'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { Client, Approval, Agreement } from '@/types'
import { Download, TrendingUp, CheckCircle, Clock, FileText } from 'lucide-react'

export default function ReportsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [agreements, setAgreements] = useState<Agreement[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [cl, ap, ag] = await Promise.all([
        supabase.from('clients').select('*').eq('agency_id', user.id).eq('status', 'active').order('name'),
        supabase.from('approvals').select('*').eq('agency_id', user.id),
        supabase.from('agreements').select('*').eq('agency_id', user.id),
      ])
      setClients(cl.data || [])
      setApprovals(ap.data || [])
      setAgreements(ag.data || [])
      if (cl.data && cl.data.length > 0) setSelectedClientId(cl.data[0].id)
      setLoading(false)
    }
    load()
  }, [])

  const clientApprovals = selectedClientId === 'all' ? approvals : approvals.filter(a => a.client_id === selectedClientId)
  const clientAgreements = selectedClientId === 'all' ? agreements : agreements.filter(a => a.client_id === selectedClientId)
  const selectedClient = clients.find(c => c.id === selectedClientId)

  const total = clientApprovals.length
  const approved = clientApprovals.filter(a => a.status === 'approved' || a.status === 'revised').length
  const withChanges = clientAgreements.filter(a => a.action === 'changes_requested').length
  const approvalRate = total ? Math.round(approved / total * 100) : 0

  // Avg response time
  const pendingHours = clientApprovals.filter(a => a.status === 'pending')
    .map(a => Math.round((Date.now() - new Date(a.created_at).getTime()) / 3600000))
  const avgHours = pendingHours.length ? Math.round(pendingHours.reduce((s, h) => s + h, 0) / pendingHours.length) : 0

  // Monthly breakdown (last 5 months)
  const months = Array.from({ length: 5 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (4 - i))
    return { label: d.toLocaleDateString('es-AR', { month: 'short' }), month: d.getMonth(), year: d.getFullYear() }
  })

  const monthlyData = months.map(m => {
    const items = clientApprovals.filter(a => {
      const d = new Date(a.created_at)
      return d.getMonth() === m.month && d.getFullYear() === m.year
    })
    return { ...m, total: items.length, approved: items.filter(a => ['approved','revised'].includes(a.status)).length }
  })

  const maxBar = Math.max(...monthlyData.map(m => m.total), 1)

  // Per-client stats
  const clientStats = clients.map(c => {
    const ca = approvals.filter(a => a.client_id === c.id)
    const ok = ca.filter(a => ['approved','revised'].includes(a.status)).length
    return { client: c, total: ca.length, approved: ok, rate: ca.length ? Math.round(ok / ca.length * 100) : 0 }
  }).sort((a, b) => b.total - a.total)

  function exportReport() {
    const lines = [
      `REPORTE AGENCYFLOW — ${selectedClient ? selectedClient.name : 'Todos los clientes'}`,
      `Generado: ${new Date().toLocaleDateString('es-AR')}`,
      '',
      `Total de piezas: ${total}`,
      `Aprobadas directas: ${approved}`,
      `Tasa de aprobación: ${approvalRate}%`,
      `Con cambios: ${withChanges}`,
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'reporte-agencyflow.txt'; a.click()
  }

  if (loading) return <div className="p-5 text-sm" style={{ color: 'var(--text2)' }}>Cargando reportes...</div>

  return (
    <div className="p-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold">Reportes mensuales</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text2)' }}>Actividad y métricas por cliente</p>
        </div>
        <div className="flex gap-3 items-center">
          <select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)}
            className="px-3 py-2 rounded-xl border text-sm font-medium"
            style={{ borderColor: 'var(--border)', background: 'white' }}>
            <option value="all">Todos los clientes</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={exportReport}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium"
            style={{ borderColor: 'var(--border)', color: 'var(--text2)' }}>
            <Download size={14} /> Exportar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Piezas entregadas', value: total, icon: FileText, color: 'var(--coral)' },
          { label: 'Aprobadas directas', value: approved, icon: CheckCircle, color: 'var(--green)' },
          { label: 'Tasa de aprobación', value: `${approvalRate}%`, icon: TrendingUp, color: 'var(--teal)' },
          { label: 'Tiempo resp. promedio', value: avgHours ? `${avgHours}h` : '—', icon: Clock, color: 'var(--amber)' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border p-4" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Icon size={14} style={{ color }} />
              <span className="text-xs font-medium" style={{ color: 'var(--text2)' }}>{label}</span>
            </div>
            <div className="text-2xl font-bold" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Bar chart */}
        <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--border)' }}>
          <h3 className="font-bold text-sm mb-4">Piezas por mes</h3>
          <div className="space-y-3">
            {monthlyData.map(m => (
              <div key={m.label} className="flex items-center gap-3">
                <span className="text-xs w-8 text-right font-medium" style={{ color: 'var(--text2)' }}>{m.label}</span>
                <div className="flex-1 relative h-7 rounded-lg overflow-hidden" style={{ background: 'var(--bg3)' }}>
                  <div className="absolute left-0 top-0 bottom-0 rounded-lg transition-all"
                    style={{ width: `${Math.round(m.total / maxBar * 100)}%`, background: 'var(--teal)', opacity: 0.3 }} />
                  <div className="absolute left-0 top-0 bottom-0 rounded-lg transition-all"
                    style={{ width: `${Math.round(m.approved / maxBar * 100)}%`, background: 'var(--teal)' }} />
                </div>
                <div className="text-xs w-12 text-right">
                  <span className="font-bold" style={{ color: 'var(--teal)' }}>{m.approved}</span>
                  <span style={{ color: 'var(--text3)' }}>/{m.total}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-4">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ background: 'var(--teal)' }} /><span className="text-xs" style={{ color: 'var(--text2)' }}>Aprobadas</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ background: 'var(--teal)', opacity: 0.3 }} /><span className="text-xs" style={{ color: 'var(--text2)' }}>Total</span></div>
          </div>
        </div>

        {/* Per-client ranking */}
        <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--border)' }}>
          <h3 className="font-bold text-sm mb-4">Ranking de clientes por piezas</h3>
          {clientStats.length === 0 ? (
            <div className="text-sm text-center py-8" style={{ color: 'var(--text3)' }}>Sin datos todavía</div>
          ) : clientStats.map(({ client: c, total: t, approved: a, rate }) => (
            <div key={c.id} className="mb-4">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: c.avatar_color }}>
                  {c.name[0]}
                </div>
                <span className="text-sm font-medium flex-1">{c.name}</span>
                <span className="text-xs font-bold" style={{ color: rate >= 80 ? 'var(--green)' : rate >= 60 ? 'var(--amber)' : 'var(--red)' }}>{rate}%</span>
                <span className="text-xs" style={{ color: 'var(--text2)' }}>{a}/{t} piezas</span>
              </div>
              <div className="h-2 rounded-full" style={{ background: 'var(--bg3)' }}>
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${Math.round(t / Math.max(...clientStats.map(s => s.total), 1) * 100)}%`, background: c.avatar_color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

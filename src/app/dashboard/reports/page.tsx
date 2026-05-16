'use client'
import PlanGuard from '@/components/PlanGuard'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

function ReportsContent() {
  const [clients, setClients] = useState<any[]>([])
  const [approvals, setApprovals] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [cl, ap] = await Promise.all([
        supabase.from('clients').select('*').eq('agency_id', user.id).eq('status','active').order('name'),
        supabase.from('approvals').select('*').eq('agency_id', user.id),
      ])
      setClients(cl.data || [])
      setApprovals(ap.data || [])
      setLoading(false)
    }
    load()
  }, [])

  const ca = selectedId === 'all' ? approvals : approvals.filter(a => a.client_id === selectedId)
  const total = ca.length
  const approved = ca.filter(a => ['approved','revised'].includes(a.status)).length
  const rate = total ? Math.round(approved/total*100) : 0

  const months = Array.from({length:5},(_,i) => {
    const d = new Date(); d.setMonth(d.getMonth()-(4-i))
    return { label: d.toLocaleDateString('es-AR',{month:'short'}), month: d.getMonth(), year: d.getFullYear() }
  })
  const monthly = months.map(m => {
    const items = ca.filter(a => { const d=new Date(a.created_at); return d.getMonth()===m.month && d.getFullYear()===m.year })
    return { ...m, total: items.length, approved: items.filter(a => ['approved','revised'].includes(a.status)).length }
  })
  const maxBar = Math.max(...monthly.map(m => m.total), 1)

  const clientStats = clients.map(c => {
    const a = approvals.filter(x => x.client_id === c.id)
    const ok = a.filter(x => ['approved','revised'].includes(x.status)).length
    return { client: c, total: a.length, approved: ok, rate: a.length ? Math.round(ok/a.length*100) : 0 }
  }).sort((a,b) => b.total - a.total)

  const card = { background: '#fff', border: '1px solid #E2E0D8', borderRadius: '12px', padding: '18px' }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>Cargando...</div>

  return (
    <div style={{ padding: '20px', maxWidth: '960px', margin: '0 auto', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Reportes mensuales</h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>Actividad y métricas por cliente</p>
        </div>
        <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #E2E0D8', fontSize: '13px', fontFamily: 'system-ui,sans-serif', background: '#fff' }}>
          <option value="all">Todos los clientes</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Piezas entregadas', value: total, color: '#E8623A' },
          { label: 'Aprobadas', value: approved, color: '#059669' },
          { label: 'Tasa aprobación', value: `${rate}%`, color: '#0D9488' },
          { label: 'Clientes activos', value: clients.length, color: '#7C3AED' },
        ].map(k => (
          <div key={k.label} style={{ background: '#fff', border: '1px solid #E2E0D8', borderRadius: '10px', padding: '14px' }}>
            <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '6px' }}>{k.label}</div>
            <div style={{ fontSize: '26px', fontWeight: 700, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={card}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>Piezas por mes</h3>
          {monthly.map(m => (
            <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', color: '#64748B', width: '28px', textAlign: 'right', flexShrink: 0 }}>{m.label}</span>
              <div style={{ flex: 1, height: '24px', background: '#F1EFE8', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.round(m.total/maxBar*100)}%`, background: '#0D948840', borderRadius: '6px' }} />
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.round(m.approved/maxBar*100)}%`, background: '#0D9488', borderRadius: '6px' }} />
              </div>
              <span style={{ fontSize: '11px', width: '36px', textAlign: 'right' }}>
                <span style={{ fontWeight: 600, color: '#0D9488' }}>{m.approved}</span>
                <span style={{ color: '#94A3B8' }}>/{m.total}</span>
              </span>
            </div>
          ))}
        </div>
        <div style={card}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px' }}>Ranking de clientes</h3>
          {clientStats.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#94A3B8', fontSize: '13px' }}>Sin datos todavía</div>
          ) : clientStats.map(({ client: c, total: t, approved: a, rate: r }) => (
            <div key={c.id} style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: c.avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>{c.name[0]}</div>
                <span style={{ fontSize: '13px', fontWeight: 500, flex: 1 }}>{c.name}</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: r >= 80 ? '#059669' : r >= 60 ? '#D97706' : '#DC2626' }}>{r}%</span>
                <span style={{ fontSize: '11px', color: '#94A3B8' }}>{a}/{t}</span>
              </div>
              <div style={{ height: '6px', borderRadius: '3px', background: '#F1EFE8' }}>
                <div style={{ height: '100%', borderRadius: '3px', width: `${clientStats.length ? Math.round(t/Math.max(...clientStats.map(s=>s.total),1)*100) : 0}%`, background: c.avatar_color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ReportsPage() {
  return (
    <PlanGuard feature="reports">
      <ReportsContent />
    </PlanGuard>
  )
}

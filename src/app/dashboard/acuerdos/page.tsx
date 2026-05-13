'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { Agreement } from '@/types'
import { Lock, Search, Download } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function AcuerdosPage() {
  const [agreements, setAgreements] = useState<Agreement[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('agreements')
        .select('*, client:clients(name,avatar_color)')
        .eq('agency_id', user.id)
        .order('signed_at', { ascending: false })
      setAgreements(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = agreements.filter(a => {
    const q = search.toLowerCase()
    return !q ||
      (a.client as any)?.name?.toLowerCase().includes(q) ||
      a.piece_name.toLowerCase().includes(q) ||
      a.client_name.toLowerCase().includes(q)
  })

  function exportCSV() {
    const rows = [
      ['Cliente', 'Pieza', 'Quién', 'Acción', 'Fecha', 'Hora'],
      ...filtered.map(a => [
        (a.client as any)?.name || '',
        a.piece_name,
        a.client_name,
        a.action === 'approved' ? 'Aprobación' : 'Cambio solicitado',
        format(new Date(a.signed_at), 'dd/MM/yyyy'),
        format(new Date(a.signed_at), 'HH:mm'),
      ])
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'acuerdos-agencyflow.csv'; a.click()
  }

  return (
    <div className="p-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Lock size={18} style={{ color: 'var(--teal)' }} /> Registro de acuerdos
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text2)' }}>Historial inmutable con fecha y hora · {agreements.length} registros</p>
        </div>
        <button onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium"
          style={{ borderColor: 'var(--border)', color: 'var(--text2)' }}>
          <Download size={14} /> Exportar CSV
        </button>
      </div>

      {/* Info banner */}
      <div className="flex items-center gap-3 p-3 rounded-xl mb-5" style={{ background: '#CCFBF1', border: '1px solid #99F6E4' }}>
        <Lock size={15} style={{ color: 'var(--teal)', flexShrink: 0 }} />
        <p className="text-sm" style={{ color: '#0F766E' }}>
          Cada registro es <strong>inmutable</strong> — fecha, hora y nombre no se pueden modificar.
          Usalo como evidencia ante cualquier disputa con un cliente.
        </p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border mb-5 bg-white"
        style={{ borderColor: 'var(--border)' }}>
        <Search size={15} style={{ color: 'var(--text3)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por cliente, pieza o persona..."
          className="flex-1 text-sm outline-none bg-transparent" style={{ color: 'var(--text)' }} />
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-sm" style={{ color: 'var(--text2)' }}>Cargando historial...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Lock size={36} className="mx-auto mb-3" style={{ color: 'var(--text3)' }} />
          <div className="text-sm" style={{ color: 'var(--text2)' }}>
            {search ? 'Sin resultados para esa búsqueda' : 'Todavía no hay acuerdos registrados'}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          {/* Header */}
          <div className="grid gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wide"
            style={{ gridTemplateColumns: '1.5fr 2fr 1.2fr 1fr 0.8fr', background: 'var(--bg3)', color: 'var(--text2)' }}>
            <span>Cliente</span>
            <span>Pieza</span>
            <span>Quién</span>
            <span>Fecha y hora</span>
            <span>Tipo</span>
          </div>
          {filtered.map((a, i) => {
            const client = a.client as any
            const isApproved = a.action === 'approved'
            return (
              <div key={a.id} className="grid gap-3 px-4 py-3 items-center border-t text-sm hover:bg-gray-50 transition-colors"
                style={{ gridTemplateColumns: '1.5fr 2fr 1.2fr 1fr 0.8fr', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: client?.avatar_color || 'var(--coral)' }}>
                    {client?.name?.[0] || '?'}
                  </div>
                  <span className="font-semibold truncate">{client?.name}</span>
                </div>
                <span className="truncate" style={{ color: 'var(--text2)' }}>{a.piece_name}</span>
                <span style={{ color: 'var(--text2)' }}>{a.client_name}</span>
                <div>
                  <div className="font-medium">{format(new Date(a.signed_at), 'dd MMM yyyy', { locale: es })}</div>
                  <div className="text-xs" style={{ color: 'var(--text3)' }}>{format(new Date(a.signed_at), 'HH:mm')} hs</div>
                </div>
                <span className="text-xs font-bold px-2 py-1 rounded-full"
                  style={isApproved ? { background: '#D1FAE5', color: '#065F46' } : { background: '#FEF3C7', color: '#92400E' }}>
                  {isApproved ? '✓ Aprobado' : '✎ Cambios'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

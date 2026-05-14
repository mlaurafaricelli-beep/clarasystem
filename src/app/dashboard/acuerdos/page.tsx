'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export default function AcuerdosPage() {
  const [agreements, setAgreements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('agreements').select('*, client:clients(name,avatar_color)').eq('agency_id', user.id).order('signed_at', { ascending: false })
      setAgreements(data || [])
      setLoading(false)
    }
    load()
  }, [])

  function exportCSV() {
    const rows = [['Cliente','Pieza','Quién','Acción','Fecha','Hora'], ...filtered.map(a => [(a.client as any)?.name||'', a.piece_name, a.client_name, a.action==='approved'?'Aprobación':'Cambio', format(new Date(a.signed_at),'dd/MM/yyyy'), format(new Date(a.signed_at),'HH:mm')])]
    const blob = new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url; a.download='acuerdos.csv'; a.click()
  }

  const filtered = agreements.filter(a => {
    const q = search.toLowerCase()
    return !q || (a.client as any)?.name?.toLowerCase().includes(q) || a.piece_name.toLowerCase().includes(q) || a.client_name.toLowerCase().includes(q)
  })

  const p = { padding: '20px', maxWidth: '960px', margin: '0 auto', fontFamily: 'system-ui,sans-serif' }

  return (
    <div style={p}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>🔒 Registro de acuerdos</h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>Historial inmutable · {agreements.length} registros</p>
        </div>
        <button onClick={exportCSV} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #E2E0D8', background: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'system-ui,sans-serif' }}>
          ↓ Exportar CSV
        </button>
      </div>

      <div style={{ background: '#CCFBF1', border: '1px solid #99F6E4', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '16px' }}>🔒</span>
        <p style={{ fontSize: '13px', color: '#0F766E', margin: 0 }}>
          Cada registro es <strong>inmutable</strong> — fecha, hora y nombre no se pueden modificar. Usalo como evidencia ante cualquier disputa.
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1px solid #E2E0D8', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px' }}>
        <span style={{ color: '#94A3B8' }}>🔍</span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por cliente, pieza o persona..." style={{ flex: 1, border: 'none', outline: 'none', fontSize: '13px', fontFamily: 'system-ui,sans-serif', background: 'transparent' }} />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>Cargando historial...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94A3B8' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔒</div>
          <div>{search ? 'Sin resultados' : 'Todavía no hay acuerdos registrados'}</div>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #E2E0D8', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr 1.2fr 1fr 0.9fr', padding: '10px 16px', background: '#F1EFE8', borderBottom: '1px solid #E2E0D8' }}>
            {['Cliente','Pieza','Quién','Fecha y hora','Tipo'].map(h => (
              <span key={h} style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#64748B' }}>{h}</span>
            ))}
          </div>
          {filtered.map(a => {
            const cl = a.client as any
            const ok = a.action === 'approved'
            return (
              <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr 1.2fr 1fr 0.9fr', padding: '12px 16px', borderBottom: '1px solid #F1EFE8', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: cl?.avatar_color || '#E8623A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {cl?.name?.[0] || '?'}
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cl?.name}</span>
                </div>
                <span style={{ fontSize: '12px', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.piece_name}</span>
                <span style={{ fontSize: '12px', color: '#475569' }}>{a.client_name}</span>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 500 }}>{format(new Date(a.signed_at), 'dd MMM yyyy', { locale: es })}</div>
                  <div style={{ fontSize: '10px', color: '#94A3B8' }}>{format(new Date(a.signed_at), 'HH:mm')} hs</div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '20px', ...(ok ? { background: '#D1FAE5', color: '#065F46' } : { background: '#FEF3C7', color: '#92400E' }) }}>
                  {ok ? '✓ Aprobado' : '✎ Cambios'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

const s = {
  page: { padding: '20px', maxWidth: '900px', margin: '0 auto', fontFamily: 'system-ui,sans-serif' },
  card: { background: '#fff', border: '1px solid #E2E0D8', borderRadius: '12px', padding: '16px', marginBottom: '8px' },
  btn: { padding: '7px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'system-ui,sans-serif' },
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const supabase = createClient()

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('alerts').select('*, client:clients(name)').eq('agency_id', user.id).order('created_at', { ascending: false })
    setAlerts(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function markRead(id: string) {
    await supabase.from('alerts').update({ read: true }).eq('id', id)
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a))
  }

  async function markAllRead() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('alerts').update({ read: true }).eq('agency_id', user.id)
    setAlerts(prev => prev.map(a => ({ ...a, read: true })))
  }

  async function generate() {
    setGenerating(true)
    await fetch('/api/alerts/generate', { method: 'POST' })
    await load()
    setGenerating(false)
  }

  const urgent = alerts.filter(a => a.type === 'urgent')
  const warning = alerts.filter(a => a.type === 'warning')
  const info = alerts.filter(a => a.type === 'info')
  const unread = alerts.filter(a => !a.read).length

  const cfg: Record<string, any> = {
    urgent: { color: '#DC2626', bg: '#FEF2F2', dot: '#DC2626', label: '🔴 Urgentes — actuar hoy' },
    warning: { color: '#D97706', bg: '#FFFBEB', dot: '#D97706', label: '🟡 Atención pronto' },
    info: { color: '#2563EB', bg: '#EFF6FF', dot: '#2563EB', label: '🔵 Informativo' },
  }

  return (
    <div style={s.page}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Alertas inteligentes</h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>Problemas antes de que exploten · {unread} sin leer</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={generate} disabled={generating} style={{ ...s.btn, background: '#F1EFE8', color: '#475569' }}>
            {generating ? '⟳ Verificando...' : '⟳ Verificar ahora'}
          </button>
          {unread > 0 && (
            <button onClick={markAllRead} style={{ ...s.btn, background: '#0D9488', color: '#fff' }}>✓ Marcar todas leídas</button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '24px' }}>
        {(['urgent','warning','info'] as const).map(t => (
          <div key={t} style={{ background: cfg[t].bg, borderRadius: '10px', padding: '14px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: cfg[t].color, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>
              {t === 'urgent' ? 'Urgentes' : t === 'warning' ? 'Atención' : 'Informativo'}
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: cfg[t].color }}>
              {t === 'urgent' ? urgent.length : t === 'warning' ? warning.length : info.length}
            </div>
            <div style={{ fontSize: '11px', color: cfg[t].color, opacity: 0.7 }}>
              {(t === 'urgent' ? urgent : t === 'warning' ? warning : info).filter((a: any) => !a.read).length} sin leer
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>Cargando alertas...</div>
      ) : alerts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94A3B8' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
          <div style={{ fontWeight: 600, marginBottom: '6px' }}>Sin alertas activas 🎉</div>
          <div style={{ fontSize: '13px' }}>Hacé clic en "Verificar ahora" para revisar</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {urgent.length > 0 && (
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#DC2626', marginBottom: '10px' }}>🔴 Urgentes — actuar hoy</div>
              {urgent.map((a: any) => (
                <div key={a.id} style={{ ...s.card, opacity: a.read ? 0.5 : 1, borderLeft: '3px solid #DC2626' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 500, lineHeight: 1.5 }}>{a.message}</div>
                      <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '3px' }}>
                        {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: es })}
                      </div>
                    </div>
                    {!a.read && (
                      <button onClick={() => markRead(a.id)} style={{ ...s.btn, background: '#F1F5F9', color: '#475569', fontSize: '11px', flexShrink: 0 }}>Leída</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div>
            {warning.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#D97706', marginBottom: '10px' }}>🟡 Atención pronto</div>
                {warning.map((a: any) => (
                  <div key={a.id} style={{ ...s.card, opacity: a.read ? 0.5 : 1, borderLeft: '3px solid #D97706' }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, lineHeight: 1.5 }}>{a.message}</div>
                    <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '3px' }}>
                      {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: es })}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {info.length > 0 && (
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#2563EB', marginBottom: '10px' }}>🔵 Informativo</div>
                {info.map((a: any) => (
                  <div key={a.id} style={{ ...s.card, opacity: a.read ? 0.5 : 1, borderLeft: '3px solid #2563EB' }}>
                    <div style={{ fontSize: '13px', lineHeight: 1.5 }}>{a.message}</div>
                    <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '3px' }}>
                      {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: es })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

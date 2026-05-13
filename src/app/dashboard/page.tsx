'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export default function DashboardPage() {
  const [clients, setClients] = useState<any[]>([])
  const [pending, setPending] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [lateTasks, setLateTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [cl, ap, al, tk] = await Promise.all([
        supabase.from('clients').select('*').eq('agency_id', user.id).eq('status', 'active').order('name'),
        supabase.from('approvals').select('*, client:clients(name,avatar_color)').eq('agency_id', user.id).eq('status', 'pending').order('created_at'),
        supabase.from('alerts').select('*, client:clients(name)').eq('agency_id', user.id).eq('read', false).order('created_at', { ascending: false }).limit(6),
        supabase.from('tasks').select('*, client:clients(name)').eq('agency_id', user.id).in('status', ['pending','in_progress']).lt('due_date', new Date().toISOString().split('T')[0]),
      ])
      setClients(cl.data || [])
      setPending(ap.data || [])
      setAlerts(al.data || [])
      setLateTasks(tk.data || [])
      setLoading(false)
    }
    load()
  }, [])

  const urgent = alerts.filter(a => a.type === 'urgent')

  const card = { background: '#fff', border: '1px solid #E2E0D8', borderRadius: '12px', padding: '16px' }
  const statCard = { background: '#F1EFE8', borderRadius: '10px', padding: '14px', textAlign: 'center' as const }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>Cargando tu agencia...</div>

  return (
    <div style={{ padding: '20px', maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Buenos días 👀</h1>
        <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
          Tu agencia de un vistazo — {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Tareas atrasadas', value: lateTasks.length, color: '#DC2626' },
          { label: 'Esperando aprobación', value: pending.length, color: '#0D9488' },
          { label: 'Clientes activos', value: clients.length, color: '#E8623A' },
          { label: 'Alertas urgentes', value: urgent.length, color: '#D97706' },
        ].map(s => (
          <div key={s.label} style={statCard}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Clientes */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Estado de clientes</h2>
            <button onClick={() => router.push('/dashboard/fichas')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#E8623A' }}>Ver todos →</button>
          </div>
          {clients.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: '#94A3B8', fontSize: '13px' }}>
              Sin clientes aún.{' '}
              <button onClick={() => router.push('/dashboard/fichas')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E8623A', textDecoration: 'underline' }}>
                Agregar primero
              </button>
            </div>
          ) : clients.map(c => {
            const late = lateTasks.filter(t => t.client_id === c.id).length
            const pend = pending.filter(a => a.client_id === c.id).length
            return (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid #F1EFE8' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: c.avatar_color || '#E8623A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {c.name.split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>{c.sector || 'Sin sector'}</div>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {late > 0 && <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '20px', background: '#FEE2E2', color: '#991B1B' }}>{late} tarde</span>}
                  {pend > 0 && <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '20px', background: '#FEF3C7', color: '#92400E' }}>{pend} pend.</span>}
                  {late === 0 && pend === 0 && <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '20px', background: '#D1FAE5', color: '#065F46' }}>Al día</span>}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Esperando */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>⏳ Esperando respuesta</h2>
              <button onClick={() => router.push('/dashboard/approvals')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#E8623A' }}>Ver →</button>
            </div>
            {pending.length === 0 ? (
              <div style={{ fontSize: '12px', color: '#94A3B8' }}>✓ Ningún cliente está esperando</div>
            ) : pending.slice(0,4).map(a => {
              const hours = Math.round((Date.now() - new Date(a.created_at).getTime()) / 3600000)
              return (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', borderBottom: '1px solid #F1EFE8' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: hours > 48 ? '#DC2626' : '#D97706', flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: '12px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(a.client as any)?.name}</div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: hours > 48 ? '#DC2626' : '#D97706' }}>{hours}h</div>
                </div>
              )
            })}
          </div>

          {/* Alertas */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>🔴 Alertas urgentes</h2>
              <button onClick={() => router.push('/dashboard/alerts')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#E8623A' }}>Ver →</button>
            </div>
            {urgent.length === 0 ? (
              <div style={{ fontSize: '12px', color: '#94A3B8' }}>✓ Sin alertas urgentes hoy 🎉</div>
            ) : urgent.slice(0,3).map(a => (
              <div key={a.id} style={{ display: 'flex', gap: '8px', padding: '6px 0', borderBottom: '1px solid #F1EFE8' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#DC2626', flexShrink: 0, marginTop: '5px' }} />
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 500, lineHeight: 1.4 }}>{a.message}</div>
                  <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>
                    {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: es })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

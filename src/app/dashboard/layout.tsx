'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { differenceInDays } from 'date-fns'

const NAV = [
  { href: '/dashboard', label: 'Tablero', exact: true },
  { href: '/dashboard/approvals', label: 'Aprobaciones' },
  { href: '/dashboard/fichas', label: 'Fichas de clientes' },
  { href: '/dashboard/alerts', label: 'Alertas' },
  { href: '/dashboard/acuerdos', label: 'Registro' },
  { href: '/dashboard/team', label: 'Equipo' },
  { href: '/dashboard/reports', label: 'Reportes' },
  { href: '/dashboard/plan', label: '⭐ Mi plan' },
]

function TrialBanner({ daysLeft, onClick }: { daysLeft: number, onClick: () => void }) {
  if (daysLeft > 5) return null
  if (daysLeft < 0) return null
  return (
    <div onClick={onClick} style={{ margin: '8px', padding: '8px 10px', background: daysLeft <= 2 ? 'rgba(220,38,38,0.15)' : 'rgba(212,175,55,0.1)', border: `1px solid ${daysLeft <= 2 ? 'rgba(220,38,38,0.3)' : 'rgba(212,175,55,0.2)'}`, borderRadius: '8px', cursor: 'pointer' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: daysLeft <= 2 ? '#FCA5A5' : '#D4AF37' }}>
        {daysLeft <= 0 ? '🔒 Trial vencido' : `⚠️ Trial: ${daysLeft} días`}
      </div>
      <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>Ver planes →</div>
    </div>
  )
}

function TrialBlock({ agencyName, onGoToPlan, onSignOut }: { agencyName: string, onGoToPlan: () => void, onSignOut: () => void }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'system-ui,sans-serif', background: '#F8F7F4' }}>
      <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', marginBottom: '28px' }}>
          Clara<span style={{ color: '#D4AF37' }}>System</span>
        </div>
        <div style={{ background: '#0A0A0F', borderRadius: '20px', padding: '40px 32px', border: '1px solid rgba(212,175,55,0.2)', boxShadow: '0 24px 64px rgba(0,0,0,0.15)' }}>
          <div style={{ fontSize: '52px', marginBottom: '16px' }}>🔒</div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '10px' }}>Tu período de prueba venció</h1>
          <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.7, marginBottom: '28px' }}>
            {agencyName ? `Gracias por probar ClaraSystem, ${agencyName}.` : 'Gracias por probar ClaraSystem.'} Para seguir usando la app y no perder tus datos, elegí un plan.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
            {[
              { name: 'Esencial', price: 19, clients: 3, color: '#64748B' },
              { name: 'Crecimiento', price: 39, clients: 5, color: '#0D9488' },
              { name: 'Agencia', price: 69, clients: 10, color: '#E8623A', popular: true },
              { name: 'Estudio', price: 129, clients: 25, color: '#7C3AED' },
            ].map(p => (
              <div key={p.name} style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${(p as any).popular ? p.color : 'rgba(255,255,255,0.08)'}`, borderRadius: '10px', padding: '12px', textAlign: 'center', position: 'relative' }}>
                {(p as any).popular && <div style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: p.color, color: '#fff', fontSize: '9px', fontWeight: 700, padding: '2px 10px', borderRadius: '20px', whiteSpace: 'nowrap' }}>Más elegido</div>}
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>{p.name}</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: p.color }}>USD {p.price}</div>
                <div style={{ fontSize: '10px', color: '#475569' }}>/mes · {p.clients} clientes</div>
              </div>
            ))}
          </div>
          <button onClick={onGoToPlan} style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: 800, fontFamily: 'system-ui,sans-serif', background: 'linear-gradient(135deg,#D4AF37,#F5D060)', color: '#0A0A0F', marginBottom: '12px' }}>
            Ver planes y contactar a Laura →
          </button>
          <button onClick={onSignOut} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#334155', fontFamily: 'system-ui,sans-serif' }}>
            Cerrar sesión
          </button>
        </div>
        <p style={{ fontSize: '11px', color: '#94A3B8', marginTop: '20px' }}>Tus datos están guardados y seguros.</p>
      </div>
    </div>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<any>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [urgentCount, setUrgentCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [trialDays, setTrialDays] = useState(99)
  const [blocked, setBlocked] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)

      if (prof) {
        // Calcular días restantes
        let endDate: Date
        if (prof.payment_status === 'active' && prof.subscription_end) {
          endDate = new Date(prof.subscription_end)
        } else {
          endDate = new Date(prof.trial_ends_at)
        }
        const days = differenceInDays(endDate, new Date())
        setTrialDays(days)

        // Bloquear si venció Y no es la página de plan
        if (days < 0 && pathname !== '/dashboard/plan') {
          setBlocked(true)
        }
      }

      const { count: pc } = await supabase.from('approvals').select('*', { count: 'exact', head: true }).eq('agency_id', user.id).eq('status', 'pending')
      setPendingCount(pc || 0)
      const { count: ac } = await supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('agency_id', user.id).eq('type', 'urgent').eq('read', false)
      setUrgentCount(ac || 0)
    }
    load()
  }, [pathname])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  function active(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname.startsWith(href)
  }

  const sidebar = (
    <div style={{ width: '220px', minWidth: '220px', height: '100vh', background: '#13131A', borderRight: '1px solid rgba(212,175,55,0.15)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px', borderBottom: '1px solid rgba(212,175,55,0.15)' }}>
        <div style={{ fontSize: '20px', fontWeight: 800, color: '#fff' }}>
          Clara<span style={{ color: '#D4AF37' }}>System</span>
        </div>
        <div style={{ fontSize: '10px', color: '#444', marginTop: '3px', letterSpacing: '1px' }}>BY NEGOCIO DELEGABLE</div>
      </div>

      <TrialBanner daysLeft={trialDays} onClick={() => router.push('/dashboard/plan')} />

      <div style={{ flex: 1, padding: '8px', overflowY: 'auto' }}>
        <div style={{ fontSize: '9px', color: '#333', padding: '12px 10px 6px', letterSpacing: '1.5px', fontWeight: 700 }}>PRINCIPAL</div>
        {NAV.map(item => {
          const isActive = active(item.href, item.exact)
          const badge = item.href.includes('approvals') ? pendingCount : item.href.includes('alerts') ? urgentCount : 0
          const isPlan = item.href.includes('plan')
          return (
            <button key={item.href} onClick={() => { router.push(item.href); setOpen(false) }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '10px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontFamily: 'system-ui,sans-serif', fontWeight: isActive ? 600 : 400, background: isActive ? 'rgba(212,175,55,0.12)' : 'transparent', color: isActive ? '#D4AF37' : isPlan ? '#D4AF3788' : '#777', marginBottom: '2px', textAlign: 'left', gap: '8px' }}>
              <span style={{ flex: 1 }}>{item.label}</span>
              {badge > 0 && <span style={{ background: '#D4AF37', color: '#000', fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '10px' }}>{badge}</span>}
            </button>
          )
        })}
      </div>

      <div style={{ padding: '12px', borderTop: '1px solid rgba(212,175,55,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg,#D4AF37,#F5D060)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#000', flexShrink: 0 }}>
            {profile?.full_name?.[0] || profile?.email?.[0] || '?'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#E2E8F0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.full_name || profile?.email}</div>
            <div style={{ fontSize: '10px', color: '#444' }}>Plan {profile?.plan || 'esencial'}</div>
          </div>
          <button onClick={signOut} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', fontSize: '18px', padding: '4px', lineHeight: 1 }}>×</button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ flexShrink: 0 }}>{sidebar}</div>
      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)' }} onClick={() => setOpen(false)} />
          <div style={{ position: 'relative', zIndex: 1 }}>{sidebar}</div>
        </div>
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', background: '#13131A', borderBottom: '1px solid rgba(212,175,55,0.15)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => setOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D4AF37', fontSize: '22px', lineHeight: 1, padding: 0 }}>☰</button>
          <span style={{ fontWeight: 800, fontSize: '18px', color: '#fff' }}>Clara<span style={{ color: '#D4AF37' }}>System</span></span>
        </div>
        {blocked ? (
          <TrialBlock
            agencyName={profile?.agency_name || ''}
            onGoToPlan={() => { setBlocked(false); router.push('/dashboard/plan') }}
            onSignOut={signOut}
          />
        ) : (
          <main style={{ flex: 1, overflowY: 'auto', background: '#F8F7F4' }}>{children}</main>
        )}
      </div>
    </div>
  )
}

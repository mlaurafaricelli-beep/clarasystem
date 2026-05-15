'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'

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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<any>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [urgentCount, setUrgentCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [trialBanner, setTrialBanner] = useState(false)
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
        const daysLeft = Math.round((new Date(prof.trial_ends_at).getTime() - Date.now()) / 86400000)
        setTrialBanner(daysLeft <= 5 && daysLeft >= 0)
      }
      const { count: pc } = await supabase.from('approvals').select('*', { count: 'exact', head: true }).eq('agency_id', user.id).eq('status', 'pending')
      setPendingCount(pc || 0)
      const { count: ac } = await supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('agency_id', user.id).eq('type', 'urgent').eq('read', false)
      setUrgentCount(ac || 0)
    }
    load()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  function active(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname.startsWith(href)
  }

  const trialDays = profile ? Math.round((new Date(profile.trial_ends_at).getTime() - Date.now()) / 86400000) : 0

  const sidebar = (
    <div style={{ width: '220px', minWidth: '220px', height: '100vh', background: '#13131A', borderRight: '1px solid rgba(212,175,55,0.15)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '20px', borderBottom: '1px solid rgba(212,175,55,0.15)' }}>
        <div style={{ fontSize: '20px', fontWeight: 800, color: '#fff' }}>
          Clara<span style={{ color: '#D4AF37' }}>System</span>
        </div>
        <div style={{ fontSize: '10px', color: '#444', marginTop: '3px', letterSpacing: '1px' }}>BY NEGOCIO DELEGABLE</div>
      </div>

      {/* Trial warning in sidebar */}
      {trialBanner && (
        <div onClick={() => router.push('/dashboard/plan')} style={{ margin: '8px', padding: '8px 10px', background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: '8px', cursor: 'pointer' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#D4AF37' }}>⚠️ Trial: {trialDays} días</div>
          <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>Ver planes →</div>
        </div>
      )}

      <div style={{ flex: 1, padding: '8px', overflowY: 'auto' }}>
        <div style={{ fontSize: '9px', color: '#333', padding: '12px 10px 6px', letterSpacing: '1.5px', fontWeight: 700 }}>PRINCIPAL</div>
        {NAV.map(item => {
          const isActive = active(item.href, item.exact)
          const badge = item.href.includes('approvals') ? pendingCount : item.href.includes('alerts') ? urgentCount : 0
          const isPlan = item.href.includes('plan')
          return (
            <button key={item.href} onClick={() => { router.push(item.href); setOpen(false) }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '10px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontFamily: 'system-ui,sans-serif', fontWeight: isActive ? 600 : 400, background: isActive ? (isPlan ? 'rgba(212,175,55,0.15)' : 'rgba(212,175,55,0.12)') : 'transparent', color: isActive ? '#D4AF37' : isPlan ? '#D4AF3788' : '#777', marginBottom: '2px', textAlign: 'left', gap: '8px' }}>
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
        <main style={{ flex: 1, overflowY: 'auto', background: '#F8F7F4' }}>{children}</main>
      </div>
    </div>
  )
}

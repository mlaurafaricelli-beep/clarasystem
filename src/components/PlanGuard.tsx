'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { hasFeature } from '@/lib/plan-limits'

interface PlanGuardProps {
  feature: string
  children: React.ReactNode
}

export default function PlanGuard({ feature, children }: PlanGuardProps) {
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [plan, setPlan] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('plan').eq('id', user.id).single()
      const userPlan = data?.plan || 'esencial'
      setPlan(userPlan)
      setAllowed(hasFeature(userPlan, feature))
    }
    check()
  }, [feature])

  if (allowed === null) return (
    <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontFamily: 'system-ui,sans-serif' }}>Cargando...</div>
  )

  if (!allowed) return (
    <div style={{ padding: '60px 40px', maxWidth: '480px', margin: '0 auto', textAlign: 'center', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ fontSize: '52px', marginBottom: '16px' }}>🔒</div>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: '#0F172A' }}>Esta función no está en tu plan</h2>
      <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.6, marginBottom: '24px' }}>
        Upgradeá tu plan para acceder a esta función y seguir creciendo tu agencia.
      </p>
      <div style={{ background: '#F8F7F4', border: '1px solid #E2E0D8', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
        <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '6px' }}>Tu plan actual</div>
        <div style={{ fontSize: '20px', fontWeight: 700, textTransform: 'capitalize', color: '#0F172A' }}>{plan}</div>
      </div>
      <button onClick={() => router.push('/dashboard/plan')}
        style={{ padding: '12px 28px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 700, fontFamily: 'system-ui,sans-serif', background: 'linear-gradient(135deg,#D4AF37,#F5D060)', color: '#0A0A0F', boxShadow: '0 4px 16px rgba(212,175,55,0.3)' }}>
        Ver planes y upgradear →
      </button>
    </div>
  )

  return <>{children}</>
}

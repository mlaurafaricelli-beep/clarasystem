'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

const PLANS = [
  { id: 'esencial', name: 'Esencial', price: 19, clients: 3, users: 3, color: '#64748B', desc: 'Para empezar a ordenar y salir del caos del WhatsApp' },
  { id: 'crecimiento', name: 'Crecimiento', price: 39, clients: 5, users: 5, color: '#0D9488', desc: 'Cuando sumaste clientes y el equipo necesita más coordinación' },
  { id: 'agencia', name: 'Agencia', price: 69, clients: 10, users: 8, color: '#E8623A', desc: 'Para agencias que quieren verse más profesionales', popular: true },
  { id: 'estudio', name: 'Estudio', price: 129, clients: 25, users: 999, color: '#7C3AED', desc: 'Para agencias consolidadas con muchos clientes' },
]

export default function PlanPage() {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
      setLoading(false)
    }
    load()
  }, [])

  const trialEnd = profile ? new Date(profile.trial_ends_at) : new Date()
  const now = new Date()
  const daysLeft = Math.round((trialEnd.getTime() - now.getTime()) / 86400000)
  const trialActive = daysLeft > 0
  const currentPlan = PLANS.find(p => p.id === profile?.plan) || PLANS[0]

  function contactLaura(planName: string) {
    const msg = encodeURIComponent(`Hola Laura! Quiero contratar el plan ${planName} de ClaraSystem. Mi agencia es: ${profile?.agency_name}`)
    window.open(`https://wa.me/543584800823?text=${msg}`, '_blank')
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontFamily: 'system-ui,sans-serif' }}>Cargando...</div>

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto', fontFamily: 'system-ui,sans-serif' }}>

      {trialActive && daysLeft <= 5 && (
        <div style={{ background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: '10px', padding: '14px 18px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#92400E' }}>Tu período de prueba vence en {daysLeft} día{daysLeft !== 1 ? 's' : ''}</div>
            <div style={{ fontSize: '13px', color: '#B45309' }}>Elegí un plan para seguir usando ClaraSystem sin interrupciones.</div>
          </div>
        </div>
      )}

      {!trialActive && (
        <div style={{ background: '#FEE2E2', border: '1px solid #DC2626', borderRadius: '10px', padding: '14px 18px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>🔒</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#991B1B' }}>Tu período de prueba venció</div>
            <div style={{ fontSize: '13px', color: '#B91C1C' }}>Contactá a Laura para activar tu plan y seguir usando la app.</div>
          </div>
          <button onClick={() => contactLaura(currentPlan.name)} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#DC2626', color: '#fff', fontSize: '13px', fontWeight: 700, fontFamily: 'system-ui,sans-serif', whiteSpace: 'nowrap' }}>
            Contactar a Laura →
          </button>
        </div>
      )}

      <div style={{ background: '#0A0A0F', borderRadius: '12px', padding: '20px', marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '11px', color: '#4A4A5A', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Tu plan actual</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#fff' }}>
            {currentPlan.name} <span style={{ fontSize: '14px', fontWeight: 400, color: '#D4AF37' }}>USD ${currentPlan.price}/mes</span>
          </div>
          <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
            {profile?.max_clients} clientes · {profile?.max_users === 999 ? 'Usuarios ilimitados' : `${profile?.max_users} usuarios`}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {trialActive ? (
            <>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#D4AF37' }}>{daysLeft}</div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>días de prueba</div>
            </>
          ) : (
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#DC2626' }}>Trial vencido</div>
          )}
        </div>
      </div>

      <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>Elegí tu plan</h2>
      <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px' }}>Todas las funciones desde el plan más chico. El límite es la cantidad de clientes.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '14px', marginBottom: '28px' }}>
        {PLANS.map(plan => {
          const isCurrent = plan.id === profile?.plan
          return (
            <div key={plan.id} style={{ background: '#fff', border: `2px solid ${isCurrent ? plan.color : '#E2E0D8'}`, borderRadius: '14px', padding: '20px', position: 'relative' }}>
              {(plan as any).popular && !isCurrent && (
                <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: '#E8623A', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '3px 14px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                  ⭐ Más elegido
                </div>
              )}
              {isCurrent && (
                <div style={{ position: 'absolute', top: '-12px', right: '16px', background: plan.color, color: '#fff', fontSize: '11px', fontWeight: 700, padding: '3px 12px', borderRadius: '20px' }}>
                  Tu plan
                </div>
              )}
              <div style={{ fontSize: '18px', fontWeight: 800, marginBottom: '4px' }}>{plan.name}</div>
              <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '14px', minHeight: '36px' }}>{plan.desc}</div>
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '32px', fontWeight: 800, color: plan.color }}>USD {plan.price}</span>
                <span style={{ fontSize: '13px', color: '#94A3B8' }}>/mes</span>
              </div>
              <div style={{ marginBottom: '16px' }}>
                {[
                  `Hasta ${plan.clients} clientes activos`,
                  `Hasta ${plan.users === 999 ? 'ilimitados' : plan.users} usuarios`,
                  'Tablero + Aprobaciones + Fichas',
                  'Alertas + Acuerdos + Reportes',
                  plan.id !== 'esencial' ? 'Alertas de contratos' : null,
                  plan.id === 'agencia' || plan.id === 'estudio' ? 'Portal con tu marca' : null,
                  plan.id === 'estudio' ? 'Onboarding 1 a 1 con Laura' : null,
                ].filter(Boolean).map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '3px 0', fontSize: '12px', color: '#475569' }}>
                    <span style={{ color: '#059669', fontWeight: 700 }}>✓</span> {f}
                  </div>
                ))}
              </div>
              <button onClick={() => contactLaura(plan.name)} disabled={isCurrent}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', cursor: isCurrent ? 'default' : 'pointer', fontSize: '13px', fontWeight: 700, fontFamily: 'system-ui,sans-serif', background: isCurrent ? '#F1EFE8' : plan.color, color: isCurrent ? '#94A3B8' : '#fff' }}>
                {isCurrent ? 'Plan actual ✓' : `Contratar ${plan.name} →`}
              </button>
            </div>
          )
        })}
      </div>

      <div style={{ background: '#F8F7F4', border: '1px solid #E2E0D8', borderRadius: '12px', padding: '18px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>💳 Formas de pago</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ background: '#fff', border: '1px solid #E2E0D8', borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '6px' }}>💳</div>
            <div style={{ fontSize: '13px', fontWeight: 700 }}>PayPal</div>
            <div style={{ fontSize: '11px', color: '#64748B' }}>En USD · desde cualquier país</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #E2E0D8', borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '6px' }}>🏦</div>
            <div style={{ fontSize: '13px', fontWeight: 700 }}>Transferencia / CBU</div>
            <div style={{ fontSize: '11px', color: '#64748B' }}>En pesos o USD · Argentina</div>
          </div>
        </div>
        <p style={{ fontSize: '12px', color: '#94A3B8', textAlign: 'center', marginTop: '12px', marginBottom: 0 }}>
          Al elegir tu plan te enviamos los datos de pago por mail · 14 días gratis · Sin tarjeta de crédito
        </p>
      </div>
    </div>
  )
}

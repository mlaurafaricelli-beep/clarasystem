'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [agencyName, setAgencyName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (mode === 'register') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, agency_name: agencyName } },
      })
      if (error) { setError(error.message); setLoading(false); return }
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('profiles').update({ agency_name: agencyName, full_name: fullName }).eq('id', user.id)
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0A0F',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(212,175,55,0.12), transparent)',
      }} />

      <div style={{ width: '100%', maxWidth: '420px', position: 'relative' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '56px', height: '56px', borderRadius: '16px', marginBottom: '16px',
            background: 'linear-gradient(135deg, #D4AF37, #F5D060)',
            boxShadow: '0 0 32px rgba(212,175,55,0.3)',
          }}>
            <span style={{ fontSize: '24px', fontWeight: '800', color: '#0A0A0F' }}>A</span>
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#FFFFFF', letterSpacing: '-0.5px' }}>
            Clara<span style={{ color: '#D4AF37' }}>System</span>
          </div>
          <div style={{ fontSize: '12px', color: '#4A4A5A', marginTop: '4px', letterSpacing: '1px', textTransform: 'uppercase' }}>
            by Negocio Delegable
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: '#13131A',
          border: '1px solid rgba(212,175,55,0.15)',
          borderRadius: '20px',
          padding: '32px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}>
          {/* Toggle */}
          <div style={{
            display: 'flex', background: '#0A0A0F', borderRadius: '10px',
            padding: '4px', marginBottom: '28px', border: '1px solid rgba(255,255,255,0.06)',
          }}>
            {(['login', 'register'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                flex: 1, padding: '9px', borderRadius: '7px', border: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: '600', fontFamily: 'inherit', transition: 'all .2s',
                background: mode === m ? 'linear-gradient(135deg, #D4AF37, #F5D060)' : 'transparent',
                color: mode === m ? '#0A0A0F' : '#4A4A5A',
              }}>
                {m === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {mode === 'register' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '6px', color: '#6A6A7A', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                      Tu nombre
                    </label>
                    <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required
                      placeholder="Laura García"
                      style={{
                        width: '100%', padding: '11px 14px', borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.08)', background: '#0A0A0F',
                        color: '#FFFFFF', fontSize: '14px', fontFamily: 'inherit', outline: 'none',
                        boxSizing: 'border-box',
                      }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '6px', color: '#6A6A7A', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                      Nombre de tu agencia
                    </label>
                    <input type="text" value={agencyName} onChange={e => setAgencyName(e.target.value)} required
                      placeholder="Studio Vela / MR Contenidos"
                      style={{
                        width: '100%', padding: '11px 14px', borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.08)', background: '#0A0A0F',
                        color: '#FFFFFF', fontSize: '14px', fontFamily: 'inherit', outline: 'none',
                        boxSizing: 'border-box',
                      }} />
                  </div>
                </>
              )}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '6px', color: '#6A6A7A', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  Email
                </label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="vos@tuagencia.com"
                  style={{
                    width: '100%', padding: '11px 14px', borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.08)', background: '#0A0A0F',
                    color: '#FFFFFF', fontSize: '14px', fontFamily: 'inherit', outline: 'none',
                    boxSizing: 'border-box',
                  }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', marginBottom: '6px', color: '#6A6A7A', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  Contraseña
                </label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                  placeholder="••••••••" minLength={6}
                  style={{
                    width: '100%', padding: '11px 14px', borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.08)', background: '#0A0A0F',
                    color: '#FFFFFF', fontSize: '14px', fontFamily: 'inherit', outline: 'none',
                    boxSizing: 'border-box',
                  }} />
              </div>
            </div>

            {error && (
              <div style={{
                marginTop: '14px', padding: '10px 14px', borderRadius: '8px',
                background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)',
                color: '#FCA5A5', fontSize: '13px',
              }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', marginTop: '20px', padding: '13px',
              borderRadius: '10px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px', fontWeight: '700', fontFamily: 'inherit',
              background: loading ? 'rgba(212,175,55,0.4)' : 'linear-gradient(135deg, #D4AF37, #F5D060)',
              color: '#0A0A0F', transition: 'all .2s',
              boxShadow: loading ? 'none' : '0 4px 20px rgba(212,175,55,0.3)',
            }}>
              {loading ? 'Cargando...' : mode === 'login' ? 'Entrar al dashboard →' : 'Crear cuenta gratis — 14 días →'}
            </button>
          </form>

          {mode === 'register' && (
            <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '11px', color: '#4A4A5A' }}>
              ✓ Sin tarjeta de crédito · ✓ 14 días gratis · ✓ Cancelás cuando querés
            </p>
          )}
        </div>

        {/* Bottom tagline */}
        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '12px', color: '#2A2A3A' }}>
          El CRM hecho para dueñas de agencias de marketing
        </p>
      </div>
    </div>
  )
}

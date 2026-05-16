'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [agencyName, setAgencyName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset`,
      })
      if (error) { setError(error.message); setLoading(false); return }
      setSuccess('✓ Te enviamos un email para restablecer tu contraseña. Revisá tu bandeja.')
      setLoading(false)
      return
    }

    if (mode === 'register') {
      const { error } = await supabase.auth.signUp({
        email, password,
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

  const inputStyle = { width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', background: '#0A0A0F', color: '#FFFFFF', fontSize: '14px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as any }
  const labelStyle = { display: 'block', fontSize: '11px', fontWeight: '700' as any, marginBottom: '6px', color: '#6A6A7A', textTransform: 'uppercase' as any, letterSpacing: '0.8px' }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(212,175,55,0.12), transparent)' }} />
      <div style={{ width: '100%', maxWidth: '420px', position: 'relative' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '16px', marginBottom: '16px', background: 'linear-gradient(135deg, #D4AF37, #F5D060)', boxShadow: '0 0 32px rgba(212,175,55,0.3)' }}>
            <span style={{ fontSize: '24px', fontWeight: '800', color: '#0A0A0F' }}>C</span>
          </div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#FFFFFF', letterSpacing: '-0.5px' }}>
            Clara<span style={{ color: '#D4AF37' }}>System</span>
          </div>
          <div style={{ fontSize: '12px', color: '#4A4A5A', marginTop: '4px', letterSpacing: '1px', textTransform: 'uppercase' }}>
            by Negocio Delegable
          </div>
        </div>

        <div style={{ background: '#13131A', border: '1px solid rgba(212,175,55,0.15)', borderRadius: '20px', padding: '32px', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>

          {/* Tabs — solo login y register, no forgot */}
          {mode !== 'forgot' && (
            <div style={{ display: 'flex', background: '#0A0A0F', borderRadius: '10px', padding: '4px', marginBottom: '28px', border: '1px solid rgba(255,255,255,0.06)' }}>
              {(['login', 'register'] as const).map(m => (
                <button key={m} onClick={() => { setMode(m); setError(''); setSuccess('') }}
                  style={{ flex: 1, padding: '9px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', fontFamily: 'inherit', transition: 'all .2s', background: mode === m ? 'linear-gradient(135deg, #D4AF37, #F5D060)' : 'transparent', color: mode === m ? '#0A0A0F' : '#4A4A5A' }}>
                  {m === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
                </button>
              ))}
            </div>
          )}

          {mode === 'forgot' && (
            <div style={{ marginBottom: '24px' }}>
              <button onClick={() => { setMode('login'); setError(''); setSuccess('') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6A6A7A', fontSize: '13px', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
                ← Volver al login
              </button>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginTop: '12px', marginBottom: '4px' }}>Recuperar contraseña</h2>
              <p style={{ fontSize: '13px', color: '#6A6A7A', margin: 0 }}>Te enviamos un link para crear una nueva.</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {mode === 'register' && (
                <>
                  <div>
                    <label style={labelStyle}>Tu nombre</label>
                    <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Laura García" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Nombre de tu agencia</label>
                    <input type="text" value={agencyName} onChange={e => setAgencyName(e.target.value)} required placeholder="Studio Vela / MR Contenidos" style={inputStyle} />
                  </div>
                </>
              )}
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="vos@tuagencia.com" style={inputStyle} />
              </div>
              {mode !== 'forgot' && (
                <div>
                  <label style={labelStyle}>Contraseña</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" minLength={6} style={inputStyle} />
                </div>
              )}
            </div>

            {error && (
              <div style={{ marginTop: '14px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)', color: '#FCA5A5', fontSize: '13px' }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{ marginTop: '14px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.2)', color: '#6EE7B7', fontSize: '13px' }}>
                {success}
              </div>
            )}

            <button type="submit" disabled={loading} style={{ width: '100%', marginTop: '20px', padding: '13px', borderRadius: '10px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: '700', fontFamily: 'inherit', background: loading ? 'rgba(212,175,55,0.4)' : 'linear-gradient(135deg, #D4AF37, #F5D060)', color: '#0A0A0F', boxShadow: loading ? 'none' : '0 4px 20px rgba(212,175,55,0.3)' }}>
              {loading ? 'Cargando...' :
               mode === 'login' ? 'Entrar al dashboard →' :
               mode === 'register' ? 'Crear cuenta gratis — 14 días →' :
               'Enviar link de recuperación →'}
            </button>
          </form>

          {/* Forgot password link */}
          {mode === 'login' && (
            <button onClick={() => { setMode('forgot'); setError(''); setSuccess('') }}
              style={{ width: '100%', marginTop: '14px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#4A4A5A', fontFamily: 'inherit', textAlign: 'center' }}>
              ¿Olvidaste tu contraseña?
            </button>
          )}

          {mode === 'register' && (
            <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '11px', color: '#4A4A5A' }}>
              ✓ Sin tarjeta de crédito · ✓ 14 días gratis · ✓ Cancelás cuando querés
            </p>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '12px', color: '#2A2A3A' }}>
          El CRM hecho para dueñas de agencias de marketing
        </p>
      </div>
    </div>
  )
}

'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const ADMIN_EMAIL = 'mlaurafaricelli@gmail.com'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return }
    if (password.length < 6) { setError('Mínimo 6 caracteres'); return }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    setSuccess(true)
    // Verificar si es admin y redirigir accordingly
    const { data: { user } } = await supabase.auth.getUser()
    setTimeout(() => {
      if (user?.email === ADMIN_EMAIL) {
        router.push('/admin')
      } else {
        router.push('/dashboard')
      }
    }, 2000)
  }

  const inp = { width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', background: '#0A0A0F', color: '#FFFFFF', fontSize: '14px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' as any }
  const lbl = { display: 'block', fontSize: '11px', fontWeight: 700 as any, marginBottom: '6px', color: '#6A6A7A', textTransform: 'uppercase' as any, letterSpacing: '0.8px' }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(212,175,55,0.12), transparent)' }} />
      <div style={{ width: '100%', maxWidth: '400px', position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#fff' }}>
            Clara<span style={{ color: '#D4AF37' }}>System</span>
          </div>
        </div>
        <div style={{ background: '#13131A', border: '1px solid rgba(212,175,55,0.15)', borderRadius: '20px', padding: '32px', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
          {success ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>¡Contraseña actualizada!</h2>
              <p style={{ fontSize: '13px', color: '#6A6A7A' }}>Redirigiendo...</p>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>Nueva contraseña</h2>
              <p style={{ fontSize: '13px', color: '#6A6A7A', marginBottom: '24px' }}>Elegí una contraseña segura.</p>
              <form onSubmit={handleReset}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={lbl}>Nueva contraseña</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" minLength={6} style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Confirmar contraseña</label>
                    <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required placeholder="••••••••" style={inp} />
                  </div>
                </div>
                {error && (
                  <div style={{ marginTop: '14px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)', color: '#FCA5A5', fontSize: '13px' }}>
                    {error}
                  </div>
                )}
                <button type="submit" disabled={loading} style={{ width: '100%', marginTop: '20px', padding: '13px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 700, fontFamily: 'inherit', background: 'linear-gradient(135deg, #D4AF37, #F5D060)', color: '#0A0A0F', opacity: loading ? 0.6 : 1 }}>
                  {loading ? 'Guardando...' : 'Guardar contraseña →'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

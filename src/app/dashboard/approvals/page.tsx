'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'

const s = {
  page: { padding: '20px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'system-ui,sans-serif' },
  card: { background: '#fff', border: '1px solid #E2E0D8', borderRadius: '12px', overflow: 'hidden', marginBottom: '12px' },
  btn: { padding: '7px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'system-ui,sans-serif' },
  input: { width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #E2E0D8', fontSize: '13px', fontFamily: 'system-ui,sans-serif', outline: 'none', boxSizing: 'border-box' as any },
}

type Tab = 'pending'|'changes'|'approved'

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [tab, setTab] = useState<Tab>('pending')
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({ client_id: '', piece_name: '', piece_type: 'Post estático', file: null as File|null })
  const [toast, setToast] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [ap, cl] = await Promise.all([
      supabase.from('approvals').select('*, client:clients(name,avatar_color,email)').eq('agency_id', user.id).order('created_at', { ascending: false }),
      supabase.from('clients').select('*').eq('agency_id', user.id).eq('status','active').order('name'),
    ])
    setApprovals(ap.data || [])
    setClients(cl.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  async function upload() {
    if (!form.client_id || !form.piece_name) return
    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    let fileUrl = null, fileName = null
    if (form.file) {
      const path = `${user.id}/${Date.now()}.${form.file.name.split('.').pop()}`
      const { data: up } = await supabase.storage.from('pieces').upload(path, form.file)
      if (up) { const { data: url } = supabase.storage.from('pieces').getPublicUrl(path); fileUrl = url.publicUrl; fileName = form.file.name }
    }
    const { data: na } = await supabase.from('approvals').insert({ agency_id: user.id, client_id: form.client_id, piece_name: form.piece_name, piece_type: form.piece_type, file_url: fileUrl, file_name: fileName }).select('*, client:clients(name,avatar_color,email)').single()
    if (na) {
      const cl = clients.find(c => c.id === form.client_id)
      if (cl?.email) await fetch('/api/approvals/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientEmail: cl.email, clientName: cl.name, pieceName: form.piece_name, pieceType: form.piece_type, approvalToken: na.client_token }) })
      setApprovals(prev => [na, ...prev])
      setShowUpload(false)
      setForm({ client_id: '', piece_name: '', piece_type: 'Post estático', file: null })
      setTab('pending')
      showToast(`✓ Pieza subida${cl?.email ? ` — Email enviado a ${cl.email}` : ''}`)
    }
    setUploading(false)
  }

  async function approve(id: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const a = approvals.find(x => x.id === id)
    await supabase.from('approvals').update({ status: 'approved', updated_at: new Date().toISOString() }).eq('id', id)
    await supabase.from('agreements').insert({ agency_id: user.id, client_id: a.client_id, approval_id: id, piece_name: a.piece_name, action: 'approved', client_name: (a.client as any)?.name || 'Cliente', client_email: (a.client as any)?.email })
    setApprovals(prev => prev.map(x => x.id === id ? { ...x, status: 'approved' } : x))
    showToast('✓ Aprobado y registrado en Acuerdos')
  }

  async function reqChanges(id: string) {
    await supabase.from('approvals').update({ status: 'changes', updated_at: new Date().toISOString() }).eq('id', id)
    setApprovals(prev => prev.map(x => x.id === id ? { ...x, status: 'changes' } : x))
    showToast('Marcado para revisión')
  }

  function copyLink(token: string) {
    navigator.clipboard.writeText(`${window.location.origin}/portal/${token}`)
    showToast('✓ Link copiado')
  }

  const filtered = approvals.filter(a => tab === 'pending' ? a.status === 'pending' : tab === 'changes' ? a.status === 'changes' : ['approved','revised'].includes(a.status))
  const counts = { pending: approvals.filter(a => a.status === 'pending').length, changes: approvals.filter(a => a.status === 'changes').length, approved: approvals.filter(a => ['approved','revised'].includes(a.status)).length }

  return (
    <div style={s.page}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Portal de aprobaciones</h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>Sin intermediarias</p>
        </div>
        <button onClick={() => setShowUpload(true)} style={{ ...s.btn, background: '#E8623A', color: '#fff', padding: '9px 18px', fontSize: '13px' }}>
          ↑ Subir pieza
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #E2E0D8', marginBottom: '20px' }}>
        {(['pending','changes','approved'] as Tab[]).map((t, i) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 20px', border: 'none', borderBottom: `2px solid ${tab === t ? '#E8623A' : 'transparent'}`, background: 'transparent', cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'system-ui,sans-serif', color: tab === t ? '#E8623A' : '#64748B' }}>
            {['Esperando','Con cambios','Aprobadas'][i]} ({counts[t]})
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>Cargando...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94A3B8' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>📭</div>
          <div>Sin piezas en esta categoría</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '16px' }}>
          {filtered.map(a => {
            const cl = a.client as any
            const hours = Math.round((Date.now() - new Date(a.created_at).getTime()) / 3600000)
            return (
              <div key={a.id} style={s.card}>
                <div style={{ height: '80px', background: `${cl?.avatar_color || '#E8623A'}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>
                  {a.file_url && a.file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                    ? <img src={a.file_url} alt="" style={{ height: '100%', width: '100%', objectFit: 'cover' }} />
                    : '🖼️'}
                </div>
                <div style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: cl?.avatar_color || '#E8623A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                      {cl?.name?.[0] || '?'}
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>{cl?.name}</span>
                    <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '20px', ...(a.status === 'pending' ? { background: '#FEF3C7', color: '#92400E' } : a.status === 'approved' ? { background: '#D1FAE5', color: '#065F46' } : { background: '#FEE2E2', color: '#991B1B' }) }}>
                      {a.status === 'pending' ? `⏳ ${hours}h` : a.status === 'approved' ? '✓ OK' : '✎ Cambios'}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '3px' }}>{a.piece_name}</div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '8px' }}>{a.piece_type}</div>
                  {a.client_feedback && (
                    <div style={{ fontSize: '11px', background: '#FFFBEB', borderLeft: '2px solid #D97706', padding: '6px 8px', borderRadius: '4px', marginBottom: '8px', color: '#78350F' }}>
                      "{a.client_feedback}"
                    </div>
                  )}
                  {a.status === 'pending' && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => approve(a.id)} style={{ ...s.btn, flex: 1, background: '#D1FAE5', color: '#065F46' }}>✓ Aprobar</button>
                      <button onClick={() => reqChanges(a.id)} style={{ ...s.btn, flex: 1, background: '#FEE2E2', color: '#991B1B' }}>✎ Cambios</button>
                      <button onClick={() => copyLink(a.client_token)} style={{ ...s.btn, background: '#F1EFE8', color: '#475569' }}>🔗</button>
                    </div>
                  )}
                  {['approved','revised'].includes(a.status) && (
                    <div style={{ fontSize: '10px', color: '#94A3B8' }}>✓ Registrado en Acuerdos automáticamente</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Upload modal */}
      {showUpload && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>↑ Subir nueva pieza</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: '5px' }}>CLIENTE</label>
                <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} style={s.input}>
                  <option value="">Seleccioná un cliente</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: '5px' }}>NOMBRE DE LA PIEZA</label>
                <input value={form.piece_name} onChange={e => setForm(f => ({ ...f, piece_name: e.target.value }))} placeholder="Reel Mayo — Promo verano" style={s.input} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: '5px' }}>TIPO</label>
                <select value={form.piece_type} onChange={e => setForm(f => ({ ...f, piece_type: e.target.value }))} style={s.input}>
                  {['Post estático','Video Reel','Carrusel','Story','Email','Banner','Flyer'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: '5px' }}>ARCHIVO (opcional)</label>
                <div onClick={() => fileRef.current?.click()} style={{ border: '2px dashed #E2E0D8', borderRadius: '8px', padding: '16px', textAlign: 'center', cursor: 'pointer' }}>
                  {form.file ? <div style={{ fontSize: '13px', fontWeight: 600, color: '#0D9488' }}>✓ {form.file.name}</div> : <div style={{ fontSize: '12px', color: '#94A3B8' }}>Clic para seleccionar · JPG, PNG, PDF, MP4</div>}
                  <input ref={fileRef} type="file" style={{ display: 'none' }} accept="image/*,video/*,.pdf" onChange={e => setForm(f => ({ ...f, file: e.target.files?.[0] || null }))} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowUpload(false)} style={{ ...s.btn, flex: 1, background: '#F1F5F9', color: '#475569' }}>Cancelar</button>
              <button onClick={upload} disabled={uploading || !form.client_id || !form.piece_name} style={{ ...s.btn, flex: 1, background: '#E8623A', color: '#fff', opacity: uploading || !form.client_id || !form.piece_name ? 0.5 : 1 }}>
                {uploading ? 'Subiendo...' : 'Subir y notificar →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={{ position: 'fixed', bottom: '20px', right: '20px', background: '#1E293B', color: '#fff', padding: '12px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 500, borderLeft: '3px solid #14B8A6', zIndex: 99 }}>{toast}</div>}
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

const COLORS = ['#E8623A','#0D9488','#D97706','#2563EB','#7C3AED','#059669','#DC2626','#0891B2']
const SECTORS = ['Gastronomía','Diseño','Fitness','Real Estate','Salud','Educación','Moda','Tecnología','Retail','Otro']

const s = {
  page: { display: 'flex', height: 'calc(100vh - 53px)', fontFamily: 'system-ui,sans-serif' } as any,
  sidebar: { width: '220px', minWidth: '220px', background: '#fff', borderRight: '1px solid #E2E0D8', display: 'flex', flexDirection: 'column' as any },
  main: { flex: 1, overflowY: 'auto' as any, padding: '24px' },
  card: { background: '#fff', border: '1px solid #E2E0D8', borderRadius: '12px', padding: '20px' },
  label: { display: 'block', fontSize: '10px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' as any, letterSpacing: '0.8px', marginBottom: '5px' },
  value: { fontSize: '13px', color: '#0F172A', lineHeight: 1.6 },
  input: { width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #E2E0D8', fontSize: '13px', fontFamily: 'system-ui,sans-serif', outline: 'none', boxSizing: 'border-box' as any },
  btn: { padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'system-ui,sans-serif' },
}

export default function FichasPage() {
  const [clients, setClients] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<any>({})
  const [showNew, setShowNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const supabase = createClient()

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('clients').select('*').eq('agency_id', user.id).order('name')
    setClients(data || [])
    if (data && data.length > 0 && !selected) setSelected(data[0])
  }

  useEffect(() => { load() }, [])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  async function save() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (showNew) {
      const { data } = await supabase.from('clients').insert({ ...form, agency_id: user.id }).select().single()
      if (data) { setClients(prev => [...prev, data].sort((a,b) => a.name.localeCompare(b.name))); setSelected(data); showToast('✓ Cliente creado') }
      setShowNew(false)
    } else {
      const { data } = await supabase.from('clients').update(form).eq('id', selected.id).select().single()
      if (data) { setClients(prev => prev.map(c => c.id === data.id ? data : c)); setSelected(data); showToast('✓ Guardado') }
      setEditing(false)
    }
    setSaving(false)
  }

  async function del(id: string) {
    if (!confirm('¿Eliminar este cliente?')) return
    await supabase.from('clients').delete().eq('id', id)
    setClients(prev => prev.filter(c => c.id !== id))
    setSelected(null)
  }

  const isEdit = editing || showNew
  const data = isEdit ? form : selected

  return (
    <div style={s.page}>
      {/* Client list */}
      <div style={s.sidebar}>
        <div style={{ padding: '16px', borderBottom: '1px solid #E2E0D8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700 }}>Clientes</div>
            <div style={{ fontSize: '11px', color: '#94A3B8' }}>{clients.length} activos</div>
          </div>
          <button onClick={() => { setForm({ avatar_color: '#E8623A', status: 'active', contacts: [] }); setShowNew(true); setEditing(false) }}
            style={{ ...s.btn, background: '#E8623A', color: '#fff', padding: '6px 12px', fontSize: '12px' }}>
            + Nuevo
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {showNew && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '8px', background: 'rgba(232,98,58,0.08)', marginBottom: '4px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: form.avatar_color || '#E8623A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#fff' }}>+</div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#E8623A' }}>{form.name || 'Nuevo cliente'}</span>
            </div>
          )}
          {clients.map(c => (
            <div key={c.id} onClick={() => { setSelected(c); setEditing(false); setShowNew(false) }}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '8px', marginBottom: '2px', cursor: 'pointer', background: selected?.id === c.id && !showNew ? '#F1EFE8' : 'transparent' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: c.avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {c.name.split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: selected?.id === c.id ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                <div style={{ fontSize: '11px', color: '#94A3B8' }}>{c.sector || '—'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail */}
      <div style={s.main}>
        {!selected && !showNew ? (
          <div style={{ textAlign: 'center', paddingTop: '80px', color: '#94A3B8' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
            <div style={{ fontWeight: 600, marginBottom: '8px' }}>Sin clientes todavía</div>
            <button onClick={() => { setForm({ avatar_color: '#E8623A', status: 'active', contacts: [] }); setShowNew(true) }}
              style={{ ...s.btn, background: '#E8623A', color: '#fff' }}>+ Agregar cliente</button>
          </div>
        ) : (
          <div style={{ maxWidth: '680px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              {isEdit ? (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {COLORS.map(col => (
                    <div key={col} onClick={() => setForm((f: any) => ({ ...f, avatar_color: col }))}
                      style={{ width: '28px', height: '28px', borderRadius: '50%', background: col, cursor: 'pointer', outline: form.avatar_color === col ? '3px solid #0F172A' : 'none', outlineOffset: '2px' }} />
                  ))}
                </div>
              ) : (
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: selected?.avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700, color: '#fff' }}>
                  {selected?.name.split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase()}
                </div>
              )}
              <div style={{ flex: 1 }}>
                {isEdit ? (
                  <input value={form.name || ''} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))}
                    placeholder="Nombre del cliente"
                    style={{ ...s.input, fontSize: '18px', fontWeight: 700, borderColor: '#E8623A' }} />
                ) : (
                  <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>{selected?.name}</h1>
                )}
              </div>
              {!isEdit && selected && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => { setForm({ ...selected }); setEditing(true) }}
                    style={{ ...s.btn, background: '#F1EFE8', color: '#475569' }}>✏️ Editar</button>
                  <button onClick={() => del(selected.id)}
                    style={{ ...s.btn, background: '#FEE2E2', color: '#991B1B' }}>🗑</button>
                </div>
              )}
              {isEdit && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => { setEditing(false); setShowNew(false) }}
                    style={{ ...s.btn, background: '#F1F5F9', color: '#475569' }}>Cancelar</button>
                  <button onClick={save} disabled={saving}
                    style={{ ...s.btn, background: '#E8623A', color: '#fff', opacity: saving ? 0.6 : 1 }}>
                    {saving ? 'Guardando...' : '💾 Guardar'}
                  </button>
                </div>
              )}
            </div>

            {/* Fields */}
            <div style={{ ...s.card, marginBottom: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                {[
                  { label: 'Sector', key: 'sector', type: 'select', opts: SECTORS },
                  { label: 'Email del cliente', key: 'email', type: 'email' },
                  { label: 'Teléfono', key: 'phone', type: 'tel' },
                  { label: 'Vencimiento contrato', key: 'contract_ends_at', type: 'date' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={s.label}>{f.label}</label>
                    {isEdit ? (
                      f.type === 'select' ? (
                        <select value={form[f.key] || ''} onChange={e => setForm((fm: any) => ({ ...fm, [f.key]: e.target.value }))} style={s.input}>
                          <option value="">Seleccioná</option>
                          {f.opts?.map(o => <option key={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input type={f.type} value={form[f.key] || ''} onChange={e => setForm((fm: any) => ({ ...fm, [f.key]: e.target.value }))} style={s.input} />
                      )
                    ) : (
                      <div style={s.value}>{data?.[f.key] || '—'}</div>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ height: '1px', background: '#E2E0D8', margin: '16px 0' }} />

              <div style={{ fontSize: '11px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>Brief de marca</div>

              {[
                { label: 'Tono de comunicación', key: 'tone' },
                { label: '✓ Lo que SÍ le gusta', key: 'likes' },
                { label: '✗ Lo que NO le gusta', key: 'dislikes' },
                { label: 'Fechas clave', key: 'key_dates' },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: '14px' }}>
                  <label style={s.label}>{f.label}</label>
                  {isEdit ? (
                    <textarea value={form[f.key] || ''} onChange={e => setForm((fm: any) => ({ ...fm, [f.key]: e.target.value }))}
                      rows={2} style={{ ...s.input, resize: 'none' }} />
                  ) : (
                    <div style={s.value}>{data?.[f.key] || '—'}</div>
                  )}
                </div>
              ))}

              {/* Contacts */}
              <div>
                <label style={s.label}>Contactos</label>
                {(isEdit ? form.contacts : selected?.contacts || [])?.map((ct: any, i: number) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '8px', padding: '8px', background: '#F8F7F4', borderRadius: '8px', marginBottom: '6px', alignItems: 'center' }}>
                    {isEdit ? (
                      <>
                        {['name','role','email'].map(k => (
                          <input key={k} value={ct[k] || ''} placeholder={k === 'name' ? 'Nombre' : k === 'role' ? 'Rol' : 'Email'}
                            onChange={e => { const c = [...(form.contacts||[])]; c[i] = {...c[i], [k]: e.target.value}; setForm((f: any) => ({...f, contacts: c})) }}
                            style={{ ...s.input, fontSize: '12px' }} />
                        ))}
                        <button onClick={() => { const c = [...(form.contacts||[])]; c.splice(i,1); setForm((f: any) => ({...f, contacts: c})) }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '16px' }}>×</button>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: '12px', fontWeight: 600 }}>{ct.name}</span>
                        <span style={{ fontSize: '12px', color: '#64748B' }}>{ct.role}</span>
                        <span style={{ fontSize: '12px', color: '#0D9488' }}>{ct.email}</span>
                        <span />
                      </>
                    )}
                  </div>
                ))}
                {isEdit && (
                  <button onClick={() => setForm((f: any) => ({ ...f, contacts: [...(f.contacts||[]), { name:'', role:'', email:'' }] }))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: '#E8623A' }}>
                    + Agregar contacto
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: '20px', right: '20px', background: '#1E293B', color: '#fff', padding: '12px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 500, borderLeft: '3px solid #14B8A6', zIndex: 99 }}>
          {toast}
        </div>
      )}
    </div>
  )
}

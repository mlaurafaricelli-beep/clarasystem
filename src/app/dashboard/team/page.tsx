'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

const COLORS = ['#E8623A','#0D9488','#D97706','#2563EB','#7C3AED','#059669']
const s = {
  page: { padding: '20px', maxWidth: '960px', margin: '0 auto', fontFamily: 'system-ui,sans-serif' },
  card: { background: '#fff', border: '1px solid #E2E0D8', borderRadius: '12px', padding: '16px' },
  btn: { padding: '7px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'system-ui,sans-serif' },
  input: { width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #E2E0D8', fontSize: '13px', fontFamily: 'system-ui,sans-serif', outline: 'none', boxSizing: 'border-box' as any },
  modal: { position: 'fixed' as any, inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' },
}

export default function TeamPage() {
  const [members, setMembers] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [showTask, setShowTask] = useState<string|null>(null)
  const [form, setForm] = useState({ full_name: '', email: '', role: 'member', avatar_color: '#E8623A' })
  const [taskForm, setTaskForm] = useState({ title: '', client_id: '', due_date: '', priority: 'normal' })
  const [toast, setToast] = useState('')
  const supabase = createClient()

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [m, t, c] = await Promise.all([
      supabase.from('team_members').select('*').eq('agency_id', user.id).order('full_name'),
      supabase.from('tasks').select('*, client:clients(name), assignee:team_members(full_name)').eq('agency_id', user.id).order('due_date'),
      supabase.from('clients').select('id,name').eq('agency_id', user.id).eq('status','active').order('name'),
    ])
    setMembers(m.data || [])
    setTasks(t.data || [])
    setClients(c.data || [])
  }

  useEffect(() => { load() }, [])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  async function addMember() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('team_members').insert({ ...form, agency_id: user.id })
    setShowAdd(false)
    setForm({ full_name: '', email: '', role: 'member', avatar_color: '#E8623A' })
    load(); showToast('✓ Integrante agregado')
  }

  async function assignTask(memberId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !taskForm.title) return
    await supabase.from('tasks').insert({ ...taskForm, agency_id: user.id, assigned_to: memberId, status: 'pending', client_id: taskForm.client_id || null, due_date: taskForm.due_date || null })
    setShowTask(null)
    setTaskForm({ title: '', client_id: '', due_date: '', priority: 'normal' })
    load(); showToast('✓ Tarea asignada')
  }

  async function toggleTask(taskId: string, current: string) {
    const next = current === 'done' ? 'pending' : current === 'pending' ? 'in_progress' : 'done'
    await supabase.from('tasks').update({ status: next, updated_at: new Date().toISOString() }).eq('id', taskId)
    load()
  }

  async function removeMember(id: string) {
    if (!confirm('¿Eliminar este integrante?')) return
    await supabase.from('team_members').delete().eq('id', id)
    load()
  }

  return (
    <div style={s.page}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Mi equipo</h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>Asignaciones y rendimiento</p>
        </div>
        <button onClick={() => setShowAdd(true)} style={{ ...s.btn, background: '#E8623A', color: '#fff', padding: '9px 18px', fontSize: '13px' }}>
          + Agregar integrante
        </button>
      </div>

      {members.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px', color: '#94A3B8' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>👥</div>
          <div style={{ fontWeight: 600, marginBottom: '8px' }}>Todavía no agregaste tu equipo</div>
          <button onClick={() => setShowAdd(true)} style={{ ...s.btn, background: '#E8623A', color: '#fff', padding: '10px 20px' }}>Agregar primer integrante</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '16px' }}>
          {members.map(m => {
            const mt = tasks.filter(t => t.assigned_to === m.id)
            const done = mt.filter(t => t.status === 'done').length
            const late = mt.filter(t => t.status !== 'done' && t.due_date && t.due_date < new Date().toISOString().split('T')[0]).length
            const pct = mt.length ? Math.round(done/mt.length*100) : 0
            return (
              <div key={m.id} style={s.card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: m.avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {m.full_name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600 }}>{m.full_name}</div>
                    <div style={{ fontSize: '11px', color: '#94A3B8' }}>{m.email}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: 700 }}>{done}<span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 400 }}>/{mt.length}</span></div>
                    <div style={{ fontSize: '10px', color: '#94A3B8' }}>tareas</div>
                  </div>
                  <button onClick={() => removeMember(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CBD5E1', fontSize: '16px' }}>×</button>
                </div>

                <div style={{ height: '6px', borderRadius: '3px', background: '#F1EFE8', marginBottom: '12px' }}>
                  <div style={{ height: '100%', borderRadius: '3px', width: `${pct}%`, background: late > 0 ? '#D97706' : '#0D9488', transition: 'width .3s' }} />
                </div>

                <div style={{ marginBottom: '10px', maxHeight: '140px', overflowY: 'auto' }}>
                  {mt.length === 0 ? (
                    <div style={{ fontSize: '12px', color: '#94A3B8', textAlign: 'center', padding: '8px' }}>Sin tareas asignadas</div>
                  ) : mt.slice(0,5).map(t => {
                    const isLate = t.status !== 'done' && t.due_date && t.due_date < new Date().toISOString().split('T')[0]
                    const icon = t.status === 'done' ? '✓' : t.status === 'in_progress' ? '⟳' : '○'
                    return (
                      <div key={t.id} onClick={() => toggleTask(t.id, t.status)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 0', borderBottom: '1px solid #F1EFE8', cursor: 'pointer' }}>
                        <span style={{ color: t.status === 'done' ? '#059669' : isLate ? '#DC2626' : '#94A3B8', fontSize: '12px', flexShrink: 0 }}>{icon}</span>
                        <span style={{ flex: 1, fontSize: '12px', textDecoration: t.status === 'done' ? 'line-through' : 'none', color: t.status === 'done' ? '#94A3B8' : '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                        {(t.client as any)?.name && <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '10px', background: '#F1EFE8', color: '#64748B', flexShrink: 0 }}>{(t.client as any).name}</span>}
                        {isLate && <span style={{ fontSize: '10px', fontWeight: 700, color: '#DC2626', flexShrink: 0 }}>tarde</span>}
                      </div>
                    )
                  })}
                </div>

                <button onClick={() => setShowTask(m.id)} style={{ ...s.btn, width: '100%', background: '#F1EFE8', color: '#475569' }}>+ Asignar tarea</button>

                {showTask === m.id && (
                  <div style={{ marginTop: '10px', padding: '12px', background: '#F8F7F4', borderRadius: '8px' }}>
                    <input value={taskForm.title} onChange={e => setTaskForm(f => ({...f, title: e.target.value}))} placeholder="Nombre de la tarea" style={{ ...s.input, marginBottom: '8px', fontSize: '12px' }} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                      <select value={taskForm.client_id} onChange={e => setTaskForm(f => ({...f, client_id: e.target.value}))} style={{ ...s.input, fontSize: '12px' }}>
                        <option value="">Sin cliente</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <input type="date" value={taskForm.due_date} onChange={e => setTaskForm(f => ({...f, due_date: e.target.value}))} style={{ ...s.input, fontSize: '12px' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => setShowTask(null)} style={{ ...s.btn, flex: 1, background: '#fff', border: '1px solid #E2E0D8', color: '#475569' }}>Cancelar</button>
                      <button onClick={() => assignTask(m.id)} style={{ ...s.btn, flex: 1, background: '#E8623A', color: '#fff' }}>Asignar</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showAdd && (
        <div style={s.modal}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '380px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>Agregar integrante</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: '5px' }}>NOMBRE COMPLETO</label>
                <input value={form.full_name} onChange={e => setForm(f => ({...f, full_name: e.target.value}))} placeholder="Sofía Ruiz" style={s.input} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: '5px' }}>EMAIL</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="sofia@tuagencia.com" style={s.input} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: '5px' }}>ROL</label>
                <select value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))} style={s.input}>
                  <option value="member">Miembro</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: '8px' }}>COLOR</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {COLORS.map(col => (
                    <div key={col} onClick={() => setForm(f => ({...f, avatar_color: col}))} style={{ width: '28px', height: '28px', borderRadius: '50%', background: col, cursor: 'pointer', outline: form.avatar_color === col ? '3px solid #0F172A' : 'none', outlineOffset: '2px' }} />
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowAdd(false)} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #E2E0D8', background: '#fff', cursor: 'pointer', fontSize: '13px', fontFamily: 'system-ui,sans-serif' }}>Cancelar</button>
              <button onClick={addMember} disabled={!form.full_name || !form.email} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#E8623A', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: 'system-ui,sans-serif', opacity: !form.full_name || !form.email ? 0.5 : 1 }}>Agregar</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={{ position: 'fixed', bottom: '20px', right: '20px', background: '#1E293B', color: '#fff', padding: '12px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 500, borderLeft: '3px solid #14B8A6', zIndex: 99 }}>{toast}</div>}
    </div>
  )
}

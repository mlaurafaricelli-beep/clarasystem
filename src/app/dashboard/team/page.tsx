'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

const COLORS = ['#E8623A','#0D9488','#D97706','#2563EB','#7C3AED','#059669']

const s = {
  page: { padding: '20px', maxWidth: '960px', margin: '0 auto', fontFamily: 'system-ui,sans-serif' },
  card: { background: '#fff', border: '1px solid #E2E0D8', borderRadius: '12px', padding: '16px' },
  btn: { padding: '7px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'system-ui,sans-serif' } as any,
  input: { width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #E2E0D8', fontSize: '13px', fontFamily: 'system-ui,sans-serif', outline: 'none', boxSizing: 'border-box' as any },
}

export default function TeamPage() {
  const [members, setMembers] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showTask, setShowTask] = useState<string|null>(null)
  const [form, setForm] = useState({ full_name: '', email: '', role: '', avatar_color: '#E8623A' })
  const [taskForm, setTaskForm] = useState({ title: '', client_id: '', due_date: '', priority: 'normal', description: '' })
  const [toast, setToast] = useState('')
  const supabase = createClient()

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [m, t, c, p] = await Promise.all([
      supabase.from('team_members').select('*').eq('agency_id', user.id).order('full_name'),
      supabase.from('tasks').select('*, client:clients(name), assignee:team_members(full_name,email)').eq('agency_id', user.id).order('created_at', { ascending: false }),
      supabase.from('clients').select('id,name').eq('agency_id', user.id).eq('status','active').order('name'),
      supabase.from('profiles').select('agency_name').eq('id', user.id).single(),
    ])

    setMembers(m.data || [])
    setTasks(t.data || [])
    setClients(c.data || [])
    setProfile(p.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  async function addMember() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !form.full_name || !form.email) return
    const { error } = await supabase.from('team_members').insert({
      full_name: form.full_name,
      email: form.email,
      role: form.role,
      avatar_color: form.avatar_color,
      agency_id: user.id,
    })
    if (error) { showToast('Error: ' + error.message); return }
    setShowAdd(false)
    setForm({ full_name: '', email: '', role: '', avatar_color: '#E8623A' })
    await load()
    showToast('✓ Integrante agregado')
  }

  async function assignTask(memberId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !taskForm.title) return
    await supabase.from('tasks').insert({
      title: taskForm.title,
      description: taskForm.description,
      client_id: taskForm.client_id || null,
      due_date: taskForm.due_date || null,
      priority: taskForm.priority,
      agency_id: user.id,
      assigned_to: memberId,
      status: 'pending',
    })
    const member = members.find(m => m.id === memberId)
    const client = clients.find(c => c.id === taskForm.client_id)
    if (member?.email) {
      await fetch('/api/tasks/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberEmail: member.email,
          memberName: member.full_name,
          taskTitle: taskForm.title,
          clientName: client?.name || null,
          dueDate: taskForm.due_date || null,
          agencyName: profile?.agency_name || 'Tu agencia',
        }),
      })
    }
    setShowTask(null)
    setTaskForm({ title: '', client_id: '', due_date: '', priority: 'normal', description: '' })
    await load()
    showToast(`✓ Tarea asignada${member?.email ? ' — Email enviado' : ''}`)
  }

  async function toggleTask(taskId: string, current: string) {
    const next = current === 'done' ? 'pending' : current === 'pending' ? 'in_progress' : 'done'
    await supabase.from('tasks').update({ status: next }).eq('id', taskId)
    await load()
  }

  async function deleteTask(taskId: string) {
    await supabase.from('tasks').delete().eq('id', taskId)
    await load()
  }

  async function removeMember(id: string) {
    if (!confirm('¿Eliminar este integrante?')) return
    await supabase.from('team_members').delete().eq('id', id)
    await load()
  }

  if (loading) return (
    <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8', fontFamily: 'system-ui,sans-serif' }}>
      Cargando equipo...
    </div>
  )

  return (
    <div style={s.page}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Mi equipo</h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
            {members.length} integrante{members.length !== 1 ? 's' : ''} · Notificaciones automáticas por email
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} style={{ ...s.btn, background: '#E8623A', color: '#fff', padding: '9px 18px', fontSize: '13px' }}>
          + Agregar integrante
        </button>
      </div>

      {members.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#94A3B8' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
          <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '8px', color: '#475569' }}>Todavía no agregaste tu equipo</div>
          <div style={{ fontSize: '13px', marginBottom: '24px' }}>Agregá cada integrante y empezá a asignar tareas</div>
          <button onClick={() => setShowAdd(true)} style={{ ...s.btn, background: '#E8623A', color: '#fff', padding: '10px 24px', fontSize: '14px' }}>
            Agregar primer integrante
          </button>
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
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: m.avatar_color || '#E8623A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {m.full_name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600 }}>{m.full_name}</div>
                    <div style={{ fontSize: '11px', color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.role || 'Sin rol'} · {m.email}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '16px', fontWeight: 700 }}>{done}<span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 400 }}>/{mt.length}</span></div>
                    <div style={{ fontSize: '9px', color: '#94A3B8' }}>tareas</div>
                  </div>
                  <button onClick={() => removeMember(m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CBD5E1', fontSize: '18px', flexShrink: 0, padding: 0, lineHeight: 1 }}>×</button>
                </div>

                <div style={{ height: '5px', borderRadius: '3px', background: '#F1EFE8', marginBottom: '10px' }}>
                  <div style={{ height: '100%', borderRadius: '3px', width: `${pct}%`, background: late > 0 ? '#D97706' : '#0D9488', transition: 'width .3s' }} />
                </div>

                <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                  {[
                    { label: 'Pendientes', value: mt.filter(t=>t.status==='pending').length, color: '#64748B' },
                    { label: 'En proceso', value: mt.filter(t=>t.status==='in_progress').length, color: '#D97706' },
                    { label: 'Tarde', value: late, color: '#DC2626' },
                    { label: 'Listas', value: done, color: '#059669' },
                  ].map(stat => (
                    <div key={stat.label} style={{ flex: 1, textAlign: 'center', padding: '5px 2px', background: '#F8F7F4', borderRadius: '6px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: stat.color }}>{stat.value}</div>
                      <div style={{ fontSize: '9px', color: '#94A3B8' }}>{stat.label}</div>
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: '10px', maxHeight: '150px', overflowY: 'auto' }}>
                  {mt.length === 0 ? (
                    <div style={{ fontSize: '12px', color: '#94A3B8', textAlign: 'center', padding: '10px' }}>Sin tareas asignadas</div>
                  ) : mt.map(t => {
                    const isLate = t.status !== 'done' && t.due_date && t.due_date < new Date().toISOString().split('T')[0]
                    return (
                      <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 0', borderBottom: '1px solid #F8F7F4' }}>
                        <button onClick={() => toggleTask(t.id, t.status)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', flexShrink: 0, padding: 0, color: t.status==='done'?'#059669':isLate?'#DC2626':'#94A3B8' }}>
                          {t.status==='done'?'✓':t.status==='in_progress'?'⟳':'○'}
                        </button>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '12px', textDecoration: t.status==='done'?'line-through':'none', color: t.status==='done'?'#94A3B8':'#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                          {(t.client as any)?.name && <div style={{ fontSize: '10px', color: '#94A3B8' }}>{(t.client as any).name}</div>}
                        </div>
                        {t.due_date && <div style={{ fontSize: '10px', color: isLate?'#DC2626':'#94A3B8', flexShrink: 0 }}>{new Date(t.due_date).toLocaleDateString('es-AR',{day:'numeric',month:'short'})}</div>}
                        <button onClick={() => deleteTask(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#E2E0D8', fontSize: '14px', flexShrink: 0, padding: 0 }}>×</button>
                      </div>
                    )
                  })}
                </div>

                <button onClick={() => { setShowTask(m.id); setTaskForm({ title:'', client_id:'', due_date:'', priority:'normal', description:'' }) }}
                  style={{ ...s.btn, width: '100%', background: '#F1EFE8', color: '#475569' }}>
                  + Asignar tarea {m.email ? '· notifica por email' : ''}
                </button>

                {showTask === m.id && (
                  <div style={{ marginTop: '10px', padding: '14px', background: '#F8F7F4', borderRadius: '10px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '10px' }}>Nueva tarea para {m.full_name}</div>
                    <input value={taskForm.title} onChange={e => setTaskForm(f=>({...f,title:e.target.value}))} placeholder="Nombre de la tarea *" style={{ ...s.input, marginBottom: '8px', fontSize: '12px' }} />
                    <textarea value={taskForm.description} onChange={e => setTaskForm(f=>({...f,description:e.target.value}))} placeholder="Descripción (opcional)" rows={2} style={{ ...s.input, resize:'none', marginBottom:'8px', fontSize:'12px' }} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                      <select value={taskForm.client_id} onChange={e => setTaskForm(f=>({...f,client_id:e.target.value}))} style={{ ...s.input, fontSize:'12px' }}>
                        <option value="">Sin cliente</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <input type="date" value={taskForm.due_date} onChange={e => setTaskForm(f=>({...f,due_date:e.target.value}))} style={{ ...s.input, fontSize:'12px' }} />
                    </div>
                    <select value={taskForm.priority} onChange={e => setTaskForm(f=>({...f,priority:e.target.value}))} style={{ ...s.input, fontSize:'12px', marginBottom:'10px' }}>
                      <option value="low">Prioridad baja</option>
                      <option value="normal">Prioridad normal</option>
                      <option value="high">Prioridad alta</option>
                      <option value="urgent">🔴 Urgente</option>
                    </select>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => setShowTask(null)} style={{ flex:1, padding:'8px', borderRadius:'8px', border:'1px solid #E2E0D8', background:'#fff', cursor:'pointer', fontSize:'12px', fontFamily:'system-ui,sans-serif' }}>Cancelar</button>
                      <button onClick={() => assignTask(m.id)} disabled={!taskForm.title} style={{ flex:1, padding:'8px', borderRadius:'8px', border:'none', background:'#E8623A', color:'#fff', cursor:'pointer', fontSize:'12px', fontWeight:600, fontFamily:'system-ui,sans-serif', opacity:!taskForm.title?0.5:1 }}>
                        Asignar y notificar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showAdd && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50, padding:'16px' }}>
          <div style={{ background:'#fff', borderRadius:'16px', padding:'24px', width:'100%', maxWidth:'400px' }}>
            <h2 style={{ fontSize:'18px', fontWeight:700, marginBottom:'20px' }}>Agregar integrante</h2>
            <div style={{ display:'flex', flexDirection:'column', gap:'12px', marginBottom:'20px' }}>
              <div>
                <label style={{ display:'block', fontSize:'11px', fontWeight:700, color:'#64748B', marginBottom:'5px' }}>NOMBRE COMPLETO *</label>
                <input value={form.full_name} onChange={e => setForm(f=>({...f,full_name:e.target.value}))} placeholder="Sofía Ruiz" style={s.input} />
              </div>
              <div>
                <label style={{ display:'block', fontSize:'11px', fontWeight:700, color:'#64748B', marginBottom:'5px' }}>EMAIL *</label>
                <input type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} placeholder="sofia@tuagencia.com" style={s.input} />
              </div>
              <div>
                <label style={{ display:'block', fontSize:'11px', fontWeight:700, color:'#64748B', marginBottom:'5px' }}>ROL</label>
                <input value={form.role} onChange={e => setForm(f=>({...f,role:e.target.value}))} placeholder="Diseñadora / Redactora / Community Manager..." style={s.input} />
              </div>
              <div>
                <label style={{ display:'block', fontSize:'11px', fontWeight:700, color:'#64748B', marginBottom:'8px' }}>COLOR</label>
                <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                  {COLORS.map(col => (
                    <div key={col} onClick={() => setForm(f=>({...f,avatar_color:col}))}
                      style={{ width:'28px', height:'28px', borderRadius:'50%', background:col, cursor:'pointer', outline:form.avatar_color===col?'3px solid #0F172A':'none', outlineOffset:'2px' }} />
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={() => setShowAdd(false)} style={{ flex:1, padding:'10px', borderRadius:'8px', border:'1px solid #E2E0D8', background:'#fff', cursor:'pointer', fontSize:'13px', fontFamily:'system-ui,sans-serif' }}>Cancelar</button>
              <button onClick={addMember} disabled={!form.full_name || !form.email} style={{ flex:1, padding:'10px', borderRadius:'8px', border:'none', background:'#E8623A', color:'#fff', cursor:'pointer', fontSize:'13px', fontWeight:600, fontFamily:'system-ui,sans-serif', opacity:!form.full_name||!form.email?0.5:1 }}>
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={{ position:'fixed', bottom:'20px', right:'20px', background:'#1E293B', color:'#fff', padding:'12px 16px', borderRadius:'10px', fontSize:'13px', fontWeight:500, borderLeft:'3px solid #14B8A6', zIndex:99, maxWidth:'320px' }}>{toast}</div>}
    </div>
  )
}

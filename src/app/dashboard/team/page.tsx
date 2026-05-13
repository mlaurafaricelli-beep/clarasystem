'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { TeamMember, Task, Client } from '@/types'
import { Plus, Trash2, CheckCircle, Clock, AlertTriangle } from 'lucide-react'

const COLORS = ['#E8623A','#0D9488','#D97706','#2563EB','#7C3AED','#059669']

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [showTask, setShowTask] = useState<string | null>(null)
  const [form, setForm] = useState({ full_name: '', email: '', role: 'member' as 'admin' | 'member', avatar_color: '#E8623A' })
  const [taskForm, setTaskForm] = useState({ title: '', client_id: '', due_date: '', priority: 'normal' })
  const [toast, setToast] = useState('')
  const supabase = createClient()

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [m, t, c] = await Promise.all([
      supabase.from('team_members').select('*').eq('agency_id', user.id).order('full_name'),
      supabase.from('tasks').select('*, client:clients(name), assignee:team_members(full_name)').eq('agency_id', user.id).order('due_date'),
      supabase.from('clients').select('id,name').eq('agency_id', user.id).eq('status', 'active').order('name'),
    ])
    setMembers(m.data || [])
    setTasks(t.data || [])
    setClients((c.data as any) || [])
  }

  useEffect(() => { load() }, [])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  async function addMember() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('team_members').insert({ ...form, agency_id: user.id })
    setShowAdd(false)
    setForm({ full_name: '', email: '', role: 'member', avatar_color: '#E8623A' })
    load()
    showToast('✓ Integrante agregado')
  }

  async function assignTask(memberId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !taskForm.title) return
    await supabase.from('tasks').insert({
      ...taskForm, agency_id: user.id, assigned_to: memberId, status: 'pending',
      client_id: taskForm.client_id || null, due_date: taskForm.due_date || null,
    })
    setShowTask(null)
    setTaskForm({ title: '', client_id: '', due_date: '', priority: 'normal' })
    load()
    showToast('✓ Tarea asignada')
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

  const statusIcon = { pending: Clock, in_progress: AlertTriangle, done: CheckCircle, cancelled: CheckCircle }
  const statusColor = { pending: 'var(--text3)', in_progress: 'var(--amber)', done: 'var(--green)', cancelled: 'var(--text3)' }

  return (
    <div className="p-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold">Mi equipo</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text2)' }}>Asignaciones, tareas y rendimiento mensual</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold"
          style={{ background: 'var(--coral)' }}>
          <Plus size={15} /> Agregar integrante
        </button>
      </div>

      {members.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-3">👥</div>
          <div className="font-semibold mb-1">Todavía no agregaste tu equipo</div>
          <div className="text-sm mb-4" style={{ color: 'var(--text2)' }}>Agregá cada integrante y empezá a asignar tareas</div>
          <button onClick={() => setShowAdd(true)}
            className="px-4 py-2 rounded-xl text-white text-sm font-semibold"
            style={{ background: 'var(--coral)' }}>
            Agregar primer integrante
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {members.map(m => {
            const memberTasks = tasks.filter(t => t.assigned_to === m.id)
            const done = memberTasks.filter(t => t.status === 'done').length
            const late = memberTasks.filter(t => t.status !== 'done' && t.due_date && t.due_date < new Date().toISOString().split('T')[0]).length
            const pct = memberTasks.length ? Math.round(done / memberTasks.length * 100) : 0

            return (
              <div key={m.id} className="bg-white rounded-xl border p-4" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                    style={{ background: m.avatar_color }}>
                    {m.full_name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{m.full_name}</div>
                    <div className="text-xs" style={{ color: 'var(--text2)' }}>{m.email} · {m.role === 'admin' ? 'Admin' : 'Miembro'}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">{done}<span className="text-xs font-normal" style={{ color: 'var(--text2)' }}>/{memberTasks.length}</span></div>
                    <div className="text-xs" style={{ color: 'var(--text2)' }}>tareas</div>
                  </div>
                  <button onClick={() => removeMember(m.id)} className="p-1 rounded" style={{ color: 'var(--text3)' }}>
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Progress */}
                <div className="h-1.5 rounded-full mb-3" style={{ background: 'var(--bg3)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: late > 0 ? 'var(--amber)' : 'var(--teal)' }} />
                </div>

                {/* Tasks */}
                <div className="space-y-1 mb-3 max-h-36 overflow-y-auto">
                  {memberTasks.length === 0 ? (
                    <div className="text-xs text-center py-2" style={{ color: 'var(--text3)' }}>Sin tareas asignadas</div>
                  ) : memberTasks.slice(0, 6).map(t => {
                    const Icon = statusIcon[t.status] || Clock
                    const isLate = t.status !== 'done' && t.due_date && t.due_date < new Date().toISOString().split('T')[0]
                    return (
                      <div key={t.id} className="flex items-center gap-2 py-1 cursor-pointer" onClick={() => toggleTask(t.id, t.status)}>
                        <Icon size={13} style={{ color: isLate ? 'var(--red)' : statusColor[t.status], flexShrink: 0 }} />
                        <span className="flex-1 text-xs truncate" style={{ textDecoration: t.status === 'done' ? 'line-through' : 'none', color: t.status === 'done' ? 'var(--text3)' : 'var(--text)' }}>{t.title}</span>
                        {(t.client as any)?.name && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg3)', color: 'var(--text2)' }}>{(t.client as any).name}</span>}
                        {isLate && <span className="text-xs font-bold" style={{ color: 'var(--red)' }}>Tarde</span>}
                      </div>
                    )
                  })}
                </div>

                <button onClick={() => setShowTask(m.id)}
                  className="w-full py-1.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1"
                  style={{ borderColor: 'var(--border)', color: 'var(--text2)' }}>
                  <Plus size={12} /> Asignar tarea
                </button>

                {/* Task form inline */}
                {showTask === m.id && (
                  <div className="mt-3 p-3 rounded-lg space-y-2" style={{ background: 'var(--bg3)' }}>
                    <input value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
                      placeholder="Nombre de la tarea"
                      className="w-full px-2.5 py-1.5 rounded-lg border text-xs" style={{ borderColor: 'var(--border)', background: 'white' }} />
                    <div className="grid grid-cols-2 gap-2">
                      <select value={taskForm.client_id} onChange={e => setTaskForm(f => ({ ...f, client_id: e.target.value }))}
                        className="px-2.5 py-1.5 rounded-lg border text-xs" style={{ borderColor: 'var(--border)', background: 'white' }}>
                        <option value="">Sin cliente</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <input type="date" value={taskForm.due_date} onChange={e => setTaskForm(f => ({ ...f, due_date: e.target.value }))}
                        className="px-2.5 py-1.5 rounded-lg border text-xs" style={{ borderColor: 'var(--border)', background: 'white' }} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setShowTask(null)} className="flex-1 py-1.5 rounded-lg text-xs border" style={{ borderColor: 'var(--border)' }}>Cancelar</button>
                      <button onClick={() => assignTask(m.id)} className="flex-1 py-1.5 rounded-lg text-xs text-white font-semibold" style={{ background: 'var(--coral)' }}>Asignar</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add member modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.6)' }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm border" style={{ borderColor: 'var(--border)' }}>
            <h2 className="font-bold text-lg mb-4">Agregar integrante</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text2)' }}>Nombre completo</label>
                <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  placeholder="Sofía Ruiz"
                  className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text2)' }}>Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="sofia@tuagencia.com"
                  className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text2)' }}>Rol</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as any }))}
                  className="w-full px-3 py-2 rounded-lg border text-sm" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                  <option value="member">Miembro</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text2)' }}>Color</label>
                <div className="flex gap-2">
                  {COLORS.map(col => (
                    <div key={col} onClick={() => setForm(f => ({ ...f, avatar_color: col }))}
                      className="w-7 h-7 rounded-full cursor-pointer"
                      style={{ background: col, outline: form.avatar_color === col ? '3px solid var(--navy)' : 'none', outlineOffset: '2px' }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 rounded-xl border text-sm" style={{ borderColor: 'var(--border)' }}>Cancelar</button>
              <button onClick={addMember} disabled={!form.full_name || !form.email}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
                style={{ background: 'var(--coral)' }}>
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 px-4 py-3 rounded-xl text-white text-sm font-medium border-l-4 z-50"
          style={{ background: 'var(--navy2)', borderColor: 'var(--teal)' }}>
          {toast}
        </div>
      )}
    </div>
  )
}

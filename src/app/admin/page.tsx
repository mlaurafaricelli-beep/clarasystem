'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Users, TrendingUp, Clock, DollarSign, CheckCircle, XCircle, Edit3, Search, LogOut, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const ADMIN_EMAIL = 'mlaurafaricelli@gmail.com' // ← tu email acá

const PLANS = ['esencial', 'crecimiento', 'agencia', 'estudio']
const PLAN_PRICES: Record<string, number> = { esencial: 19, crecimiento: 39, agencia: 69, estudio: 129 }
const PLAN_COLORS: Record<string, string> = {
  esencial: '#64748B', crecimiento: '#0D9488', agencia: '#E8623A', estudio: '#7C3AED'
}

type Agency = {
  id: string
  email: string
  full_name: string
  agency_name: string
  plan: string
  max_clients: number
  max_users: number
  trial_ends_at: string
  created_at: string
  active: boolean
  client_count?: number
}

export default function AdminPage() {
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPlan, setEditPlan] = useState('')
  const [toast, setToast] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [tab, setTab] = useState<'all' | 'trial' | 'active' | 'inactive'>('all')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.email !== ADMIN_EMAIL) {
        window.location.href = '/dashboard'
        return
      }
      setIsAdmin(true)
      await loadAgencies()
    }
    load()
  }, [])

  async function loadAgencies() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) {
      // Get client counts
      const withCounts = await Promise.all(data.map(async (a) => {
        const { count } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .eq('agency_id', a.id)
        return { ...a, active: true, client_count: count || 0 }
      }))
      setAgencies(withCounts)
    }
    setLoading(false)
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  async function updatePlan(agencyId: string, plan: string) {
    const limits: Record<string, { max_clients: number; max_users: number }> = {
      esencial: { max_clients: 3, max_users: 3 },
      crecimiento: { max_clients: 5, max_users: 5 },
      agencia: { max_clients: 10, max_users: 8 },
      estudio: { max_clients: 25, max_users: 999 },
    }
    await supabase.from('profiles').update({ plan, ...limits[plan] }).eq('id', agencyId)
    setAgencies(prev => prev.map(a => a.id === agencyId ? { ...a, plan, ...limits[plan] } : a))
    setEditingId(null)
    showToast(`✓ Plan actualizado a ${plan}`)
  }

  async function extendTrial(agencyId: string) {
    const newDate = new Date(Date.now() + 14 * 86400000).toISOString()
    await supabase.from('profiles').update({ trial_ends_at: newDate }).eq('id', agencyId)
    setAgencies(prev => prev.map(a => a.id === agencyId ? { ...a, trial_ends_at: newDate } : a))
    showToast('✓ Trial extendido 14 días más')
  }

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/auth'
  }

  const now = new Date()
  const filtered = agencies
    .filter(a => {
      const q = search.toLowerCase()
      return !q || a.email?.toLowerCase().includes(q) || a.agency_name?.toLowerCase().includes(q) || a.full_name?.toLowerCase().includes(q)
    })
    .filter(a => {
      const trialEnd = new Date(a.trial_ends_at)
      if (tab === 'trial') return trialEnd > now && a.plan === 'esencial'
      if (tab === 'active') return a.plan !== 'esencial' || trialEnd > now
      if (tab === 'inactive') return trialEnd < now && a.plan === 'esencial'
      return true
    })

  const totalMRR = agencies.reduce((sum, a) => {
    const trialEnd = new Date(a.trial_ends_at)
    if (trialEnd > now || a.plan !== 'esencial') return sum + PLAN_PRICES[a.plan]
    return sum
  }, 0)

  const onTrial = agencies.filter(a => new Date(a.trial_ends_at) > now).length
  const paying = agencies.filter(a => new Date(a.trial_ends_at) < now || a.plan !== 'esencial').length

  if (!isAdmin) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F172A' }}>
      <div className="text-white text-sm">Verificando acceso...</div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: '#F8F7F4' }}>
      {/* Topbar */}
      <div className="sticky top-0 z-10 border-b px-6 py-3 flex items-center gap-4" style={{ background: '#0F172A', borderColor: 'rgba(255,255,255,0.08)' }}>
        <div>
          <span className="font-bold text-lg text-white">Clara<span style={{ color: '#E8623A' }}>System</span></span>
          <span className="text-xs ml-2 px-2 py-0.5 rounded-full font-bold" style={{ background: '#E8623A', color: 'white' }}>ADMIN</span>
        </div>
        <div className="text-xs ml-2" style={{ color: '#475569' }}>Panel de Laura · Negocio Delegable</div>
        <div className="ml-auto flex items-center gap-3">
          <button onClick={loadAgencies} className="p-1.5 rounded-lg" style={{ color: '#64748B' }}><RefreshCw size={15} /></button>
          <button onClick={signOut} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg" style={{ color: '#64748B' }}>
            <LogOut size={13} /> Salir
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-5">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Agencias totales', value: agencies.length, icon: Users, color: '#E8623A' },
            { label: 'En período de prueba', value: onTrial, icon: Clock, color: '#D97706' },
            { label: 'Pagando', value: paying, icon: CheckCircle, color: '#059669' },
            { label: 'MRR estimado', value: `USD ${totalMRR}`, icon: DollarSign, color: '#7C3AED' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl border p-4" style={{ borderColor: '#E2E0D8' }}>
              <div className="flex items-center gap-2 mb-2">
                <Icon size={14} style={{ color }} />
                <span className="text-xs" style={{ color: '#64748B' }}>{label}</span>
              </div>
              <div className="text-2xl font-bold" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border bg-white flex-1 min-w-48" style={{ borderColor: '#E2E0D8' }}>
            <Search size={14} style={{ color: '#94A3B8' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, email o agencia..."
              className="flex-1 text-sm outline-none bg-transparent" />
          </div>
          <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: '#E2E0D8' }}>
            {([['all', 'Todas'], ['trial', 'En prueba'], ['active', 'Activas'], ['inactive', 'Inactivas']] as const).map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)}
                className="px-3 py-2 text-xs font-semibold transition-colors"
                style={{ background: tab === t ? '#0F172A' : 'white', color: tab === t ? 'white' : '#64748B' }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-sm" style={{ color: '#64748B' }}>Cargando agencias...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-sm" style={{ color: '#64748B' }}>Sin resultados</div>
        ) : (
          <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#E2E0D8' }}>
            {/* Header */}
            <div className="grid px-4 py-3 text-xs font-bold uppercase tracking-wide" style={{ gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1fr 1.5fr', background: '#F1EFE8', color: '#64748B' }}>
              <span>Agencia</span>
              <span>Email</span>
              <span>Plan</span>
              <span>Clientes</span>
              <span>Trial vence</span>
              <span>Registrada</span>
              <span>Acciones</span>
            </div>

            {filtered.map(a => {
              const trialEnd = new Date(a.trial_ends_at)
              const trialExpired = trialEnd < now
              const daysLeft = Math.round((trialEnd.getTime() - now.getTime()) / 86400000)
              const isEditing = editingId === a.id

              return (
                <div key={a.id} className="grid px-4 py-3 items-center border-t text-sm hover:bg-gray-50 transition-colors"
                  style={{ gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1fr 1.5fr', borderColor: '#E2E0D8' }}>

                  {/* Agencia */}
                  <div>
                    <div className="font-semibold text-sm">{a.agency_name || '—'}</div>
                    <div className="text-xs" style={{ color: '#94A3B8' }}>{a.full_name || '—'}</div>
                  </div>

                  {/* Email */}
                  <div className="text-xs truncate" style={{ color: '#64748B' }}>{a.email}</div>

                  {/* Plan */}
                  <div>
                    {isEditing ? (
                      <select value={editPlan} onChange={e => setEditPlan(e.target.value)}
                        onBlur={() => editPlan && updatePlan(a.id, editPlan)}
                        autoFocus
                        className="text-xs px-2 py-1 rounded-lg border w-full"
                        style={{ borderColor: '#E2E0D8' }}>
                        {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    ) : (
                      <span className="text-xs font-bold px-2 py-1 rounded-full capitalize"
                        style={{ background: `${PLAN_COLORS[a.plan]}18`, color: PLAN_COLORS[a.plan] }}>
                        {a.plan}
                      </span>
                    )}
                  </div>

                  {/* Clientes */}
                  <div className="text-xs">
                    <span className="font-bold">{a.client_count}</span>
                    <span style={{ color: '#94A3B8' }}>/{a.max_clients}</span>
                  </div>

                  {/* Trial */}
                  <div>
                    {trialExpired ? (
                      <span className="text-xs font-bold" style={{ color: '#DC2626' }}>Vencido</span>
                    ) : (
                      <span className="text-xs font-bold" style={{ color: daysLeft <= 3 ? '#DC2626' : '#D97706' }}>
                        {daysLeft}d
                      </span>
                    )}
                  </div>

                  {/* Registrada */}
                  <div className="text-xs" style={{ color: '#94A3B8' }}>
                    {format(new Date(a.created_at), 'dd MMM yy', { locale: es })}
                  </div>

                  {/* Acciones */}
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => { setEditingId(a.id); setEditPlan(a.plan) }}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border"
                      style={{ borderColor: '#E2E0D8', color: '#475569' }}>
                      <Edit3 size={11} /> Plan
                    </button>
                    <button
                      onClick={() => extendTrial(a.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium"
                      style={{ background: '#FEF3C7', color: '#92400E' }}>
                      <Clock size={11} /> +14d
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Revenue breakdown */}
        <div className="mt-5 bg-white rounded-xl border p-5" style={{ borderColor: '#E2E0D8' }}>
          <h3 className="font-bold text-sm mb-4" style={{ color: '#0F172A' }}>Distribución por plan</h3>
          <div className="grid grid-cols-4 gap-3">
            {PLANS.map(plan => {
              const count = agencies.filter(a => a.plan === plan).length
              const revenue = count * PLAN_PRICES[plan]
              return (
                <div key={plan} className="rounded-xl p-3 text-center" style={{ background: `${PLAN_COLORS[plan]}10` }}>
                  <div className="text-xs font-bold uppercase mb-1" style={{ color: PLAN_COLORS[plan] }}>{plan}</div>
                  <div className="text-2xl font-bold" style={{ color: PLAN_COLORS[plan] }}>{count}</div>
                  <div className="text-xs mt-1" style={{ color: '#94A3B8' }}>USD {revenue}/mes</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-5 right-5 px-4 py-3 rounded-xl text-white text-sm font-medium border-l-4 z-50"
          style={{ background: '#1E293B', borderColor: '#14B8A6' }}>
          {toast}
        </div>
      )}
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import type { Alert } from '@/types'
import { AlertTriangle, AlertCircle, Info, CheckCircle, RefreshCw } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const supabase = createClient()

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('alerts')
      .select('*, client:clients(name)')
      .eq('agency_id', user.id)
      .order('created_at', { ascending: false })
    setAlerts(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function markRead(id: string) {
    await supabase.from('alerts').update({ read: true }).eq('id', id)
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a))
  }

  async function markAllRead() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('alerts').update({ read: true }).eq('agency_id', user.id)
    setAlerts(prev => prev.map(a => ({ ...a, read: true })))
  }

  async function generateAlerts() {
    setGenerating(true)
    await fetch('/api/alerts/generate', { method: 'POST' })
    await load()
    setGenerating(false)
  }

  const urgent = alerts.filter(a => a.type === 'urgent')
  const warning = alerts.filter(a => a.type === 'warning')
  const info = alerts.filter(a => a.type === 'info')
  const unread = alerts.filter(a => !a.read).length

  const typeConfig = {
    urgent: { icon: AlertTriangle, color: '#DC2626', bg: '#FEF2F2', border: '#DC2626', label: 'Urgentes' },
    warning: { icon: AlertCircle, color: '#D97706', bg: '#FFFBEB', border: '#D97706', label: 'Atención' },
    info: { icon: Info, color: '#2563EB', bg: '#EFF6FF', border: '#2563EB', label: 'Informativo' },
  }

  function AlertItem({ alert: a }: { alert: Alert }) {
    const cfg = typeConfig[a.type]
    const Icon = cfg.icon
    return (
      <div className={`flex gap-3 p-3 rounded-xl border-l-4 mb-2 transition-opacity ${a.read ? 'opacity-50' : ''}`}
        style={{ background: cfg.bg, borderColor: cfg.border }}>
        <Icon size={16} className="flex-shrink-0 mt-0.5" style={{ color: cfg.color }} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium leading-relaxed">{a.message}</div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs" style={{ color: 'var(--text3)' }}>
              {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: es })}
            </span>
            {(a.client as any)?.name && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.06)', color: 'var(--text2)' }}>
                {(a.client as any).name}
              </span>
            )}
          </div>
        </div>
        {!a.read && (
          <button onClick={() => markRead(a.id)}
            className="text-xs flex-shrink-0 px-2 py-1 rounded-lg font-medium"
            style={{ background: 'rgba(0,0,0,0.06)', color: 'var(--text2)' }}>
            Marcar leída
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="p-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold">Alertas inteligentes</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text2)' }}>Problemas antes de que exploten · {unread} sin leer</p>
        </div>
        <div className="flex gap-2">
          <button onClick={generateAlerts} disabled={generating}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium"
            style={{ borderColor: 'var(--border)', color: 'var(--text2)' }}>
            <RefreshCw size={13} className={generating ? 'animate-spin' : ''} />
            {generating ? 'Generando...' : 'Verificar ahora'}
          </button>
          {unread > 0 && (
            <button onClick={markAllRead}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-white"
              style={{ background: 'var(--teal)' }}>
              <CheckCircle size={13} /> Marcar todas leídas
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {([['urgent', urgent], ['warning', warning], ['info', info]] as const).map(([type, items]) => {
          const cfg = typeConfig[type]
          const Icon = cfg.icon
          return (
            <div key={type} className="rounded-xl p-4" style={{ background: cfg.bg }}>
              <div className="flex items-center gap-2 mb-1">
                <Icon size={15} style={{ color: cfg.color }} />
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: cfg.color }}>{cfg.label}</span>
              </div>
              <div className="text-2xl font-bold" style={{ color: cfg.color }}>{items.length}</div>
              <div className="text-xs" style={{ color: cfg.color + 'aa' }}>{items.filter(a => !a.read).length} sin leer</div>
            </div>
          )
        })}
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm" style={{ color: 'var(--text2)' }}>Cargando alertas...</div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle size={40} className="mx-auto mb-3" style={{ color: 'var(--green)' }} />
          <div className="font-semibold mb-1">Sin alertas activas 🎉</div>
          <div className="text-sm" style={{ color: 'var(--text2)' }}>Hacé clic en "Verificar ahora" para revisar el estado de tus clientes</div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {urgent.length > 0 && (
            <div>
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                <AlertTriangle size={14} style={{ color: '#DC2626' }} />
                <span style={{ color: '#DC2626' }}>Urgentes — actuar hoy</span>
              </h3>
              {urgent.map(a => <AlertItem key={a.id} alert={a} />)}
            </div>
          )}
          <div>
            {warning.length > 0 && (
              <div className="mb-6">
                <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                  <AlertCircle size={14} style={{ color: '#D97706' }} />
                  <span style={{ color: '#D97706' }}>Atención pronto</span>
                </h3>
                {warning.map(a => <AlertItem key={a.id} alert={a} />)}
              </div>
            )}
            {info.length > 0 && (
              <div>
                <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                  <Info size={14} style={{ color: '#2563EB' }} />
                  <span style={{ color: '#2563EB' }}>Informativo</span>
                </h3>
                {info.map(a => <AlertItem key={a.id} alert={a} />)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

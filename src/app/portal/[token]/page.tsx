'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Check, Edit3, Send, CheckCircle } from 'lucide-react'

export default function PortalPage({ params }: { params: { token: string } }) {
  const [approval, setApproval] = useState<any>(null)
  const [agency, setAgency] = useState<any>(null)
  const [feedback, setFeedback] = useState('')
  const [showFeedback, setShowFeedback] = useState(false)
  const [done, setDone] = useState<'approved' | 'changes' | null>(null)
  const [clientName, setClientName] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: ap } = await supabase
        .from('approvals')
        .select('*, client:clients(name, agency_id, avatar_color, agency:profiles(agency_name, full_name))')
        .eq('client_token', params.token)
        .single()
      setApproval(ap)
      if (ap?.status === 'approved') setDone('approved')
      if (ap?.status === 'changes') setDone('changes')
      setLoading(false)
    }
    load()
  }, [params.token])

  async function handleApprove() {
    if (!clientName.trim()) { alert('Por favor ingresá tu nombre para confirmar la aprobación.'); return }
    setSubmitting(true)
    await supabase.from('approvals').update({ status: 'approved', updated_at: new Date().toISOString() }).eq('client_token', params.token)
    await supabase.from('agreements').insert({
      agency_id: approval.client.agency_id,
      client_id: approval.client_id,
      approval_id: approval.id,
      piece_name: approval.piece_name,
      action: 'approved',
      client_name: clientName,
      client_email: '',
      ip_address: null,
    })
    // Notificar al equipo
    await fetch('/api/approvals/team-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approvalId: approval.id, action: 'approved', clientName }),
    })
    setDone('approved')
    setSubmitting(false)
  }

  async function handleChanges() {
    if (!clientName.trim()) { alert('Por favor ingresá tu nombre.'); return }
    if (!feedback.trim()) { alert('Por favor describí qué querés cambiar.'); return }
    setSubmitting(true)
    await supabase.from('approvals').update({ status: 'changes', client_feedback: feedback, updated_at: new Date().toISOString() }).eq('client_token', params.token)
    await supabase.from('agreements').insert({
      agency_id: approval.client.agency_id,
      client_id: approval.client_id,
      approval_id: approval.id,
      piece_name: approval.piece_name,
      action: 'changes_requested',
      client_name: clientName,
      client_email: '',
      metadata: { feedback },
    })
    await fetch('/api/approvals/team-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approvalId: approval.id, action: 'changes_requested', clientName, feedback }),
    })
    setDone('changes')
    setSubmitting(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F172A' }}>
      <div className="text-white text-sm">Cargando tu portal...</div>
    </div>
  )

  if (!approval) return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0F172A' }}>
      <div className="text-center">
        <div className="text-4xl mb-4">🔍</div>
        <div className="text-white font-semibold mb-2">Link no encontrado</div>
        <div className="text-sm" style={{ color: '#64748B' }}>Este link de aprobación no existe o ya venció.</div>
      </div>
    </div>
  )

  const agencyName = approval.client?.agency?.agency_name || 'Tu agencia'
  const clientDisplayName = approval.client?.name

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0F172A' }}>
      {/* Header */}
      <div className="text-center py-8 px-4">
        <div className="text-2xl font-bold text-white mb-1">{agencyName}</div>
        <div className="text-sm" style={{ color: '#64748B' }}>Portal exclusivo para {clientDisplayName}</div>
      </div>

      <div className="flex-1 px-4 pb-8 max-w-lg mx-auto w-full">
        {done ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: done === 'approved' ? '#059669' : '#D97706' }}>
              <CheckCircle size={28} className="text-white" />
            </div>
            <div className="text-xl font-bold text-white mb-2">
              {done === 'approved' ? '¡Aprobación registrada!' : 'Feedback enviado'}
            </div>
            <div className="text-sm" style={{ color: '#64748B' }}>
              {done === 'approved'
                ? 'Tu aprobación quedó guardada con fecha y hora. El equipo fue notificado.'
                : 'El equipo recibió tu feedback y trabajará en los cambios.'}
            </div>
            <div className="mt-6 p-3 rounded-xl text-xs" style={{ background: 'rgba(255,255,255,0.05)', color: '#475569' }}>
              🔒 Este registro es permanente e inmutable · Powered by ClaraSystem
            </div>
          </div>
        ) : (
          <>
            {/* Piece card */}
            <div className="rounded-2xl overflow-hidden mb-5" style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="h-40 flex items-center justify-center" style={{ background: `${approval.client?.avatar_color || '#E8623A'}20` }}>
                {approval.file_url ? (
                  approval.file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i)
                    ? <img src={approval.file_url} alt="" className="max-h-full max-w-full object-contain" />
                    : <div className="text-center">
                        <div className="text-5xl mb-2">📄</div>
                        <a href={approval.file_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs underline" style={{ color: '#64748B' }}>Ver archivo</a>
                      </div>
                ) : (
                  <div className="text-5xl">🖼️</div>
                )}
              </div>
              <div className="p-4">
                <div className="text-white font-semibold mb-1">{approval.piece_name}</div>
                <div className="text-sm" style={{ color: '#64748B' }}>{approval.piece_type}</div>
              </div>
            </div>

            {/* Name input */}
            <div className="mb-4">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#94A3B8' }}>Tu nombre (para el registro)</label>
              <input value={clientName} onChange={e => setClientName(e.target.value)}
                placeholder="Ej: Ana Torres"
                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
                style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>

            {/* Feedback textarea */}
            {showFeedback && (
              <div className="mb-4">
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#94A3B8' }}>Describí exactamente qué querés cambiar</label>
                <textarea value={feedback} onChange={e => setFeedback(e.target.value)}
                  placeholder="Ej: Cambiar el fondo a blanco y agrandar el logo. El texto está muy pequeño para mobile."
                  rows={4} className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none resize-none"
                  style={{ background: '#1E293B', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>
            )}

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleApprove} disabled={submitting || !clientName.trim()}
                className="flex items-center justify-center gap-2 py-4 rounded-xl text-white font-bold text-sm disabled:opacity-40 transition-all"
                style={{ background: '#059669' }}>
                <Check size={18} />
                APRUEBO
              </button>
              {!showFeedback ? (
                <button onClick={() => setShowFeedback(true)}
                  className="flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-sm transition-all"
                  style={{ background: 'rgba(220,38,38,0.15)', color: '#FCA5A5', border: '1px solid rgba(220,38,38,0.3)' }}>
                  <Edit3 size={18} />
                  PIDO CAMBIOS
                </button>
              ) : (
                <button onClick={handleChanges} disabled={submitting || !clientName.trim() || !feedback.trim()}
                  className="flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-sm disabled:opacity-40"
                  style={{ background: 'rgba(220,38,38,0.15)', color: '#FCA5A5', border: '1px solid rgba(220,38,38,0.3)' }}>
                  <Send size={18} />
                  ENVIAR FEEDBACK
                </button>
              )}
            </div>

            <div className="text-center mt-4 text-xs" style={{ color: '#334155' }}>
              🔒 Tu respuesta queda registrada con fecha y hora · Portal seguro by ClaraSystem
            </div>
          </>
        )}
      </div>
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { format, addMonths, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'

const SECRET_KEY = 'negociodelegable2025'
const PLANS = ['esencial','crecimiento','agencia','estudio']
const PLAN_PRICES: Record<string,number> = { esencial:19, crecimiento:39, agencia:69, estudio:129 }
const PLAN_COLORS: Record<string,string> = { esencial:'#64748B', crecimiento:'#0D9488', agencia:'#E8623A', estudio:'#7C3AED' }
const PLAN_LIMITS: Record<string,any> = {
  esencial:{max_clients:3,max_users:3},
  crecimiento:{max_clients:5,max_users:5},
  agencia:{max_clients:10,max_users:8},
  estudio:{max_clients:25,max_users:999},
}

type Tab = 'agencies'|'payments'|'expiring'

export default function AdminPage() {
  const [agencies, setAgencies] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const [tab, setTab] = useState<Tab>('agencies')
  const [search, setSearch] = useState('')
  const [filterTab, setFilterTab] = useState<'all'|'trial'|'active'|'overdue'>('all')
  const [editingId, setEditingId] = useState<string|null>(null)
  const [editPlan, setEditPlan] = useState('')
  const [paymentModal, setPaymentModal] = useState<any>(null)
  const [msgModal, setMsgModal] = useState<any>(null)
  const [msgText, setMsgText] = useState('')
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState('')
  const [payForm, setPayForm] = useState({ amount: '', method: 'transferencia', note: '', months: '1' })
  const supabase = createClient()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const key = params.get('key')
    if (key === SECRET_KEY) sessionStorage.setItem('admin_access', SECRET_KEY)
    const stored = sessionStorage.getItem('admin_access')
    if (stored === SECRET_KEY) {
      setAllowed(true)
      loadData()
    } else {
      window.location.href = '/dashboard'
    }
  }, [])

  async function loadData() {
    const [{ data: ag }, { data: py }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('payments').select('*, agency:profiles(agency_name,email)').order('registered_at', { ascending: false }),
    ])
    if (ag) {
      const withCounts = await Promise.all(ag.map(async a => {
        const { count } = await supabase.from('clients').select('*', { count:'exact', head:true }).eq('agency_id', a.id)
        return { ...a, client_count: count || 0 }
      }))
      setAgencies(withCounts)
    }
    setPayments(py || [])
    setLoading(false)
  }

  function showToast(msg: string) { setToast(msg); setTimeout(()=>setToast(''), 3500) }

  async function updatePlan(agencyId: string, plan: string) {
    await supabase.from('profiles').update({ plan, ...PLAN_LIMITS[plan] }).eq('id', agencyId)
    setAgencies(prev => prev.map(a => a.id === agencyId ? { ...a, plan, ...PLAN_LIMITS[plan] } : a))
    setEditingId(null)
    showToast('✓ Plan actualizado a ' + plan)
  }

  async function extendTrial(agencyId: string) {
    const newDate = new Date(Date.now() + 14*86400000).toISOString()
    await supabase.from('profiles').update({ trial_ends_at: newDate }).eq('id', agencyId)
    setAgencies(prev => prev.map(a => a.id === agencyId ? { ...a, trial_ends_at: newDate } : a))
    showToast('✓ Trial extendido 14 días')
  }

  async function registerPayment() {
    if (!payForm.amount || !paymentModal) return
    const months = parseInt(payForm.months)
    const start = new Date()
    const end = addMonths(start, months)
    const endStr = end.toISOString().split('T')[0]

    await Promise.all([
      supabase.from('payments').insert({
        agency_id: paymentModal.id,
        amount: parseFloat(payForm.amount),
        plan: paymentModal.plan,
        period_start: start.toISOString().split('T')[0],
        period_end: endStr,
        payment_method: payForm.method,
        note: payForm.note,
      }),
      supabase.from('profiles').update({
        payment_status: 'active',
        subscription_end: endStr,
        trial_ends_at: end.toISOString(),
      }).eq('id', paymentModal.id),
    ])

    setAgencies(prev => prev.map(a => a.id === paymentModal.id
      ? { ...a, payment_status: 'active', subscription_end: endStr, trial_ends_at: end.toISOString() }
      : a
    ))
    showToast(`✓ Pago de USD ${payForm.amount} registrado · Vence el ${format(end,'dd MMM yyyy',{locale:es})}`)
    setPaymentModal(null)
    setPayForm({ amount:'', method:'transferencia', note:'', months:'1' })
    loadData()
  }

  async function sendMessage() {
    if (!msgText.trim() || !msgModal) return
    setSending(true)
    await fetch('/api/approvals/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientEmail: msgModal.email,
        clientName: msgModal.full_name || msgModal.agency_name,
        pieceName: msgText,
        pieceType: 'Mensaje de Laura - ClaraSystem',
        approvalToken: 'mensaje-directo-' + Date.now(),
      }),
    })
    showToast('✓ Mensaje enviado a ' + msgModal.email)
    setMsgModal(null); setMsgText(''); setSending(false)
  }

  const now = new Date()

  function getStatus(a: any) {
    if (a.payment_status === 'active') {
      const end = new Date(a.subscription_end || a.trial_ends_at)
      const days = differenceInDays(end, now)
      if (days < 0) return { label: 'Vencido', color: '#DC2626', bg: '#FEE2E2' }
      if (days <= 7) return { label: `Vence en ${days}d`, color: '#D97706', bg: '#FEF3C7' }
      return { label: 'Activo', color: '#059669', bg: '#D1FAE5' }
    }
    const trialEnd = new Date(a.trial_ends_at)
    const days = differenceInDays(trialEnd, now)
    if (days < 0) return { label: 'Trial vencido', color: '#DC2626', bg: '#FEE2E2' }
    if (days <= 5) return { label: `Trial: ${days}d`, color: '#D97706', bg: '#FEF3C7' }
    return { label: `Trial: ${days}d`, color: '#2563EB', bg: '#DBEAFE' }
  }

  const filtered = agencies
    .filter(a => { const q=search.toLowerCase(); return !q||a.email?.toLowerCase().includes(q)||a.agency_name?.toLowerCase().includes(q)||a.full_name?.toLowerCase().includes(q) })
    .filter(a => {
      if (filterTab === 'active') return a.payment_status === 'active'
      if (filterTab === 'trial') return a.payment_status !== 'active' && differenceInDays(new Date(a.trial_ends_at), now) >= 0
      if (filterTab === 'overdue') return differenceInDays(new Date(a.subscription_end || a.trial_ends_at), now) < 0
      return true
    })

  // Agencias que vencen en los próximos 10 días
  const expiring = agencies.filter(a => {
    const end = new Date(a.subscription_end || a.trial_ends_at)
    const days = differenceInDays(end, now)
    return days >= 0 && days <= 10
  }).sort((a, b) => {
    const da = differenceInDays(new Date(a.subscription_end || a.trial_ends_at), now)
    const db = differenceInDays(new Date(b.subscription_end || b.trial_ends_at), now)
    return da - db
  })

  const totalMRR = agencies.filter(a => a.payment_status === 'active').reduce((s, a) => s + PLAN_PRICES[a.plan], 0)
  const totalActive = agencies.filter(a => a.payment_status === 'active').length
  const totalTrial = agencies.filter(a => a.payment_status !== 'active' && differenceInDays(new Date(a.trial_ends_at), now) >= 0).length
  const totalOverdue = agencies.filter(a => differenceInDays(new Date(a.subscription_end || a.trial_ends_at), now) < 0).length

  const btn: any = { padding:'7px 14px', borderRadius:'8px', border:'none', cursor:'pointer', fontSize:'12px', fontWeight:600, fontFamily:'system-ui,sans-serif' }
  const inp: any = { width:'100%', padding:'9px 12px', borderRadius:'8px', border:'1px solid #E2E0D8', fontSize:'13px', fontFamily:'system-ui,sans-serif', outline:'none', boxSizing:'border-box' }

  if (!allowed) return <div style={{ minHeight:'100vh', background:'#0A0A0F', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff' }}>Verificando...</div>

  return (
    <div style={{ minHeight:'100vh', background:'#F8F7F4', fontFamily:'system-ui,sans-serif' }}>
      {/* Topbar */}
      <div style={{ background:'#0A0A0F', borderBottom:'1px solid rgba(212,175,55,0.15)', padding:'12px 24px', display:'flex', alignItems:'center', gap:'12px', position:'sticky', top:0, zIndex:10 }}>
        <div style={{ fontSize:'18px', fontWeight:800, color:'#fff' }}>Clara<span style={{ color:'#D4AF37' }}>System</span></div>
        <span style={{ background:'#D4AF37', color:'#0A0A0F', fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'20px' }}>ADMIN</span>
        <div style={{ fontSize:'12px', color:'#4A4A5A' }}>Panel de Laura · Negocio Delegable</div>
        <div style={{ marginLeft:'auto', display:'flex', gap:'8px' }}>
          <button onClick={loadData} style={{ ...btn, background:'rgba(255,255,255,0.05)', color:'#64748B' }}>⟳</button>
          <button onClick={()=>{ sessionStorage.removeItem('admin_access'); window.location.href='/auth' }} style={{ ...btn, background:'rgba(255,255,255,0.05)', color:'#64748B' }}>Salir</button>
        </div>
      </div>

      <div style={{ maxWidth:'1200px', margin:'0 auto', padding:'20px' }}>

        {/* KPIs */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'12px', marginBottom:'20px' }}>
          {[
            { label:'Total agencias', value: agencies.length, color:'#E8623A' },
            { label:'Pagando', value: totalActive, color:'#059669' },
            { label:'En trial', value: totalTrial, color:'#2563EB' },
            { label:'Vencidos', value: totalOverdue, color:'#DC2626' },
            { label:'MRR', value: 'USD '+totalMRR, color:'#7C3AED' },
          ].map(k => (
            <div key={k.label} style={{ background:'#fff', border:'1px solid #E2E0D8', borderRadius:'10px', padding:'14px' }}>
              <div style={{ fontSize:'10px', color:'#64748B', marginBottom:'4px' }}>{k.label}</div>
              <div style={{ fontSize:'22px', fontWeight:700, color:k.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:'1px solid #E2E0D8', marginBottom:'20px', gap:'0' }}>
          {([['agencies','🏢 Agencias'],['payments','💰 Pagos'],['expiring','⚠️ Por vencer ('+expiring.length+')']] as const).map(([t,l]) => (
            <button key={t} onClick={()=>setTab(t)}
              style={{ ...btn, borderRadius:0, borderBottom:`2px solid ${tab===t?'#D4AF37':'transparent'}`, background:'transparent', color:tab===t?'#D4AF37':'#64748B', padding:'10px 20px', fontSize:'13px' }}>
              {l}
            </button>
          ))}
        </div>

        {/* AGENCIES TAB */}
        {tab === 'agencies' && (
          <>
            <div style={{ display:'flex', gap:'10px', marginBottom:'14px', flexWrap:'wrap' }}>
              <div style={{ flex:1, minWidth:'200px', display:'flex', alignItems:'center', gap:'8px', background:'#fff', border:'1px solid #E2E0D8', borderRadius:'8px', padding:'8px 12px' }}>
                <span style={{ color:'#94A3B8' }}>🔍</span>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar..." style={{ border:'none', outline:'none', fontSize:'13px', fontFamily:'system-ui,sans-serif', flex:1 }} />
              </div>
              <div style={{ display:'flex', border:'1px solid #E2E0D8', borderRadius:'8px', overflow:'hidden' }}>
                {(['all','active','trial','overdue'] as const).map((t,i) => (
                  <button key={t} onClick={()=>setFilterTab(t)} style={{ ...btn, borderRadius:0, background:filterTab===t?'#0A0A0F':'#fff', color:filterTab===t?'#D4AF37':'#64748B', padding:'7px 12px' }}>
                    {['Todas','Pagando','Trial','Vencidas'][i]}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign:'center', padding:'40px', color:'#94A3B8' }}>Cargando...</div>
            ) : (
              <div style={{ background:'#fff', border:'1px solid #E2E0D8', borderRadius:'12px', overflow:'hidden' }}>
                <div style={{ display:'grid', gridTemplateColumns:'1.8fr 1.5fr 0.9fr 0.9fr 1fr 1fr 2fr', padding:'10px 16px', background:'#F1EFE8', borderBottom:'1px solid #E2E0D8' }}>
                  {['Agencia','Email','Plan','Clientes','Estado','Vence','Acciones'].map(h => (
                    <span key={h} style={{ fontSize:'10px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px', color:'#64748B' }}>{h}</span>
                  ))}
                </div>
                {filtered.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'40px', color:'#94A3B8' }}>Sin agencias</div>
                ) : filtered.map(a => {
                  const status = getStatus(a)
                  const endDate = a.subscription_end || a.trial_ends_at
                  return (
                    <div key={a.id} style={{ display:'grid', gridTemplateColumns:'1.8fr 1.5fr 0.9fr 0.9fr 1fr 1fr 2fr', padding:'11px 16px', borderBottom:'1px solid #F1EFE8', alignItems:'center' }}>
                      <div>
                        <div style={{ fontSize:'13px', fontWeight:600 }}>{a.agency_name||'—'}</div>
                        <div style={{ fontSize:'11px', color:'#94A3B8' }}>{a.full_name}</div>
                      </div>
                      <div style={{ fontSize:'11px', color:'#64748B', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.email}</div>
                      <div>
                        {editingId===a.id ? (
                          <select value={editPlan} onChange={e=>setEditPlan(e.target.value)} onBlur={()=>editPlan&&updatePlan(a.id,editPlan)} autoFocus style={{ fontSize:'11px', padding:'4px 6px', borderRadius:'6px', border:'1px solid #E2E0D8', width:'100%' }}>
                            {PLANS.map(p=><option key={p} value={p}>{p}</option>)}
                          </select>
                        ) : (
                          <span style={{ fontSize:'11px', fontWeight:700, padding:'2px 7px', borderRadius:'20px', background:PLAN_COLORS[a.plan]+'18', color:PLAN_COLORS[a.plan] }}>{a.plan}</span>
                        )}
                      </div>
                      <div style={{ fontSize:'12px' }}><span style={{ fontWeight:700 }}>{a.client_count}</span><span style={{ color:'#94A3B8' }}>/{a.max_clients}</span></div>
                      <span style={{ fontSize:'11px', fontWeight:700, padding:'2px 8px', borderRadius:'20px', background:status.bg, color:status.color, whiteSpace:'nowrap' }}>
                        {status.label}
                      </span>
                      <div style={{ fontSize:'11px', color:'#64748B' }}>
                        {endDate ? format(new Date(endDate),'dd MMM yy',{locale:es}) : '—'}
                      </div>
                      <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
                        <button onClick={()=>{setEditingId(a.id);setEditPlan(a.plan)}} style={{ ...btn, background:'#F1EFE8', color:'#475569', padding:'4px 7px', fontSize:'10px' }}>✏️</button>
                        <button onClick={()=>extendTrial(a.id)} style={{ ...btn, background:'#FEF3C7', color:'#92400E', padding:'4px 7px', fontSize:'10px' }}>+14d</button>
                        <button onClick={()=>{setPaymentModal(a);setPayForm({amount:String(PLAN_PRICES[a.plan]),method:'transferencia',note:'',months:'1'})}} style={{ ...btn, background:'#D1FAE5', color:'#065F46', padding:'4px 7px', fontSize:'10px' }}>💰 Pago</button>
                        <button onClick={()=>{setMsgModal(a);setMsgText('')}} style={{ ...btn, background:'#DBEAFE', color:'#1E40AF', padding:'4px 7px', fontSize:'10px' }}>✉️</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* PAYMENTS TAB */}
        {tab === 'payments' && (
          <div>
            <div style={{ background:'#fff', border:'1px solid #E2E0D8', borderRadius:'12px', overflow:'hidden' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr 0.7fr 1fr 1fr 1.2fr', padding:'10px 16px', background:'#F1EFE8', borderBottom:'1px solid #E2E0D8' }}>
                {['Agencia','Plan','USD','Método','Período','Registrado'].map(h => (
                  <span key={h} style={{ fontSize:'10px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px', color:'#64748B' }}>{h}</span>
                ))}
              </div>
              {payments.length === 0 ? (
                <div style={{ textAlign:'center', padding:'40px', color:'#94A3B8' }}>
                  <div style={{ fontSize:'32px', marginBottom:'8px' }}>💰</div>
                  <div>Sin pagos registrados todavía</div>
                  <div style={{ fontSize:'13px', marginTop:'4px', color:'#64748B' }}>Usá el botón "Pago" en cada agencia para registrar</div>
                </div>
              ) : payments.map(p => (
                <div key={p.id} style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr 0.7fr 1fr 1fr 1.2fr', padding:'11px 16px', borderBottom:'1px solid #F1EFE8', alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:'12px', fontWeight:600 }}>{(p.agency as any)?.agency_name||'—'}</div>
                    <div style={{ fontSize:'10px', color:'#94A3B8' }}>{(p.agency as any)?.email}</div>
                  </div>
                  <span style={{ fontSize:'11px', fontWeight:700, padding:'2px 7px', borderRadius:'20px', background:PLAN_COLORS[p.plan]+'18', color:PLAN_COLORS[p.plan] }}>{p.plan}</span>
                  <div style={{ fontSize:'14px', fontWeight:700, color:'#059669' }}>USD {p.amount}</div>
                  <div style={{ fontSize:'12px', color:'#64748B', textTransform:'capitalize' }}>{p.payment_method}</div>
                  <div style={{ fontSize:'11px', color:'#64748B' }}>
                    {format(new Date(p.period_start),'dd MMM',{locale:es})} → {format(new Date(p.period_end),'dd MMM yy',{locale:es})}
                  </div>
                  <div>
                    <div style={{ fontSize:'11px', color:'#64748B' }}>{format(new Date(p.registered_at),'dd MMM yyyy',{locale:es})}</div>
                    {p.note && <div style={{ fontSize:'10px', color:'#94A3B8' }}>{p.note}</div>}
                  </div>
                </div>
              ))}
            </div>

            {/* Resumen */}
            {payments.length > 0 && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px', marginTop:'16px' }}>
                <div style={{ background:'#fff', border:'1px solid #E2E0D8', borderRadius:'10px', padding:'16px', textAlign:'center' }}>
                  <div style={{ fontSize:'11px', color:'#64748B', marginBottom:'4px' }}>Total cobrado (histórico)</div>
                  <div style={{ fontSize:'24px', fontWeight:700, color:'#059669' }}>USD {payments.reduce((s,p)=>s+parseFloat(p.amount),0).toFixed(0)}</div>
                </div>
                <div style={{ background:'#fff', border:'1px solid #E2E0D8', borderRadius:'10px', padding:'16px', textAlign:'center' }}>
                  <div style={{ fontSize:'11px', color:'#64748B', marginBottom:'4px' }}>Pagos registrados</div>
                  <div style={{ fontSize:'24px', fontWeight:700, color:'#0D9488' }}>{payments.length}</div>
                </div>
                <div style={{ background:'#fff', border:'1px solid #E2E0D8', borderRadius:'10px', padding:'16px', textAlign:'center' }}>
                  <div style={{ fontSize:'11px', color:'#64748B', marginBottom:'4px' }}>MRR actual</div>
                  <div style={{ fontSize:'24px', fontWeight:700, color:'#7C3AED' }}>USD {totalMRR}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* EXPIRING TAB */}
        {tab === 'expiring' && (
          <div>
            {expiring.length === 0 ? (
              <div style={{ textAlign:'center', padding:'60px', color:'#94A3B8' }}>
                <div style={{ fontSize:'40px', marginBottom:'12px' }}>✅</div>
                <div style={{ fontWeight:600, marginBottom:'6px' }}>Sin vencimientos próximos</div>
                <div style={{ fontSize:'13px' }}>No hay agencias que venzan en los próximos 10 días</div>
              </div>
            ) : (
              <>
                <div style={{ padding:'12px 16px', background:'#FEF3C7', border:'1px solid #F59E0B', borderRadius:'10px', marginBottom:'16px', fontSize:'13px', color:'#92400E' }}>
                  ⚠️ <strong>{expiring.length} agencia{expiring.length!==1?'s':''}</strong> vencen en los próximos 10 días. Contactalas para renovar.
                </div>
                <div style={{ background:'#fff', border:'1px solid #E2E0D8', borderRadius:'12px', overflow:'hidden' }}>
                  {expiring.map(a => {
                    const endDate = new Date(a.subscription_end || a.trial_ends_at)
                    const days = differenceInDays(endDate, now)
                    const status = getStatus(a)
                    return (
                      <div key={a.id} style={{ display:'flex', alignItems:'center', gap:'16px', padding:'14px 16px', borderBottom:'1px solid #F1EFE8' }}>
                        <div style={{ width:'40px', height:'40px', borderRadius:'50%', background:days<=3?'#FEE2E2':days<=7?'#FEF3C7':'#DBEAFE', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', fontWeight:800, color:days<=3?'#DC2626':days<=7?'#D97706':'#2563EB', flexShrink:0 }}>
                          {days}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:'14px', fontWeight:700 }}>{a.agency_name||'—'}</div>
                          <div style={{ fontSize:'12px', color:'#64748B' }}>{a.email} · Plan {a.plan} · Vence el {format(endDate,'dd MMM yyyy',{locale:es})}</div>
                        </div>
                        <div style={{ display:'flex', gap:'8px' }}>
                          <button onClick={()=>{setPaymentModal(a);setPayForm({amount:String(PLAN_PRICES[a.plan]),method:'transferencia',note:'Renovación',months:'1'})}}
                            style={{ ...btn, background:'#D1FAE5', color:'#065F46' }}>💰 Registrar pago</button>
                          <button onClick={()=>{setMsgModal(a);setMsgText('Hola '+a.full_name+'! Tu suscripción de ClaraSystem vence en '+days+' días. Cuando quieras renovar avisame y te paso los datos 😊')}}
                            style={{ ...btn, background:'#DBEAFE', color:'#1E40AF' }}>✉️ Avisar</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {paymentModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50, padding:'16px' }}>
          <div style={{ background:'#fff', borderRadius:'16px', padding:'24px', width:'100%', maxWidth:'420px' }}>
            <h2 style={{ fontSize:'18px', fontWeight:700, marginBottom:'4px' }}>💰 Registrar pago</h2>
            <p style={{ fontSize:'13px', color:'#64748B', marginBottom:'20px' }}>{paymentModal.agency_name} · Plan {paymentModal.plan} (USD {PLAN_PRICES[paymentModal.plan]}/mes)</p>
            <div style={{ display:'flex', flexDirection:'column', gap:'12px', marginBottom:'20px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                <div>
                  <label style={{ display:'block', fontSize:'11px', fontWeight:700, color:'#64748B', marginBottom:'5px' }}>MONTO USD</label>
                  <input type="number" value={payForm.amount} onChange={e=>setPayForm(f=>({...f,amount:e.target.value}))} style={inp} />
                </div>
                <div>
                  <label style={{ display:'block', fontSize:'11px', fontWeight:700, color:'#64748B', marginBottom:'5px' }}>MESES</label>
                  <select value={payForm.months} onChange={e=>setPayForm(f=>({...f,months:e.target.value,amount:String(PLAN_PRICES[paymentModal.plan]*parseInt(e.target.value))}))} style={inp}>
                    <option value="1">1 mes</option>
                    <option value="2">2 meses</option>
                    <option value="3">3 meses</option>
                    <option value="6">6 meses</option>
                    <option value="12">12 meses (anual)</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display:'block', fontSize:'11px', fontWeight:700, color:'#64748B', marginBottom:'5px' }}>MÉTODO DE PAGO</label>
                <select value={payForm.method} onChange={e=>setPayForm(f=>({...f,method:e.target.value}))} style={inp}>
                  <option value="transferencia">Transferencia / CBU</option>
                  <option value="paypal">PayPal</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div>
                <label style={{ display:'block', fontSize:'11px', fontWeight:700, color:'#64748B', marginBottom:'5px' }}>NOTA (opcional)</label>
                <input value={payForm.note} onChange={e=>setPayForm(f=>({...f,note:e.target.value}))} placeholder="Ej: Renovación Mayo 2025" style={inp} />
              </div>
              <div style={{ background:'#F1EFE8', borderRadius:'8px', padding:'12px', fontSize:'12px', color:'#475569' }}>
                ✓ Activa la cuenta por <strong>{payForm.months} mes{parseInt(payForm.months)!==1?'es':''}</strong> · Nuevo vencimiento: <strong>{format(addMonths(now,parseInt(payForm.months)),'dd MMM yyyy',{locale:es})}</strong>
              </div>
            </div>
            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={()=>setPaymentModal(null)} style={{ flex:1, padding:'10px', borderRadius:'8px', border:'1px solid #E2E0D8', background:'#fff', cursor:'pointer', fontSize:'13px', fontFamily:'system-ui,sans-serif' }}>Cancelar</button>
              <button onClick={registerPayment} disabled={!payForm.amount} style={{ flex:1, padding:'10px', borderRadius:'8px', border:'none', background:'#059669', color:'#fff', cursor:'pointer', fontSize:'14px', fontWeight:700, fontFamily:'system-ui,sans-serif', opacity:!payForm.amount?0.5:1 }}>
                Confirmar pago ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {msgModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50, padding:'16px' }}>
          <div style={{ background:'#fff', borderRadius:'16px', padding:'24px', width:'100%', maxWidth:'440px' }}>
            <h2 style={{ fontSize:'18px', fontWeight:700, marginBottom:'4px' }}>✉️ Enviar mensaje</h2>
            <p style={{ fontSize:'13px', color:'#64748B', marginBottom:'16px' }}>{msgModal.agency_name} · {msgModal.email}</p>
            <textarea value={msgText} onChange={e=>setMsgText(e.target.value)} rows={5}
              style={{ ...inp, resize:'none', marginBottom:'16px' }} placeholder="Escribí tu mensaje..." />
            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={()=>setMsgModal(null)} style={{ flex:1, padding:'10px', borderRadius:'8px', border:'1px solid #E2E0D8', background:'#fff', cursor:'pointer', fontSize:'13px', fontFamily:'system-ui,sans-serif' }}>Cancelar</button>
              <button onClick={sendMessage} disabled={sending||!msgText.trim()} style={{ flex:1, padding:'10px', borderRadius:'8px', border:'none', background:'#0A0A0F', color:'#D4AF37', cursor:'pointer', fontSize:'13px', fontWeight:700, fontFamily:'system-ui,sans-serif', opacity:sending||!msgText.trim()?0.5:1 }}>
                {sending?'Enviando...':'Enviar →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={{ position:'fixed', bottom:'20px', right:'20px', background:'#1E293B', color:'#fff', padding:'12px 16px', borderRadius:'10px', fontSize:'13px', fontWeight:500, borderLeft:'3px solid #14B8A6', zIndex:99, maxWidth:'320px' }}>{toast}</div>}
    </div>
  )
}

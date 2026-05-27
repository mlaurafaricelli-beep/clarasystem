'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { format } from 'date-fns'
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

export default function AdminPage() {
  const [agencies, setAgencies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'all'|'trial'|'active'|'inactive'>('all')
  const [editingId, setEditingId] = useState<string|null>(null)
  const [editPlan, setEditPlan] = useState('')
  const [msgAgency, setMsgAgency] = useState<any>(null)
  const [msgText, setMsgText] = useState('')
  const [sending, setSending] = useState(false)
  const [paymentAgency, setPaymentAgency] = useState<any>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNote, setPaymentNote] = useState('')
  const [toast, setToast] = useState('')
  const supabase = createClient()

  useEffect(() => {
    // Verificar key secreta en URL
    const params = new URLSearchParams(window.location.search)
    const key = params.get('key')
    if (key === SECRET_KEY) {
      // Guardar en sessionStorage para no tener que poner la key cada vez
      sessionStorage.setItem('admin_access', SECRET_KEY)
    }
    const stored = sessionStorage.getItem('admin_access')
    if (stored === SECRET_KEY) {
      setAllowed(true)
      loadAgencies()
    } else {
      window.location.href = '/dashboard'
    }
  }, [])

  async function loadAgencies() {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    if (data) {
      const withCounts = await Promise.all(data.map(async (a) => {
        const { count } = await supabase.from('clients').select('*', { count:'exact', head:true }).eq('agency_id', a.id)
        return { ...a, client_count: count || 0 }
      }))
      setAgencies(withCounts)
    }
    setLoading(false)
  }

  function showToast(msg: string) { setToast(msg); setTimeout(()=>setToast(''), 3000) }

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
    showToast('✓ Trial extendido 14 días más')
  }

  async function sendMessage() {
    if (!msgText.trim() || !msgAgency) return
    setSending(true)
    try {
      await fetch('/api/approvals/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientEmail: msgAgency.email,
          clientName: msgAgency.full_name || msgAgency.agency_name,
          pieceName: msgText,
          pieceType: 'Mensaje de Laura',
          approvalToken: 'mensaje-directo',
        }),
      })
      showToast('✓ Mensaje enviado a ' + msgAgency.email)
      setMsgAgency(null)
      setMsgText('')
    } catch(e) {
      showToast('Error al enviar')
    }
    setSending(false)
  }

  function registerPayment() {
    if (!paymentAmount || !paymentAgency) return
    showToast('✓ Pago de USD ' + paymentAmount + ' registrado para ' + paymentAgency.agency_name)
    setPaymentAgency(null)
    setPaymentAmount('')
    setPaymentNote('')
  }

  const now = new Date()
  const filtered = agencies
    .filter(a => { const q=search.toLowerCase(); return !q || a.email?.toLowerCase().includes(q) || a.agency_name?.toLowerCase().includes(q) || a.full_name?.toLowerCase().includes(q) })
    .filter(a => {
      const trialEnd = new Date(a.trial_ends_at)
      if (tab==='trial') return trialEnd > now
      if (tab==='active') return a.plan !== 'esencial'
      if (tab==='inactive') return trialEnd < now && a.plan === 'esencial'
      return true
    })

  const totalMRR = agencies.reduce((sum,a) => sum + PLAN_PRICES[a.plan], 0)
  const onTrial = agencies.filter(a => new Date(a.trial_ends_at) > now).length
  const paying = agencies.filter(a => a.plan !== 'esencial').length
  const expired = agencies.filter(a => new Date(a.trial_ends_at) < now && a.plan === 'esencial').length

  const btn = { padding:'7px 14px', borderRadius:'8px', border:'none', cursor:'pointer', fontSize:'12px', fontWeight:600, fontFamily:'system-ui,sans-serif' } as any
  const inp = { width:'100%', padding:'9px 12px', borderRadius:'8px', border:'1px solid #E2E0D8', fontSize:'13px', fontFamily:'system-ui,sans-serif', outline:'none', boxSizing:'border-box' as any }

  if (!allowed) return <div style={{ minHeight:'100vh', background:'#0A0A0F', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontFamily:'system-ui,sans-serif' }}>Verificando...</div>

  return (
    <div style={{ minHeight:'100vh', background:'#F8F7F4', fontFamily:'system-ui,sans-serif' }}>
      <div style={{ background:'#0A0A0F', borderBottom:'1px solid rgba(212,175,55,0.15)', padding:'12px 24px', display:'flex', alignItems:'center', gap:'12px', position:'sticky', top:0, zIndex:10 }}>
        <div style={{ fontSize:'18px', fontWeight:800, color:'#fff' }}>Clara<span style={{ color:'#D4AF37' }}>System</span></div>
        <span style={{ background:'#D4AF37', color:'#0A0A0F', fontSize:'10px', fontWeight:700, padding:'2px 8px', borderRadius:'20px' }}>ADMIN</span>
        <div style={{ fontSize:'12px', color:'#4A4A5A', marginLeft:'4px' }}>Panel de Laura · Negocio Delegable</div>
        <div style={{ marginLeft:'auto', display:'flex', gap:'8px' }}>
          <button onClick={loadAgencies} style={{ ...btn, background:'rgba(255,255,255,0.05)', color:'#64748B' }}>⟳ Actualizar</button>
          <button onClick={()=>{ sessionStorage.removeItem('admin_access'); window.location.href='/auth' }} style={{ ...btn, background:'rgba(255,255,255,0.05)', color:'#64748B' }}>Salir</button>
        </div>
      </div>

      <div style={{ maxWidth:'1100px', margin:'0 auto', padding:'20px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'12px', marginBottom:'20px' }}>
          {[
            { label:'Agencias totales', value:agencies.length, color:'#E8623A' },
            { label:'En trial', value:onTrial, color:'#D97706' },
            { label:'Pagando', value:paying, color:'#059669' },
            { label:'Trial vencido', value:expired, color:'#DC2626' },
            { label:'MRR estimado', value:'USD '+totalMRR, color:'#7C3AED' },
          ].map(k => (
            <div key={k.label} style={{ background:'#fff', border:'1px solid #E2E0D8', borderRadius:'10px', padding:'14px' }}>
              <div style={{ fontSize:'10px', color:'#64748B', marginBottom:'4px' }}>{k.label}</div>
              <div style={{ fontSize:'22px', fontWeight:700, color:k.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display:'flex', gap:'10px', marginBottom:'14px', flexWrap:'wrap' }}>
          <div style={{ flex:1, minWidth:'200px', display:'flex', alignItems:'center', gap:'8px', background:'#fff', border:'1px solid #E2E0D8', borderRadius:'8px', padding:'8px 12px' }}>
            <span style={{ color:'#94A3B8' }}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar agencia, email o nombre..." style={{ border:'none', outline:'none', fontSize:'13px', fontFamily:'system-ui,sans-serif', flex:1 }} />
          </div>
          <div style={{ display:'flex', border:'1px solid #E2E0D8', borderRadius:'8px', overflow:'hidden' }}>
            {(['all','trial','active','inactive'] as const).map((t,i) => (
              <button key={t} onClick={()=>setTab(t)} style={{ ...btn, borderRadius:0, background:tab===t?'#0A0A0F':'#fff', color:tab===t?'#D4AF37':'#64748B' }}>
                {['Todas','En trial','Activas','Vencidas'][i]}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign:'center', padding:'40px', color:'#94A3B8' }}>Cargando agencias...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px', color:'#94A3B8' }}>
            <div style={{ fontSize:'40px', marginBottom:'12px' }}>🏢</div>
            <div>Sin agencias todavía</div>
            <div style={{ fontSize:'13px', marginTop:'8px', color:'#64748B' }}>Cuando las dueñas se registren van a aparecer acá</div>
          </div>
        ) : (
          <div style={{ background:'#fff', border:'1px solid #E2E0D8', borderRadius:'12px', overflow:'hidden' }}>
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1.5fr 1fr 0.8fr 0.8fr 0.8fr 2fr', padding:'10px 16px', background:'#F1EFE8', borderBottom:'1px solid #E2E0D8' }}>
              {['Agencia','Email','Plan','Clientes','Trial','Registro','Acciones'].map(h => (
                <span key={h} style={{ fontSize:'10px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px', color:'#64748B' }}>{h}</span>
              ))}
            </div>
            {filtered.map(a => {
              const trialEnd = new Date(a.trial_ends_at)
              const isExpired = trialEnd < now
              const daysLeft = Math.round((trialEnd.getTime()-now.getTime())/86400000)
              return (
                <div key={a.id} style={{ display:'grid', gridTemplateColumns:'2fr 1.5fr 1fr 0.8fr 0.8fr 0.8fr 2fr', padding:'11px 16px', borderBottom:'1px solid #F1EFE8', alignItems:'center' }}>
                  <div>
                    <div style={{ fontSize:'13px', fontWeight:600 }}>{a.agency_name || '—'}</div>
                    <div style={{ fontSize:'11px', color:'#94A3B8' }}>{a.full_name}</div>
                  </div>
                  <div style={{ fontSize:'12px', color:'#64748B', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.email}</div>
                  <div>
                    {editingId === a.id ? (
                      <select value={editPlan} onChange={e=>setEditPlan(e.target.value)} onBlur={()=>editPlan&&updatePlan(a.id,editPlan)} autoFocus
                        style={{ fontSize:'11px', padding:'4px 8px', borderRadius:'6px', border:'1px solid #E2E0D8', width:'100%' }}>
                        {PLANS.map(p=><option key={p} value={p}>{p}</option>)}
                      </select>
                    ) : (
                      <span style={{ fontSize:'11px', fontWeight:700, padding:'2px 8px', borderRadius:'20px', background:PLAN_COLORS[a.plan]+'18', color:PLAN_COLORS[a.plan] }}>
                        {a.plan}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize:'12px' }}><span style={{ fontWeight:700 }}>{a.client_count}</span><span style={{ color:'#94A3B8' }}>/{a.max_clients}</span></div>
                  <div>
                    {isExpired
                      ? <span style={{ fontSize:'11px', fontWeight:700, color:'#DC2626' }}>Vencido</span>
                      : <span style={{ fontSize:'11px', fontWeight:700, color:daysLeft<=3?'#DC2626':'#D97706' }}>{daysLeft}d</span>
                    }
                  </div>
                  <div style={{ fontSize:'11px', color:'#94A3B8' }}>
                    {format(new Date(a.created_at),'dd MMM yy',{locale:es})}
                  </div>
                  <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
                    <button onClick={()=>{setEditingId(a.id);setEditPlan(a.plan)}} style={{ ...btn, background:'#F1EFE8', color:'#475569', padding:'5px 8px', fontSize:'11px' }}>✏️ Plan</button>
                    <button onClick={()=>extendTrial(a.id)} style={{ ...btn, background:'#FEF3C7', color:'#92400E', padding:'5px 8px', fontSize:'11px' }}>+14d</button>
                    <button onClick={()=>{setMsgAgency(a);setMsgText('')}} style={{ ...btn, background:'#DBEAFE', color:'#1E40AF', padding:'5px 8px', fontSize:'11px' }}>✉️</button>
                    <button onClick={()=>{setPaymentAgency(a);setPaymentAmount('');setPaymentNote('')}} style={{ ...btn, background:'#D1FAE5', color:'#065F46', padding:'5px 8px', fontSize:'11px' }}>💰</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px', marginTop:'16px' }}>
          {PLANS.map(plan => {
            const count = agencies.filter(a=>a.plan===plan).length
            return (
              <div key={plan} style={{ background:'#fff', border:'1px solid #E2E0D8', borderRadius:'10px', padding:'14px', textAlign:'center' }}>
                <div style={{ fontSize:'10px', fontWeight:700, color:PLAN_COLORS[plan], textTransform:'uppercase', marginBottom:'4px' }}>{plan}</div>
                <div style={{ fontSize:'24px', fontWeight:700, color:PLAN_COLORS[plan] }}>{count}</div>
                <div style={{ fontSize:'11px', color:'#94A3B8' }}>USD {count*PLAN_PRICES[plan]}/mes</div>
              </div>
            )
          })}
        </div>
      </div>

      {msgAgency && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50, padding:'16px' }}>
          <div style={{ background:'#fff', borderRadius:'16px', padding:'24px', width:'100%', maxWidth:'440px' }}>
            <h2 style={{ fontSize:'18px', fontWeight:700, marginBottom:'6px' }}>✉️ Enviar mensaje</h2>
            <p style={{ fontSize:'13px', color:'#64748B', marginBottom:'16px' }}>Para: <strong>{msgAgency.agency_name}</strong> · {msgAgency.email}</p>
            <textarea value={msgText} onChange={e=>setMsgText(e.target.value)}
              placeholder="Escribí tu mensaje acá..."
              rows={5} style={{ ...inp, resize:'none', marginBottom:'16px' }} />
            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={()=>setMsgAgency(null)} style={{ flex:1, padding:'10px', borderRadius:'8px', border:'1px solid #E2E0D8', background:'#fff', cursor:'pointer', fontSize:'13px', fontFamily:'system-ui,sans-serif' }}>Cancelar</button>
              <button onClick={sendMessage} disabled={sending||!msgText.trim()} style={{ flex:1, padding:'10px', borderRadius:'8px', border:'none', background:'#0A0A0F', color:'#D4AF37', cursor:'pointer', fontSize:'13px', fontWeight:700, fontFamily:'system-ui,sans-serif', opacity:sending||!msgText.trim()?0.5:1 }}>
                {sending?'Enviando...':'Enviar →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {paymentAgency && (
        <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50, padding:'16px' }}>
          <div style={{ background:'#fff', borderRadius:'16px', padding:'24px', width:'100%', maxWidth:'380px' }}>
            <h2 style={{ fontSize:'18px', fontWeight:700, marginBottom:'6px' }}>💰 Registrar pago</h2>
            <p style={{ fontSize:'13px', color:'#64748B', marginBottom:'16px' }}>{paymentAgency.agency_name} · Plan {paymentAgency.plan}</p>
            <div style={{ marginBottom:'12px' }}>
              <label style={{ display:'block', fontSize:'11px', fontWeight:700, color:'#64748B', marginBottom:'5px' }}>MONTO (USD)</label>
              <input type="number" value={paymentAmount} onChange={e=>setPaymentAmount(e.target.value)} placeholder={String(PLAN_PRICES[paymentAgency.plan])} style={inp} />
            </div>
            <div style={{ marginBottom:'16px' }}>
              <label style={{ display:'block', fontSize:'11px', fontWeight:700, color:'#64748B', marginBottom:'5px' }}>NOTA (opcional)</label>
              <input value={paymentNote} onChange={e=>setPaymentNote(e.target.value)} placeholder="Ej: Transferencia Mayo 2025" style={inp} />
            </div>
            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={()=>setPaymentAgency(null)} style={{ flex:1, padding:'10px', borderRadius:'8px', border:'1px solid #E2E0D8', background:'#fff', cursor:'pointer', fontSize:'13px', fontFamily:'system-ui,sans-serif' }}>Cancelar</button>
              <button onClick={registerPayment} disabled={!paymentAmount} style={{ flex:1, padding:'10px', borderRadius:'8px', border:'none', background:'#059669', color:'#fff', cursor:'pointer', fontSize:'13px', fontWeight:700, fontFamily:'system-ui,sans-serif', opacity:!paymentAmount?0.5:1 }}>
                Registrar ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={{ position:'fixed', bottom:'20px', right:'20px', background:'#1E293B', color:'#fff', padding:'12px 16px', borderRadius:'10px', fontSize:'13px', fontWeight:500, borderLeft:'3px solid #14B8A6', zIndex:99 }}>{toast}</div>}
    </div>
  )
}

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  try {
    const { approvalId, action, clientName, feedback, agencyId } = await req.json()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const resendKey = process.env.RESEND_API_KEY

    if (!supabaseUrl || !supabaseKey || !resendKey) {
      return NextResponse.json({ error: 'Missing config' }, { status: 503 })
    }

    // Get approval details
    const apRes = await fetch(`${supabaseUrl}/rest/v1/approvals?id=eq.${approvalId}&select=*,client:clients(name,agency_id)`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    })
    const approvals = await apRes.json()
    const approval = approvals?.[0]
    if (!approval) return NextResponse.json({ error: 'Approval not found' }, { status: 404 })

    const agId = agencyId || approval.client?.agency_id
    if (!agId) return NextResponse.json({ error: 'No agency id' }, { status: 400 })

    // Get team members
    const tmRes = await fetch(`${supabaseUrl}/rest/v1/team_members?agency_id=eq.${agId}&select=email,full_name`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    })
    const teamMembers = await tmRes.json()

    // Get agency profile email too
    const prRes = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${agId}&select=email,full_name,agency_name`, {
      headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` }
    })
    const profiles = await prRes.json()
    const agencyProfile = profiles?.[0]

    const isApproved = action === 'approved'
    const subject = isApproved
      ? `✅ ${clientName} aprobó: ${approval.piece_name}`
      : `📝 ${clientName} pide cambios en: ${approval.piece_name}`

    const emailBody = `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <div style="background:#0A0A0F;border-radius:12px 12px 0 0;padding:20px;text-align:center">
          <div style="font-size:20px;font-weight:800;color:#fff">Clara<span style="color:#D4AF37">System</span></div>
        </div>
        <div style="background:#fff;padding:24px;border:1px solid #E2E0D8;border-top:none;border-radius:0 0 12px 12px">
          <div style="font-size:32px;text-align:center;margin-bottom:16px">${isApproved ? '✅' : '📝'}</div>
          <h2 style="font-size:18px;font-weight:700;color:#0F172A;margin:0 0 12px;text-align:center">
            ${isApproved ? '¡Aprobado!' : 'Cambios solicitados'}
          </h2>
          <div style="background:#F8F7F4;border-radius:10px;padding:14px;margin-bottom:16px">
            <div style="font-size:11px;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Pieza</div>
            <div style="font-size:15px;font-weight:700;color:#0F172A">${approval.piece_name}</div>
            <div style="font-size:12px;color:#64748B;margin-top:2px">${approval.piece_type}</div>
          </div>
          <div style="font-size:14px;color:#475569;margin-bottom:${feedback ? '12px' : '0'}">
            <strong>${clientName}</strong> ${isApproved ? 'aprobó esta pieza.' : 'solicitó los siguientes cambios:'}
          </div>
          ${feedback ? `<div style="background:#FFFBEB;border-left:3px solid #D97706;padding:12px;border-radius:4px;font-size:13px;color:#78350F;font-style:italic">"${feedback}"</div>` : ''}
          <div style="margin-top:20px;padding-top:16px;border-top:1px solid #E2E0D8;font-size:12px;color:#94A3B8;text-align:center">
            ClaraSystem · ${agencyProfile?.agency_name || 'Tu agencia'}
          </div>
        </div>
      </div>
    `

    // Send to all team members + agency owner
    const recipients = [
      ...(teamMembers || []).map((m: any) => m.email),
      ...(agencyProfile?.email ? [agencyProfile.email] : [])
    ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i) // deduplicate

    for (const email of recipients) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'ClaraSystem <onboarding@resend.dev>',
          to: [email],
          subject,
          html: emailBody,
        }),
      })
    }

    return NextResponse.json({ success: true, sent: recipients.length })
  } catch (e: any) {
    console.error('[team-notify]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

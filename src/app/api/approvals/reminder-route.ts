import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const resendKey = process.env.RESEND_API_KEY
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://clarasystem.vercel.app'

    if (!supabaseUrl || !supabaseKey || !resendKey) {
      return NextResponse.json({ error: 'Missing config' }, { status: 503 })
    }

    // Get approvals pending for more than 48 hours
    const cutoff = new Date(Date.now() - 48 * 3600000).toISOString()
    const res = await fetch(
      `${supabaseUrl}/rest/v1/approvals?status=eq.pending&created_at=lt.${cutoff}&select=*,client:clients(name,email,agency_id)`,
      { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } }
    )
    const staleApprovals = await res.json()

    let sent = 0
    for (const approval of staleApprovals || []) {
      const client = approval.client
      if (!client?.email) continue

      const hours = Math.round((Date.now() - new Date(approval.created_at).getTime()) / 3600000)
      const portalUrl = `${appUrl}/portal/${approval.client_token}`

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'ClaraSystem <onboarding@resend.dev>',
          to: [client.email],
          subject: `Recordatorio: Tenés contenido esperando tu revisión 📬`,
          html: `
            <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px">
              <div style="background:#0A0A0F;border-radius:12px 12px 0 0;padding:20px;text-align:center">
                <div style="font-size:20px;font-weight:800;color:#fff">Clara<span style="color:#D4AF37">System</span></div>
              </div>
              <div style="background:#fff;padding:24px;border:1px solid #E2E0D8;border-top:none;border-radius:0 0 12px 12px">
                <p style="font-size:16px;font-weight:600;color:#0F172A;margin:0 0 10px">Hola ${client.name} 👋</p>
                <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 20px">
                  Te recordamos que tenés contenido esperando tu aprobación hace <strong>${hours} horas</strong>.
                </p>
                <div style="background:#FEF3C7;border-radius:10px;padding:14px;margin-bottom:20px;border-left:4px solid #D97706">
                  <div style="font-size:11px;color:#92400E;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Pendiente de revisión</div>
                  <div style="font-size:15px;font-weight:700;color:#0F172A">${approval.piece_name}</div>
                  <div style="font-size:12px;color:#64748B">${approval.piece_type}</div>
                </div>
                <a href="${portalUrl}" style="display:block;background:linear-gradient(135deg,#D4AF37,#F5D060);color:#0A0A0F;text-decoration:none;text-align:center;padding:14px;border-radius:10px;font-size:15px;font-weight:800;margin-bottom:12px">
                  Ver y aprobar ahora →
                </a>
                <p style="font-size:12px;color:#94A3B8;text-align:center;margin:0">No necesitás crear cuenta.</p>
              </div>
            </div>
          `,
        }),
      })
      sent++
    }

    return NextResponse.json({ success: true, reminders_sent: sent })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

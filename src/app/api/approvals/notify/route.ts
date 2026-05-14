import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  try {
    const { clientEmail, clientName, pieceName, pieceType, approvalToken } = await req.json()
    if (!clientEmail || !approvalToken) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://clarasystem.vercel.app'
    const portalUrl = `${appUrl}/portal/${approvalToken}`
    const apiKey = process.env.RESEND_API_KEY

    if (!apiKey) {
      console.log('[Email] No API key configured')
      return NextResponse.json({ success: true, stub: true })
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ClaraSystem <onboarding@resend.dev>',
        to: [clientEmail],
        subject: `Tenés contenido nuevo para revisar: ${pieceName}`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;background:#F8F7F4;padding:32px 16px">
            <div style="background:#0A0A0F;border-radius:12px 12px 0 0;padding:24px;text-align:center">
              <div style="font-size:22px;font-weight:800;color:#ffffff">Clara<span style="color:#D4AF37">System</span></div>
              <div style="font-size:11px;color:#475569;margin-top:4px;letter-spacing:1px">by Negocio Delegable</div>
            </div>
            <div style="background:#ffffff;padding:32px;border:1px solid #E2E0D8;border-top:none;border-radius:0 0 12px 12px">
              <p style="font-size:16px;font-weight:600;color:#0F172A;margin:0 0 12px">Hola ${clientName || 'Cliente'} 👋</p>
              <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 24px">
                Hay contenido nuevo listo para que lo revises y apruebes.
              </p>
              <div style="background:#F8F7F4;border-radius:10px;padding:16px;margin-bottom:24px;border-left:4px solid #D4AF37">
                <div style="font-size:11px;color:#94A3B8;font-weight:700;text-transform:uppercase;margin-bottom:4px">Nueva pieza</div>
                <div style="font-size:16px;font-weight:700;color:#0F172A">${pieceName}</div>
                <div style="font-size:12px;color:#64748B;margin-top:2px">${pieceType}</div>
              </div>
              <a href="${portalUrl}" style="display:block;background:linear-gradient(135deg,#D4AF37,#F5D060);color:#0A0A0F;text-decoration:none;text-align:center;padding:14px 24px;border-radius:10px;font-size:15px;font-weight:800;margin-bottom:16px">
                Ver y aprobar →
              </a>
              <p style="font-size:12px;color:#94A3B8;text-align:center;margin:0">
                No necesitás crear cuenta. El link te lleva directo al portal.
              </p>
            </div>
          </div>
        `,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('[Resend] Error:', data)
      return NextResponse.json({ error: data }, { status: 500 })
    }

    return NextResponse.json({ success: true, emailId: data.id })
  } catch (e: any) {
    console.error('[Email] Exception:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

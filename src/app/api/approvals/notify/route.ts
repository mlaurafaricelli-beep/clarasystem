import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  try {
    const { clientEmail, clientName, pieceName, pieceType, approvalToken } = await req.json()
    if (!clientEmail || !approvalToken) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const portalUrl = `${appUrl}/portal/${approvalToken}`

    if (!process.env.RESEND_API_KEY) {
      console.log('[Email stub] Would send to:', clientEmail, 'portal:', portalUrl)
      return NextResponse.json({ success: true, stub: true })
    }

    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    const { data, error } = await resend.emails.send({
      from: 'ClaraSystem <notificaciones@agencyflow.app>',
      to: clientEmail,
      subject: `Tenés contenido nuevo para revisar: ${pieceName}`,
      html: `<p>Hola ${clientName},</p><p>Tenés nueva pieza para revisar: <strong>${pieceName}</strong></p><a href="${portalUrl}">Ver y aprobar →</a>`,
    })

    if (error) return NextResponse.json({ error }, { status: 500 })
    return NextResponse.json({ success: true, emailId: data?.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

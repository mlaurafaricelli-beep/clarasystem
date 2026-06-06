import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  try {
    const { memberEmail, memberName, taskTitle, clientName, dueDate, agencyName } = await req.json()
    
    const resendKey = process.env.RESEND_API_KEY
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://clarasystem.vercel.app'

    if (!resendKey || !memberEmail) {
      return NextResponse.json({ success: true, stub: true })
    }

    const dueDateFormatted = dueDate
      ? new Date(dueDate).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
      : null

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ClaraSystem <onboarding@resend.dev>',
        to: [memberEmail],
        subject: `📋 Nueva tarea asignada: ${taskTitle}`,
        html: `
          <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px">
            <div style="background:#0A0A0F;border-radius:12px 12px 0 0;padding:20px;text-align:center">
              <div style="font-size:20px;font-weight:800;color:#fff">Clara<span style="color:#D4AF37">System</span></div>
              <div style="font-size:11px;color:#475569;margin-top:4px">${agencyName || 'Tu agencia'}</div>
            </div>
            <div style="background:#fff;padding:28px;border:1px solid #E2E0D8;border-top:none;border-radius:0 0 12px 12px">
              <p style="font-size:16px;font-weight:600;color:#0F172A;margin:0 0 8px">Hola ${memberName} 👋</p>
              <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 20px">
                Te asignaron una nueva tarea.
              </p>
              <div style="background:#F8F7F4;border-radius:10px;padding:16px;margin-bottom:20px;border-left:4px solid #D4AF37">
                <div style="font-size:11px;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Nueva tarea</div>
                <div style="font-size:17px;font-weight:700;color:#0F172A;margin-bottom:6px">${taskTitle}</div>
                ${clientName ? `<div style="font-size:13px;color:#64748B;display:flex;align-items:center;gap:6px">👤 Cliente: <strong>${clientName}</strong></div>` : ''}
                ${dueDateFormatted ? `<div style="font-size:13px;color:#DC2626;margin-top:4px;font-weight:600">📅 Fecha límite: ${dueDateFormatted}</div>` : ''}
              </div>
              <p style="font-size:13px;color:#94A3B8;text-align:center;margin:0">
                Entrá al dashboard para ver todos los detalles.
              </p>
            </div>
          </div>
        `,
      }),
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[task-notify]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}


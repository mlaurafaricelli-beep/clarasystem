import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'ClaraSystem'

// ─── Notificar al cliente que tiene contenido nuevo ──────────────────────────
export async function sendApprovalNotification({
  clientEmail,
  clientName,
  agencyName,
  pieceName,
  pieceType,
  approvalToken,
}: {
  clientEmail: string
  clientName: string
  agencyName: string
  pieceName: string
  pieceType: string
  approvalToken: string
}) {
  const portalUrl = `${APP_URL}/portal/${approvalToken}`

  const { data, error } = await resend.emails.send({
    from: `${agencyName} via ${APP_NAME} <notificaciones@agencyflow.app>`,
    to: clientEmail,
    subject: `${agencyName}: Tenés contenido nuevo para revisar 📬`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:'Helvetica Neue',Arial,sans-serif;background:#F8F7F4;margin:0;padding:32px 16px">
  <div style="max-width:520px;margin:0 auto">
    <div style="background:#0F172A;border-radius:12px 12px 0 0;padding:24px;text-align:center">
      <div style="font-size:22px;font-weight:700;color:#fff">${agencyName}</div>
      <div style="font-size:11px;color:#475569;margin-top:4px;letter-spacing:1px;text-transform:uppercase">via ClaraSystem</div>
    </div>
    <div style="background:#fff;padding:32px;border:1px solid #E2E0D8;border-top:none">
      <p style="font-size:16px;font-weight:600;color:#0F172A;margin:0 0 12px">Hola ${clientName} 👋</p>
      <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 24px">
        Tu equipo subió nuevo contenido listo para que lo revisés y aprobés.
      </p>
      <div style="background:#F8F7F4;border-radius:10px;padding:16px;margin-bottom:24px;border-left:4px solid #E8623A">
        <div style="font-size:11px;color:#94A3B8;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Nueva pieza</div>
        <div style="font-size:16px;font-weight:700;color:#0F172A">${pieceName}</div>
        <div style="font-size:12px;color:#64748B;margin-top:2px">${pieceType}</div>
      </div>
      <a href="${portalUrl}" style="display:block;background:#E8623A;color:#fff;text-decoration:none;text-align:center;padding:14px 24px;border-radius:10px;font-size:15px;font-weight:700;margin-bottom:16px">
        Ver y aprobar contenido →
      </a>
      <p style="font-size:12px;color:#94A3B8;text-align:center;margin:0">
        No necesitás crear cuenta. El link te lleva directo al portal.
      </p>
    </div>
    <div style="background:#F1EFE8;border-radius:0 0 12px 12px;padding:16px;text-align:center;border:1px solid #E2E0D8;border-top:none">
      <p style="font-size:11px;color:#94A3B8;margin:0">Este email fue enviado por ${agencyName} · Powered by ${APP_NAME}</p>
    </div>
  </div>
</body>
</html>`,
  })

  if (error) console.error('[Resend] Error sending approval notification:', error)
  return { data, error }
}

// ─── Notificar al equipo que el cliente aprobó ───────────────────────────────
export async function sendTeamApprovalNotification({
  teamEmails,
  clientName,
  pieceName,
  action,
  feedback,
}: {
  teamEmails: string[]
  clientName: string
  pieceName: string
  action: 'approved' | 'changes_requested'
  feedback?: string
}) {
  const isApproved = action === 'approved'
  const subject = isApproved
    ? `✅ ${clientName} aprobó: ${pieceName}`
    : `📝 ${clientName} pide cambios en: ${pieceName}`

  for (const email of teamEmails) {
    await resend.emails.send({
      from: `${APP_NAME} <notificaciones@agencyflow.app>`,
      to: email,
      subject,
      html: `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#F8F7F4;margin:0;padding:32px 16px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #E2E0D8;overflow:hidden">
    <div style="background:${isApproved ? '#059669' : '#D97706'};padding:16px 24px">
      <div style="font-size:20px">${isApproved ? '✅' : '📝'}</div>
      <div style="font-size:16px;font-weight:700;color:#fff;margin-top:4px">${subject}</div>
    </div>
    <div style="padding:24px">
      <p style="font-size:14px;color:#475569;margin:0 0 16px">
        <strong>${clientName}</strong> ${isApproved ? 'aprobó la pieza' : 'solicitó cambios en'} <strong>"${pieceName}"</strong>
      </p>
      ${feedback ? `<div style="background:#FEF3C7;border-radius:8px;padding:12px;border-left:3px solid #D97706;font-size:13px;color:#78350F">"${feedback}"</div>` : ''}
      <p style="font-size:12px;color:#94A3B8;margin:16px 0 0">Entrá al dashboard para ver el detalle completo.</p>
    </div>
  </div>
</body>
</html>`,
    })
  }
}

// ─── Alerta de contrato por vencer ───────────────────────────────────────────
export async function sendContractRenewalAlert({
  agencyEmail,
  agencyName,
  clientName,
  daysLeft,
}: {
  agencyEmail: string
  agencyName: string
  clientName: string
  daysLeft: number
}) {
  await resend.emails.send({
    from: `${APP_NAME} <alertas@agencyflow.app>`,
    to: agencyEmail,
    subject: `⚠️ Recordatorio: Contrato de ${clientName} vence en ${daysLeft} días`,
    html: `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#F8F7F4;margin:0;padding:32px 16px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #E2E0D8;padding:24px">
    <div style="font-size:32px;margin-bottom:12px">⚠️</div>
    <h2 style="font-size:20px;color:#0F172A;margin:0 0 12px">Renovación próxima</h2>
    <p style="font-size:14px;color:#475569;line-height:1.6">
      El contrato de <strong>${clientName}</strong> vence en <strong>${daysLeft} días</strong>.
      Es un buen momento para hablar con ellos sobre la renovación.
    </p>
    <a href="${APP_URL}/dashboard/fichas" style="display:inline-block;background:#E8623A;color:#fff;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;margin-top:16px">
      Ver ficha del cliente →
    </a>
  </div>
</body>
</html>`,
  })
}

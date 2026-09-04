import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'

export async function POST(req: NextRequest) {
  const { email, nombre, clase_nombre, horario, sucursal, duracion, qr_token, spot_numero } = await req.json()
  const nombre1   = nombre?.split(' ')[0] || ''
  const fechaDate = new Date(horario)
  const fecha     = fechaDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const hora      = fechaDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

  // Generar QR como base64
  const qrDataUrl = await QRCode.toDataURL(qr_token, { width: 200, margin: 1 })
  const qrBase64  = qrDataUrl.split(',')[1]

  // Generar .ics para calendario
  const dtStart  = fechaDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const dtEnd    = new Date(fechaDate.getTime() + duracion * 60000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:Clase Muestra Navy — ${clase_nombre}`,
    `DESCRIPTION:Tu clase muestra en Navy Training Center. Sucursal: ${sucursal}`,
    `LOCATION:${sucursal}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  const html = `<!doctype html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f6;padding:32px 16px"><tr><td align="center"><table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%"><tr><td style="background:#171B24;border-radius:20px 20px 0 0;padding:36px 40px"><img src="https://crm.navytrainingcenter.com/logo-navy.svg" alt="NAVY" style="height:48px;display:block;margin-bottom:16px"><p style="font-family:'Gill Sans','Gill Sans MT',Calibri,sans-serif;font-size:11px;color:#9aa3b5;letter-spacing:3px;margin:0">TRAINING CENTER</p></td></tr><tr><td style="background:#fff;padding:36px 40px"><h2 style="color:#111;margin:0 0 8px;font-size:22px">🎉 ¡Tu clase muestra está confirmada!</h2><p style="color:#6b7280;font-size:15px;line-height:24px;margin:0 0 24px">Hola <strong>${nombre1}</strong>, te esperamos para tu clase muestra en Navy Training Center.</p><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9fafb;border-radius:16px;padding:24px;margin-bottom:24px"><tr><td style="font-size:14px;color:#374151;padding:6px 0;width:40%">Clase</td><td style="font-size:14px;font-weight:700;color:#111">${clase_nombre}</td></tr><tr><td style="font-size:14px;color:#374151;padding:6px 0">Fecha</td><td style="font-size:14px;font-weight:700;color:#111">${fecha}</td></tr><tr><td style="font-size:14px;color:#374151;padding:6px 0">Hora</td><td style="font-size:14px;font-weight:700;color:#111">${hora}</td></tr><tr><td style="font-size:14px;color:#374151;padding:6px 0">Duración</td><td style="font-size:14px;font-weight:700;color:#111">${duracion} minutos</td></tr><tr><td style="font-size:14px;color:#374151;padding:6px 0">Sucursal</td><td style="font-size:14px;font-weight:700;color:#111">${sucursal}</td></tr>${spot_numero ? `<tr><td style="font-size:14px;color:#374151;padding:6px 0">Tu spot</td><td style="font-size:14px;font-weight:700;color:#111">🎯 ${spot_numero}</td></tr>` : ''}<tr><td style="font-size:14px;color:#374151;padding:6px 0">Costo</td><td style="font-size:14px;font-weight:700;color:#22c55e">¡Gratis!</td></tr></table><p style="color:#374151;font-size:14px;font-weight:700;margin:0 0 12px">Tu QR de check-in:</p><div style="text-align:center;margin-bottom:24px"><img src="cid:qr_code" alt="QR Check-in" style="width:160px;height:160px;border-radius:12px"><p style="color:#9ca3af;font-size:12px;margin:8px 0 0">Presenta este QR al llegar a la sucursal</p></div><div style="background:#f0fdf4;border-left:4px solid #22c55e;border-radius:0 12px 12px 0;padding:14px 18px;margin-bottom:24px"><p style="color:#166534;font-size:13px;margin:0;line-height:20px">El archivo adjunto es un evento de calendario. Ábrelo para agregarlo a tu calendario.</p></div><p style="color:#6b7280;font-size:13px">¿Tienes dudas? Contáctanos en <a href="mailto:contacto@navytrainingcenter.com" style="color:#111">contacto@navytrainingcenter.com</a></p></td></tr><tr><td style="background:#f9fafb;border-radius:0 0 20px 20px;padding:20px 40px;text-align:center;border:1px solid #e5e7eb;border-top:none"><p style="color:#9ca3af;font-size:11px;margin:0">© 2026 Navy Training Center · Todos los derechos reservados</p></td></tr></table></td></tr></table></body></html>`

  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    'Navy Training Center <noreply@navytrainingcenter.com>',
      to:      email,
      subject: `🏋️ Tu clase muestra está confirmada — ${clase_nombre}`,
      html,
      attachments: [
        {
          filename:    'clase-navy.ics',
          content:     Buffer.from(icsContent).toString('base64'),
          content_type: 'text/calendar',
        },
        {
          filename:    'qr-checkin.png',
          content:     qrBase64,
          content_id:  'qr_code',
          content_type: 'image/png',
        },
      ],
    }),
  })

  return NextResponse.json({ ok: res.ok })
}
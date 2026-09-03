import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { email, nombre, paquete_nombre, vigencia_dias, fecha_inicio, fecha_fin, tiene_membresia } = await req.json()
  const nombre1 = nombre?.split(' ')[0] || ''

  const html = `
<!doctype html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f6;padding:32px 16px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%">

  <!-- Header -->
  <tr><td style="background:#171B24;border-radius:20px 20px 0 0;padding:36px 40px;text-align:center">
    <p style="color:#fff;font-size:28px;font-weight:900;margin:0;letter-spacing:4px">NAVY</p>
    <p style="color:#4b5563;font-size:10px;font-weight:700;margin:6px 0 0;letter-spacing:6px">TRAINING CENTER</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="background:#fff;padding:36px 40px">
    <h2 style="color:#111;margin:0 0 8px;font-size:22px">🎁 ¡Tienes un paquete de cortesía!</h2>
    <p style="color:#6b7280;font-size:15px;line-height:24px;margin:0 0 24px">
      Hola <strong>${nombre1}</strong>, el equipo Navy te ha asignado un paquete de cortesía. Aquí están los detalles:
    </p>

    <!-- Detalles del paquete -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9fafb;border-radius:16px;padding:24px;margin-bottom:24px">
      <tr>
        <td style="font-size:14px;color:#374151;padding:6px 0;width:40%">Paquete</td>
        <td style="font-size:14px;font-weight:700;color:#111">${paquete_nombre}</td>
      </tr>
      <tr>
        <td style="font-size:14px;color:#374151;padding:6px 0">Vigencia</td>
        <td style="font-size:14px;font-weight:700;color:#111">${vigencia_dias} días</td>
      </tr>
      <tr>
        <td style="font-size:14px;color:#374151;padding:6px 0">Fecha de inicio</td>
        <td style="font-size:14px;font-weight:700;color:#111">${fecha_inicio}</td>
      </tr>
      <tr>
        <td style="font-size:14px;color:#374151;padding:6px 0">Fecha de vencimiento</td>
        <td style="font-size:14px;font-weight:700;color:#111">${fecha_fin}</td>
      </tr>
      <tr>
        <td style="font-size:14px;color:#374151;padding:6px 0">Costo</td>
        <td style="font-size:14px;font-weight:700;color:#22c55e">¡Gratis! cortesía Navy</td>
      </tr>
    </table>

    ${tiene_membresia ? `
    <div style="background:#fef9c3;border-left:4px solid #f59e0b;border-radius:0 12px 12px 0;padding:16px 18px;margin-bottom:24px">
      <p style="color:#92400e;font-size:14px;margin:0;line-height:22px">
        <strong>Nota:</strong> Tu paquete de cortesía iniciará automáticamente al terminar tu membresía actual el <strong>${fecha_inicio}</strong>.
      </p>
    </div>` : ''}

    <p style="color:#6b7280;font-size:14px;line-height:22px;margin:0">
      Puedes ver tu paquete activo desde la app de Navy Training Center. ¡Nos vemos en el gym! 💪
    </p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f9fafb;border-radius:0 0 20px 20px;padding:20px 40px;text-align:center;border:1px solid #e5e7eb;border-top:none">
    <p style="color:#9ca3af;font-size:11px;margin:0">© 2026 Navy Training Center · Todos los derechos reservados</p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`

  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    'Navy Training Center <noreply@navytrainingcenter.com>',
      to:      email,
      subject: `🎁 ${nombre1}, tienes un paquete de cortesía en Navy`,
      html,
    }),
  })

  return NextResponse.json({ ok: res.ok })
}
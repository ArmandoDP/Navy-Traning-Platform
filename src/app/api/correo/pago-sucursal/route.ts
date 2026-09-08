import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend  = new Resend(process.env.RESEND_API_KEY)
const LOGO    = 'https://crm.navytrainingcenter.com/email/logo-navy.png'
const MESES   = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

function fmtNum(n: number) { return n.toLocaleString('es-MX') }

export async function POST(req: NextRequest) {
  const {
    email, nombre, paquete_nombre, vigencia_dias,
    fecha_inicio, fecha_fin, monto, metodo_pago,
    referencia, tiene_membresia_previa,
  } = await req.json()

  const nombre1  = (nombre || '').split(' ')[0] || 'cliente'
  const folio    = `NVY-${Date.now().toString(36).toUpperCase()}`
  const ahora    = new Date()
  const fechaStr = `${ahora.getDate()} de ${MESES[ahora.getMonth()]} de ${ahora.getFullYear()}, ${ahora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`
  const metodoEmoji = metodo_pago === 'Terminal' ? '💳 Terminal' : '💵 Efectivo'

  const html = `<!doctype html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0f2f5;padding:40px 16px">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;width:100%">

  <tr><td style="background:#171B24;border-radius:24px 24px 0 0;padding:40px 48px 32px;text-align:center">
    <img src="${LOGO}" alt="NAVY" width="130" style="display:block;width:130px;height:auto;margin:0 auto 20px">
    <div style="width:52px;height:52px;background:#22c55e;border-radius:50%;margin:0 auto 16px;line-height:52px;font-size:24px;color:#fff;text-align:center">✓</div>
    <p style="color:#fff;font-size:22px;font-weight:900;margin:0;letter-spacing:-0.4px">Membresía activada</p>
    <p style="color:#6b7280;font-size:12px;margin:6px 0 0;letter-spacing:2px;text-transform:uppercase">Comprobante de pago</p>
  </td></tr>

  <tr><td style="background:#ffffff;padding:40px 48px">
    <p style="color:#374151;font-size:15px;line-height:24px;margin:0 0 28px">
      Hola <strong>${nombre1}</strong>, tu membresía en Navy Training Center ha sido registrada exitosamente.
      ${tiene_membresia_previa ? 'Se activará automáticamente cuando termine tu plan actual.' : 'Ya está activa.'}
    </p>

    <!-- Plan -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#171B24;border-radius:18px;padding:24px;margin-bottom:24px;text-align:center">
      <tr><td>
        <p style="color:#9ca3af;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px">Tu plan</p>
        <p style="color:#fff;font-size:22px;font-weight:900;margin:0 0 4px">${paquete_nombre}</p>
        <p style="color:#9ca3af;font-size:13px;margin:0">${vigencia_dias} días de vigencia</p>
      </td></tr>
    </table>

    <!-- Vigencia -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #f3f4f6;border-radius:14px;overflow:hidden;margin-bottom:24px">
      <tr><td style="padding:12px 20px;background:#fafafa;border-bottom:1px solid #f3f4f6">
        <table width="100%"><tr>
          <td style="color:#9ca3af;font-size:12px">Inicio</td>
          <td align="right" style="color:#111;font-size:12px;font-weight:700">${fecha_inicio}</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:12px 20px;background:#fafafa;border-bottom:1px solid #f3f4f6">
        <table width="100%"><tr>
          <td style="color:#9ca3af;font-size:12px">Vencimiento</td>
          <td align="right" style="color:#111;font-size:12px;font-weight:700">${fecha_fin}</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:12px 20px;background:#fafafa;border-bottom:1px solid #f3f4f6">
        <table width="100%"><tr>
          <td style="color:#9ca3af;font-size:12px">Fecha de pago</td>
          <td align="right" style="color:#111;font-size:12px;font-weight:700">${fechaStr}</td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:12px 20px;background:#fafafa;border-bottom:1px solid #f3f4f6">
        <table width="100%"><tr>
          <td style="color:#9ca3af;font-size:12px">Método de pago</td>
          <td align="right" style="color:#111;font-size:12px;font-weight:700">${metodoEmoji}</td>
        </tr></table>
      </td></tr>
      ${referencia ? `<tr><td style="padding:12px 20px;background:#fafafa;border-bottom:1px solid #f3f4f6">
        <table width="100%"><tr>
          <td style="color:#9ca3af;font-size:12px">No. Operación</td>
          <td align="right" style="color:#111;font-size:12px;font-weight:700;font-family:monospace">${referencia}</td>
        </tr></table>
      </td></tr>` : ''}
      <tr><td style="padding:14px 20px;background:#f0fdf4">
        <table width="100%"><tr>
          <td style="color:#15803d;font-size:13px;font-weight:700">Total pagado</td>
          <td align="right" style="color:#15803d;font-size:18px;font-weight:900">$${fmtNum(monto)} MXN</td>
        </tr></table>
      </td></tr>
    </table>

    <!-- Folio -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9fafb;border:2px solid #e5e7eb;border-radius:14px;padding:16px 20px;margin-bottom:28px;text-align:center">
      <tr><td>
        <p style="font-size:11px;font-weight:700;color:#9ca3af;letter-spacing:3px;margin:0 0 6px;text-transform:uppercase">Folio</p>
        <p style="font-size:15px;font-weight:900;color:#111;margin:0;font-family:monospace">${folio}</p>
      </td></tr>
    </table>

    <p style="color:#d1d5db;font-size:12px;line-height:20px;margin:0;text-align:center">
      ¿Dudas? Escríbenos a <a href="mailto:contacto@navytrainingcenter.com" style="color:#111">contacto@navytrainingcenter.com</a>
    </p>
  </td></tr>

  <tr><td style="background:#f9fafb;border-radius:0 0 24px 24px;padding:24px 48px;text-align:center;border:1px solid #e5e7eb;border-top:none">
    <p style="color:#9ca3af;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin:0 0 4px;font-weight:700">Navy Training Center</p>
    <p style="color:#d1d5db;font-size:10px;margin:0">© 2026 · navytrainingcenter.com</p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`

  await resend.emails.send({
    from:    'Navy Training Center <noreply@navytrainingcenter.com>',
    to:      email,
    subject: `🏋️ ${nombre1}, tu membresía ${paquete_nombre} está lista`,
    html,
  })

  return NextResponse.json({ ok: true })
}
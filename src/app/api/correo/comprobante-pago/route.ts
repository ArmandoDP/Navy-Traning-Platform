import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const {
    email, nombre, paquete_nombre, vigencia_dias,
    fecha_inicio, fecha_fin, monto, metodo_pago,
    referencia, sucursal_nombre, clases_incluidas,
    acceso_total, acceso_sucursal_hermana, es_recurrente,
    descripcion, tiene_membresia_previa, folio,
  } = await req.json()

  const nombre1    = (nombre || '').split(' ')[0] || 'cliente'
  const folioFinal = folio || `NVY-${Date.now().toString(36).toUpperCase()}`
  const montoFmt   = Number(monto).toLocaleString('es-MX')
  const metodoEmoji = metodo_pago === 'Terminal' ? '💳 Terminal' : metodo_pago === 'Efectivo' ? '💵 Efectivo' : '💳 Tarjeta'

  // Beneficios dinámicos
  const beneficios = [
    clases_incluidas ? `${clases_incluidas} clase${clases_incluidas > 1 ? 's' : ''} incluida${clases_incluidas > 1 ? 's' : ''}` : 'Acceso ilimitado a clases',
    `${vigencia_dias} días de vigencia`,
    acceso_total             ? 'Acceso a todas las salas' : null,
    acceso_sucursal_hermana  ? 'Acceso a sucursal hermana' : null,
    es_recurrente            ? 'Renovación automática' : null,
  ].filter(Boolean) as string[]

  const beneficiosHtml = beneficios.map(b => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #1e3a5f">
        <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
          <td style="width:20px;color:#6366f1;font-size:14px;font-weight:900">✓</td>
          <td style="font-family:Arial,sans-serif;font-size:14px;color:#cbd5e1;padding-left:8px">${b}</td>
        </tr></table>
      </td>
    </tr>`).join('')

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>Comprobante de pago — NAVY</title>
<style>
  @media only screen and (max-width:620px){
    .container{width:100%!important;}
    .px{padding-left:24px!important;padding-right:24px!important;}
    .monto-txt{font-size:44px!important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background:#0f172a;-webkit-text-size-adjust:100%;">
<span style="display:none;font-size:1px;color:#0f172a;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">Comprobante de tu membresía ${paquete_nombre} en Navy Training Center — $${montoFmt} MXN</span>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0f172a;">
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="container" style="width:600px;max-width:600px;">

  <!-- HEADER -->
  <tr><td style="background:linear-gradient(145deg,#0f172a 0%,#171B24 40%,#1e2d40 70%,#0f172a 100%);border-radius:28px 28px 0 0;padding:52px 52px 44px;text-align:center;">

    <!-- Línea decorativa top -->
    <table width="100" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 32px;">
      <tr><td style="height:3px;background:linear-gradient(90deg,transparent,#6366f1,#818cf8,#6366f1,transparent);border-radius:2px;"></td></tr>
    </table>

    <!-- Logo -->
    <img src="https://crm.navytrainingcenter.com/email/navy-icon-white.png" alt="NAVY" width="140" style="display:block;width:140px;height:auto;border:0;margin:0 0 40px;filter:brightness(0) invert(1);">
    

    <!-- Badge -->
    <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 20px;">
      <tr><td style="background:rgba(34,197,94,0.15);border:1px solid rgba(34,197,94,0.35);border-radius:50px;padding:8px 22px;">
        <p style="color:#4ade80;font-size:11px;font-weight:700;margin:0;letter-spacing:3px;text-transform:uppercase;">✓ Pago confirmado</p>
      </td></tr>
    </table>

    <p style="color:#f1f5f9;font-size:28px;font-weight:900;margin:0 0 8px;letter-spacing:-0.5px;">Membresía activada</p>
    <p style="color:#475569;font-size:14px;margin:0;">Hola ${nombre1}, aquí está tu comprobante de compra</p>

    <!-- Línea decorativa bottom -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:40px;">
      <tr><td style="height:1px;background:linear-gradient(90deg,transparent,#1e3a5f 30%,#2d4a6f 50%,#1e3a5f 70%,transparent);"></td></tr>
    </table>
  </td></tr>

  <!-- MONTO HERO -->
  <tr><td style="background:#171B24;padding:44px 52px;text-align:center;">
    <p style="font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:#475569;letter-spacing:4px;text-transform:uppercase;margin:0 0 12px;">Total pagado</p>
    <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
      <tr><td style="background:linear-gradient(135deg,#0f172a,#1e2d40);border-radius:20px;padding:3px;">
        <table cellpadding="0" cellspacing="0" border="0">
          <tr><td style="background:linear-gradient(135deg,#171B24,#0f172a);border-radius:18px;padding:24px 48px;text-align:center;">
            <p class="monto-txt" style="font-family:Arial,sans-serif;font-size:52px;font-weight:900;color:#f1f5f9;margin:0;letter-spacing:-1px;">$${montoFmt}</p>
            <p style="font-family:Arial,sans-serif;font-size:13px;color:#475569;margin:6px 0 0;letter-spacing:2px;">MXN</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>

  <!-- PLAN -->
  <tr><td style="background:#171B24;padding:0 52px 44px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:20px;overflow:hidden;">
      <tr><td style="background:rgba(99,102,241,0.15);padding:20px 28px;border-bottom:1px solid rgba(99,102,241,0.2);">
        <p style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;color:#818cf8;letter-spacing:4px;text-transform:uppercase;margin:0 0 4px;">Tu plan</p>
        <p style="font-family:Arial,sans-serif;font-size:22px;font-weight:900;color:#f1f5f9;margin:0;">${paquete_nombre}</p>
        ${descripcion ? `<p style="font-family:Arial,sans-serif;font-size:13px;color:#64748b;margin:6px 0 0;">${descripcion}</p>` : ''}
      </td></tr>
      <tr><td style="padding:20px 28px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          ${beneficiosHtml}
        </table>
      </td></tr>
    </table>
  </td></tr>

  <!-- DETALLE PAGO -->
  <tr><td style="background:#0f172a;padding:44px 52px;">
    <p style="font-family:Arial,sans-serif;font-size:10px;font-weight:700;color:#334155;letter-spacing:4px;text-transform:uppercase;margin:0 0 20px;">Detalle del pago</p>

    <table width="100%" cellpadding="0" cellspacing="0" border="0">

      <!-- Fila: Plan -->
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #1e3a5f;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="font-family:Arial,sans-serif;font-size:13px;color:#475569;">Plan</td>
            <td align="right" style="font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#cbd5e1;">${paquete_nombre}</td>
          </tr></table>
        </td>
      </tr>

      <!-- Fila: Sucursal -->
      ${sucursal_nombre ? `<tr>
        <td style="padding:14px 0;border-bottom:1px solid #1e3a5f;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="font-family:Arial,sans-serif;font-size:13px;color:#475569;">Sucursal</td>
            <td align="right" style="font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#cbd5e1;">${sucursal_nombre}</td>
          </tr></table>
        </td>
      </tr>` : ''}

      <!-- Fila: Inicia -->
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #1e3a5f;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="font-family:Arial,sans-serif;font-size:13px;color:#475569;">Inicia</td>
            <td align="right" style="font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#cbd5e1;">${fecha_inicio}</td>
          </tr></table>
        </td>
      </tr>

      <!-- Fila: Vence -->
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #1e3a5f;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="font-family:Arial,sans-serif;font-size:13px;color:#475569;">Vence</td>
            <td align="right" style="font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#cbd5e1;">${fecha_fin}</td>
          </tr></table>
        </td>
      </tr>

      <!-- Fila: Método -->
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #1e3a5f;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="font-family:Arial,sans-serif;font-size:13px;color:#475569;">Método de pago</td>
            <td align="right" style="font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#cbd5e1;">${metodoEmoji}</td>
          </tr></table>
        </td>
      </tr>

      ${referencia ? `<!-- Fila: Referencia -->
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #1e3a5f;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="font-family:Arial,sans-serif;font-size:13px;color:#475569;">No. Operación</td>
            <td align="right" style="font-family:'Courier New',monospace;font-size:13px;font-weight:700;color:#cbd5e1;">${referencia}</td>
          </tr></table>
        </td>
      </tr>` : ''}

      <!-- Fila: Folio -->
      <tr>
        <td style="padding:14px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td style="font-family:Arial,sans-serif;font-size:13px;color:#475569;">Folio</td>
            <td align="right" style="font-family:'Courier New',monospace;font-size:13px;font-weight:700;color:#94a3b8;">${folioFinal}</td>
          </tr></table>
        </td>
      </tr>

    </table>

    ${tiene_membresia_previa ? `
    <!-- Aviso cola -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;">
      <tr><td style="background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.2);border-radius:14px;padding:16px 20px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
          <td style="width:24px;font-size:16px;vertical-align:top;">⏳</td>
          <td style="padding-left:12px;font-family:Arial,sans-serif;font-size:12px;color:#fbbf24;line-height:20px;">
            Tu nuevo plan se activará automáticamente cuando termine tu membresía actual.
          </td>
        </tr></table>
      </td></tr>
    </table>` : ''}

    <!-- Seguridad -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;">
      <tr><td style="background:#0a1628;border:1px solid #1e3a5f;border-radius:14px;padding:16px 20px;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
          <td style="width:24px;font-size:16px;vertical-align:top;">🛡️</td>
          <td style="padding-left:12px;font-family:Arial,sans-serif;font-size:12px;color:#64748b;line-height:20px;">
            ¿Dudas sobre este cargo? Escríbenos a <a href="mailto:contacto@navytrainingcenter.com" style="color:#6366f1;text-decoration:none;">contacto@navytrainingcenter.com</a>
          </td>
        </tr></table>
      </td></tr>
    </table>
  </td></tr>

  <!-- FOOTER -->
  <tr><td style="background:linear-gradient(145deg,#0f172a,#171B24);border-radius:0 0 28px 28px;padding:32px 52px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
      <tr><td style="text-align:center;">
        <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
          <tr>
            <td style="padding:0 14px;border-right:1px solid #1e3a5f;"><p style="color:#334155;font-size:9px;margin:0;letter-spacing:2px;text-transform:uppercase;">Condesa</p></td>
            <td style="padding:0 14px;border-right:1px solid #1e3a5f;"><p style="color:#334155;font-size:9px;margin:0;letter-spacing:2px;text-transform:uppercase;">Lomas</p></td>
            <td style="padding:0 14px;border-right:1px solid #1e3a5f;"><p style="color:#334155;font-size:9px;margin:0;letter-spacing:2px;text-transform:uppercase;">Interlomas</p></td>
            <td style="padding:0 14px;"><p style="color:#334155;font-size:9px;margin:0;letter-spacing:2px;text-transform:uppercase;">Juriquilla</p></td>
          </tr>
        </table>
      </td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="height:1px;background:linear-gradient(90deg,transparent,#1e3a5f,transparent);"></td></tr>
    </table>
    <p style="font-family:Arial,sans-serif;color:#1e3a5f;font-size:10px;margin:16px 0 0;text-align:center;letter-spacing:2px;text-transform:uppercase;">© 2026 Navy Training Center · navytrainingcenter.com</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`

  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    'Navy Training Center <noreply@navytrainingcenter.com>',
      to:      email,
      subject: `${nombre1}, tu membresía ${paquete_nombre} está activa`,
      html,
    }),
  })

  return NextResponse.json({ ok: res.ok })
}
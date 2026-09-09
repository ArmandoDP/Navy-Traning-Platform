import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { email, nombre } = await req.json()
  const nombre1 = nombre?.split(' ')[0] || ''

  const html = `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="x-apple-disable-message-reformatting">
<title>Activa tu acceso — NAVY Condesa</title>
<style>
  @media only screen and (max-width: 620px) {
    .container { width: 100% !important; }
    .px { padding-left: 24px !important; padding-right: 24px !important; }
    .step-num { font-size: 26px !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background-color:#f2f2f2; -webkit-text-size-adjust:100%;">
<span style="display:none; font-size:1px; color:#f2f2f2; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">Activa tu acceso en la app NAVY Training — toma un minuto.</span>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f2f2f2;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="container" style="width:600px; max-width:600px; background-color:#ffffff;">

  <tr><td align="center" style="padding:36px 48px 28px 48px;">
    <img src="https://crm.navytrainingcenter.com/email/logo-navy.png" alt="NAVY Training" width="150" style="display:block; width:150px; height:auto; border:0;">
  </td></tr>

  <tr><td style="line-height:0;">
    <img src="https://crm.navytrainingcenter.com/email/hero-banner.png" alt="La app NAVY Training" width="600" style="display:block; width:100%; height:auto; border:0;">
  </td></tr>

  <tr><td class="px" style="padding:44px 48px 0 48px;">
    <div style="font-family:Arial, Helvetica, sans-serif; font-size:30px; line-height:1.15; font-weight:bold; letter-spacing:1px; color:#0a0a0a; text-transform:uppercase;">Tu acceso a NAVY Condesa ya est&aacute; listo.</div>
  </td></tr>

  <tr><td class="px" style="padding:28px 48px 0 48px;">
    <div style="font-family:Arial, Helvetica, sans-serif; font-size:17px; line-height:1.55; color:#0a0a0a;">
      Hola, ${nombre1}:<br><br>
      Ya estamos abiertos y te esperamos. Solo necesitas una cosa para reservar tu primera clase: activar tu acceso en la app NAVY Training. Toma un minuto.
    </div>
  </td></tr>

  <tr><td class="px" style="padding:28px 48px 0 48px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr><td style="background-color:#0a0a0a; padding:24px 28px;">
        <div style="font-family:Arial, Helvetica, sans-serif; font-size:17px; line-height:1.6; color:#ffffff;">
          Si intentaste entrar antes y no funcion&oacute;, ya qued&oacute; resuelto: cambiamos la forma de ingresar y <strong>ya no necesitas contrase&ntilde;a</strong>. Ahora entras con tu correo y un c&oacute;digo que te llega al instante.
        </div>
      </td></tr>
    </table>
  </td></tr>

  <tr><td class="px" style="padding:28px 48px 0 48px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr><td style="border:2px solid #0a0a0a; padding:20px 28px;">
        <div style="font-family:Arial, Helvetica, sans-serif; font-size:12px; letter-spacing:2px; text-transform:uppercase; color:#6a6a6a; padding-bottom:8px;">Nombre de usuario:</div>
        <div style="font-family:Arial, Helvetica, sans-serif; font-size:18px; font-weight:bold; color:#0a0a0a;">${email}</div>
      </td></tr>
    </table>
  </td></tr>

  <tr><td class="px" style="padding:40px 48px 8px 48px;">
    <div style="font-family:Arial, Helvetica, sans-serif; font-size:22px; line-height:1.25; font-weight:bold; color:#0a0a0a;">As&iacute; se hace, paso a paso:</div>
  </td></tr>

  <tr><td class="px" style="padding:24px 48px 0 48px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td width="60" valign="top" class="step-num" style="font-family:Arial, Helvetica, sans-serif; font-size:28px; font-weight:bold; color:#0a0a0a;">1&nbsp;&mdash;&nbsp;&nbsp;</td>
        <td valign="top" style="font-family:Arial, Helvetica, sans-serif; font-size:17px; line-height:1.55; color:#0a0a0a; padding-top:5px;"><strong>Descarga la app NAVY Training</strong><br>Disponible en App Store y Google Play.</td>
      </tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px; margin-left:60px;">
      <tr>
        <td style="padding:0 14px 0 0;">
          <a href="https://apps.apple.com/mx/app/navy-training-center/id6792128524" style="text-decoration:none;"><img src="https://crm.navytrainingcenter.com/email/app-store-badge.png" alt="Download on the App Store" width="170" style="display:block; width:170px; height:auto; border:0;"></a>
        </td>
        <td>
          <a href="https://play.google.com/store/apps/details?id=com.navytrainingcenter.app" style="text-decoration:none;"><img src="https://crm.navytrainingcenter.com/email/google-play-badge.png" alt="Get it on Google Play" width="170" style="display:block; width:170px; height:auto; border:0;"></a>
        </td>
      </tr>
    </table>
  </td></tr>

  <tr><td class="px" style="padding:36px 48px 0 48px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td width="60" valign="top" class="step-num" style="font-family:Arial, Helvetica, sans-serif; font-size:28px; font-weight:bold; color:#0a0a0a;">2&nbsp;&mdash;&nbsp;&nbsp;</td>
        <td valign="top" style="font-family:Arial, Helvetica, sans-serif; font-size:17px; line-height:1.55; color:#0a0a0a; padding-top:5px;"><strong>Toca &ldquo;Iniciar sesi&oacute;n&rdquo; y escribe tu correo</strong><br>Usa este mismo correo donde recibes este mensaje &mdash; es tu usuario registrado.</td>
      </tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr><td align="center" style="padding:20px 0 0 0; line-height:0;">
        <img src="https://crm.navytrainingcenter.com/email/paso1-login.jpg" alt="Pantalla Bienvenido de vuelta" width="260" style="display:block; width:260px; max-width:100%; height:auto; border:0; border-radius:12px;">
      </td></tr>
    </table>
  </td></tr>

  <tr><td class="px" style="padding:36px 48px 0 48px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td width="60" valign="top" class="step-num" style="font-family:Arial, Helvetica, sans-serif; font-size:28px; font-weight:bold; color:#0a0a0a;">3&nbsp;&mdash;&nbsp;&nbsp;</td>
        <td valign="top" style="font-family:Arial, Helvetica, sans-serif; font-size:17px; line-height:1.55; color:#0a0a0a; padding-top:5px;"><strong>Revisa tu bandeja de entrada</strong><br>Te llegar&aacute; un c&oacute;digo de 6 d&iacute;gitos. Es v&aacute;lido por 10 minutos y de un solo uso; si se vence, pides otro con &ldquo;Reenviar c&oacute;digo&rdquo;.</td>
      </tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr><td align="center" style="padding:20px 0 0 0; line-height:0;">
        <img src="https://crm.navytrainingcenter.com/email/paso2-otp.jpg" alt="Correo Tu llave de entrada" width="260" style="display:block; width:260px; max-width:100%; height:auto; border:0; border-radius:12px;">
      </td></tr>
    </table>
  </td></tr>

  <tr><td class="px" style="padding:36px 48px 0 48px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td width="60" valign="top" class="step-num" style="font-family:Arial, Helvetica, sans-serif; font-size:28px; font-weight:bold; color:#0a0a0a;">4&nbsp;&mdash;&nbsp;&nbsp;</td>
        <td valign="top" style="font-family:Arial, Helvetica, sans-serif; font-size:17px; line-height:1.55; color:#0a0a0a; padding-top:5px;"><strong>Escribe el c&oacute;digo en la app y listo</strong><br>Est&aacute;s dentro. Tu cuenta y tu membres&iacute;a ya te esperan.</td>
      </tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr><td align="center" style="padding:20px 0 0 0; line-height:0;">
        <img src="https://crm.navytrainingcenter.com/email/paso3-listo.jpg" alt="Pantalla del c&oacute;digo" width="260" style="display:block; width:260px; max-width:100%; height:auto; border:0; border-radius:12px;">
      </td></tr>
    </table>
  </td></tr>

  <tr><td class="px" style="padding:44px 48px 0 48px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr><td style="border-top:2px solid #0a0a0a; padding:24px 4px 0 4px;">
        <div style="font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:1.6; color:#0a0a0a;">
          <strong>Ya puedes reservar clases.</strong> Una vez dentro de la app ver&aacute;s la agenda completa y podr&aacute;s elegir tu spot. Nos vemos en el gym.
        </div>
      </td></tr>
    </table>
  </td></tr>

  <tr><td class="px" style="padding:32px 48px 0 48px;">
    <div style="font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:1.55; color:#0a0a0a;">
      <strong>&iquest;Algo no sali&oacute; como esperabas?</strong><br>
      Esr&iacute;benos por WhatsApp y lo resolvemos contigo en minutos.
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;">
      <tr><td style="background-color:#0a0a0a;">
        <a href="https://wa.me/5217207317517?text=Hola%2C%20necesito%20ayuda%20con%20mi%20acceso%20a%20la%20app%20NAVY." style="display:inline-block; font-family:Arial, Helvetica, sans-serif; font-size:15px; font-weight:bold; letter-spacing:1px; color:#ffffff; text-decoration:none; text-transform:uppercase; padding:16px 28px;">Escribir por WhatsApp&nbsp;&nbsp;&rarr;</a>
      </td></tr>
    </table>
  </td></tr>

  <tr><td class="px" style="padding:36px 48px 48px 48px;">
    <div style="font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:1.6; color:#0a0a0a;">
      Nos vemos en el gym.<br>
      <strong>Equipo NAVY</strong>
    </div>
  </td></tr>

  <tr><td style="background-color:#0a0a0a; padding:28px 48px;">
    <div style="font-family:Arial, Helvetica, sans-serif; font-size:12px; line-height:1.7; color:#9a9a9a;">
      NAVY Training Center &middot; Av. Nuevo Le&oacute;n 107, Condesa, CDMX<br>
      <a href="mailto:contacto@navytrainingcenter.com?subject=Darse%20de%20baja" style="color:#ffffff; text-decoration:underline;">Darse de baja</a>
    </div>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    'Navy Training Center <noreply@navytrainingcenter.com>',
      to:      email,
      subject: `💪 ${nombre1}, tu acceso a NAVY está listo`,
      html,
    }),
  })

  return NextResponse.json({ ok: res.ok })
}
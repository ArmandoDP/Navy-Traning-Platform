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
<!--[if mso]>
<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<![endif]-->
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

    <!-- LOGO -->
    <tr><td align="center" style="padding:36px 48px 28px 48px;">
      <img src="https://crm.navytrainingcenter.com/email/logo-navy.png" alt="NAVY Training" width="150" style="display:block; width:150px; height:auto; border:0;">
    </td></tr>

    <!-- HERO -->
    <tr><td style="line-height:0;">
      <img src="https://crm.navytrainingcenter.com/email/hero-banner.png" alt="La app NAVY Training" width="600" style="display:block; width:100%; height:auto; border:0;">
    </td></tr>

    <!-- HEADLINE -->
    <tr><td class="px" style="padding:44px 48px 0 48px;">
      <div style="font-family:Arial, Helvetica, sans-serif; font-size:30px; line-height:1.15; font-weight:bold; letter-spacing:1px; color:#0a0a0a; text-transform:uppercase; mso-line-height-rule:exactly;">Llegó el momento: NAVY Condesa abre sus puertas en Soft Opening esta semana.</div>
    </td></tr>

    <!-- INTRO -->
    <tr><td class="px" style="padding:28px 48px 0 48px;">
      <div style="font-family:Arial, Helvetica, sans-serif; font-size:17px; line-height:1.55; color:#0a0a0a; mso-line-height-rule:exactly;">
        Hola, ${nombre1}:<br><br>
        Como Founding Member, queremos que seas de los primeros en vivir la experiencia. Antes de comenzar, solo necesitas una cosa: activar tu acceso en la app NAVY Training. Toma un minuto.
      </div>
    </td></tr>

    <!-- SIN CONTRASEÑA -->
    <tr><td class="px" style="padding:28px 48px 0 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="background-color:#0a0a0a; padding:24px 28px;">
          <div style="font-family:Arial, Helvetica, sans-serif; font-size:17px; line-height:1.6; color:#ffffff; mso-line-height-rule:exactly;">
            Si intentaste entrar antes y no funcionó, ya quedó resuelto: cambiamos la forma de ingresar y <strong>ya no necesitas contraseña</strong>. Ahora entras con tu correo y un código que te llega al instante.
          </div>
        </td></tr>
      </table>
    </td></tr>

    <!-- USUARIO -->
    <tr><td class="px" style="padding:28px 48px 0 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="border:2px solid #0a0a0a; padding:20px 28px;">
          <div style="font-family:Arial, Helvetica, sans-serif; font-size:12px; letter-spacing:2px; text-transform:uppercase; color:#6a6a6a; padding-bottom:8px;">Nombre de usuario:</div>
          <div style="font-family:Arial, Helvetica, sans-serif; font-size:18px; font-weight:bold; color:#0a0a0a;">${email}</div>
        </td></tr>
      </table>
    </td></tr>

    <!-- SUBTITULO PASOS -->
    <tr><td class="px" style="padding:40px 48px 8px 48px;">
      <div style="font-family:Arial, Helvetica, sans-serif; font-size:22px; line-height:1.25; font-weight:bold; color:#0a0a0a;">Así se hace, paso a paso:</div>
    </td></tr>

    <!-- PASO 1 -->
    <tr><td class="px" style="padding:24px 48px 0 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td width="60" valign="top" class="step-num" style="font-family:Arial, Helvetica, sans-serif; font-size:28px; font-weight:bold; color:#0a0a0a;">1&nbsp;—&nbsp;&nbsp;</td>
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

    <!-- PASO 2 -->
    <tr><td class="px" style="padding:36px 48px 0 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td width="60" valign="top" class="step-num" style="font-family:Arial, Helvetica, sans-serif; font-size:28px; font-weight:bold; color:#0a0a0a;">2&nbsp;—&nbsp;&nbsp;</td>
          <td valign="top" style="font-family:Arial, Helvetica, sans-serif; font-size:17px; line-height:1.55; color:#0a0a0a; padding-top:5px;"><strong>Toca &ldquo;Iniciar sesión&rdquo; y escribe tu correo</strong><br>Usa este mismo correo donde recibes este mensaje — es tu usuario registrado.</td>
        </tr>
      </table>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td align="center" style="padding:20px 0 0 0; line-height:0;">
          <img src="https://crm.navytrainingcenter.com/email/paso1-login.jpg" alt="Pantalla Bienvenido de vuelta" width="260" style="display:block; width:260px; max-width:100%; height:auto; border:0; border-radius:12px;">
        </td></tr>
      </table>
    </td></tr>

    <!-- PASO 3 -->
    <tr><td class="px" style="padding:36px 48px 0 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td width="60" valign="top" class="step-num" style="font-family:Arial, Helvetica, sans-serif; font-size:28px; font-weight:bold; color:#0a0a0a;">3&nbsp;—&nbsp;&nbsp;</td>
          <td valign="top" style="font-family:Arial, Helvetica, sans-serif; font-size:17px; line-height:1.55; color:#0a0a0a; padding-top:5px;"><strong>Revisa tu bandeja de entrada</strong><br>Te llegará un código de 6 dígitos. Es válido por 10 minutos y de un solo uso; si se vence, pides otro con &ldquo;Reenviar código&rdquo;.</td>
        </tr>
      </table>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td align="center" style="padding:20px 0 0 0; line-height:0;">
          <img src="https://crm.navytrainingcenter.com/email/paso2-otp.jpg" alt="Correo Tu llave de entrada" width="260" style="display:block; width:260px; max-width:100%; height:auto; border:0; border-radius:12px;">
        </td></tr>
      </table>
    </td></tr>

    <!-- PASO 4 -->
    <tr><td class="px" style="padding:36px 48px 0 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td width="60" valign="top" class="step-num" style="font-family:Arial, Helvetica, sans-serif; font-size:28px; font-weight:bold; color:#0a0a0a;">4&nbsp;—&nbsp;&nbsp;</td>
          <td valign="top" style="font-family:Arial, Helvetica, sans-serif; font-size:17px; line-height:1.55; color:#0a0a0a; padding-top:5px;"><strong>Escribe el código en la app y listo</strong><br>Estás dentro. Tu cuenta y tu membresía Founding ya te esperan.</td>
        </tr>
      </table>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td align="center" style="padding:20px 0 0 0; line-height:0;">
          <img src="https://crm.navytrainingcenter.com/email/paso3-listo.jpg" alt="Pantalla del código" width="260" style="display:block; width:260px; max-width:100%; height:auto; border:0; border-radius:12px;">
        </td></tr>
      </table>
    </td></tr>

    <!-- IMPORTANTE -->
    <tr><td class="px" style="padding:44px 48px 0 48px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="border-top:2px solid #0a0a0a; padding:24px 4px 0 4px;">
          <div style="font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:1.6; color:#0a0a0a;">
            <strong>Importante:</strong> al entrar todavía no verás clases cargadas. Las agendas se abren 24 horas antes de la apertura y te avisaremos por notificación en cuanto estén disponibles. Hoy lo único que necesitas es confirmar que tu acceso funciona.
          </div>
        </td></tr>
      </table>
    </td></tr>

    <!-- AYUDA -->
    <tr><td class="px" style="padding:32px 48px 0 48px;">
      <div style="font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:1.55; color:#0a0a0a;">
        <strong>¿Algo no salió como esperabas?</strong><br>
        Escríbenos por WhatsApp y lo resolvemos contigo en minutos.
      </div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;">
        <tr><td style="background-color:#0a0a0a;">
          <a href="https://wa.me/5217207317517?text=Hola%2C%20soy%20Founding%20Member%20de%20Condesa%20y%20necesito%20ayuda%20con%20mi%20acceso%20a%20la%20app." style="display:inline-block; font-family:Arial, Helvetica, sans-serif; font-size:15px; font-weight:bold; letter-spacing:1px; color:#ffffff; text-decoration:none; text-transform:uppercase; padding:16px 28px;">Escribir por WhatsApp&nbsp;&nbsp;&rarr;</a>
        </td></tr>
      </table>
    </td></tr>

    <!-- FIRMA -->
    <tr><td class="px" style="padding:36px 48px 48px 48px;">
      <div style="font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:1.6; color:#0a0a0a;">
        Nos vemos en Condesa.<br>
        <strong>Equipo NAVY</strong>
      </div>
    </td></tr>

    <!-- FOOTER -->
    <tr><td style="background-color:#0a0a0a; padding:28px 48px;">
      <div style="font-family:Arial, Helvetica, sans-serif; font-size:12px; line-height:1.7; color:#9a9a9a;">
        NAVY Training Center · Av. Nuevo León 107, Condesa, CDMX<br>
        Recibes este correo porque eres Founding Member de NAVY. <a href="mailto:contacto@navytrainingcenter.com?subject=Darse%20de%20baja" style="color:#ffffff; text-decoration:underline;">Darse de baja</a>
      </div>
    </td></tr>

  </table>

</td></tr>
</table>
</body>
</html>
`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Navy Training Center <noreply@navytrainingcenter.com>',
      to: email,
      subject: `💪 ${nombre1}, activa tu acceso a NAVY`,
      html,
    }),
  })

  return NextResponse.json({ ok: res.ok })
}
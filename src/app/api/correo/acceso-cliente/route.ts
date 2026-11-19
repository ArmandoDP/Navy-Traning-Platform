import { NextRequest, NextResponse } from 'next/server'

// Reenvía al cliente sus datos de acceso a la app. Se envía desde el servidor: la llave de Resend no puede
// usarse en el navegador (ahí no existe y el navegador bloquea la llamada).
export async function POST(req: NextRequest) {
  const { email, nombre, password } = await req.json()
  if (!email) return NextResponse.json({ ok: false, error: 'Correo requerido' }, { status: 400 })
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ ok: false, error: 'Falta la llave de correo en el servidor' }, { status: 500 })

  const nombre1 = String(nombre || '').split(' ')[0]
  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:40px auto">
      <div style="background:#171B24;border-radius:20px 20px 0 0;padding:36px 32px;text-align:center">
        <p style="color:#fff;font-size:28px;font-weight:900;margin:0;letter-spacing:4px">NAVY</p>
        <p style="color:#4b5563;font-size:10px;font-weight:700;margin:4px 0 0;letter-spacing:6px">TRAINING CENTER</p>
      </div>
      <div style="background:#fff;padding:32px;border:1px solid #e5e7eb">
        <h2 style="color:#111">Es momento de activarte 💪</h2>
        <p style="color:#6b7280">Hola ${nombre1}, aquí están tus datos de acceso a la app de Navy Training Center.</p>
        <div style="background:#f9fafb;border-radius:12px;padding:20px;margin:20px 0">
          <table style="width:100%;font-size:14px;border-collapse:collapse">
            <tr><td style="color:#9ca3af;padding:6px 0">Usuario</td><td style="color:#111;font-weight:700">${email}</td></tr>
            <tr><td style="color:#9ca3af;padding:6px 0">Contraseña temporal</td><td style="color:#111;font-weight:700;font-family:monospace;letter-spacing:2px;font-size:16px">${password || '—'}</td></tr>
          </table>
        </div>
        <p style="color:#6b7280;font-size:13px">Al iniciar sesión deberás cambiar tu contraseña. Descarga la app en App Store o Google Play.</p>
      </div>
      <div style="background:#f9fafb;border-radius:0 0 20px 20px;padding:16px 32px;text-align:center;border:1px solid #e5e7eb;border-top:none">
        <p style="color:#9ca3af;font-size:11px;margin:0">© 2026 Navy Training Center · Condesa</p>
      </div>
    </div>`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from:    'Navy Training Center <noreply@navytrainingcenter.com>',
        to:      email,
        subject: 'Es momento de activarte — Navy Training Center',
        html,
      }),
    })
    if (!res.ok) {
      const detalle = await res.text().catch(() => '')
      return NextResponse.json({ ok: false, error: detalle || `Resend respondió ${res.status}` }, { status: 502 })
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'No se pudo enviar el correo' }, { status: 500 })
  }
}

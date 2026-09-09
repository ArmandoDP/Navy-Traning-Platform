import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  const { email, clienteId } = await req.json()

  if (!email) return NextResponse.json({ error: 'Email requerido' }, { status: 400 })

  try {
    // Intentar crear con el mismo UUID que ya tiene en clientes
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      id:             clienteId,   // mismo UUID → sin romper FK
      email,
      email_confirm:  true,        // confirmado directo, acceso por OTP
    })

    if (error) {
      // Si ya existe en Auth, no es error — simplemente continuar
      if (error.message.includes('already been registered') || error.message.includes('already exists')) {
        return NextResponse.json({ ok: true, existed: true })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, userId: data.user?.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Busca la cuenta de acceso por correo recorriendo todas las páginas (antes solo se revisaban los primeros 50)
async function buscarUsuario(email: string) {
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) return null
    const user = data.users.find(u => u.email?.toLowerCase() === email)
    if (user) return user
    if (data.users.length < 1000) break
  }
  return null
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const email = String(body.email || '').trim().toLowerCase()
  const staff_id = body.staff_id

  // Crear usuario en Auth
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
  })

  // Si el correo ya tiene cuenta (por ejemplo, ya es cliente de la app) se reutiliza.
  // El mensaje real de Supabase es "has already been registered", no "already registered".
  const yaExiste = !!error && ((error as any).code === 'email_exists' || /already.*registered|already been registered/i.test(error.message))
  if (error && !yaExiste) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  let userId = data?.user?.id
  if (!userId) {
    const existing = await buscarUsuario(email)
    userId = existing?.id
    // Una cuenta existente sin correo confirmado no puede recibir el código de acceso
    if (existing && !existing.email_confirmed_at) {
      await supabaseAdmin.auth.admin.updateUserById(existing.id, { email_confirm: true })
    }
  }

  if (!userId) {
    return NextResponse.json({ error: 'No se pudo crear ni encontrar el acceso de este correo' }, { status: 400 })
  }

  // Actualizar supabase_user_id en staff
  await supabaseAdmin.from('staff').update({ supabase_user_id: userId }).eq('id', staff_id)

  return NextResponse.json({ ok: true, userId })
}

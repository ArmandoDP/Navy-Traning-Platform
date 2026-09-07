import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { email, staff_id } = await req.json()

  // Crear usuario en Auth
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
  })

  if (error && !error.message.includes('already registered')) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Si ya existía, obtener el ID
  let userId = data?.user?.id
  if (!userId) {
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
    const existing = users.find(u => u.email === email)
    userId = existing?.id
  }

  // Actualizar supabase_user_id en staff
  if (userId) {
    await supabaseAdmin.from('staff').update({ supabase_user_id: userId }).eq('id', staff_id)
  }

  return NextResponse.json({ ok: true, userId })
}
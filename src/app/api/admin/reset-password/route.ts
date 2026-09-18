import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const { userId, clienteId } = await req.json()

    if (!userId || !clienteId) {
      return NextResponse.json({ error: 'Parámetros faltantes' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Generar contraseña aleatoria
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const newPass = 'NAVY-' + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')

    // Actualizar usuario en Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPass
    })

    if (authError) throw authError

    // Actualizar tabla clientes
    const { error: dbError } = await supabaseAdmin
      .from('clientes')
      .update({
        password_temporal: newPass,
        debe_cambiar_password: true,
      })
      .eq('id', clienteId)

    if (dbError) throw dbError

    return NextResponse.json({ success: true, tempPassword: newPass })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error del servidor' }, { status: 500 })
  }
}
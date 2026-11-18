import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  const buscado = String(email || '').trim().toLowerCase()
  try {
    // Recorre todas las páginas: antes solo se revisaban los primeros 1000 usuarios
    for (let page = 1; page <= 50; page++) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      const user = data.users.find(u => u.email?.toLowerCase() === buscado)
      if (user) return NextResponse.json({ userId: user.id })
      if (data.users.length < 1000) break
    }
    return NextResponse.json({ userId: null })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
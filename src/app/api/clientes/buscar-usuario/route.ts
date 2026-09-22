import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  try {
    const { data } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
    const user = data.users.find(u => u.email?.toLowerCase() === email?.toLowerCase())
    return NextResponse.json({ userId: user?.id || null })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
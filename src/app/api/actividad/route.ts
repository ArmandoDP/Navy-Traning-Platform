// src/app/api/actividad/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin }             from '@/lib/supabase-admin'

const POR_PAGINA = 50

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tabla      = searchParams.get('tabla')
  const busqueda   = searchParams.get('busqueda')
  const sucursal   = searchParams.get('sucursal')
  const staffId    = searchParams.get('staff')
  const soloStaff  = searchParams.get('soloStaff') === '1'
  const desde      = searchParams.get('desde')
  const hasta      = searchParams.get('hasta')
  const pagina     = parseInt(searchParams.get('pagina') || '0')

  let q = supabaseAdmin
    .from('actividad_log')
    .select('*, staff(id, nombre, primer_apellido, rol)')
    .order('created_at', { ascending: false })
    .range(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA - 1)

  if (sucursal)                  q = q.eq('sucursal_id', sucursal)
  if (tabla && tabla !== 'todas') q = q.eq('tabla', tabla)
  if (busqueda)                  q = q.ilike('descripcion', `%${busqueda}%`)
  if (staffId)                   q = q.eq('staff_id', staffId)
  if (soloStaff)                 q = q.not('staff_id', 'is', null)
  if (desde)                     q = q.gte('created_at', `${desde}T00:00:00-06:00`)
  if (hasta)                     q = q.lte('created_at', `${hasta}T23:59:59-06:00`)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data || [])
}
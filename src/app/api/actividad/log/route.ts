// src/app/api/actividad/log/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin }             from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  const body = await req.json()

  if (!body.tipo || !body.descripcion) {
    return NextResponse.json({ error: 'tipo y descripcion son requeridos' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('actividad_log').insert({
    tipo:        body.tipo,
    descripcion: body.descripcion,
    tabla:       body.tabla       || null,
    accion:      body.accion      || null,
    metadata:    body.metadata    || null,
    sucursal_id: body.sucursal_id || null,
    staff_id:    body.staff_id    || null,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
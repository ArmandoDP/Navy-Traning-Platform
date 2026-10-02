import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  const { payload, precios, accesosSucursales, roomsSelected, splits } = await req.json()

  // 1. Crear paquete
  const { data, error } = await supabaseAdmin
    .from('paquetes')
    .insert(payload)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const paqueteId = data.id

  // 2. Precios
  await supabaseAdmin.from('paquete_precios').delete().eq('paquete_id', paqueteId)
  const preciosActivos = precios.filter((p: any) => p.activo && p.precio_app)
  if (preciosActivos.length > 0) {
    await supabaseAdmin.from('paquete_precios').insert(
      preciosActivos.map((p: any) => ({
        paquete_id:   paqueteId,
        sucursal_id:  p.sucursal_id,
        activo:       true,
        precio_app:   Number(p.precio_app),
        activo_desde: p.activo_desde || null,
      }))
    )
  }

  // 3. Accesos sucursales
  await supabaseAdmin.from('paquete_accesos_sucursales').delete().eq('paquete_id', paqueteId)
  if (accesosSucursales.length > 0) {
    await supabaseAdmin.from('paquete_accesos_sucursales').insert(
      accesosSucursales.map((sucursalId: string) => ({ paquete_id: paqueteId, sucursal_id: sucursalId }))
    )
  }

  // 4. Rooms
  await supabaseAdmin.from('paquete_rooms').delete().eq('paquete_id', paqueteId)
  if (roomsSelected.length > 0) {
    await supabaseAdmin.from('paquete_rooms').insert(
      roomsSelected.map((roomId: string) => ({ paquete_id: paqueteId, room_id: roomId }))
    )
  }

  // 5. Splits
  await supabaseAdmin.from('paquete_splits').delete().eq('paquete_id', paqueteId)
  if (splits.length > 0) {
    await supabaseAdmin.from('paquete_splits').insert(
      splits.map((s: any) => ({
        paquete_id:       paqueteId,
        sucursal_origen:  s.sucursal_origen_id,
        sucursal_destino: s.sucursal_destino_id,
        porcentaje:       s.porcentaje,
      }))
    )
  }

  return NextResponse.json({ ok: true, id: paqueteId })
}

export async function PATCH(req: NextRequest) {
  const { id, payload, precios, accesosSucursales, roomsSelected, splits } = await req.json()

  // 1. Actualizar paquete
  const { error } = await supabaseAdmin
    .from('paquetes')
    .update(payload)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // 2. Precios
  await supabaseAdmin.from('paquete_precios').delete().eq('paquete_id', id)
  const preciosActivos = precios.filter((p: any) => p.activo && p.precio_app)
  if (preciosActivos.length > 0) {
    await supabaseAdmin.from('paquete_precios').insert(
      preciosActivos.map((p: any) => ({
        paquete_id:   id,
        sucursal_id:  p.sucursal_id,
        activo:       true,
        precio_app:   Number(p.precio_app),
        activo_desde: p.activo_desde || null,
      }))
    )
  }

  // 3. Accesos sucursales
  await supabaseAdmin.from('paquete_accesos_sucursales').delete().eq('paquete_id', id)
  if (accesosSucursales.length > 0) {
    await supabaseAdmin.from('paquete_accesos_sucursales').insert(
      accesosSucursales.map((sucursalId: string) => ({ paquete_id: id, sucursal_id: sucursalId }))
    )
  }

  // 4. Rooms
  await supabaseAdmin.from('paquete_rooms').delete().eq('paquete_id', id)
  if (roomsSelected.length > 0) {
    await supabaseAdmin.from('paquete_rooms').insert(
      roomsSelected.map((roomId: string) => ({ paquete_id: id, room_id: roomId }))
    )
  }

  // 5. Splits
  await supabaseAdmin.from('paquete_splits').delete().eq('paquete_id', id)
  if (splits.length > 0) {
    await supabaseAdmin.from('paquete_splits').insert(
      splits.map((s: any) => ({
        paquete_id:       id,
        sucursal_origen:  s.sucursal_origen_id,
        sucursal_destino: s.sucursal_destino_id,
        porcentaje:       s.porcentaje,
      }))
    )
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  const { error } = await supabaseAdmin.from('paquetes').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
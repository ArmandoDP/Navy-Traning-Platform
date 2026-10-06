import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase-admin'
import { crearClaseWellhub, crearSlotWellhub } from '@/lib/wellhub'

// Supabase puede regresar la relación como objeto o como arreglo según los tipos
function nombreCoach(staff: any): string | undefined {
  const s = Array.isArray(staff) ? staff[0] : staff
  if (!s) return undefined
  const nombre = `${s.nombre || ''} ${s.primer_apellido || ''}`.replace(/\s+/g, ' ').trim()
  return nombre || undefined
}

export async function POST(req: NextRequest) {
  try {
    const { claseId, nombre, descripcion, horario, duracionMinutos, capacidadMax } = await req.json()

    // 0. Datos de la clase
    const { data: clase } = await supabase
      .from('clases')
      .select('sucursal_id, salon, coach_id, wellhub_slot_id, wellhub_class_id, staff(nombre, primer_apellido)')
      .eq('id', claseId)
      .single()

    if (!clase?.sucursal_id) {
      return NextResponse.json({ error: 'Clase sin sucursal asignada' }, { status: 400 })
    }

    // Si ya está publicada, no crear duplicado
    if (clase.wellhub_slot_id && clase.wellhub_class_id) {
      console.log(`Clase ${claseId} ya publicada en Wellhub — slot ${clase.wellhub_slot_id}`)
      return NextResponse.json({
        success:           true,
        already_published: true,
        wellhub_class_id:  clase.wellhub_class_id,
        wellhub_slot_id:   clase.wellhub_slot_id,
      })
    }

    const sucursalId  = clase.sucursal_id
    const coachNombre = nombreCoach(clase.staff)

    // 1. Crear la clase en Wellhub
    const claseData      = await crearClaseWellhub(nombre, descripcion || nombre, sucursalId)
    const wellhubClassId = claseData.classes[0].id

    // 2. Crear el slot con el coach
    const slotData = await crearSlotWellhub(String(wellhubClassId), sucursalId, {
      fechaInicio: horario,
      duracionMin: duracionMinutos,
      capacidad:   capacidadMax,
      room:        clase.salon || 'Sala Principal',
      coach:       coachNombre,
    })
    const wellhubSlotId = slotData.results[0].id

    console.log(`Wellhub publicado: ${nombre} | class ${wellhubClassId} | slot ${wellhubSlotId} | coach ${coachNombre || '(sin coach)'}`)

    // 3. Guardar referencias en Supabase
    await supabase.from('clases').update({
      wellhub_class_id: String(wellhubClassId),
      wellhub_slot_id:  String(wellhubSlotId),
    }).eq('id', claseId)

    // 4. Cupos con el conteo real (por si la clase ya tenía reservas)
    try {
      await fetch(`${process.env.BACKEND_URL}/sync/cupos`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ clase_id: claseId }),
      })
    } catch (e: any) {
      console.error('Error sincronizando cupos al publicar:', e.message)
    }

    return NextResponse.json({
      success:          true,
      wellhub_class_id: wellhubClassId,
      wellhub_slot_id:  wellhubSlotId,
      coach:            coachNombre || null,
    })

  } catch (err: any) {
    console.error('Error publicando en Wellhub:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
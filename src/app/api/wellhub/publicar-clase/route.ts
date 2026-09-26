import { NextRequest, NextResponse } from 'next/server'
import { supabase }                  from '@/lib/supabase'
import { actualizarCuposSlotWellhub, crearClaseWellhub, crearSlotWellhub } from '@/lib/wellhub'

export async function POST(req: NextRequest) {
  try {
    const { claseId, nombre, descripcion, horario, duracionMinutos, capacidadMax } = await req.json()

    // 0. Obtener la sucursal de la clase para usar el gym_id y product_id correctos
    const { data: clase } = await supabase
      .from('clases')
      .select('sucursal_id, salon, coach_id, staff(nombre, primer_apellido)')
      .eq('id', claseId)
      .single()

    if (!clase?.sucursal_id) {
      return NextResponse.json({ error: 'Clase sin sucursal asignada' }, { status: 400 })
    }

    const sucursalId = clase.sucursal_id

    // 1. Crear la clase en Wellhub
    const claseData      = await crearClaseWellhub(nombre, descripcion || nombre, sucursalId)
    const wellhubClassId = claseData.classes[0].id

    // Obtener reservas activas de la clase
    const { count: reservasActivas } = await supabase
      .from('reservas')
      .select('id', { count: 'exact' })
      .eq('clase_id', claseId)
      .neq('estatus', 'Cancelada')

    const coachNombre = clase.staff && Array.isArray(clase.staff) && clase.staff.length > 0
      ? `${clase.staff[0].nombre} ${clase.staff[0].primer_apellido}`.trim()
      : undefined

    // 2. Crear el slot
    const slotData = await crearSlotWellhub(String(wellhubClassId), sucursalId, {
      fechaInicio: horario,
      duracionMin: duracionMinutos,
      capacidad:   capacidadMax,
      room:        clase.salon || 'Sala Principal',
      coach:       coachNombre,
    })

    const wellhubSlotId = slotData.results[0].id
    
    // Actualizar total_booked con reservas existentes
    if (reservasActivas && reservasActivas > 0) {
      await actualizarCuposSlotWellhub(
        String(wellhubSlotId),
        reservasActivas,
        String(wellhubClassId),
        sucursalId
      )
    }

    // 3. Guardar referencias en Supabase
    await supabase.from('clases').update({
      wellhub_class_id: String(wellhubClassId),
      wellhub_slot_id:  String(wellhubSlotId),
    }).eq('id', claseId)

    return NextResponse.json({
      success:          true,
      wellhub_class_id: wellhubClassId,
      wellhub_slot_id:  wellhubSlotId,
    })

  } catch (err: any) {
    console.error('Error publicando en Wellhub:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
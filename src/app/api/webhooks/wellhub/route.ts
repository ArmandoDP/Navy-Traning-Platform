import { NextRequest, NextResponse }              from 'next/server'
import { supabaseAdmin as supabase }              from '@/lib/supabase-admin'
import { validarAccesoWellhub, confirmarBookingWellhub } from '@/lib/wellhub'

const GYM_SUCURSAL: Record<string, string> = {
  '848637': '1b2032dc-f5da-40c6-8c4e-e227be14673b', // Condesa Gym
  '848638': 'f8f798a8-d89b-4874-a53a-cdcb6325ad2a', // Condesa Studio
}

// Fuente única de cupos: Supabase + Wellhub + TotalPass desde Railway
async function sincronizarCupos(claseId: string) {
  try {
    const res = await fetch(`${process.env.BACKEND_URL}/sync/cupos`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ clase_id: claseId }),
    })
    console.log('Sync cupos:', res.status, await res.text())
  } catch (e: any) {
    console.error('Error sincronizando cupos:', e.message)
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  console.log('Webhook Wellhub recibido:', body.event_type)

  try {

    // ── CHECK-IN ─────────────────────────────────────────────────────────────
    if (body.event_type === 'checkin' || body.event_type === 'checkin-booking-occurred') {
      const user = body.event_data?.user

      if (!user?.unique_token) {
        return NextResponse.json({ error: 'unique_token faltante' }, { status: 400 })
      }

      const { data: clienteExistente } = await supabase
        .from('clientes')
        .select('id')
        .eq('email', user.email)
        .maybeSingle()

      const { data: checkin } = await supabase.from('wellhub_checkins').insert({
        unique_token: user.unique_token,
        nombre:       user.first_name,
        apellido:     user.last_name,
        email:        user.email,
        telefono:     user.phone_number,
        gym_id:       body.event_data?.gym?.id?.toString(),
        cliente_id:   clienteExistente?.id || null,
        metadata:     body,
      }).select().single()

      try {
        await validarAccesoWellhub(user.unique_token)

        await supabase.from('wellhub_checkins')
          .update({ validado: true })
          .eq('id', checkin?.id)

        if (!clienteExistente && user.email) {
          await supabase.from('clientes').insert({
            nombre_completo: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
            email:           user.email,
            telefono:        user.phone_number || null,
            estatus:         'Activo',
            plan:            'Wellhub',
            origen:          'Wellhub',
            sucursal_id:     GYM_SUCURSAL[String(body.event_data?.gym?.id)] || null,
          })
        }

        return NextResponse.json({ received: true, validado: true })

      } catch (errValidacion: any) {
        await supabase.from('alertas').insert({
          tipo:        'pago_fallido',
          categoria:   'operacion',
          titulo:      `Check-in Wellhub sin acceso válido — ${user.first_name || ''} ${user.last_name || ''}`.trim(),
          descripcion: errValidacion.message,
          metadata:    { unique_token: user.unique_token },
        })

        return NextResponse.json({ received: true, validado: false }, { status: 200 })
      }
    }

    // ── BOOKING REQUESTED ─────────────────────────────────────────────────────
    if (body.event_type === 'booking-requested') {
      const user = body.event_data?.user
      const slot = body.event_data?.slot

      if (!slot?.booking_number) {
        return NextResponse.json({ error: 'booking_number faltante' }, { status: 400 })
      }

      // Anti-duplicado por booking_number
      const { data: existenteBooking } = await supabase
        .from('wellhub_bookings')
        .select('id')
        .eq('booking_number', slot.booking_number)
        .maybeSingle()

      if (existenteBooking) {
        console.log(`Booking ${slot.booking_number} ya procesado — ignorando duplicado`)
        return NextResponse.json({ received: true, duplicado: true })
      }

      const { data: clase } = await supabase
        .from('clases')
        .select('id, capacidad_max, nombre_clase, sucursal_id')
        .eq('wellhub_slot_id', String(slot.id))
        .maybeSingle()

      // Buscar / crear cliente
      let { data: clienteExistente } = await supabase
        .from('clientes')
        .select('id')
        .eq('email', user.email)
        .maybeSingle()

      if (!clienteExistente && user.email) {
        const { data: nuevoCliente, error: errorCliente } = await supabase.from('clientes').insert({
          nombre_completo: user.name || user.email,
          email:           user.email,
          telefono:        user.phone_number || null,
          estatus:         'Activo',
          plan:            'Wellhub',
          origen:          'Wellhub',
          sucursal_id:     GYM_SUCURSAL[String(slot.gym_id)] || null,
        }).select('id').single()
        if (errorCliente) console.error('Error creando cliente Wellhub:', errorCliente.message)
        else console.log(`Cliente Wellhub creado: ${user.email}`)
        clienteExistente = nuevoCliente
      }

      const clienteId = clienteExistente?.id ?? null

      // Anti-duplicado por cliente + clase
      if (clase && clienteId) {
        const { data: reservaExistente } = await supabase
          .from('reservas')
          .select('id')
          .eq('cliente_id', clienteId)
          .eq('clase_id', clase.id)
          .neq('estatus', 'Cancelada')
          .maybeSingle()

        if (reservaExistente) {
          console.log('Reserva duplicada ignorada:', clienteId, clase.id)
          return NextResponse.json({ ok: true, duplicado: true })
        }
      }

      const { data: booking } = await supabase.from('wellhub_bookings').insert({
        booking_number:   slot.booking_number,
        gympass_user_id:  user.unique_token,
        wellhub_slot_id:  String(slot.id),
        wellhub_class_id: String(slot.class_id),
        estatus:          'Pendiente',
        cliente_id:       clienteId,
        metadata:         body,
      }).select().single()

      // Cupo real = reservas activas en la BD
      let activas = 0
      if (clase) {
        const { count } = await supabase
          .from('reservas')
          .select('id', { count: 'exact', head: true })
          .eq('clase_id', clase.id)
          .neq('estatus', 'Cancelada')
        activas = count || 0
      }

      const hayCupo = clase ? activas < clase.capacidad_max : true

      if (hayCupo) {
        try {
          await confirmarBookingWellhub(slot.booking_number, slot.class_id, true, String(slot.gym_id))

          await supabase.from('wellhub_bookings')
            .update({ estatus: 'Confirmado' })
            .eq('id', booking?.id)

          if (clase) {
            const { error: insertError } = await supabase.from('reservas').insert({
              clase_id:       clase.id,
              cliente_id:     clienteId,
              estatus:        'Confirmada',
              origen:         'Wellhub',
              nombre_externo: null,
              email_externo:  null,
            })

            if (insertError) {
              console.warn('Error al insertar reserva Wellhub:', insertError.message)
            }

            // Supabase + Wellhub + TotalPass con el conteo real
            await sincronizarCupos(clase.id)
          }

        } catch (errConfirm: any) {
          console.error('❌ Error confirmando booking en Wellhub:', errConfirm.message)
        }
      } else {
        try {
          await confirmarBookingWellhub(slot.booking_number, slot.class_id, false)
          await supabase.from('wellhub_bookings')
            .update({ estatus: 'Rechazado' })
            .eq('id', booking?.id)

          await supabase.from('alertas').insert({
            tipo:        'lista_espera',
            categoria:   'operacion',
            titulo:      'Booking Wellhub rechazado — sin cupo',
            descripcion: `${clase?.nombre_clase || 'Clase'} ya no tiene espacios disponibles`,
            cliente_id:  clienteId,
            metadata:    { booking_number: slot.booking_number },
          })
        } catch (errReject: any) {
          console.error('Error rechazando booking en Wellhub:', errReject.message)
        }
      }

      return NextResponse.json({ received: true })
    }

    // ── BOOKING CANCELATION ───────────────────────────────────────────────────
    if (body.event_type === 'booking-cancelation' || body.event_type === 'booking-late-cancelation') {
      const bookingNumber = body.event_data?.booking?.booking_number || body.event_data?.slot?.booking_number

      if (bookingNumber) {
        const { data: booking } = await supabase
          .from('wellhub_bookings')
          .select('id, cliente_id, wellhub_slot_id')
          .eq('booking_number', bookingNumber)
          .maybeSingle()

        if (booking) {
          await supabase.from('wellhub_bookings')
            .update({ estatus: 'Cancelado' })
            .eq('id', booking.id)

          const { data: clase } = await supabase
            .from('clases')
            .select('id')
            .eq('wellhub_slot_id', booking.wellhub_slot_id)
            .maybeSingle()

          if (clase) {
            if (booking.cliente_id) {
              await supabase.from('reservas')
                .update({ estatus: 'Cancelada' })
                .eq('clase_id', clase.id)
                .eq('cliente_id', booking.cliente_id)
            }

            await sincronizarCupos(clase.id)
          }

          if (body.event_type === 'booking-late-cancelation') {
            await supabase.from('alertas').insert({
              tipo:        'no_show',
              categoria:   'asistencia',
              titulo:      'Cancelación tardía — Wellhub',
              descripcion: `Booking ${bookingNumber} cancelado fuera de la ventana permitida`,
              cliente_id:  booking.cliente_id,
              metadata:    { booking_number: bookingNumber },
            })
          }
        }
      }

      return NextResponse.json({ received: true })
    }

    return NextResponse.json({ received: true })

  } catch (err: any) {
    console.error('Error procesando webhook Wellhub:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
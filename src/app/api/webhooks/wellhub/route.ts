// src/app/api/webhooks/wellhub/route.ts
import { NextRequest, NextResponse }                     from 'next/server'
import { supabaseAdmin as supabase }                     from '@/lib/supabase-admin'
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

// Busca al cliente por correo sin importar mayúsculas ni duplicados
async function buscarCliente(email?: string | null) {
  if (!email) return null
  const { data } = await supabase.from('clientes').select('id')
    .ilike('email', email.trim()).limit(1)
  return data?.[0] || null
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  console.log('Webhook Wellhub recibido:', body.event_type)

  try {

    // ── CHECK-IN ─────────────────────────────────────────────────────────────
    if (body.event_type === 'checkin' || body.event_type === 'checkin-booking-occurred') {
      const user  = body.event_data?.user
      const gymId = String(body.event_data?.gym?.id || '')

      if (!user?.unique_token) {
        return NextResponse.json({ error: 'unique_token faltante' }, { status: 400 })
      }

      const clienteExistente = await buscarCliente(user.email)

      const { data: checkin } = await supabase.from('wellhub_checkins').insert({
        unique_token: user.unique_token,
        nombre:       user.first_name,
        apellido:     user.last_name,
        email:        user.email,
        telefono:     user.phone_number,
        gym_id:       gymId,
        cliente_id:   clienteExistente?.id || null,
        metadata:     body,
      }).select().single()

      // Wellhub manda dos avisos por visita (checkin y checkin-booking-occurred).
      // Si la visita ya se validó con el otro aviso, no se vuelve a validar.
      const yaValidada = async () => {
        const desde = new Date(Date.now() - 3 * 3600 * 1000).toISOString()
        const { data } = await supabase.from('wellhub_checkins').select('id')
          .eq('unique_token', user.unique_token).eq('validado', true)
          .gte('created_at', desde).neq('id', checkin?.id).limit(1)
        return !!data?.length
      }

      if (await yaValidada()) {
        await supabase.from('wellhub_checkins').update({ validado: true }).eq('id', checkin?.id)
        return NextResponse.json({ received: true, validado: true, duplicado: true })
      }

      try {
        // Validar contra el gym donde ocurrió el check-in (antes iba al gym por defecto)
        await validarAccesoWellhub(user.unique_token, GYM_SUCURSAL[gymId])

        await supabase.from('wellhub_checkins')
          .update({ validado: true })
          .eq('id', checkin?.id)

        if (!clienteExistente && user.email) {
          await supabase.from('clientes').insert({
            nombre_completo: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
            email:           user.email.trim().toLowerCase(),
            telefono:        user.phone_number || null,
            estatus:         'Activo',
            plan:            'Wellhub',
            origen:          'Wellhub',
            sucursal_id:     GYM_SUCURSAL[gymId] || null,
          })
        }

        console.log(`✅ Check-in Wellhub validado: ${user.email} (gym ${gymId})`)
        await supabase.from('alertas').insert({
          tipo:        'checkin_ok',
          categoria:   'plataformas',
          titulo:      `Check-in Wellhub validado — ${`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'Usuario'}`,
          descripcion: 'Llegó a Navy · visita validada, Wellhub la paga',
          cliente_id:  clienteExistente?.id || null,
          sucursal_id: GYM_SUCURSAL[gymId] || null,
          metadata:    { gym_id: gymId, canal: 'Wellhub' },
        })
        return NextResponse.json({ received: true, validado: true })

      } catch (errValidacion: any) {
        // Los dos avisos llegan casi al mismo tiempo: si el otro sí validó, este no es error
        await new Promise(r => setTimeout(r, 1500))
        if (await yaValidada()) {
          await supabase.from('wellhub_checkins').update({ validado: true }).eq('id', checkin?.id)
          return NextResponse.json({ received: true, validado: true, duplicado: true })
        }

        console.error(`❌ Check-in Wellhub no validado: ${user.email} (gym ${gymId}):`, errValidacion.message)
        await supabase.from('alertas').insert({
          tipo:        'checkin_fallido',
          categoria:   'plataformas',
          titulo:      `Check-in Wellhub no validado — ${`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'Usuario'}`,
          descripcion: `Wellhub no aceptó la visita (${errValidacion.message}). Si se repite, revisa que su Wellhub esté activo.`,
          cliente_id:  clienteExistente?.id || null,
          sucursal_id: GYM_SUCURSAL[gymId] || null,
          metadata:    { unique_token: user.unique_token, gym_id: gymId, canal: 'Wellhub' },
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

      // Apartar el booking: si el mismo aviso llega dos veces al mismo tiempo, el segundo choca
      // con el índice único y se descarta
      const { data: booking, error: errApartar } = await supabase.from('wellhub_bookings').insert({
        booking_number:   slot.booking_number,
        gympass_user_id:  user?.unique_token,
        wellhub_slot_id:  String(slot.id),
        wellhub_class_id: String(slot.class_id),
        estatus:          'Procesando',
        metadata:         body,
      }).select().single()

      if (errApartar) {
        console.log(`Booking ${slot.booking_number} ya procesado — ignorando duplicado (${errApartar.code})`)
        return NextResponse.json({ received: true, duplicado: true })
      }

      const { data: clase } = await supabase
        .from('clases')
        .select('id, capacidad_max, nombre_clase, sucursal_id')
        .eq('wellhub_slot_id', String(slot.id))
        .maybeSingle()

      // Buscar / crear cliente
      let clienteExistente = await buscarCliente(user?.email)

      if (!clienteExistente && user?.email) {
        const { data: nuevoCliente, error: errorCliente } = await supabase.from('clientes').insert({
          nombre_completo: user.name || user.email,
          email:           user.email.trim().toLowerCase(),
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

      // Si ya tiene reserva activa en esta clase, se reutiliza y se CONFIRMA la nueva solicitud
      // (antes se ignoraba y Wellhub la dejaba colgada aunque hubiera lugar)
      let reservaExistente: string | null = null
      if (clase && clienteId) {
        const { data: ex } = await supabase
          .from('reservas').select('id')
          .eq('cliente_id', clienteId).eq('clase_id', clase.id)
          .neq('estatus', 'Cancelada').limit(1)
        reservaExistente = ex?.[0]?.id || null
      }

      await supabase.from('wellhub_bookings')
        .update({ estatus: 'Pendiente', cliente_id: clienteId, reserva_id: reservaExistente })
        .eq('id', booking?.id)

      let activas = 0
      if (clase) {
        const { count } = await supabase
          .from('reservas').select('id', { count: 'exact', head: true })
          .eq('clase_id', clase.id).neq('estatus', 'Cancelada')
        activas = count || 0
      }

      const hayCupo = !clase || !!reservaExistente || activas < clase.capacidad_max

      if (hayCupo) {
        try {
          await confirmarBookingWellhub(slot.booking_number, slot.class_id, true, String(slot.gym_id))

          let reservaId = reservaExistente
          if (clase && !reservaId) {
            const { data: nueva, error: insertError } = await supabase.from('reservas').insert({
              clase_id:       clase.id,
              cliente_id:     clienteId,
              estatus:        'Confirmada',
              origen:         'Wellhub',
              nombre_externo: clienteId ? null : (user?.name || null),
              email_externo:  clienteId ? null : (user?.email || null),
            }).select('id').single()
            if (insertError) console.warn('Error al insertar reserva Wellhub:', insertError.message)
            reservaId = nueva?.id || null
          }

          await supabase.from('wellhub_bookings')
            .update({ estatus: 'Confirmado', reserva_id: reservaId })
            .eq('id', booking?.id)

          if (clase) await sincronizarCupos(clase.id)

        } catch (errConfirm: any) {
          console.error('❌ Error confirmando booking en Wellhub:', errConfirm.message)
        }
      } else {
        try {
          // Rechazo al gym correcto (antes iba al gym por defecto y no llegaba)
          await confirmarBookingWellhub(slot.booking_number, slot.class_id, false, String(slot.gym_id))
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
          .select('id, cliente_id, wellhub_slot_id, reserva_id, estatus')
          .eq('booking_number', bookingNumber)
          .maybeSingle()

        if (booking && booking.estatus !== 'Cancelado') {
          await supabase.from('wellhub_bookings')
            .update({ estatus: 'Cancelado' })
            .eq('id', booking.id)

          const { data: clase } = await supabase
            .from('clases').select('id')
            .eq('wellhub_slot_id', booking.wellhub_slot_id)
            .maybeSingle()

          if (clase) {
            if (booking.reserva_id) {
              await supabase.from('reservas').update({ estatus: 'Cancelada' }).eq('id', booking.reserva_id)
            } else if (booking.cliente_id) {
              // Bookings viejos sin reserva_id: solo la reserva Wellhub de ese cliente en esa clase
              const { data: r } = await supabase.from('reservas').select('id')
                .eq('clase_id', clase.id).eq('cliente_id', booking.cliente_id)
                .eq('origen', 'Wellhub').neq('estatus', 'Cancelada').limit(1)
              if (r?.[0]) await supabase.from('reservas').update({ estatus: 'Cancelada' }).eq('id', r[0].id)
            }

            await sincronizarCupos(clase.id)
            console.log(`🔓 Wellhub cancelado: ${bookingNumber} → lugar liberado`)
          }

          // La alerta de cancelación (a tiempo / tardía) la crea la base de datos al cancelar la reserva
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
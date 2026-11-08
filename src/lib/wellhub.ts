// src/lib/wellhub.ts
import { supabaseAdmin } from '@/lib/supabase-admin'
const WELLHUB_BASE_URL = 'https://api.partners.gympass.com'  // ← producción

// Minutos antes de la clase en que ya no se puede cancelar en Wellhub
export const WELLHUB_CANCELACION_MIN = Number(process.env.WELLHUB_CANCELACION_MIN || 720)  // 12 horas

// Gym y producto de Wellhub de cada sucursal: desde la base (sucursales.wellhub_gym_id / wellhub_product_id).
// Respaldo: lo que ya funcionaba con Condesa, por si la base no responde.
type ConfigWellhub = { gymId: string; productId: number }
const RESPALDO: Record<string, ConfigWellhub> = {
  '1b2032dc-f5da-40c6-8c4e-e227be14673b': { gymId: '848637', productId: 953550 }, // Condesa Gym
  'f8f798a8-d89b-4874-a53a-cdcb6325ad2a': { gymId: '848638', productId: 953551 }, // Condesa Studio
}
const DEL_ENV: ConfigWellhub = { gymId: process.env.WELLHUB_GYM_ID!, productId: Number(process.env.WELLHUB_PRODUCT_ID || 0) }
const cache = new Map<string, { cfg: ConfigWellhub; t: number }>()

export async function getWellhubConfig(sucursalId?: string): Promise<ConfigWellhub> {
  if (!sucursalId) return DEL_ENV
  const hit = cache.get(sucursalId)
  if (hit && Date.now() - hit.t < 5 * 60 * 1000) return hit.cfg
  let cfg: ConfigWellhub | null = null
  try {
    const { data } = await supabaseAdmin.from('sucursales')
      .select('wellhub_gym_id, wellhub_product_id').eq('id', sucursalId).maybeSingle()
    if (data?.wellhub_gym_id) {
      cfg = {
        gymId:     String(data.wellhub_gym_id).trim(),
        productId: Number(data.wellhub_product_id || RESPALDO[sucursalId]?.productId || 0),
      }
    }
  } catch (e: any) {
    console.error('Wellhub config:', e.message)
  }
  cfg = cfg || RESPALDO[sucursalId] || DEL_ENV
  cache.set(sucursalId, { cfg, t: Date.now() })
  return cfg
}

async function getGymId(sucursalId?: string): Promise<string> {
  return (await getWellhubConfig(sucursalId)).gymId
}

// Las sucursales de un gym de Wellhub (para las reservas que llegan). Juriquilla Studio y Gym comparten gym.
export async function sucursalesDeGym(gymId: string | number): Promise<string[]> {
  const { data } = await supabaseAdmin.from('sucursales').select('id').eq('wellhub_gym_id', String(gymId))
  const ids = (data || []).map((s: any) => s.id)
  if (ids.length) return ids
  return Object.entries(RESPALDO).filter(([, c]) => c.gymId === String(gymId)).map(([id]) => id)
}

function wellhubHeaders() {
  return {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${process.env.WELLHUB_API_KEY}`,
  }
}

// Fecha límite para cancelar: X minutos antes del inicio
export function limiteCancelacion(fechaInicio: string, minutos = WELLHUB_CANCELACION_MIN): string {
  return new Date(new Date(fechaInicio).getTime() - minutos * 60 * 1000).toISOString()
}

export async function validarAccesoWellhub(gympassId: string, sucursalId?: string) {
  const gymId = await getGymId(sucursalId)
  const res = await fetch(`${WELLHUB_BASE_URL}/access/v1/validate`, {
    method:  'POST',
    headers: { ...wellhubHeaders(), 'X-Gym-Id': gymId },
    body:    JSON.stringify({ gympass_id: gympassId }),
  })
  const text = await res.text()
  let data; try { data = JSON.parse(text) } catch { data = { raw: text } }
  if (!res.ok) throw new Error(data?.message || `Error ${res.status} (gym ${gymId})`)
  return data
}

export async function crearClaseWellhub(nombre: string, descripcion: string, sucursalId: string) {
  const { gymId, productId } = await getWellhubConfig(sucursalId)
  const url = `${WELLHUB_BASE_URL}/booking/v1/gyms/${gymId}/classes`
  const res = await fetch(url, {
    method:  'POST',
    headers: wellhubHeaders(),
    body: JSON.stringify({
      classes: [{
        name:        nombre,
        description: descripcion,
        notes:       descripcion,
        bookable:    true,
        visible:     true,
        is_virtual:  false,
        product_id:  productId,
      }],
    }),
  })
  const text = await res.text()
  let data; try { data = JSON.parse(text) } catch { data = { raw: text } }
  if (!res.ok) throw new Error(data?.message || `Error ${res.status}: ${text}`)
  return data
}

export async function crearSlotWellhub(classId: string, sucursalId: string, params: {
  fechaInicio: string
  duracionMin: number
  capacidad:   number
  room?:       string
  coach?:      string
}) {
  const { gymId, productId } = await getWellhubConfig(sucursalId)
  const url = `${WELLHUB_BASE_URL}/booking/v1/gyms/${gymId}/classes/${classId}/slots`

  const payload: any = {
    occur_date:        new Date(params.fechaInicio).toISOString(),
    cancellable_until: limiteCancelacion(params.fechaInicio),
    status:            1,
    room:              params.room || 'Sala Principal',
    length_in_minutes: params.duracionMin,
    total_capacity:    params.capacidad,
    total_booked:      0,
    product_id:        productId,
  }

  if (params.coach) {
    payload.instructors = [{ name: params.coach, substitute: false }]
  }

  const res = await fetch(url, {
    method:  'POST',
    headers: wellhubHeaders(),
    body:    JSON.stringify(payload),
  })
  const text = await res.text()
  let data; try { data = JSON.parse(text) } catch { data = { raw: text } }
  if (!res.ok) throw new Error(data?.message || `Error ${res.status}: ${text}`)
  return data
}

export async function confirmarBookingWellhub(bookingNumber: string, classId: number, confirmar: boolean, wellhubGymId?: string) {
  const gymId = wellhubGymId || await getGymId()
  const url   = `${WELLHUB_BASE_URL}/booking/v2/gyms/${gymId}/bookings/${bookingNumber}`
  const res   = await fetch(url, {
    method:  'PATCH',
    headers: wellhubHeaders(),
    body: JSON.stringify({
      status: confirmar ? 'RESERVED' : 'REJECTED',
      ...(confirmar ? {} : { reason_category: 'CLASS_IS_FULL' }),
    }),
  })
  const text = await res.text()
  let data; try { data = JSON.parse(text) } catch { data = { raw: text } }
  if (!res.ok) throw new Error(data?.message || `Error ${res.status}: ${text}`)
  return data
}

export async function actualizarCapacidadSlotWellhub(slotId: string, totalCapacity: number, sucursalId?: string) {
  const gymId = await getGymId(sucursalId)
  const url   = `${WELLHUB_BASE_URL}/booking/v1/gyms/${gymId}/slots/${slotId}`
  const res   = await fetch(url, {
    method:  'PATCH',
    headers: wellhubHeaders(),
    body: JSON.stringify({ total_capacity: totalCapacity }),
  })
  const text = await res.text()
  let data; try { data = JSON.parse(text) } catch { data = { raw: text } }
  if (!res.ok) throw new Error(data?.message || `Error ${res.status}: ${text}`)
  return data
}

export async function actualizarHorarioSlotWellhub(slotId: string, fechaInicio: string, sucursalId?: string) {
  const gymId = await getGymId(sucursalId)
  const url   = `${WELLHUB_BASE_URL}/booking/v1/gyms/${gymId}/slots/${slotId}`

  // Convertir UTC a CDMX (UTC-6)
  const fechaUTC  = new Date(fechaInicio)
  const fechaCDMX = new Date(fechaUTC.getTime() - 6 * 60 * 60 * 1000)
  const occurDate = fechaCDMX.toISOString().slice(0, 19)

  const res = await fetch(url, {
    method:  'PATCH',
    headers: wellhubHeaders(),
    body: JSON.stringify({ occur_date: occurDate, cancellable_until: limiteCancelacion(fechaInicio) }),
  })
  const text = await res.text()
  let data; try { data = JSON.parse(text) } catch { data = { raw: text } }
  if (!res.ok) throw new Error(data?.message || `Error ${res.status}: ${text}`)
  return data
}

export async function actualizarCuposSlotWellhub(slotId: string, totalBooked: number, classId: string, sucursalId?: string) {
  const gymId = await getGymId(sucursalId)
  const url   = `${WELLHUB_BASE_URL}/booking/v1/gyms/${gymId}/classes/${classId}/slots/${slotId}`
  const res   = await fetch(url, {
    method:  'PATCH',
    headers: wellhubHeaders(),
    body: JSON.stringify({ total_booked: totalBooked }),
  })
  const text = await res.text()
  let data; try { data = JSON.parse(text) } catch { data = { raw: text } }
  if (!res.ok) throw new Error(data?.message || `Error ${res.status}: ${text}`)
  return data
}

// Actualizar el coach de un slot existente
export async function actualizarCoachSlotWellhub(slotId: string, classId: string, coach: string, sucursalId?: string) {
  const gymId = await getGymId(sucursalId)
  const url   = `${WELLHUB_BASE_URL}/booking/v1/gyms/${gymId}/classes/${classId}/slots/${slotId}`
  const res   = await fetch(url, {
    method:  'PATCH',
    headers: wellhubHeaders(),
    body: JSON.stringify({ instructors: [{ name: coach, substitute: false }] }),
  })
  const text = await res.text()
  let data; try { data = JSON.parse(text) } catch { data = { raw: text } }
  if (!res.ok) throw new Error(data?.message || `Error ${res.status}: ${text}`)
  return data
}

// Helpers de prueba — solo en sandbox, no usar en producción
export async function crearBookingWellhub(gympassUserId: string, slotId: number, classId: number, sucursalId?: string) {
  const gymId = await getGymId(sucursalId)
  const url   = `${WELLHUB_BASE_URL}/helper/v1/gyms/${gymId}/simulate/bookings`
  const res   = await fetch(url, {
    method:  'POST',
    headers: { ...wellhubHeaders(), Accept: 'application/json' },
    body: JSON.stringify({ gympass_user_id: gympassUserId, slot_id: slotId, class_id: classId }),
  })
  const text = await res.text()
  let data; try { data = JSON.parse(text) } catch { data = { raw: text } }
  if (!res.ok) throw new Error(data?.message || `Error ${res.status}: ${text}`)
  return data
}

export async function simularCheckinConBooking(gympassUserId: string, productId: number, bookingNumber: string, sucursalId?: string) {
  const gymId = await getGymId(sucursalId)
  const url   = `${WELLHUB_BASE_URL}/helper/v1/gyms/${gymId}/simulate/checkins`
  const res   = await fetch(url, {
    method:  'POST',
    headers: wellhubHeaders(),
    body: JSON.stringify({ gympass_user_id: gympassUserId, product_id: productId, booking_number: bookingNumber }),
  })
  const text = await res.text()
  let data; try { data = JSON.parse(text) } catch { data = { raw: text } }
  if (!res.ok) throw new Error(data?.message || `Error ${res.status}: ${text}`)
  return data
}

export async function cancelarSlotWellhub(slotId: string, classId: string, sucursalId: string) {
  const { gymId } = await getWellhubConfig(sucursalId)
  const url = `${WELLHUB_BASE_URL}/booking/v1/gyms/${gymId}/classes/${classId}/slots/${slotId}`
  const res = await fetch(url, {
    method:  'DELETE',
    headers: wellhubHeaders(),
  })
  const text = await res.text()
  let data; try { data = JSON.parse(text) } catch { data = { raw: text } }
  if (!res.ok) throw new Error(data?.message || `Error ${res.status}: ${text}`)
  return data
}
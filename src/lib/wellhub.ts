const WELLHUB_BASE_URL = 'https://api.partners.gympass.com'  // ← producción

// Mapeo sucursal → gym_id y product_id de producción
const WELLHUB_SUCURSAL_CONFIG: Record<string, { gymId: string; productId: number }> = {
  '1b2032dc-f5da-40c6-8c4e-e227be14673b': { gymId: '848637', productId: 953550 }, // Condesa Gym
  'f8f798a8-d89b-4874-a53a-cdcb6325ad2a': { gymId: '848638', productId: 953551 }, // Condesa Studio
}

// Fallback al env cuando no se pasa sucursal (ej. webhooks)
function getGymId(sucursalId?: string): string {
  if (sucursalId && WELLHUB_SUCURSAL_CONFIG[sucursalId]) {
    return WELLHUB_SUCURSAL_CONFIG[sucursalId].gymId
  }
  return process.env.WELLHUB_GYM_ID!
}

export function getWellhubConfig(sucursalId: string) {
  return WELLHUB_SUCURSAL_CONFIG[sucursalId] || {
    gymId:     process.env.WELLHUB_GYM_ID!,
    productId: Number(process.env.WELLHUB_PRODUCT_ID || 0),
  }
}

function wellhubHeaders() {
  return {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${process.env.WELLHUB_API_KEY}`,
  }
}

export async function validarAccesoWellhub(gympassId: string, sucursalId?: string) {
  const gymId = getGymId(sucursalId)
  const res = await fetch(`${WELLHUB_BASE_URL}/access/v1/validate`, {
    method:  'POST',
    headers: { ...wellhubHeaders(), 'X-Gym-Id': gymId },
    body:    JSON.stringify({ gympass_id: gympassId }),
  })
  const text = await res.text()
  let data; try { data = JSON.parse(text) } catch { data = { raw: text } }
  if (!res.ok) throw new Error(data?.message || `Error ${res.status}`)
  return data
}

export async function crearClaseWellhub(nombre: string, descripcion: string, sucursalId: string) {
  const { gymId, productId } = getWellhubConfig(sucursalId)
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
}) {
  const { gymId, productId } = getWellhubConfig(sucursalId)
  const url       = `${WELLHUB_BASE_URL}/booking/v1/gyms/${gymId}/classes/${classId}/slots`
  const opensAt   = new Date(Date.now()).toISOString()
  const closesAt  = params.fechaInicio

  const res = await fetch(url, {
    method:  'POST',
    headers: wellhubHeaders(),
    body: JSON.stringify({
      occur_date:        params.fechaInicio,
      status:            1,
      room:              params.room || 'Sala Principal',
      length_in_minutes: params.duracionMin,
      total_capacity:    params.capacidad,
      total_booked:      0,
      product_id:        productId,
      booking_window:    { opens_at: opensAt, closes_at: closesAt },
      cancellable_until: closesAt,
      instructors:       [],
      rate:              0,
    }),
  })
  const text = await res.text()
  let data; try { data = JSON.parse(text) } catch { data = { raw: text } }
  if (!res.ok) throw new Error(data?.message || `Error ${res.status}: ${text}`)
  return data
}

export async function confirmarBookingWellhub(bookingNumber: string, classId: number, confirmar: boolean, sucursalId?: string) {
  const gymId = getGymId(sucursalId)
  const url   = `${WELLHUB_BASE_URL}/booking/v1/gyms/${gymId}/bookings/${bookingNumber}`
  const res   = await fetch(url, {
    method:  'PATCH',
    headers: wellhubHeaders(),
    body: JSON.stringify({
      class_id: classId,
      status:   confirmar ? 2 : 3, // 2 = Reserved | 3 = Rejected
    }),
  })
  const text = await res.text()
  let data; try { data = JSON.parse(text) } catch { data = { raw: text } }
  if (!res.ok) throw new Error(data?.message || `Error ${res.status}: ${text}`)
  return data
}

export async function actualizarCapacidadSlotWellhub(slotId: string, totalCapacity: number, sucursalId?: string) {
  const gymId = getGymId(sucursalId)
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

export async function actualizarCuposSlotWellhub(slotId: string, totalBooked: number, classId: string, sucursalId?: string) {
  const gymId = getGymId(sucursalId)
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

// Helpers de prueba — solo en sandbox, no usar en producción
export async function crearBookingWellhub(gympassUserId: string, slotId: number, classId: number, sucursalId?: string) {
  const gymId = getGymId(sucursalId)
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
  const gymId = getGymId(sucursalId)
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
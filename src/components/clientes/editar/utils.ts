// src/components/clientes/editar/utils.ts
import { supabase } from '@/lib/supabase'

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL

/** Llama al backend de soporte con la sesión del staff. */
export async function apiSoporte(path: string, method: 'GET' | 'POST' = 'GET') {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${BACKEND}/soporte${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || 'No se pudo completar la acción')
  return data
}

/** Fecha de hoy en CDMX (YYYY-MM-DD). */
export const hoyCDMX = () => new Date(Date.now() - 6 * 3600 * 1000).toISOString().split('T')[0]

/** 'YYYY-MM-DD' → "5 de enero de 2027", sin que la zona horaria la mueva un día. */
export const fechaLarga = (d?: string | null) =>
  d ? new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'

export const fechaCorta = (d?: string | null) =>
  d ? new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

/** Fecha y hora (timestamps completos) en hora de CDMX. */
export const fechaHora = (d?: string | null) =>
  d ? new Date(d).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

/** "hace 3 días", "hoy", etc. */
export function hace(d?: string | null) {
  if (!d) return 'nunca'
  const dias = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
  if (dias <= 0) return 'hoy'
  if (dias === 1) return 'ayer'
  if (dias < 30) return `hace ${dias} días`
  const meses = Math.floor(dias / 30)
  return meses === 1 ? 'hace 1 mes' : `hace ${meses} meses`
}

export const diasHasta = (fecha?: string | null) =>
  fecha ? Math.ceil((new Date(`${fecha.slice(0, 10)}T23:59:59`).getTime() - Date.now()) / 86400000) : null

export const dinero = (n?: number | null) =>
  n == null ? '—' : `$${Number(n).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`

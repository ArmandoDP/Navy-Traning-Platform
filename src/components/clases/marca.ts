// src/components/clases/marca.ts
// Colores y etiquetas del detalle de clase. Wellhub en rosa, TotalPass en azul, Fitpass en naranja y Navy en negro;
// el verde queda solo para los estados "bien" (llegó, al día, publicada), así no se confunden.

export const NEGRO = '#171B24'
export const TZ = 'America/Mexico_City'

export type Canal = { clave: string; label: string; color: string; fondo: string; texto: string }

export const CANALES: Record<string, Canal> = {
  navy:      { clave: 'navy',      label: 'Navy app',      color: '#171B24', fondo: '#171B24', texto: '#FFFFFF' },
  crm:       { clave: 'crm',       label: 'Recepción',     color: '#6B7280', fondo: '#F3F4F6', texto: '#374151' },
  wellhub:   { clave: 'wellhub',   label: 'Wellhub',       color: '#E5197A', fondo: '#FDE7F1', texto: '#B0105C' },
  totalpass: { clave: 'totalpass', label: 'TotalPass',     color: '#2563EB', fondo: '#DBEAFE', texto: '#1D4ED8' },
  muestra:   { clave: 'muestra',   label: 'Clase muestra', color: '#7C3AED', fondo: '#F1EAFE', texto: '#6D28D9' },
  fitpass:   { clave: 'fitpass',   label: 'Fitpass',       color: '#F97316', fondo: '#FFEDD5', texto: '#C2410C' },
}
export const ORDEN_CANALES = ['navy', 'crm', 'wellhub', 'totalpass', 'fitpass', 'muestra']

export function canalDe(origen?: string | null, esMuestra?: boolean): Canal {
  const o = (origen || '').toLowerCase()
  if (esMuestra || o.includes('muestra')) return CANALES.muestra
  if (o === 'wellhub') return CANALES.wellhub
  if (o === 'totalpass') return CANALES.totalpass
  if (o === 'fitpass') return CANALES.fitpass
  if (o === 'crm' || o === 'sucursal' || o === 'recepción' || o === 'recepcion') return CANALES.crm
  return CANALES.navy
}

/** En qué va la clase, con el texto para el chip del encabezado. Se recalcula con el reloj. */
export function faseActual(horario?: string, duracion = 60, ahora = Date.now()): { fase: 'antes' | 'curso' | 'terminada'; texto: string } {
  if (!horario) return { fase: 'antes', texto: '' }
  const ini = new Date(horario).getTime()
  const fin = ini + duracion * 60000
  const min = (ms: number) => Math.max(0, Math.round(ms / 60000))
  const dur = (m: number) => m >= 1440 ? `${Math.floor(m / 1440)} d` : m >= 60 ? `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ''}`.trim() : `${m} min`
  if (ahora < ini) return { fase: 'antes', texto: `Por empezar · en ${dur(min(ini - ahora))}` }
  if (ahora < fin) return { fase: 'curso', texto: `En curso · faltan ${dur(min(fin - ahora))}` }
  return { fase: 'terminada', texto: 'Terminada' }
}

export const iniciales = (nombre?: string | null) =>
  (nombre || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase()

export const fechaLarga = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ }) : ''

export const horaCorta = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', timeZone: TZ }) : ''
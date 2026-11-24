// src/components/staff/equipo/util.ts
// Catálogos y formatos del módulo de Staff.

export const NEGRO = '#171B24'
export const TZ = 'America/Mexico_City'

export const TIPOS = ['Coach', 'Front', 'The Galley', 'Manager', 'Submanager', 'Regional', 'Staff general']
export const NIVELES = ['Seal', 'Marine', 'Elite', 'Coach de Piso']
export const CATEGORIAS = ['HYROX', 'Hybrid', 'Calistenia', 'Force', 'Open Gym', 'Movement', 'Recovery', 'Nutrición']
export const TIPOS_PAGO = ['Por clase', 'Fijo', 'Por hora', 'Fijo + clases']
export const ROLES = [
  { v: 'staff_navy',   l: 'Staff Navy',  d: 'Coaches y Front Desk: check-in, reservas y clases' },
  { v: 'staff_galley', l: 'The Galley',  d: 'Solo el módulo de The Galley' },
  { v: 'gerente',      l: 'Manager',     d: 'Su sucursal y su equipo (sin tarifas ni CLABE completa)' },
  { v: 'direccion',    l: 'Dirección',   d: 'Todo el CRM' },
]

export type Grupo = 'coach' | 'front' | 'galley' | 'gerencia' | 'otro'

export function grupo(s: any): Grupo {
  const t = (s?.tipo || '').toLowerCase()
  const r = (s?.rol || '').toLowerCase()
  if (t === 'coach') return 'coach'
  if (t === 'front') return 'front'
  if (t.includes('galley') || r === 'staff_galley') return 'galley'
  if (['manager', 'submanager', 'regional', 'admin'].includes(t) || r === 'gerente' || r === 'direccion') return 'gerencia'
  return 'otro'
}

export function puesto(s: any): string {
  const t = (s?.tipo || '').trim()
  if (t.toLowerCase() === 'front') return 'Front Desk'
  if (!t && (s?.rol || '') === 'staff_galley') return 'The Galley'
  return t || 'Staff'
}

/** Cómo se le paga si no tiene esquema capturado */
export function pagoDe(s: any): string {
  if (s?.tipo_pago) return s.tipo_pago
  return grupo(s) === 'coach' ? 'Por clase' : 'Fijo'
}

export const nombreCompleto = (s: any) =>
  [s?.nombre, s?.primer_apellido, s?.segundo_apellido].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()

export const iniciales = (s: any) => {
  const p = [s?.nombre, s?.primer_apellido].filter(Boolean).join(' ').split(/\s+/).filter(Boolean)
  return ((p[0]?.[0] || '?') + (p[1]?.[0] || '')).toUpperCase()
}

export const hora = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', timeZone: TZ }) : '—'

export const fechaCorta = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', timeZone: TZ }) : '—'

export const diaHora = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: TZ }) : '—'

export function antiguedad(fecha?: string | null): string {
  if (!fecha) return '—'
  const dias = Math.floor((Date.now() - new Date(fecha).getTime()) / 86400000)
  if (dias < 31) return `${dias} días`
  const meses = Math.floor(dias / 30.4)
  if (meses < 12) return `${meses} ${meses === 1 ? 'mes' : 'meses'}`
  const anios = Math.floor(meses / 12)
  return `${anios} ${anios === 1 ? 'año' : 'años'}`
}

/** "1 – 15 de noviembre" a partir de las fechas que manda el backend */
export function etiquetaQuincena(ini?: string, fin?: string): string {
  if (!ini || !fin) return ''
  const a = new Date(ini), b = new Date(new Date(fin).getTime() - 86400000)
  const d = (x: Date) => x.toLocaleDateString('es-MX', { day: 'numeric', timeZone: TZ })
  const mes = b.toLocaleDateString('es-MX', { month: 'long', timeZone: TZ })
  return `${d(a)} – ${d(b)} de ${mes}`
}

export const ESTADO_CLASE: Record<string, { txt: string; cls: string }> = {
  impartida:  { txt: 'Impartida',  cls: 'bg-emerald-100 text-emerald-700' },
  por_dar:    { txt: 'Por dar',    cls: 'bg-gray-100 text-gray-500' },
  en_curso:   { txt: 'En curso',   cls: 'bg-[#171B24] text-white' },
  pendiente:  { txt: 'Procesando', cls: 'bg-gray-100 text-gray-500' },
  sin_checar: { txt: 'Sin checar', cls: 'bg-amber-100 text-amber-800' },
  revisar:    { txt: 'Revisar',    cls: 'bg-amber-100 text-amber-800' },
  no_aplica:  { txt: 'No aplica',  cls: 'bg-gray-100 text-gray-400' },
}

export function quitarAcentos(str = ''): string {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim()
}
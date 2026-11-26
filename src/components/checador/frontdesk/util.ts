// src/components/checador/frontdesk/util.ts
// Constantes y formatos compartidos del checador de Front Desk.

export const NEGRO = '#171B24'
export const TZ = 'America/Mexico_City'

export const hora = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', timeZone: TZ }) : '—'

export const horaCorta = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: false, timeZone: TZ }) : '—'

export const MOTIVOS_SISTEMA: Record<string, string> = {
  sin_clases:       'sin clases hoy',
  sin_turno:        'sin turno hoy',
  fuera_de_ventana: 'fuera de su horario',
  lejos:            'lejos de la sucursal',
  sin_ubicacion:    'sin ubicación',
  codigo_vencido:   'código vencido',
  codigo_usado:     'código ya usado',
  codigo_invalido:  'código inválido',
}

export const ESTADO_CLASE: Record<string, { txt: string; cls: string }> = {
  termino:       { txt: 'Terminó',       cls: 'bg-gray-100 text-gray-500' },
  en_clase:      { txt: 'En clase',      cls: 'bg-[#171B24] text-white' },
  llego:         { txt: 'Llegó',         cls: 'bg-emerald-100 text-emerald-700' },
  no_ha_llegado: { txt: 'No ha llegado', cls: 'bg-amber-100 text-amber-800' },
  mas_tarde:     { txt: 'Más tarde',     cls: 'bg-gray-50 text-gray-400' },
  sin_coach:     { txt: 'Sin coach',     cls: 'bg-rose-100 text-rose-700' },
}

export const MOTIVOS_RECHAZO = ['No es la persona', 'No está en recepción']
export const DIAS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']        // índice 0 = domingo
export const ORDEN_SEMANA = [1, 2, 3, 4, 5, 6, 0]               // se muestra de lunes a domingo
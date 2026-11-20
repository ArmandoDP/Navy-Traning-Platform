// src/lib/ventanaReserva.ts
// Regla para agregar a un cliente desde la ventana de la clase (botón "Agregar cliente").

/** Minutos después de que EMPEZÓ la clase en los que todavía se puede agregar a quien llega tarde. */
export const MINUTOS_TOLERANCIA = 15

export type FaseClase =
  | 'antes'     // la clase no ha empezado: es una reserva normal
  | 'tarde'     // empezó hace menos de MINUTOS_TOLERANCIA: llega tarde, se registra como asistida
  | 'cerrada'   // ya pasó el tiempo: no se puede agregar

export function faseDeClase(horario: string | Date, ahora: Date = new Date(), tolerancia: number = MINUTOS_TOLERANCIA) {
  const minutos = Math.floor((ahora.getTime() - new Date(horario).getTime()) / 60000)   // negativo = falta para empezar
  const fase: FaseClase = minutos < 0 ? 'antes' : minutos < tolerancia ? 'tarde' : 'cerrada'
  return { fase, minutos }
}

/** Mensajes de la base de datos, en lenguaje de recepción. */
export function traducirErrorReserva(msg: string): string {
  const m = String(msg || '')
  if (m.includes('EMPALME'))        return 'Este cliente ya tiene otra clase reservada a la misma hora: ' + m.replace(/^.*EMPALME:\s*/, '').replace(/^ya tiene reservada\s*/i, '')
  if (m.includes('SPOT_OCUPADO'))   return 'Ese lugar acaba de ser tomado. Elige otro.'
  if (m.includes('CLASE_LLENA'))    return 'La clase está llena.'
  if (m.toLowerCase().includes('row-level security') || m.includes('42501')) return 'No tienes permiso para agregar reservas.'
  return m || 'No se pudo agregar al cliente.'
}

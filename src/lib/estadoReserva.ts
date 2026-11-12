// src/lib/estadoReserva.ts
// UN solo criterio para interpretar el estado de una reserva en el perfil del cliente.
//
// Por qué existe: el check-in por QR guarda la reserva como 'Asistida', el check-in desde la clase la guarda
// como 'Asistió', y el perfil solo entendía 'Confirmada' (y la mostraba como "Asistió"). Resultado: clases a las
// que sí fue aparecían como "Pendiente", y reservas futuras canceladas aparecían como "Próxima".

export type EstadoReserva =
  | 'cancelada'    // la canceló el cliente o el staff
  | 'no_show'      // no llegó (registrado)
  | 'asistio'      // hizo check-in
  | 'espera'       // en lista de espera, la clase aún no llega
  | 'no_asistio'   // estuvo en lista de espera y nunca tuvo lugar
  | 'proxima'      // confirmada y todavía no empieza
  | 'sin_checkin'  // la clase ya pasó, estaba confirmada y no hay check-in

const sinAcentos = (s?: string | null) =>
  String(s ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

const ESTATUS_ASISTIO = ['asistio', 'asistida', 'completada', 'checkin']

/** asistencias: filas de la tabla `asistencias` del cliente (con clase_id y/o reserva_id). */
export function estadoReserva(r: any, asistencias: any[] = [], ahora: Date = new Date()): EstadoReserva {
  const st = sinAcentos(r?.estatus)

  // El orden importa: una reserva cancelada nunca puede verse como "Próxima".
  if (st === 'cancelada' || st === 'cancelado') return 'cancelada'
  if (st === 'no show' || st === 'noshow')      return 'no_show'

  const hizoCheckin = ESTATUS_ASISTIO.includes(st)
    || asistencias.some(a => (a.reserva_id && a.reserva_id === r.id) || (a.clase_id && a.clase_id === r.clase_id))
  if (hizoCheckin) return 'asistio'

  const horario   = r?.clases?.horario
  const esFutura  = Boolean(horario) && new Date(horario) > ahora
  if (r?.lista_espera) return esFutura ? 'espera' : 'no_asistio'
  if (esFutura)        return 'proxima'
  return 'sin_checkin'
}

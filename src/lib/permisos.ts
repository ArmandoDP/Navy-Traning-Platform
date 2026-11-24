export type Rol = 'direccion' | 'gerente' | 'staff_navy' | 'staff_galley'

export type Modulo =
  | 'dashboard'
  | 'checkin'
  | 'galley'
  | 'reservas'
  | 'clases'
  | 'sucursales'
  | 'clientes'
  | 'staff'
  | 'paquetes'
  | 'finanzas'
  | 'nomina'
  | 'alertas'
  | 'reportes'
  | 'integraciones'
  | 'configuracion'
  | 'actividad'

export type Permiso = 'sin_acceso' | 'solo_ver' | 'ver_y_editar' | 'todo'

export const PERMISOS: Record<Rol, Record<Modulo, Permiso>> = {
  direccion: {
    dashboard:      'todo',
    checkin:        'todo',
    galley:         'todo',
    reservas:       'todo',
    clases:         'todo',
    sucursales:     'todo',
    clientes:       'todo',
    staff:          'todo',
    paquetes:       'todo',
    finanzas:       'todo',
    nomina:         'todo',
    alertas:        'todo',
    reportes:       'todo',
    integraciones:  'todo',
    configuracion:  'todo',
    actividad:      'todo',
  },
  gerente: {
    dashboard:      'solo_ver',
    checkin:        'ver_y_editar',
    galley:         'ver_y_editar',
    reservas:       'ver_y_editar',
    clases:         'ver_y_editar',
    sucursales:     'solo_ver',
    clientes:       'ver_y_editar',
    staff:          'ver_y_editar',   // Managers ven y editan su equipo; tarifas, cierre de quincena y CLABE completa: solo Dirección
    paquetes:       'sin_acceso',
    finanzas:       'ver_y_editar',
    nomina:         'sin_acceso',
    alertas:        'solo_ver',
    reportes:       'solo_ver',
    integraciones:  'sin_acceso',
    configuracion:  'sin_acceso',
    actividad:      'solo_ver',
  },
  staff_navy: {
    dashboard:      'sin_acceso',
    checkin:        'ver_y_editar',
    galley:         'solo_ver',
    reservas:       'ver_y_editar',
    clases:         'solo_ver',
    sucursales:     'sin_acceso',
    clientes:       'solo_ver',
    staff:          'sin_acceso',
    paquetes:       'sin_acceso',
    finanzas:       'sin_acceso',
    nomina:         'sin_acceso',
    alertas:        'ver_y_editar',
    reportes:       'sin_acceso',
    integraciones:  'sin_acceso',
    configuracion:  'sin_acceso',
    actividad:      'sin_acceso',
  },
  staff_galley: {
    dashboard:      'sin_acceso',
    checkin:        'sin_acceso',
    galley:         'ver_y_editar',
    reservas:       'sin_acceso',
    clases:         'sin_acceso',
    sucursales:     'sin_acceso',
    clientes:       'sin_acceso',
    staff:          'sin_acceso',
    paquetes:       'sin_acceso',
    finanzas:       'sin_acceso',
    nomina:         'sin_acceso',
    alertas:        'sin_acceso',
    reportes:       'sin_acceso',
    integraciones:  'sin_acceso',
    configuracion:  'sin_acceso',
    actividad:      'sin_acceso',
  },
}

export const ROLES_VALIDOS = Object.keys(PERMISOS) as Rol[]

/** Normaliza el rol que venga de la base o de la cookie ("Direccion " → "direccion"). Si no es válido, null. */
export function normalizarRol(rol?: string | null): Rol | null {
  const r = (rol || '').trim().toLowerCase() as Rol
  return ROLES_VALIDOS.includes(r) ? r : null
}

// Un rol desconocido no tiene acceso a nada (antes podía tronar o dejar pasar)
export function tieneAcceso(rol: Rol, modulo: Modulo): boolean {
  const p = PERMISOS[normalizarRol(rol) as Rol]?.[modulo] ?? 'sin_acceso'
  return p !== 'sin_acceso'
}

export function puedeEditar(rol: Rol, modulo: Modulo): boolean {
  const p = PERMISOS[normalizarRol(rol) as Rol]?.[modulo] ?? 'sin_acceso'
  return p === 'ver_y_editar' || p === 'todo'
}

/** Lo que dentro de Staff es solo de Dirección: tarifas y bonos, cerrar quincena y ver la CLABE completa. */
export function esDireccion(rol?: string | null): boolean {
  return normalizarRol(rol) === 'direccion'
}

export function esGlobal(rol: Rol): boolean {
  return normalizarRol(rol) === 'direccion'
}

export const RUTAS_MODULOS: Record<string, Modulo> = {
  '/dashboard/ejecutivo':    'dashboard',
  '/dashboard/checkin':      'checkin',
  '/dashboard/galley':       'galley',
  '/dashboard/reservas':     'reservas',
  '/dashboard/clases':       'clases',
  '/dashboard/clases-muestra': 'clases',
  '/dashboard/sucursales':   'sucursales',
  '/dashboard/clientes':     'clientes',
  '/dashboard/staff':        'staff',
  '/dashboard/paquetes':     'paquetes',
  '/dashboard/finanzas':     'finanzas',
  '/dashboard/nomina':       'nomina',
  '/dashboard/alertas':      'alertas',
  '/dashboard/reportes':     'reportes',
  '/dashboard/integraciones':'integraciones',
  '/dashboard/configuracion':'configuracion',
  '/dashboard/actividad':    'actividad',
}
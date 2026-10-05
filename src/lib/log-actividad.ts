// src/lib/log-actividad.ts
// Registra una acción del CRM con el usuario de staff que la hizo.
// Nunca lanza error: si el log falla, la acción principal no se ve afectada.

export async function logActividad({
  tipo,
  descripcion,
  tabla,
  accion,
  metadata,
  sucursal_id,
  staff_id,
}: {
  tipo:         string
  descripcion:  string
  tabla?:       string
  accion?:      string
  metadata?:    Record<string, any>
  sucursal_id?: string | null
  staff_id?:    string | null
}) {
  try {
    await fetch('/api/actividad/log', {
      method:    'POST',
      headers:   { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({ tipo, descripcion, tabla, accion, metadata, sucursal_id, staff_id }),
    })
  } catch (e) {
    console.warn('No se pudo registrar actividad:', e)
  }
}
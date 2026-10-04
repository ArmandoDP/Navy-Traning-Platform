export async function logActividad({
  tipo,
  descripcion,
  tabla,
  accion,
  metadata,
  sucursal_id,
  staff_id,
}: {
  tipo:        string
  descripcion: string
  tabla?:      string
  accion?:     string
  metadata?:   Record<string, any>
  sucursal_id?:string | null
  staff_id?:   string | null
}) {
  await fetch('/api/actividad/log', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tipo, descripcion, tabla, accion, metadata, sucursal_id, staff_id }),
  })
}
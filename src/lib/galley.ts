// Ayudas compartidas de The Galley

export const DIA_CONTEO = 4   // el conteo físico es los jueves (0 = domingo)

/** Fecha de hoy en CDMX (AAAA-MM-DD) */
export const hoyCDMX = () => new Date(Date.now() - 6 * 3600 * 1000).toISOString().slice(0, 10)

export const aFecha = (f: string) => { const [y, m, d] = f.split('-').map(Number); return new Date(y, m - 1, d) }
export const aTexto = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** El ciclo semanal del conteo arranca el jueves: devuelve el jueves más reciente (hoy, si es jueves). */
export function juevesDelCiclo(hoy: string): string {
  const d = aFecha(hoy)
  d.setDate(d.getDate() - ((d.getDay() - DIA_CONTEO + 7) % 7))
  return aTexto(d)
}

/** Trae todas las filas de una consulta aunque pasen de 1000 (el límite de Supabase por consulta). */
export async function traerTodo<T = any>(consulta: (desde: number, hasta: number) => PromiseLike<{ data: any; error: any }>): Promise<T[]> {
  const filas: T[] = []
  for (let desde = 0; desde < 50000; desde += 1000) {
    const { data, error } = await consulta(desde, desde + 999)
    if (error || !data) break
    filas.push(...data)
    if (data.length < 1000) break
  }
  return filas
}

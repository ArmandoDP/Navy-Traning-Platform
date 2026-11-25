// Equivalencias de insumos y su efecto en las recetas.
// Las recetas son una sola por producto (las comparten todas las sucursales), igual que las equivalencias:
// al cambiar una, se recalculan todas las recetas que usan ese insumo y esa medida.
import { supabase } from '@/lib/supabase'
import { convertir, normalizarUnidad, redondear, equivalenciaInversa } from '@/lib/medidas'
import { traerTodo } from '@/lib/galley'

/**
 * Aplica una equivalencia (1 `unidadNorm` de ese insumo = `cantidadBase` en su unidad base) a TODAS las recetas
 * que usan ese insumo con esa medida. La cantidad que descuenta el inventario se recalcula; lo escrito se conserva.
 */
export async function aplicarEquivalenciaARecetas(insumoId: string, unidadNorm: string, cantidadBase: number):
  Promise<{ actualizadas: number; error?: string }> {
  const { data: ins } = await supabase.from('insumos').select('id, unidad').eq('id', insumoId).single()
  if (!ins) return { actualizadas: 0, error: 'No se encontró el insumo' }
  const { data: filas, error } = await supabase.from('receta_ingredientes').select('*').eq('insumo_id', insumoId)
  if (error) return { actualizadas: 0, error: error.message }

  let actualizadas = 0
  for (const ri of filas || []) {
    const escrita = ri.unidad_medida || ri.unidad
    if (normalizarUnidad(escrita) !== unidadNorm) continue
    const cantidadEscrita = Number(ri.cantidad_medida ?? ri.cantidad)
    const conv = convertir(cantidadEscrita, escrita, ins.unidad, cantidadBase)
    if (conv.base === null) continue
    const cambios: any = { cantidad: redondear(conv.base), unidad: ins.unidad }
    if (ri.cantidad_medida == null) { cambios.cantidad_medida = cantidadEscrita; cambios.unidad_medida = String(escrita).trim() }
    const { error: e } = await supabase.from('receta_ingredientes').update(cambios).eq('id', ri.id)
    if (e) return { actualizadas, error: e.message }
    actualizadas++
  }
  return { actualizadas }
}

export interface FilaEquivalencia {
  clave:       string          // insumo|medida
  insumoId:    string
  insumo:      string
  unidadBase:  string          // unidad del inventario (pza, g, ml…)
  medida:      string          // como se escribe en las recetas (normalizada)
  inversa:     boolean         // insumo por pieza escrito en g/ml: se pregunta "¿cuánto pesa 1 pza?"
  base:        number | null   // equivalencia guardada (en unidad base por 1 medida), si existe
  recetas:     string[]        // productos que lo usan
}

/** Insumos con medidas que necesitan (o ya tienen) una equivalencia, y en qué recetas se usan. */
export async function cargarEquivalencias(): Promise<FilaEquivalencia[]> {
  const [recetas, eqs] = await Promise.all([
    traerTodo((a, b) => supabase.from('receta_ingredientes')
      .select('insumo_id, producto_id, unidad, unidad_medida').range(a, b)),
    supabase.from('insumo_equivalencias').select('insumo_id, unidad, cantidad_base'),
  ])
  const insumoIds = [...new Set(recetas.map((r: any) => r.insumo_id))]
  const productoIds = [...new Set(recetas.map((r: any) => r.producto_id))]
  const [{ data: insumos }, { data: productos }] = await Promise.all([
    insumoIds.length ? supabase.from('insumos').select('id, nombre, unidad').in('id', insumoIds) : Promise.resolve({ data: [] as any[] }),
    productoIds.length ? supabase.from('productos').select('id, nombre').in('id', productoIds) : Promise.resolve({ data: [] as any[] }),
  ])
  const porInsumo = new Map((insumos || []).map((i: any) => [i.id, i]))
  const porProducto = new Map((productos || []).map((p: any) => [p.id, p.nombre]))
  const guardadas = new Map<string, number>()
  ;(eqs.data || []).forEach((e: any) => guardadas.set(`${e.insumo_id}|${e.unidad}`, Number(e.cantidad_base)))

  const grupos = new Map<string, FilaEquivalencia>()
  for (const r of recetas as any[]) {
    const ins: any = porInsumo.get(r.insumo_id)
    if (!ins) continue
    const medida = normalizarUnidad(r.unidad_medida || r.unidad)
    if (!medida || medida === normalizarUnidad(ins.unidad)) continue
    const clave = `${r.insumo_id}|${medida}`
    const base = guardadas.has(clave) ? guardadas.get(clave)! : null
    // Solo las que necesitan equivalencia (o ya tienen una); kg→g, taza→ml, etc. se convierten solas
    if (base === null && convertir(1, medida, ins.unidad).base !== null) continue
    const fila: FilaEquivalencia = grupos.get(clave) || {
      clave, insumoId: r.insumo_id, insumo: ins.nombre, unidadBase: ins.unidad, medida,
      inversa: equivalenciaInversa(ins.unidad, medida), base, recetas: [],
    }
    const nombre = porProducto.get(r.producto_id)
    if (nombre && !fila.recetas.includes(nombre)) fila.recetas.push(nombre)
    grupos.set(clave, fila)
  }
  // Pendientes primero
  return [...grupos.values()].sort((a, b) => Number(a.base !== null) - Number(b.base !== null) || a.insumo.localeCompare(b.insumo))
}

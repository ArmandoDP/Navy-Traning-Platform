// Medidas de las recetas de The Galley.
// En las recetas se puede escribir cualquier medida (cucharadas, tazas, scoops…). El inventario siempre se
// lleva en la unidad base del insumo (g, kg, ml, lt o pza), así que cada medida se convierte a esa unidad.

type Tipo = 'masa' | 'volumen' | 'conteo'

// Unidades "formales" y cuánto valen respecto a g (masa), ml (volumen) o pza (conteo)
const FORMALES: Record<string, { tipo: Tipo; factor: number }> = {
  mg:  { tipo: 'masa',    factor: 0.001 },
  g:   { tipo: 'masa',    factor: 1 },
  kg:  { tipo: 'masa',    factor: 1000 },
  ml:  { tipo: 'volumen', factor: 1 },
  l:   { tipo: 'volumen', factor: 1000 },
  pza: { tipo: 'conteo',  factor: 1 },
}

// Medidas caseras de volumen (solo valen directo para insumos que se llevan en ml o litros)
const CASERAS_ML: Record<string, number> = { cucharadita: 5, cucharada: 15, taza: 240 }

const ALIAS: Record<string, string> = {
  gr: 'g', gramo: 'g', gramos: 'g', grs: 'g',
  kilo: 'kg', kilos: 'kg', kilogramo: 'kg', kgs: 'kg',
  litro: 'l', litros: 'l', lt: 'l', lts: 'l', mililitro: 'ml', mililitros: 'ml', cc: 'ml',
  pieza: 'pza', piezas: 'pza', pz: 'pza', pzas: 'pza', unidad: 'pza', unidades: 'pza',
  cda: 'cucharada', cdas: 'cucharada', cdta: 'cucharadita', cdtas: 'cucharadita',
}

/** Minúsculas, sin acentos, sin plural: "Cucharadas" → "cucharada", "Tazas" → "taza", "lt" → "l". */
export function normalizarUnidad(u: string | null | undefined): string {
  let x = String(u ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim()
  if (ALIAS[x]) return ALIAS[x]
  if (x.length > 3 && x.endsWith('s')) x = x.slice(0, -1)
  return ALIAS[x] || x
}

export type Via = 'igual' | 'formal' | 'equivalencia' | 'casera'
export interface Conversion { base: number | null; via: Via | null }

/**
 * Convierte `cantidad` de `unidadReceta` a la unidad base del insumo.
 * `equivalencia` = cuánto vale 1 `unidadReceta` de ESE insumo, ya expresado en su unidad base (si alguien la registró).
 * Devuelve base = null cuando no se puede convertir y falta registrar la equivalencia.
 */
export function convertir(cantidad: number, unidadReceta: string, unidadBase: string | null | undefined, equivalencia?: number | null): Conversion {
  const u = normalizarUnidad(unidadReceta)
  const b = normalizarUnidad(unidadBase)
  if (!(cantidad >= 0) || !u || !b) return { base: null, via: null }
  if (u === b) return { base: cantidad, via: 'igual' }
  if (equivalencia && equivalencia > 0) return { base: cantidad * equivalencia, via: 'equivalencia' }
  const fu = FORMALES[u], fb = FORMALES[b]
  if (fu && fb && fu.tipo === fb.tipo) return { base: cantidad * fu.factor / fb.factor, via: 'formal' }
  if (CASERAS_ML[u] && fb?.tipo === 'volumen') return { base: cantidad * CASERAS_ML[u] / fb.factor, via: 'casera' }
  return { base: null, via: null }
}

/**
 * Insumos que se llevan en piezas (plátano, limón…) pero se escriben en gramos o ml en la receta:
 * ahí la equivalencia se pregunta al revés ("¿cuántos g pesa 1 pza?") y se guarda como piezas por cada g.
 */
export const equivalenciaInversa = (unidadBase: string | null | undefined, unidadReceta: string | null | undefined) =>
  normalizarUnidad(unidadBase) === 'pza' && ['mg', 'g', 'kg', 'ml', 'l'].includes(normalizarUnidad(unidadReceta))

/** Redondea para guardar (hasta 4 decimales) */
export const redondear = (n: number) => Math.round(n * 10000) / 10000

/** Para mostrar: sin ceros de más */
export const formatoNumero = (n: number) => String(Math.round(n * 100) / 100)

/** Sugerencias para el campo "medida" (se puede escribir cualquier otra) */
export const SUGERENCIAS_UNIDAD = [
  'g', 'kg', 'ml', 'l', 'pza',
  'cucharada', 'cucharadita', 'taza', 'scoop', 'pizca', 'puñado', 'rebanada', 'porción', 'gota',
]

// Búsqueda tolerante para nombres de productos: ignora mayúsculas, acentos y espacios de más,
// y perdona errores leves de ortografía ("yogur bowl" encuentra "Yogurt Bowl").

/** Minúsculas, sin acentos, sin signos y con un solo espacio entre palabras. */
export const normalizar = (s: string | null | undefined): string =>
  String(s ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

/** Nombre listo para guardar: sin espacios al inicio ni al final y un solo espacio entre palabras. */
export const limpiarNombre = (s: string | null | undefined): string =>
  String(s ?? '').replace(/\s+/g, ' ').trim()

// Distancia de edición (cuántas letras hay que cambiar para pasar de una palabra a otra)
function distancia(a: string, b: string): number {
  if (a === b) return 0
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let anterior = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, anterior + (a[i - 1] === b[j - 1] ? 0 : 1))
      anterior = tmp
    }
  }
  return prev[b.length]
}

/** ¿El texto coincide con lo que se escribió? Todas las palabras buscadas deben aparecer (o casi). */
export function coincide(texto: string | null | undefined, consulta: string | null | undefined): boolean {
  const q = normalizar(consulta)
  if (!q) return true
  const t = normalizar(texto)
  if (t.includes(q) || t.replace(/ /g, '').includes(q.replace(/ /g, ''))) return true

  const palabrasTexto = t.split(' ').filter(Boolean)
  return q.split(' ').filter(Boolean).every(pq => {
    if (t.includes(pq)) return true
    if (pq.length < 3) return false                    // palabras muy cortas: solo coincidencia exacta
    const tolerancia = pq.length >= 7 ? 2 : 1
    // Se compara contra el inicio de cada palabra (para búsquedas a medias) y, si es larga, contra la palabra completa
    return palabrasTexto.some(pt =>
      distancia(pq, pt.slice(0, pq.length)) <= tolerancia ||
      distancia(pq, pt.slice(0, pq.length + 1)) <= tolerancia ||
      (pq.length >= 4 && distancia(pq, pt) <= tolerancia))
  })
}

'use client'
// Cuadrícula editable de un room, estilo Navy. Rack en negro, Piso en blanco con borde, Coach y Entrada.
import { motion } from 'framer-motion'
import { ItemType } from './RoomItemSelector'
import { IconoRack, IconoPiso, IconoEntrada } from './iconos'

export interface CeldaGrid {
  fila:    number
  columna: number
  tipo:    ItemType
  numero:  string | null
  bloqueado: boolean
}

// ── Numeración de los lugares ───────────────────────────────────────────────
// Un solo número corrido para todo el room (R1, P2, R3…), sin repetir entre racks y pisos.
export const ES_LUGAR = (tipo: ItemType | string | null) => tipo === 'Rack' || tipo === 'Mat'
export type Prefijos = { Rack: string; Mat: string }
export const PREFIJOS_DEFAULT: Prefijos = { Rack: 'R', Mat: 'P' }
const numeroDe = (n: string | null) => Number(String(n || '').replace(/\D/g, '')) || 0

/** El siguiente número libre del room, con la letra de su tipo (continúa la numeración corrida). */
export function siguienteNumero(celdas: CeldaGrid[], tipo: ItemType, prefijos: Prefijos = PREFIJOS_DEFAULT): string {
  if (!ES_LUGAR(tipo)) return ''
  const max = celdas.filter(c => ES_LUGAR(c.tipo)).reduce((m, c) => Math.max(m, numeroDe(c.numero)), 0)
  return `${prefijos[tipo as 'Rack' | 'Mat']}${max + 1}`
}

/** Numera todo el room en "U" por columnas, como el mapa físico de Navy:
 *  la primera columna de abajo hacia arriba, la siguiente de arriba hacia abajo, y así alternando. */
export function numerarEnU(celdas: CeldaGrid[], prefijos: Prefijos = PREFIJOS_DEFAULT): CeldaGrid[] {
  const lugares = celdas.filter(c => ES_LUGAR(c.tipo))
  const columnas = [...new Set(lugares.map(c => c.columna))].sort((a, b) => a - b)
  const orden = [...lugares].sort((a, b) => {
    const ca = columnas.indexOf(a.columna), cb = columnas.indexOf(b.columna)
    if (ca !== cb) return ca - cb
    return ca % 2 === 0 ? b.fila - a.fila : a.fila - b.fila
  })
  const nuevo = new Map(orden.map((c, i) => [`${c.fila}-${c.columna}`, `${prefijos[c.tipo as 'Rack' | 'Mat']}${i + 1}`]))
  return celdas.map(c => ES_LUGAR(c.tipo) ? { ...c, numero: nuevo.get(`${c.fila}-${c.columna}`) || c.numero } : c)
}

/** Etiquetas repetidas (para no guardar dos lugares con el mismo número). */
export function repetidos(celdas: CeldaGrid[]): string[] {
  const vistos = new Map<string, number>()
  for (const c of celdas) if (ES_LUGAR(c.tipo) && c.numero) vistos.set(c.numero.toUpperCase(), (vistos.get(c.numero.toUpperCase()) || 0) + 1)
  return [...vistos].filter(([, n]) => n > 1).map(([k]) => k)
}

interface Props {
  ancho:        number
  alto:         number
  celdas:       CeldaGrid[]
  itemSelected: ItemType
  zoom:         number
  onCeldaClick: (fila: number, columna: number) => void
  soloLectura?: boolean          // el mapa no se puede cambiar (hay reservas a futuro)
}

export function ContenidoCelda({ celda, size }: { celda: { tipo: ItemType | string | null; numero: string | null }; size: number }) {
  const etiqueta = (color: string) => celda.numero
    ? <span className="font-black leading-none tracking-tight" style={{ color, fontSize: Math.max(10, size * 0.2) }}>{celda.numero}</span>
    : null
  if (celda.tipo === 'Rack') return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1">
      <IconoRack ancho={size * 0.62} color="#FFFFFF" />
      {etiqueta('#FFFFFF')}
    </div>
  )
  if (celda.tipo === 'Mat') return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1">
      <IconoPiso ancho={size * 0.58} color="#171B24" />
      {etiqueta('#171B24')}
    </div>
  )
  if (celda.tipo === 'Coach') return (
    <div className="flex h-full w-full items-center justify-center">
      <span className="font-black tracking-[.18em] text-white" style={{ fontSize: Math.max(8, size * 0.15) }}>COACH</span>
    </div>
  )
  if (celda.tipo === 'Entrada') return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-gray-500">
      <IconoEntrada ancho={size * 0.42} />
      <span className="font-bold" style={{ fontSize: Math.max(8, size * 0.14) }}>Entrada</span>
    </div>
  )
  return null
}

export const ESTILO_CELDA: Record<string, React.CSSProperties> = {
  Rack:    { background: '#171B24', borderColor: '#171B24' },
  Mat:     { background: '#FFFFFF', borderColor: '#171B24' },
  Coach:   { background: 'linear-gradient(135deg, #171B24, #3B4252)', borderColor: '#171B24' },
  Entrada: { background: '#FFFFFF', borderColor: '#9CA3AF', borderStyle: 'dashed' },
}

export default function RoomGrid({ ancho, alto, celdas, itemSelected, zoom, onCeldaClick, soloLectura }: Props) {
  if (ancho === 0 || alto === 0) return (
    <div className="flex h-48 flex-col items-center justify-center gap-1 text-center">
      <p className="text-sm font-bold text-gray-700">Todavía no hay cuadrícula</p>
      <p className="text-xs text-gray-400">Sube las columnas y filas para empezar a colocar racks y pisos.</p>
    </div>
  )

  const cellSize = Math.max(44, Math.min(88, Math.floor((360 / ancho) * (zoom / 100))))
  const getCelda = (fila: number, columna: number) => celdas.find(c => c.fila === fila && c.columna === columna)

  return (
    <div className="flex w-full justify-center overflow-auto p-4">
      <div className="inline-grid gap-1.5" style={{ gridTemplateColumns: `repeat(${ancho}, ${cellSize}px)` }}>
        {Array.from({ length: alto }, (_, fila) =>
          Array.from({ length: ancho }, (_, columna) => {
            const celda = getCelda(fila, columna)
            const conItem = !!celda?.tipo
            return (
              <button
                key={`${fila}-${columna}`}
                type="button"
                onClick={() => onCeldaClick(fila, columna)}
                title={celda?.numero ? `${celda.numero}${soloLectura ? '' : itemSelected ? ' · clic para quitar' : ' · clic para renombrar'}` : undefined}
                className={`group relative grid place-items-center rounded-[12px] border-2 transition ${
                  soloLectura ? 'cursor-not-allowed' : 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md'}`}
                style={{
                  width: cellSize, height: cellSize,
                  ...(conItem ? ESTILO_CELDA[celda!.tipo as string] : { background: '#FFFFFF', borderColor: '#EEF0F3', borderStyle: 'dashed' }),
                  ...(celda?.bloqueado ? { opacity: 0.35 } : {}),
                }}
              >
                {conItem ? (
                  <motion.div key={`${celda!.tipo}-${celda!.numero}`} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 26 }} className="h-full w-full">
                    <ContenidoCelda celda={celda!} size={cellSize} />
                  </motion.div>
                ) : (
                  <span className="text-[9px] font-semibold text-gray-300 transition group-hover:opacity-0">{fila + 1}·{columna + 1}</span>
                )}
                {!conItem && itemSelected && !soloLectura && (
                  <span className="pointer-events-none absolute inset-0 grid place-items-center rounded-[10px] opacity-0 transition group-hover:opacity-40"
                    style={ESTILO_CELDA[itemSelected as string]}>
                    <ContenidoCelda celda={{ tipo: itemSelected, numero: null }} size={cellSize} />
                  </span>
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
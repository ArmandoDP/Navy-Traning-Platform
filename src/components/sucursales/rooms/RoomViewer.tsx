'use client'
// Visor del mapa de un room (solo ver, o elegir lugar). Estilo Navy, con el estado de cada lugar.
import { motion } from 'framer-motion'
import { ContenidoCelda, ESTILO_CELDA } from './RoomGrid'

interface Spot {
  id:        string
  numero:    string
  tipo:      string
  fila:      number
  columna:   number
  bloqueado: boolean
  estatus?:  string  // 'Libre' | 'Ocupado' | 'No-show' | 'Bloqueado'
}

interface CeldaLayout {
  fila:    number
  columna: number
  tipo:    string
  numero:  string | null
}

interface Props {
  nombre:    string
  ancho:     number
  alto:      number
  layout:    CeldaLayout[]
  spots?:    Spot[]          // spots con estatus real
  readonly?: boolean         // true = solo ver, false = puede seleccionar
  onSpotClick?: (spot: Spot) => void
}

// Estado de cada lugar: anillo de color alrededor del lugar
const ESTATUS: Record<string, { anillo: string; label: string }> = {
  Libre:     { anillo: '#D1D5DB', label: 'Libre' },
  Ocupado:   { anillo: '#10B981', label: 'Ocupado' },
  'No-show': { anillo: '#F43F5E', label: 'No-show' },
  Bloqueado: { anillo: '#E5E7EB', label: 'Bloqueado' },
}

export default function RoomViewer({ nombre, ancho, alto, layout, spots = [], readonly = true, onSpotClick }: Props) {
  if (ancho === 0 || alto === 0) return (
    <div className="flex h-48 items-center justify-center text-sm text-gray-400">Este room todavía no tiene mapa.</div>
  )

  const cellSize = Math.max(44, Math.min(72, Math.floor(320 / ancho)))
  const getCelda = (f: number, c: number) => layout.find(x => x.fila === f && x.columna === c)
  const getSpot = (f: number, c: number) => spots.find(x => x.fila === f && x.columna === c)
  const reservable = (tipo?: string) => tipo === 'Rack' || tipo === 'Mat'
  const conEstatus = spots.some(s => s.estatus)

  return (
    <div className="flex flex-col items-center gap-4">
      {nombre && <p className="text-base font-black tracking-tight text-gray-900">{nombre}</p>}

      <div className="inline-grid gap-1.5 rounded-[20px] border border-gray-100 bg-[#FAFAFB] p-4"
        style={{ gridTemplateColumns: `repeat(${ancho}, ${cellSize}px)` }}>
        {Array.from({ length: alto }, (_, fila) =>
          Array.from({ length: ancho }, (_, columna) => {
            const celda = getCelda(fila, columna)
            const spot = getSpot(fila, columna)
            const bloqueado = !!(spot?.bloqueado || spot?.estatus === 'Bloqueado')
            const clicable = !readonly && reservable(celda?.tipo) && !bloqueado && !!spot && !!onSpotClick
            const est = spot?.estatus ? ESTATUS[spot.estatus] : null
            return (
              <motion.div key={`${fila}-${columna}`}
                whileHover={clicable ? { y: -2 } : undefined}
                onClick={() => { if (clicable) onSpotClick!(spot!) }}
                className={`grid place-items-center rounded-[12px] ${celda?.tipo ? 'border-2' : ''} ${clicable ? 'cursor-pointer hover:shadow-md' : ''}`}
                style={{
                  width: cellSize, height: cellSize,
                  ...(celda?.tipo ? ESTILO_CELDA[celda.tipo] : {}),
                  ...(est && reservable(celda?.tipo) ? { boxShadow: `0 0 0 3px ${est.anillo}` } : {}),
                  opacity: bloqueado ? 0.35 : 1,
                }}>
                {celda?.tipo && <ContenidoCelda celda={{ tipo: celda.tipo, numero: celda.numero }} size={cellSize} />}
              </motion.div>
            )
          })
        )}
      </div>

      {conEstatus && (
        <div className="flex flex-wrap items-center justify-center gap-4">
          {Object.values(ESTATUS).map(e => (
            <span key={e.label} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="h-3 w-3 rounded-full border-2 bg-white" style={{ borderColor: e.anillo }} />{e.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
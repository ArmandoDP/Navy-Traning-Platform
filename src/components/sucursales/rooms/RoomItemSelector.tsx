'use client'
// Herramientas para armar el mapa de un room. El tipo 'Mat' se muestra como "Piso" (así le dicen en Navy);
// internamente sigue siendo 'Mat' para no afectar a la app.
import { motion } from 'framer-motion'
import { IconoRack, IconoPiso, IconoEntrada } from './iconos'

export type ItemType = 'Rack' | 'Mat' | 'Coach' | 'Entrada' | null

interface Props {
  selected: ItemType
  onSelect: (item: ItemType) => void
  deshabilitado?: boolean
}

const ITEMS: { tipo: ItemType; label: string; ayuda: string; icono: (on: boolean) => React.ReactNode }[] = [
  { tipo: 'Rack',    label: 'Rack',    ayuda: 'Lugar reservable', icono: on => <IconoRack ancho={36} color={on ? '#FFFFFF' : '#171B24'} /> },
  { tipo: 'Mat',     label: 'Piso',    ayuda: 'Lugar reservable', icono: on => <IconoPiso ancho={34} color={on ? '#FFFFFF' : '#171B24'} /> },
  { tipo: 'Coach',   label: 'Coach',   ayuda: 'Dónde da la clase', icono: on => <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-black tracking-[.18em] ${on ? 'bg-white text-gray-900' : 'bg-[#171B24] text-white'}`}>COACH</span> },
  { tipo: 'Entrada', label: 'Entrada', ayuda: 'Puerta del room',  icono: on => <IconoEntrada ancho={26} color={on ? '#FFFFFF' : '#171B24'} /> },
]

export default function RoomItemSelector({ selected, onSelect, deshabilitado }: Props) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {ITEMS.map(item => {
        const on = selected === item.tipo
        return (
          <button key={item.tipo} type="button" disabled={deshabilitado}
            onClick={() => onSelect(on ? null : item.tipo)}
            className={`relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-3 transition disabled:cursor-not-allowed disabled:opacity-40 ${
              on ? 'border-[#171B24] text-white' : 'border-gray-200 bg-white text-gray-900 hover:border-gray-300'}`}>
            {on && <motion.span layoutId="herramienta-room" className="absolute inset-0 rounded-2xl" style={{ background: '#171B24' }}
              transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
            <span className="relative flex h-7 items-center justify-center">{item.icono(on)}</span>
            <span className="relative text-xs font-black">{item.label}</span>
            <span className={`relative text-[10px] ${on ? 'text-white/60' : 'text-gray-400'}`}>{item.ayuda}</span>
          </button>
        )
      })}
    </div>
  )
}
'use client'
import Link from 'next/link'
import { Plus, Pencil } from 'lucide-react'

interface Clase {
  id:           string
  nombre_clase: string
  tipo_clase:   string
  capacidad_max: number
  staff?: { nombre: string; primer_apellido: string }
}

interface Props {
  clases:          Clase[]
  onCrearRoom:     () => void
}

export default function SucursalRooms({ clases, onCrearRoom }: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="font-bold text-gray-900">Rooms</h3>
        <button
          onClick={onCrearRoom}
          className="flex items-center gap-1 text-indigo-500 hover:text-indigo-700 text-sm font-bold transition"
        >
          <Plus size={14} /> Crear nuevo room
        </button>
      </div>

      {clases.length === 0 ? (
        <div className="p-10 text-center text-gray-400 italic text-sm">
          No hay rooms en esta sucursal
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-px bg-gray-100">
          {clases.map(c => (
            <div key={c.id} className="bg-white p-4 hover:bg-gray-50 transition">
              <div className="flex items-start justify-between mb-1">
                <p className="text-sm font-bold text-gray-900 leading-tight">{c.nombre_clase}</p>
                <Link href={`/dashboard/clases/${c.id}`}>
                  <Pencil size={12} className="text-gray-300 hover:text-indigo-500 transition mt-0.5" />
                </Link>
              </div>
              <p className="text-xs text-gray-400">{c.tipo_clase || 'Hybrid'}</p>
              {c.staff && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {`${c.staff.nombre} ${c.staff.primer_apellido}`.trim()}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Capacidad <span className="font-bold text-gray-700">{c.capacidad_max} pax</span>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
'use client'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import ClasesCapacidadBar from './ClasesCapacidadBar'
import ClasesFilters      from './ClasesFilters'
import { useState } from 'react'

interface Clase {
  id:           string
  nombre_clase: string
  tipo_clase:   string
  tipo_display: string
  color:        string
  horario:      string
  capacidad_max: number
  salon:        string
  estado:       string
  duracion_minutos: number
  staff?:       { nombre: string; primer_apellido: string }
  reservas?:    any[]
  categorias_clase?: { nombre: string; color: string } // ← nuevo
}

interface Props {
  clases:      Clase[]
  fechaActiva: Date
}

// Badge de tipo con color dinámico
function TipoBadge({ tipo, color }: { tipo: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border"
      style={{ borderColor: color, color, backgroundColor: `${color}12` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {tipo || 'General'}
    </span>
  )
}

function CategoriaBadge({ categoria }: { categoria?: { nombre: string; color: string } }) {
  if (!categoria) return <span className="text-xs text-gray-300">—</span>
  const r = parseInt(categoria.color.slice(1,3),16)
  const g = parseInt(categoria.color.slice(3,5),16)
  const b = parseInt(categoria.color.slice(5,7),16)
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold"
      style={{ color: categoria.color, backgroundColor: `rgba(${r},${g},${b},0.12)` }}>
      {categoria.nombre}
    </span>
  )
}

const TIPO_COLORS: Record<string, string> = {
  Hybrid:    '#3b82f6',
  Hyrox:     '#22c55e',
  Spinning:  '#f97316',
  Yoga:      '#8b5cf6',
  Box:       '#ef4444',
  Funcional: '#6366f1',
  General:   '#9ca3af',
}

function getColor(tipo: string, colorDB?: string) {
  if (colorDB && colorDB !== '#6366f1') return colorDB
  return TIPO_COLORS[tipo] || TIPO_COLORS['General']
}

export default function ClasesListaView({ clases, fechaActiva }: Props) {
  const [filtros, setFiltros] = useState({ hora: '', clase: '', room: '', coach: '', tipo: '', estado: '' })

  const setFiltro = (k: string, v: string) => setFiltros(p => ({ ...p, [k]: v }))
  const limpiar   = () => setFiltros({ hora: '', clase: '', room: '', coach: '', tipo: '', estado: '' })

  // Filtrar clases del día activo
  const clasesDia = clases.filter(c => {
    const f = new Date(c.horario)
    return f.toDateString() === fechaActiva.toDateString()
  })

  const filtradas = clasesDia.filter(c => {
    const hora  = new Date(c.horario).toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit', hour12: false })
    const coach = `${c.staff?.nombre || ''} ${c.staff?.primer_apellido || ''}`.trim().toLowerCase()
    const tipo  = (c.tipo_display || c.tipo_clase || '').toLowerCase()
    return (
      (!filtros.hora   || hora.startsWith(filtros.hora))                         &&
      (!filtros.clase  || c.nombre_clase.toLowerCase().includes(filtros.clase.toLowerCase())) &&
      (!filtros.room   || (c.salon || '').toLowerCase().includes(filtros.room.toLowerCase())) &&
      (!filtros.coach  || coach.includes(filtros.coach.toLowerCase()))           &&
      (!filtros.tipo   || tipo.includes(filtros.tipo.toLowerCase()))             &&
      (!filtros.estado || c.estado === filtros.estado)
    )
  })

  const tiposUnicos   = [...new Set(clases.map(c => c.tipo_display || c.tipo_clase).filter(Boolean))] as string[]
  const coachesUnicos = [...new Set(clases.map(c =>
    c.staff ? `${c.staff.nombre} ${c.staff.primer_apellido}`.trim() : null
  ).filter(Boolean))] as string[]
  const roomsUnicos   = [...new Set(clases.map(c => c.salon).filter(Boolean))] as string[]

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">

      {/* Sub-header con filtros */}
      <div className="px-5 border-b border-gray-100">
        <ClasesFilters
          filtros={filtros}
          tiposUnicos={tiposUnicos}
          coachesUnicos={coachesUnicos}
          roomsUnicos={roomsUnicos}
          onChange={setFiltro}
          onLimpiar={limpiar}
        />
      </div>

      {/* Tabla */}
      <table className="w-full text-left">
        <thead>
          <tr className="text-gray-400 text-xs font-bold uppercase border-b border-gray-100">
            <th className="px-5 py-3">Inicio</th>
            <th className="px-5 py-3">Clase / Room</th>
            <th className="px-5 py-3">Coach</th>
            <th className="px-5 py-3">Tipo</th>
            <th className="px-5 py-3">Categoría</th>
            <th className="px-5 py-3">Capacidad</th>
            <th className="px-5 py-3">Duración</th>
            <th className="px-5 py-3">Estado</th>
            <th className="px-5 py-3 w-8"/>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {filtradas.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-5 py-12 text-center text-gray-400 italic text-sm">
                No hay clases para este día
              </td>
            </tr>
          ) : filtradas.map(c => {
            const hora        = new Date(c.horario).toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit', hour12: false })
            const totalReservas = c.reservas?.filter((r: any) => r.estatus !== 'Cancelada').length || 0
            const tipo        = c.tipo_display || c.tipo_clase || 'General'
            const color       = getColor(tipo, c.color)
            const duracion    = c.duracion_minutos || 60

            return (
              <tr key={c.id} className="hover:bg-gray-50 transition group">
                {/* Hora */}
                <td className="px-5 py-3.5">
                  <span className="text-sm font-bold text-gray-900">{hora}</span>
                </td>

                {/* Clase / Room */}
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <div>
                      <p className="text-sm font-bold text-gray-900">{c.nombre_clase}</p>
                      <p className="text-[11px] text-gray-400 uppercase font-medium">{c.salon || tipo}</p>
                    </div>
                  </div>
                </td>

                {/* Coach */}
                <td className="px-5 py-3.5 text-sm text-gray-600">
                  {c.staff ? `${c.staff.nombre} ${c.staff.primer_apellido}`.trim() : '—'}
                </td>

                {/* Tipo badge */}
                <td className="px-5 py-3.5">
                  <TipoBadge tipo={tipo} color={color} />
                </td>

                {/* Categoría */}
                <td className="px-5 py-3.5">
                  <CategoriaBadge categoria={c.categorias_clase} />
                </td>
                
                {/* Capacidad */}
                <td className="px-5 py-3.5">
                  <ClasesCapacidadBar reservas={totalReservas} capacidad={c.capacidad_max} />
                </td>

                {/* Duración */}
                <td className="px-5 py-3.5 text-sm text-gray-600">
                  {duracion} min
                </td>

                {/* Estado */}
                <td className="px-5 py-3.5">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    c.estado === 'Activa' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                  }`}>
                    {c.estado || 'Activa'}
                  </span>
                </td>

                {/* Flecha */}
                <td className="px-5 py-3.5">
                  <Link href={`/dashboard/clases/${c.id}`}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-300 hover:text-indigo-600 flex items-center">
                    <ChevronRight size={16}/>
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
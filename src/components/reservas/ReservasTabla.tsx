'use client'
import { useState, useEffect } from 'react'
import {
  ChevronLeft, ChevronRight, MoreHorizontal,
  CheckCircle, Clock, XCircle,
  Calendar, X as XIcon
} from 'lucide-react'
import { BadgeSucursal, BadgeEstatus } from './ReservasBadges'

interface Reserva {
  id: string
  estatus: string
  lista_espera: boolean
  tipo_llegada: string
  impacto: string
  penalizacion: string
  reincidencia: number
  created_at: string
  origen: string | null
  es_clase_muestra: boolean
  nombre_externo?: string | null
  email_externo?: string | null
  asistencias: { id: string }[]
  clientes: { id: string; nombre_completo: string; email: string; telefono?: string }
  clases: { id: string; nombre_clase: string; horario: string; tipo_clase: string; sucursales?: { nombre: string } }
}

type Tab = 'activas' | 'cancelaciones' | 'no-shows'

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'activas',       label: 'Reservas activas', icon: <CheckCircle size={13}/> },
  { key: 'cancelaciones', label: 'Cancelaciones',    icon: <Clock       size={13}/> },
  { key: 'no-shows',      label: 'No-shows',         icon: <XCircle     size={13}/> },
]

const POR_PAGINA = 15

function BadgeCanal({ origen, esMuestra }: { origen: string | null; esMuestra: boolean }) {
  if (esMuestra) return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
      Muestra
    </span>
  )
  if (origen === 'Wellhub' || origen === 'wellhub') return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-100 text-pink-600">
      Wellhub
    </span>
  )
  if (origen === 'TotalPass' || origen === 'totalpass') return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
      TotalPass
    </span>
  )
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-900 text-white">
      Navy
    </span>
  )
}

interface ReservasTablaProps {
  reservas: Reserva[]
  onRefresh: () => void
  onExportarData?: (fn: () => void) => void
}

export default function ReservasTabla({ reservas, onRefresh, onExportarData }: ReservasTablaProps) {
  const [tab,       setTab]       = useState<Tab>('activas')
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())
  const [pagina,    setPagina]    = useState(1)
  const [menuOpen,  setMenuOpen]  = useState<string | null>(null)

  const [filtros, setFiltros] = useState({
    clase: '',
    fechaInicio: '',
    fechaFin: '',
    estado: '',
    canal: ''
  })

  const porTab = reservas.filter(r => {
    if (tab === 'activas')       return r.estatus !== 'Cancelada' && !r.lista_espera
    if (tab === 'cancelaciones') return r.estatus === 'Cancelada'
    if (tab === 'no-shows')      return r.lista_espera
    return true
  })

  const filtradas = porTab.filter(r => {
    const clase = r.clases?.nombre_clase?.toLowerCase() || ''
    const fechaReserva = r.clases?.horario ? r.clases.horario.slice(0, 10) : ''
    const canal = r.es_clase_muestra ? 'Muestra'
                : r.origen === 'Wellhub'   || r.origen === 'wellhub'   ? 'Wellhub'
                : r.origen === 'TotalPass' || r.origen === 'totalpass' ? 'TotalPass'
                : 'Navy'

    const cumpleClase = !filtros.clase || (filtros.clase.trim().length >= 1 && clase.includes(filtros.clase.toLowerCase().trim()))

    let cumpleFecha = true
    if (filtros.fechaInicio && fechaReserva < filtros.fechaInicio) cumpleFecha = false
    if (filtros.fechaFin && fechaReserva > filtros.fechaFin) cumpleFecha = false

    return (
      cumpleClase &&
      cumpleFecha &&
      (!filtros.estado || r.estatus === filtros.estado) &&
      (!filtros.canal  || canal === filtros.canal)
    )
  })

  // Función de exportación que toma exactamente los registros 'filtradas'
  const exportarFiltrados = () => {
    if (filtradas.length === 0) return alert('No hay datos filtrados para exportar.')

    const headers = ['Cliente', 'Email', 'Sucursal', 'Clase', 'Fecha', 'Hora', 'Canal', 'Estado']
    const rows = filtradas.map((r: Reserva) => {
      const fecha = r.clases?.horario ? new Date(r.clases.horario).toLocaleDateString('es-MX') : '—'
      const hora = r.clases?.horario ? new Date(r.clases.horario).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '—'
      const canal = r.es_clase_muestra ? 'Muestra' : (r.origen || 'Navy')

      return [
        `"${r.clientes?.nombre_completo || r.nombre_externo || 'Sin cliente'}"`,
        `"${r.clientes?.email || r.email_externo || ''}"`,
        `"${r.clases?.sucursales?.nombre || ''}"`,
        `"${r.clases?.nombre_clase || ''}"`,
        `"${fecha}"`,
        `"${hora}"`,
        `"${canal}"`,
        `"${r.estatus}"`
      ]
    })

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e: string[]) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `reporte_reservas_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Se pasa la función directa sin recrear wrappers
  useEffect(() => {
    if (onExportarData) {
      onExportarData(exportarFiltrados)
    }
  }, [filtradas, onExportarData])

  const totalPags = Math.max(Math.ceil(filtradas.length / POR_PAGINA), 1)
  const paginadas = filtradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  const setFiltro = (key: string, val: string) => { setFiltros(p => ({ ...p, [key]: val })); setPagina(1) }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 pt-1">
        <div className="flex items-center">
          {TABS.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setPagina(1); setSeleccion(new Set()) }}
              className={`flex items-center gap-1.5 px-4 py-3.5 text-xs font-bold border-b-2 transition ${
                tab === t.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}>
              {t.icon}
              {t.label}
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                tab === t.key ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'
              }`}>
                {reservas.filter(r => t.key === 'activas' ? (r.estatus !== 'Cancelada' && !r.lista_espera) : t.key === 'cancelaciones' ? r.estatus === 'Cancelada' : r.lista_espera).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Bar de Filtros */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-50 flex-wrap text-xs">
        <input
          type="text"
          placeholder="Buscar clase..."
          className="border border-gray-200 rounded-lg px-3 py-1.5 outline-none bg-white focus:border-indigo-400 w-36 text-xs"
          value={filtros.clase}
          onChange={e => setFiltro('clase', e.target.value)}
        />

        <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-2 py-1 bg-white">
          <Calendar size={13} className="text-gray-400" />
          <input
            type="date"
            className="outline-none text-xs text-gray-600 bg-transparent"
            value={filtros.fechaInicio}
            onChange={e => setFiltro('fechaInicio', e.target.value)}
          />
          <span className="text-gray-300">-</span>
          <input
            type="date"
            className="outline-none text-xs text-gray-600 bg-transparent"
            value={filtros.fechaFin}
            onChange={e => setFiltro('fechaFin', e.target.value)}
          />
        </div>

        <select
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 outline-none bg-white focus:border-indigo-400 cursor-pointer text-xs"
          value={filtros.estado}
          onChange={e => setFiltro('estado', e.target.value)}
        >
          <option value="">Estado (Todos)</option>
          <option value="Confirmada">Confirmada</option>
          <option value="Cancelada">Cancelada</option>
          <option value="No Show">No Show</option>
        </select>

        <select
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 outline-none bg-white focus:border-indigo-400 cursor-pointer text-xs"
          value={filtros.canal}
          onChange={e => setFiltro('canal', e.target.value)}
        >
          <option value="">Canal (Todos)</option>
          <option value="Navy">Navy</option>
          <option value="Wellhub">Wellhub</option>
          <option value="TotalPass">TotalPass</option>
          <option value="Muestra">Muestra</option>
        </select>

        {(filtros.clase || filtros.fechaInicio || filtros.fechaFin || filtros.estado || filtros.canal) && (
          <button onClick={() => setFiltros({ clase: '', fechaInicio: '', fechaFin: '', estado: '', canal: '' })}
            className="flex items-center gap-1 text-gray-400 hover:text-gray-600 transition px-2 py-1.5 hover:bg-gray-100 rounded-lg">
            <XIcon size={11}/> Limpiar
          </button>
        )}

        <span className="ml-auto text-gray-400 text-xs">{filtradas.length} resultado{filtradas.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[11px] font-bold text-gray-400 uppercase tracking-wide border-b border-gray-100">
              <th className="px-4 py-3 w-8">
                <input type="checkbox"
                  checked={paginadas.length > 0 && seleccion.size === paginadas.length}
                  onChange={() => setSeleccion(seleccion.size === paginadas.length ? new Set() : new Set(paginadas.map(r => r.id)))}
                  className="rounded border-gray-300 text-indigo-600 cursor-pointer" />
              </th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Sucursal</th>
              <th className="px-4 py-3">Clase</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Hora</th>
              <th className="px-4 py-3">Canal</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paginadas.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-gray-400 italic text-sm">
                  No hay reservas coincidentes.
                </td>
              </tr>
            ) : paginadas.map(r => (
              <tr key={r.id} className={`transition hover:bg-gray-50 ${seleccion.has(r.id) ? 'bg-indigo-50/50' : ''}`}>
                <td className="px-4 py-3">
                  <input type="checkbox" checked={seleccion.has(r.id)} onChange={() => {
                    const s = new Set(seleccion)
                    s.has(r.id) ? s.delete(r.id) : s.add(r.id)
                    setSeleccion(s)
                  }} className="rounded border-gray-300 text-indigo-600 cursor-pointer" />
                </td>
                <td className="px-4 py-3 font-semibold text-gray-900 text-sm">
                  {r.clientes?.nombre_completo || r.nombre_externo || 'Sin cliente'}
                </td>
                <td className="px-4 py-3"><BadgeSucursal nombre={r.clases?.sucursales?.nombre || '—'} /></td>
                <td className="px-4 py-3 text-sm text-gray-700 font-medium">{r.clases?.nombre_clase || '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {r.clases?.horario ? new Date(r.clases.horario).toLocaleDateString('es-MX') : '—'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {r.clases?.horario ? new Date(r.clases.horario).toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' }) : '—'}
                </td>
                <td className="px-4 py-3"><BadgeCanal origen={r.origen} esMuestra={r.es_clase_muestra} /></td>
                <td className="px-4 py-3"><BadgeEstatus estatus={r.estatus} /></td>
                <td className="px-4 py-3 relative">
                  <button onClick={() => setMenuOpen(menuOpen === r.id ? null : r.id)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
                    <MoreHorizontal size={15}/>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
        <div className="flex items-center gap-1">
          <button onClick={() => setPagina(p => Math.max(1, p-1))} disabled={pagina === 1} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 disabled:opacity-30">
            <ChevronLeft size={16}/>
          </button>
          <span className="text-xs text-gray-600 font-bold px-2">Página {pagina} de {totalPags}</span>
          <button onClick={() => setPagina(p => Math.min(totalPags, p+1))} disabled={pagina === totalPags} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 disabled:opacity-30">
            <ChevronRight size={16}/>
          </button>
        </div>
        <p className="text-xs text-gray-400">Resultados por página: <span className="font-bold text-gray-600">{POR_PAGINA}</span></p>
      </div>
    </div>
  )
}
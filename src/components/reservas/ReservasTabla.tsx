'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import {
  ChevronLeft, ChevronRight, MoreHorizontal,
  CheckCircle, Clock, XCircle, Eye, RotateCcw,
  MessageSquare, Check, Calendar, X as XIcon
} from 'lucide-react'
import ReservasBulkActions from './ReservasBulkActions'
import {
  BadgeSucursal, BadgeEstatus,
  BadgeTipo, BadgeImpacto, BadgePenalizacion
} from './ReservasBadges'

interface Reserva {
  id:             string
  estatus:        string
  lista_espera:   boolean
  tipo_llegada:   string
  impacto:        string
  penalizacion:   string
  reincidencia:   number
  created_at:     string
  origen:         string | null
  es_clase_muestra: boolean
  asistencias:    { id: string }[]
  clientes:       { id: string; nombre_completo: string; email: string; telefono?: string }
  clases:         { id: string; nombre_clase: string; horario: string; tipo_clase: string; sucursales?: { nombre: string } }
}

type Tab = 'activas' | 'cancelaciones' | 'no-shows'

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'activas',       label: 'Reservas activas', icon: <CheckCircle size={13}/> },
  { key: 'cancelaciones', label: 'Cancelaciones',    icon: <Clock       size={13}/> },
  { key: 'no-shows',      label: 'No-shows',         icon: <XCircle     size={13}/> },
]

const POR_PAGINA = 15

// ── Badge Canal ───────────────────────────────────────────────────────────────
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

// ── Asistencia ────────────────────────────────────────────────────────────────
function AsistenciaCheck({ reservaId, estatus, clases, clienteId, onUpdate }: {
  reservaId: string
  estatus:   string
  clases:    any
  clienteId: string
  onUpdate:  () => void
}) {
  const [loading, setLoading] = useState(false)
  const hizoChekin = (clases?.asistencias || []).some(
    (a: any) => a.cliente_id === clienteId
  )

  const handleAsistio = async (asistio: boolean) => {
    setLoading(true)
    const nuevoEstatus = asistio ? 'Confirmada' : 'No Show'
    await supabase.from('reservas').update({ estatus: nuevoEstatus }).eq('id', reservaId)
    onUpdate()
    setLoading(false)
  }

  // Hizo checkin → Asistió a clase
  if (hizoChekin) {
    return (
      <div className="flex items-center gap-1.5 text-green-600 text-xs font-medium">
        <Check size={13}/> Asistió a clase
      </div>
    )
  }

  // Confirmada sin checkin → Pendiente de checkin
  if (estatus === 'Confirmada') {
    return (
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-1.5 cursor-pointer group" onClick={() => !loading && handleAsistio(true)}>
          <div className="w-4 h-4 border-2 border-gray-300 rounded group-hover:border-green-500 transition flex-shrink-0" />
          <span className="text-xs text-gray-500 group-hover:text-gray-700 transition select-none">Asistió</span>
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer group" onClick={() => !loading && handleAsistio(false)}>
          <div className="w-4 h-4 border-2 border-gray-300 rounded group-hover:border-red-400 transition flex-shrink-0" />
          <span className="text-xs text-gray-500 group-hover:text-gray-700 transition select-none">No asistió</span>
        </label>
      </div>
    )
  }

  // Cualquier otro estatus
  return (
    <div className="flex items-center gap-4">
      <label className="flex items-center gap-1.5 cursor-pointer group" onClick={() => !loading && handleAsistio(true)}>
        <div className="w-4 h-4 border-2 border-gray-300 rounded group-hover:border-green-500 transition flex-shrink-0" />
        <span className="text-xs text-gray-500 group-hover:text-gray-700 transition select-none">Asistió</span>
      </label>
      <label className="flex items-center gap-1.5 cursor-pointer group" onClick={() => !loading && handleAsistio(false)}>
        <div className="w-4 h-4 border-2 border-gray-300 rounded group-hover:border-red-400 transition flex-shrink-0" />
        <span className="text-xs text-gray-500 group-hover:text-gray-700 transition select-none">No asistió</span>
      </label>
    </div>
  )
}

// ── Filtros dropdown ──────────────────────────────────────────────────────────
function FiltroDropdown({ label, value, onChange, options }: {
  label:    string
  value:    string
  onChange: (v: string) => void
  options?: string[]
}) {
  if (options) {
    return (
      <select
        className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 outline-none bg-white focus:border-indigo-400 appearance-none cursor-pointer"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">{label}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    )
  }
  return (
    <input
      placeholder={label}
      className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 outline-none bg-white focus:border-indigo-400 w-24"
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  )
}

function tiempoRelativo(fecha: string): string {
  const diff = Date.now() - new Date(fecha).getTime()
  const mins  = Math.floor(diff / 60000)
  const horas = Math.floor(mins / 60)
  const dias  = Math.floor(horas / 24)
  if (dias  > 0) return `Hace ${dias} día${dias > 1 ? 's' : ''}`
  if (horas > 0) return `Hace ${horas} hora${horas > 1 ? 's' : ''}`
  return `Hace ${mins} min`
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function ReservasTabla({ reservas, onRefresh }: { reservas: Reserva[]; onRefresh: () => void }) {
  const [tab,       setTab]       = useState<Tab>('activas')
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())
  const [pagina,    setPagina]    = useState(1)
  const [menuOpen,  setMenuOpen]  = useState<string | null>(null)
  const [orden,     setOrden]     = useState<{ col: string; dir: 'asc'|'desc' }>({ col: '', dir: 'asc' })
  const [filtros,   setFiltros]   = useState({ sucursal: '', clase: '', fecha: '', hora: '', estado: '', canal: '' })

  const cancelarReserva = async (r: Reserva) => {
    await supabase.from('reservas').update({ estatus: 'Cancelada' }).eq('id', r.id)
    setMenuOpen(null)
    onRefresh()
  }

  const confirmarReserva = async (id: string) => {
    await supabase.from('reservas').update({ estatus: 'Confirmada' }).eq('id', id)
    setMenuOpen(null)
    onRefresh()
  }

  const porTab = reservas.filter(r => {
    if (tab === 'activas')       return r.estatus !== 'Cancelada' && !r.lista_espera
    if (tab === 'cancelaciones') return r.estatus === 'Cancelada'
    if (tab === 'no-shows')      return r.lista_espera
    return true
  })

  const filtradas = porTab.filter(r => {
    const suc   = r.clases?.sucursales?.nombre?.toLowerCase() || ''
    const clase = r.clases?.nombre_clase?.toLowerCase() || ''
    const fecha = r.clases?.horario?.slice(0, 10) || ''
    const canal = r.es_clase_muestra ? 'Muestra'
                : r.origen === 'Wellhub'   || r.origen === 'wellhub'   ? 'Wellhub'
                : r.origen === 'TotalPass' || r.origen === 'totalpass' ? 'TotalPass'
                : 'Navy'
    return (
      (!filtros.sucursal || suc.includes(filtros.sucursal.toLowerCase()))  &&
      (!filtros.clase    || clase.includes(filtros.clase.toLowerCase()))   &&
      (!filtros.fecha    || fecha === filtros.fecha)                        &&
      (!filtros.estado   || r.estatus === filtros.estado)                  &&
      (!filtros.canal    || canal === filtros.canal)
    )
  })

  const ordenadas = [...filtradas].sort((a, b) => {
    if (!orden.col) return 0
    const va = orden.col === 'Cliente' ? a.clientes?.nombre_completo || ''
             : orden.col === 'Clase'   ? a.clases?.nombre_clase || ''
             : a.clases?.horario || ''
    const vb = orden.col === 'Cliente' ? b.clientes?.nombre_completo || ''
             : orden.col === 'Clase'   ? b.clases?.nombre_clase || ''
             : b.clases?.horario || ''
    return orden.dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
  })

  const totalPags = Math.max(Math.ceil(ordenadas.length / POR_PAGINA), 1)
  const paginadas = ordenadas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  const toggleAll = () => {
    if (seleccion.size === paginadas.length) setSeleccion(new Set())
    else setSeleccion(new Set(paginadas.map(r => r.id)))
  }
  const toggleOne = (id: string) => {
    const s = new Set(seleccion)
    s.has(id) ? s.delete(id) : s.add(id)
    setSeleccion(s)
  }

  const setFiltro = (key: string, val: string) => { setFiltros(p => ({ ...p, [key]: val })); setPagina(1) }
  const toggleOrden = (col: string) => setOrden(o => ({ col, dir: o.col === col && o.dir === 'asc' ? 'desc' : 'asc' }))

  const activas      = reservas.filter(r => r.estatus !== 'Cancelada' && !r.lista_espera).length
  const cancelaciones = reservas.filter(r => r.estatus === 'Cancelada').length
  const noShows      = reservas.filter(r => r.lista_espera).length

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">

      {/* Tabs */}
      <div className="flex items-center border-b border-gray-100 px-4 pt-1">
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
              {t.key === 'activas' ? activas : t.key === 'cancelaciones' ? cancelaciones : noShows}
            </span>
          </button>
        ))}
      </div>

      {/* Bulk actions */}
      {seleccion.size > 0 && (
        <ReservasBulkActions
          tab={tab}
          cantidad={seleccion.size}
          onNoAplicar={() => setSeleccion(new Set())}
          onContinuar={async () => {
            await Promise.all([...seleccion].map(id =>
              supabase.from('reservas').update({ estatus: 'Confirmada' }).eq('id', id)
            ))
            setSeleccion(new Set())
            onRefresh()
          }}
        />
      )}

      {/* Filtros */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-50 flex-wrap">
        <FiltroDropdown label="Sucursal" value={filtros.sucursal} onChange={v => setFiltro('sucursal', v)} />
        <FiltroDropdown label="Clase"    value={filtros.clase}    onChange={v => setFiltro('clase', v)} />
        <FiltroDropdown label="Fecha"    value={filtros.fecha}    onChange={v => setFiltro('fecha', v)} />
        <FiltroDropdown label="Estado"   value={filtros.estado}   onChange={v => setFiltro('estado', v)}
          options={['Confirmada', 'Cancelada', 'No Show']} />
        <FiltroDropdown label="Canal"    value={filtros.canal}    onChange={v => setFiltro('canal', v)}
          options={['Navy', 'Wellhub', 'TotalPass', 'Muestra']} />
        {(filtros.sucursal || filtros.clase || filtros.fecha || filtros.estado || filtros.canal) && (
          <button onClick={() => setFiltros({ sucursal: '', clase: '', fecha: '', hora: '', estado: '', canal: '' })}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition px-2 py-1.5 hover:bg-gray-100 rounded-lg">
            <XIcon size={11}/> Limpiar
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400">{filtradas.length} resultado{filtradas.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[11px] font-bold text-gray-400 uppercase tracking-wide border-b border-gray-100">
              <th className="px-4 py-3 w-8">
                <input type="checkbox"
                  checked={paginadas.length > 0 && seleccion.size === paginadas.length}
                  onChange={toggleAll}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
              </th>
              {['Cliente', 'Sucursal', 'Clase', 'Fecha', 'Hora'].map(col => (
                <th key={col} className="px-4 py-3 cursor-pointer hover:text-gray-600 transition select-none"
                  onClick={() => toggleOrden(col)}>
                  {col} {orden.col === col ? (orden.dir === 'asc' ? '↑' : '↓') : ''}
                </th>
              ))}
              <th className="px-4 py-3">Canal</th>
              {tab === 'activas' && <>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Asistencia</th>
              </>}
              {tab === 'cancelaciones' && <>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Impacto</th>
                <th className="px-4 py-3">Tiempo</th>
              </>}
              {tab === 'no-shows' && <>
                <th className="px-4 py-3">Penalización</th>
                <th className="px-4 py-3">Reincidencia</th>
                <th className="px-4 py-3">Tiempo</th>
              </>}
              <th className="px-4 py-3 w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paginadas.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-gray-400 italic text-sm">
                  No hay {tab === 'activas' ? 'reservas activas' : tab === 'cancelaciones' ? 'cancelaciones' : 'no-shows'}
                </td>
              </tr>
            ) : paginadas.map(r => (
              <tr key={r.id} className={`transition hover:bg-gray-50 ${seleccion.has(r.id) ? 'bg-indigo-50/50' : ''}`}>

                <td className="px-4 py-3">
                  <input type="checkbox" checked={seleccion.has(r.id)} onChange={() => toggleOne(r.id)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                </td>

                <td className="px-4 py-3 min-w-[180px]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 flex-shrink-0">
                      {r.clientes?.nombre_completo?.charAt(0) || '?'}
                    </div>
                    <div className="min-w-0">
                      <Link href={`/dashboard/clientes/${r.clientes?.id}`}
                        className="text-sm font-semibold text-gray-900 hover:text-indigo-600 transition truncate block">
                        {r.clientes?.nombre_completo}
                      </Link>
                      <p className="text-[11px] text-gray-400 truncate">{r.clientes?.email}</p>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3">
                  <BadgeSucursal nombre={r.clases?.sucursales?.nombre || '—'} />
                </td>

                <td className="px-4 py-3 text-sm text-gray-700 font-medium">
                  {r.clases?.nombre_clase || '—'}
                </td>

                <td className="px-4 py-3 text-sm text-gray-600">
                  {r.clases?.horario
                    ? new Date(r.clases.horario).toLocaleDateString('es-MX', { day:'2-digit', month:'2-digit', year:'numeric' }).replace(/\//g,'-')
                    : '—'}
                </td>

                <td className="px-4 py-3">
                  <div>
                    <p className="text-sm text-gray-700 font-medium">
                      {r.clases?.horario
                        ? new Date(r.clases.horario).toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit', hour12: false })
                        : '—'}
                    </p>
                    <p className="text-[11px] text-gray-400">{tiempoRelativo(r.created_at)}</p>
                  </div>
                </td>

                {/* Canal */}
                <td className="px-4 py-3">
                  <BadgeCanal origen={r.origen} esMuestra={r.es_clase_muestra} />
                </td>

                {tab === 'activas' && <>
                  <td className="px-4 py-3"><BadgeEstatus estatus={r.estatus} /></td>
                  <td className="px-4 py-3">
                    <AsistenciaCheck
                      reservaId={r.id}
                      estatus={r.estatus}
                      clases={r.clases}
                      clienteId={r.clientes?.id}
                      onUpdate={onRefresh}
                    />
                  </td>
                </>}

                {tab === 'cancelaciones' && <>
                  <td className="px-4 py-3"><BadgeTipo    tipo={r.tipo_llegada} /></td>
                  <td className="px-4 py-3"><BadgeImpacto impacto={r.impacto}   /></td>
                  <td className="px-4 py-3 text-[11px] text-gray-400">{tiempoRelativo(r.created_at)}</td>
                </>}

                {tab === 'no-shows' && <>
                  <td className="px-4 py-3"><BadgePenalizacion estado={r.penalizacion} /></td>
                  <td className="px-4 py-3 text-sm text-gray-700">{r.reincidencia || 0} {r.reincidencia === 1 ? 'vez' : 'veces'}</td>
                  <td className="px-4 py-3 text-[11px] text-gray-400">{tiempoRelativo(r.created_at)}</td>
                </>}

                <td className="px-4 py-3 relative">
                  <button onClick={() => setMenuOpen(menuOpen === r.id ? null : r.id)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-400 hover:text-gray-700">
                    <MoreHorizontal size={15}/>
                  </button>
                  {menuOpen === r.id && (
                    <div className="absolute right-8 top-8 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 py-2 min-w-[200px]">
                      <button className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition w-full text-left">
                        <MessageSquare size={15} className="text-gray-400"/> Contactar
                      </button>
                      <button className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition w-full text-left">
                        <Calendar size={15} className="text-gray-400"/> Reagendar
                      </button>
                      {r.estatus !== 'Cancelada' && (
                        <button onClick={() => cancelarReserva(r)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition w-full text-left">
                          <XCircle size={15} className="text-gray-400"/> Cancelar reserva
                        </button>
                      )}
                      {r.estatus === 'Cancelada' && (
                        <button onClick={() => confirmarReserva(r.id)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-green-600 hover:bg-green-50 transition w-full text-left">
                          <RotateCcw size={15} className="text-green-400"/> Reactivar reserva
                        </button>
                      )}
                      <button onClick={() => setMenuOpen(null)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition w-full text-left">
                        <Eye size={15} className="text-gray-400"/>
                        <Link href={`/dashboard/clientes/${r.clientes?.id}`} className="w-full">
                          Ver detalle de cliente
                        </Link>
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
        <div className="flex items-center gap-1">
          <button onClick={() => setPagina(p => Math.max(1, p-1))} disabled={pagina === 1}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition">
            <ChevronLeft size={16}/>
          </button>
          {Array.from({ length: Math.min(totalPags, 5) }, (_, i) => i + 1).map(n => (
            <button key={n} onClick={() => setPagina(n)}
              className={`w-7 h-7 rounded-lg text-xs font-bold transition ${pagina === n ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100 text-gray-500'}`}>
              {n}
            </button>
          ))}
          {totalPags > 5 && <>
            <span className="text-gray-400 text-xs px-1">...</span>
            <button onClick={() => setPagina(totalPags)}
              className={`w-7 h-7 rounded-lg text-xs font-bold transition ${pagina === totalPags ? 'bg-indigo-600 text-white' : 'hover:bg-gray-100 text-gray-500'}`}>
              {totalPags}
            </button>
          </>}
          <button onClick={() => setPagina(p => Math.min(totalPags, p+1))} disabled={pagina === totalPags}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition">
            <ChevronRight size={16}/>
          </button>
        </div>
        <p className="text-xs text-gray-400">
          Resultados por página <span className="font-bold text-gray-600">{POR_PAGINA}</span>
        </p>
      </div>
    </div>
  )
}
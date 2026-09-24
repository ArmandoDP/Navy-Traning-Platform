'use client'
import { useState } from 'react'
import { ChevronRight, ChevronLeft, ChevronRight as ChevronR, Wifi, Smartphone, Users, TrendingUp, Clock, Calendar, Star } from 'lucide-react'
import { BadgeEstatus, BadgeSucursal, AsistenciaBar } from './ClientesBadges'
import ClientesFilters    from './ClientesFilters'
import ClientesBulkActions from './ClientesBulkActions'

interface Cliente {
  id: string; nombre_completo: string; email: string
  estatus: string; plan: string; sucursal_id?: string
  fecha_vencimiento_memb?: string; fecha_venc_plan?: string
  valor_cliente?: number; asistencia_pct?: number
  created_at: string; perdido?: boolean
  sucursales?: { nombre: string; color: string }
  pagos?: any[]
  origen?: string
  password_temporal?: string
  debe_cambiar_password?: boolean
  supabase_user_id?: string
  fecha_alta_original?: string
  membresias?: any[]
  clases_mes?: number
  ultima_visita?: string
}

interface Props {
  clientes:        Cliente[]
  onRefresh:       () => void
  onRenovar:       (ids: string[]) => void
  onMarcarPerdido: (ids: string[]) => void
  onCambiarPaquete:(ids: string[]) => void
  onEditarCliente: (cliente: Cliente) => void
  onVerCliente:    (cliente: Cliente) => void
}

type Tab = 'todo' | 'vence7' | 'riesgo'
const POR_PAGINA = 15

function getCanal(c: Cliente): string {
  if (c.plan === 'Wellhub' || c.origen === 'Wellhub')     return 'Wellhub'
  if (c.plan === 'TotalPass' || c.origen === 'TotalPass') return 'TotalPass'
  if (c.estatus === 'Prospecto' || c.origen === 'Clase Muestra' || (!c.plan && (!c.membresias || c.membresias.length === 0))) return 'Prospecto'
  return 'Navy'
}

function BadgeCanal({ canal }: { canal: string }) {
  const map: Record<string, { cls: string; icon: React.ReactNode }> = {
    'Navy':      { cls: 'bg-gray-900 text-white',         icon: <Users size={9} /> },
    'Wellhub':   { cls: 'bg-pink-600 text-white',         icon: <Wifi size={9} /> },
    'TotalPass': { cls: 'bg-purple-600 text-white',       icon: <Smartphone size={9} /> },
    'Prospecto': { cls: 'bg-amber-100 text-amber-700',    icon: <span className="text-[8px]">👤</span> },
  }
  const { cls, icon } = map[canal] || { cls: 'bg-gray-100 text-gray-600', icon: null }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cls}`}>
      {icon}{canal}
    </span>
  )
}

function getSortVal(c: Cliente, col: string) {
  if (col === 'nombre')       return c.nombre_completo || ''
  if (col === 'sucursal')     return c.sucursales?.nombre || ''
  if (col === 'plan')         return c.plan || ''
  if (col === 'fecha')        return c.created_at || ''
  if (col === 'estado')       return c.estatus || ''
  if (col === 'asistencia')   return c.asistencia_pct || 0
  if (col === 'clases_mes')   return c.clases_mes || 0
  if (col === 'ultima_visita')return c.ultima_visita || ''
  if (col === 'canal')        return getCanal(c)
  return ''
}

export default function ClientesTabla({ clientes, onRefresh, onRenovar, onMarcarPerdido, onCambiarPaquete, onEditarCliente, onVerCliente }: Props) {
  const [tab,       setTab]       = useState<Tab>('todo')
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())
  const [pagina,    setPagina]    = useState(1)
  const [orden,     setOrden]     = useState<{ col: string; dir: 'asc'|'desc' }>({ col: '', dir: 'asc' })
  const [filtros, setFiltros] = useState({ nombre: '', sucursal: '', plan: '', fecha: '', estado: '', canal: '' })

  const hoy = new Date()

  const porTab = clientes.filter(c => {
    if (tab === 'todo')   return true
    if (tab === 'vence7') {
      const fecha = c.fecha_vencimiento_memb || c.fecha_venc_plan
      if (!fecha) return false
      const dias = Math.ceil((new Date(fecha).getTime() - hoy.getTime()) / (1000 * 3600 * 24))
      return dias >= 0 && dias <= 7
    }
    if (tab === 'riesgo') return (c.asistencia_pct || 0) < 50
    return true
  })

  const filtrados = porTab.filter(c => {
    const nombre   = c.nombre_completo?.toLowerCase() || ''
    const email    = c.email?.toLowerCase() || ''
    const sucursal = c.sucursales?.nombre?.toLowerCase() || ''
    const plan     = c.plan?.toLowerCase() || ''
    const fecha    = c.created_at?.slice(0, 10) || ''
    return (
      (!filtros.nombre   || nombre.includes(filtros.nombre.toLowerCase()) || email.includes(filtros.nombre.toLowerCase())) &&
      (!filtros.sucursal || sucursal.includes(filtros.sucursal.toLowerCase())) &&
      (!filtros.plan     || plan.includes(filtros.plan.toLowerCase())) &&
      (!filtros.fecha    || fecha === filtros.fecha) &&
      (!filtros.canal    || getCanal(c) === filtros.canal) &&
      (!filtros.estado   || c.estatus === filtros.estado)
    )
  })

  const ordenados = [...filtrados].sort((a, b) => {
    if (!orden.col) return 0
    const va = getSortVal(a, orden.col)
    const vb = getSortVal(b, orden.col)
    if (typeof va === 'number') return orden.dir === 'asc' ? va - (vb as number) : (vb as number) - va
    return orden.dir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
  })

  const totalPags = Math.max(Math.ceil(ordenados.length / POR_PAGINA), 1)
  const paginados = ordenados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  const toggleAll = () => {
    if (seleccion.size === paginados.length) setSeleccion(new Set())
    else setSeleccion(new Set(paginados.map(c => c.id)))
  }
  const toggleOne = (id: string) => {
    const s = new Set(seleccion); s.has(id) ? s.delete(id) : s.add(id); setSeleccion(s)
  }

  const setFiltro = (k: string, v: string) => { setFiltros(p => ({ ...p, [k]: v })); setPagina(1) }
  const limpiar = () => { setFiltros({ nombre:'', sucursal:'', plan:'', fecha:'', estado:'', canal:'' }); setPagina(1) }
  const toggleOrden = (col: string) => setOrden(o => ({ col, dir: o.col === col && o.dir === 'asc' ? 'desc' : 'asc' }))
  const sortIcon = (col: string) => <span className="text-gray-300 ml-0.5 text-[10px]">{orden.col === col ? (orden.dir === 'asc' ? '↑' : '↓') : '↕'}</span>

  const antiguedad = (fecha: string) => {
    const dias = Math.floor((hoy.getTime() - new Date(fecha).getTime()) / (1000 * 3600 * 24))
    if (dias < 1)   return { label: 'Hoy',              color: 'text-emerald-600 font-bold' }
    if (dias < 7)   return { label: `${dias} días`,     color: 'text-emerald-500' }
    if (dias < 30)  return { label: `${Math.floor(dias/7)} semanas`,  color: 'text-blue-500' }
    if (dias < 365) return { label: `${Math.floor(dias/30)} ${Math.floor(dias/30) === 1 ? 'mes' : 'meses'}`, color: 'text-gray-600' }
    const años = Math.floor(dias/365)
    return { label: `${años} ${años === 1 ? 'año' : 'años'}`, color: 'text-purple-600 font-bold' }
  }

  const ultimaVisita = (fecha?: string) => {
    if (!fecha) return { label: 'Sin visitas aún', color: 'text-gray-300 italic' }
    const dias = Math.floor((hoy.getTime() - new Date(fecha).getTime()) / (1000 * 3600 * 24))
    if (dias === 0) return { label: '🟢 Hoy',             color: 'text-emerald-600 font-bold' }
    if (dias === 1) return { label: '🟡 Ayer',            color: 'text-emerald-500 font-semibold' }
    if (dias < 7)   return { label: `Hace ${dias} días`,  color: 'text-blue-500' }
    if (dias < 14)  return { label: 'Hace 1 semana',      color: 'text-amber-500' }
    if (dias < 30)  return { label: `Hace ${Math.floor(dias/7)} semanas`, color: 'text-amber-500' }
    if (dias < 60)  return { label: 'Hace 1 mes',         color: 'text-red-400' }
    return { label: new Date(fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }), color: 'text-red-500 font-semibold' }
  }

  const clasesMesLabel = (n?: number) => {
    if (n == null) return { label: '—', color: 'text-gray-300' }
    if (n === 0)   return { label: 'Ninguna', color: 'text-gray-300 italic text-[11px]' }
    if (n >= 12)   return { label: `🔥 ${n} clases`, color: 'text-emerald-600 font-bold' }
    if (n >= 8)    return { label: `⚡ ${n} clases`, color: 'text-emerald-500 font-bold' }
    if (n >= 4)    return { label: `${n} clases`, color: 'text-blue-500 font-semibold' }
    return { label: `${n} ${n === 1 ? 'clase' : 'clases'}`, color: 'text-gray-500' }
  }

  const vencimientoLabel = (c: Cliente) => {
    const fecha = c.fecha_vencimiento_memb || c.fecha_venc_plan
    if (!fecha) return null
    const dias = Math.ceil((new Date(fecha).getTime() - hoy.getTime()) / (1000 * 3600 * 24))
    if (dias < 0)  return <span className="text-[10px] text-red-400 font-bold">⛔ Expirado</span>
    if (dias === 0) return <span className="text-[10px] text-red-500 font-bold">⚠️ Vence hoy</span>
    if (dias <= 3) return <span className="text-[10px] text-red-400 font-bold">⚠️ Vence en {dias}d</span>
    if (dias <= 7) return <span className="text-[10px] text-amber-500 font-semibold">⏰ Vence en {dias}d</span>
    return <span className="text-[10px] text-gray-400">Vence en {dias}d</span>
  }

  const TABS = [
    { key: 'todo',   label: '⊙ Todo' },
    { key: 'vence7', label: '⏰ Vence en 7 días' },
    { key: 'riesgo', label: '⚠ Riesgo de No-show' },
  ]

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">

      {/* Tabs */}
      <div className="grid grid-cols-3 border-b border-gray-100">
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key as Tab); setPagina(1); setSeleccion(new Set()) }}
            className={`py-3.5 text-sm font-medium transition border-b-2 text-center ${
              tab === t.key ? 'border-gray-900 text-gray-900 font-bold' : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Contador + Bulk + Filtros */}
      <div className="px-5 py-3 border-b border-gray-100 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 font-medium">
            {filtrados.length} Clientes
            {seleccion.size > 0 && <span className="text-indigo-600 font-bold ml-1">({seleccion.size} seleccionados)</span>}
          </span>
          {seleccion.size > 0 && (
            <ClientesBulkActions
              cantidad={seleccion.size}
              onCambiarPaquete={() => onCambiarPaquete([...seleccion])}
              onRenovar={() => onRenovar([...seleccion])}
              onMarcarPerdido={() => { onMarcarPerdido([...seleccion]); setSeleccion(new Set()) }}
            />
          )}
        </div>
        <ClientesFilters filtros={filtros} onChange={setFiltro} onLimpiar={limpiar} />
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-gray-500">
          <thead className="bg-gray-50 border-b border-gray-100 text-[11px] font-bold uppercase tracking-wide text-gray-400">
            <tr>
              <th className="px-4 py-3">
                <input type="checkbox" checked={seleccion.size === paginados.length && paginados.length > 0}
                  onChange={toggleAll} className="rounded border-gray-300 text-indigo-600 cursor-pointer" />
              </th>
              <th className="px-4 py-3 cursor-pointer hover:text-gray-700" onClick={() => toggleOrden('nombre')}>Cliente {sortIcon('nombre')}</th>
              <th className="px-4 py-3 cursor-pointer hover:text-gray-700" onClick={() => toggleOrden('sucursal')}>Sucursal {sortIcon('sucursal')}</th>
              <th className="px-4 py-3 cursor-pointer hover:text-gray-700" onClick={() => toggleOrden('plan')}>Plan {sortIcon('plan')}</th>
              <th className="px-4 py-3 cursor-pointer hover:text-gray-700" onClick={() => toggleOrden('canal')}>Canal {sortIcon('canal')}</th>
              <th className="px-4 py-3 cursor-pointer hover:text-gray-700" onClick={() => toggleOrden('fecha')}>
                <div className="flex items-center gap-1"><Calendar size={11}/> Alta {sortIcon('fecha')}</div>
              </th>
              <th className="px-4 py-3 cursor-pointer hover:text-gray-700" onClick={() => toggleOrden('estado')}>Estado {sortIcon('estado')}</th>
              <th className="px-4 py-3 cursor-pointer hover:text-gray-700" onClick={() => toggleOrden('asistencia')}>
                <div className="flex items-center gap-1"><TrendingUp size={11}/> Asistencia {sortIcon('asistencia')}</div>
              </th>
              <th className="px-4 py-3 cursor-pointer hover:text-gray-700" onClick={() => toggleOrden('clases_mes')}>
                <div className="flex items-center gap-1"><Star size={11}/> Clases mes {sortIcon('clases_mes')}</div>
              </th>
              <th className="px-4 py-3 cursor-pointer hover:text-gray-700" onClick={() => toggleOrden('ultima_visita')}>
                <div className="flex items-center gap-1"><Clock size={11}/> Última visita {sortIcon('ultima_visita')}</div>
              </th>
              <th className="px-4 py-3">Antigüedad</th>
              <th className="px-4 py-3 w-8"/>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paginados.length === 0 ? (
              <tr><td colSpan={12} className="px-4 py-12 text-center text-gray-400 italic text-sm">No hay clientes</td></tr>
            ) : paginados.map(c => {
              const antData   = antiguedad(c.fecha_alta_original || c.created_at)
              const visitData = ultimaVisita(c.ultima_visita)
              const clasesData = clasesMesLabel(c.clases_mes)
              return (
                <tr key={c.id} className={`transition hover:bg-gray-50/70 ${seleccion.has(c.id) ? 'bg-indigo-50/40' : ''}`}>

                  {/* Checkbox */}
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={seleccion.has(c.id)} onChange={() => toggleOne(c.id)}
                      className="rounded border-gray-300 text-indigo-600 cursor-pointer" />
                  </td>

                  {/* Cliente */}
                  <td className="px-4 py-3 min-w-[200px]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-xs font-black text-white flex-shrink-0">
                        {c.nombre_completo?.charAt(0) || '?'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => onVerCliente(c)}
                            className="text-sm font-semibold text-gray-900 hover:text-indigo-600 transition truncate block text-left">
                            {c.nombre_completo}
                          </button>
                          {c.origen === 'Migración' && (
                            <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-600 uppercase tracking-wide">MIG</span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 truncate">{c.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Sucursal */}
                  <td className="px-4 py-3">
                    {c.sucursales?.nombre
                      ? <BadgeSucursal nombre={c.sucursales.nombre} />
                      : <span className="text-xs text-gray-300">—</span>}
                  </td>

                  {/* Plan */}
                  <td className="px-4 py-3 min-w-[160px]">
                    {c.plan ? (
                      <p className="text-xs font-bold text-gray-800 truncate">{c.plan}</p>
                    ) : (
                      <p className="text-xs text-gray-300 italic">Sin paquete aún</p>
                    )}
                    <div className="mt-0.5">{vencimientoLabel(c)}</div>
                  </td>

                  {/* Canal */}
                  <td className="px-4 py-3">
                    <BadgeCanal canal={getCanal(c)} />
                  </td>

                  {/* Alta */}
                  <td className="px-4 py-3 min-w-[90px]">
                    <p className="text-xs text-gray-700">
                      {new Date(c.fecha_alta_original || c.created_at).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'2-digit' })}
                    </p>
                  </td>

                  {/* Estado */}
                  <td className="px-4 py-3">
                    <BadgeEstatus estatus={c.perdido ? 'Perdido' : c.estatus} />
                  </td>

                  {/* Asistencia */}
                  <td className="px-4 py-3">
                    <AsistenciaBar pct={c.asistencia_pct || 0} />
                  </td>

                  {/* Clases este mes */}
                  <td className="px-4 py-3">
                    <span className={`text-xs ${clasesData.color}`}>{clasesData.label}</span>
                  </td>

                  {/* Última visita */}
                  <td className="px-4 py-3 min-w-[130px]">
                    <span className={`text-xs ${visitData.color}`}>{visitData.label}</span>
                  </td>

                  {/* Antigüedad */}
                  <td className="px-4 py-3">
                    <span className={`text-xs ${antData.color}`}>{antData.label}</span>
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => onEditarCliente(c)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition text-xs font-bold">
                        Editar
                      </button>
                      <button onClick={() => onVerCliente(c)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-700 text-white transition text-xs font-bold">
                        Ver <ChevronRight size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
        <div className="flex items-center gap-1">
          <button onClick={() => setPagina(p => Math.max(1, p-1))} disabled={pagina === 1}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition">
            <ChevronLeft size={15}/>
          </button>
          {Array.from({ length: Math.min(totalPags, 5) }, (_, i) => i + 1).map(n => (
            <button key={n} onClick={() => setPagina(n)}
              className={`w-7 h-7 rounded-lg text-xs font-bold transition ${pagina === n ? 'bg-gray-900 text-white' : 'hover:bg-gray-100 text-gray-500'}`}>
              {n}
            </button>
          ))}
          {totalPags > 5 && <>
            <span className="text-gray-400 text-xs px-1">...</span>
            <button onClick={() => setPagina(totalPags)}
              className={`w-7 h-7 rounded-lg text-xs font-bold transition ${pagina === totalPags ? 'bg-gray-900 text-white' : 'hover:bg-gray-100 text-gray-500'}`}>
              {totalPags}
            </button>
          </>}
          <button onClick={() => setPagina(p => Math.min(totalPags, p+1))} disabled={pagina === totalPags}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition">
            <ChevronR size={15}/>
          </button>
        </div>
        <p className="text-xs text-gray-400">Resultados por página <span className="font-bold text-gray-600">{POR_PAGINA}</span></p>
      </div>
    </div>
  )
}
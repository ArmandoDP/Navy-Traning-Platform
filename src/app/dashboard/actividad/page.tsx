'use client'
// src/app/dashboard/actividad/page.tsx
import { useState, useEffect } from 'react'
import { supabase }            from '@/lib/supabase'
import { useSucursal }         from '@/context/SucursalContext'
import {
  Activity, Trash2, Edit2, UserPlus, UserX, CreditCard, BookOpen, Calendar,
  ShoppingBag, Package, Key, Mail, Upload, Bot, User,
  ShieldAlert,
  DollarSign,
  MapPin,
  LayoutGrid,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es }                  from 'date-fns/locale'

type Cfg = { label: string; color: string; bg: string; icon: any }

const TIPO_CONFIG: Record<string, Cfg> = {
  // Clases
  clase_creada:               { label: 'Clase creada',            color: 'text-green-700',  bg: 'bg-green-50',  icon: BookOpen   },
  clase_modificada:           { label: 'Clase modificada',        color: 'text-orange-700', bg: 'bg-orange-50', icon: Edit2      },
  clase_cancelada:            { label: 'Clase cancelada',         color: 'text-red-700',    bg: 'bg-red-50',    icon: Trash2     },
  clase_eliminada:            { label: 'Clase eliminada',         color: 'text-red-700',    bg: 'bg-red-50',    icon: Trash2     },
  clase_publicada_wellhub:    { label: 'Publicada en Wellhub',    color: 'text-blue-700',   bg: 'bg-blue-50',   icon: Upload     },
  clase_publicada_totalpass:  { label: 'Publicada en TotalPass',  color: 'text-blue-700',   bg: 'bg-blue-50',   icon: Upload     },
  clase_wellhub_actualizada:  { label: 'Horario Wellhub',         color: 'text-blue-700',   bg: 'bg-blue-50',   icon: Edit2      },
  // Reservas
  reserva_creada:             { label: 'Reserva creada',          color: 'text-blue-700',   bg: 'bg-blue-50',   icon: Calendar   },
  reserva_creada_crm:         { label: 'Reserva (CRM)',           color: 'text-blue-700',   bg: 'bg-blue-50',   icon: Calendar   },
  reserva_modificada:         { label: 'Reserva modificada',      color: 'text-yellow-700', bg: 'bg-yellow-50', icon: Calendar   },
  // Clientes
  cliente_creado:             { label: 'Cliente creado',          color: 'text-green-700',  bg: 'bg-green-50',  icon: UserPlus   },
  cliente_creado_crm:         { label: 'Cliente creado (CRM)',    color: 'text-green-700',  bg: 'bg-green-50',  icon: UserPlus   },
  cliente_modificado:         { label: 'Cliente modificado',      color: 'text-blue-700',   bg: 'bg-blue-50',   icon: Edit2      },
  cliente_editado:            { label: 'Cliente editado',         color: 'text-blue-700',   bg: 'bg-blue-50',   icon: Edit2      },
  cliente_eliminado:          { label: 'Cliente eliminado',       color: 'text-red-700',    bg: 'bg-red-50',    icon: UserX      },
  prospecto_creado:           { label: 'Prospecto',               color: 'text-purple-700', bg: 'bg-purple-50', icon: UserPlus   },
  prospecto_convertido:       { label: 'Prospecto convertido',    color: 'text-green-700',  bg: 'bg-green-50',  icon: UserPlus   },
  password_reseteado:         { label: 'Password reseteado',      color: 'text-gray-700',   bg: 'bg-gray-100',  icon: Key        },
  correo_reenviado:           { label: 'Correo reenviado',        color: 'text-gray-700',   bg: 'bg-gray-100',  icon: Mail       },
  // Membresías y pagos
  membresia_creada:           { label: 'Membresía creada',        color: 'text-green-700',  bg: 'bg-green-50',  icon: CreditCard },
  membresia_modificada:       { label: 'Membresía modificada',    color: 'text-yellow-700', bg: 'bg-yellow-50', icon: CreditCard },
  membresia_eliminada:        { label: 'Membresía eliminada',     color: 'text-red-700',    bg: 'bg-red-50',    icon: CreditCard },
  paquete_asignado:           { label: 'Paquete asignado',        color: 'text-green-700',  bg: 'bg-green-50',  icon: CreditCard },
  paquete_asignado_cortesia:  { label: 'Cortesía asignada',       color: 'text-purple-700', bg: 'bg-purple-50', icon: CreditCard },
  renovacion_cancelada:       { label: 'Renovación cancelada',    color: 'text-red-700',    bg: 'bg-red-50',    icon: CreditCard },
  renovacion_reactivada:      { label: 'Renovación reactivada',   color: 'text-green-700',  bg: 'bg-green-50',  icon: CreditCard },
  pago_sucursal:              { label: 'Pago en sucursal',        color: 'text-green-700',  bg: 'bg-green-50',  icon: CreditCard },
  // Paquetes
  paquete_creado:             { label: 'Paquete creado',          color: 'text-green-700',  bg: 'bg-green-50',  icon: Package    },
  paquete_modificado:         { label: 'Paquete modificado',      color: 'text-blue-700',   bg: 'bg-blue-50',   icon: Package    },
  paquete_estatus:            { label: 'Paquete pausado/activado',color: 'text-yellow-700', bg: 'bg-yellow-50', icon: Package    },
  paquete_eliminado:          { label: 'Paquete eliminado',       color: 'text-red-700',    bg: 'bg-red-50',    icon: Package    },
  // The Galley
  venta_galley:               { label: 'Venta Galley',            color: 'text-emerald-700',bg: 'bg-emerald-50',icon: ShoppingBag},
  producto_creado:            { label: 'Producto creado',         color: 'text-green-700',  bg: 'bg-green-50',  icon: ShoppingBag},
  producto_editado:           { label: 'Producto editado',        color: 'text-blue-700',   bg: 'bg-blue-50',   icon: ShoppingBag},
  insumo_creado:              { label: 'Insumo creado',           color: 'text-green-700',  bg: 'bg-green-50',  icon: ShoppingBag},
  insumo_editado:             { label: 'Insumo editado',          color: 'text-blue-700',   bg: 'bg-blue-50',   icon: ShoppingBag},
  insumo_eliminado:           { label: 'Insumo eliminado',        color: 'text-red-700',    bg: 'bg-red-50',    icon: ShoppingBag},
  compra_insumo:              { label: 'Compra de insumo',        color: 'text-emerald-700',bg: 'bg-emerald-50',icon: ShoppingBag},
  merma_registrada:           { label: 'Merma',                   color: 'text-orange-700', bg: 'bg-orange-50', icon: ShoppingBag},
  // Staff
  coach_creado: { label: 'Coach creado', color: 'text-green-700', bg: 'bg-green-50', icon: UserPlus },
  staff_activado:    { label: 'Staff activado',    color: 'text-green-700', bg: 'bg-green-50', icon: UserPlus },
  staff_desactivado: { label: 'Staff desactivado', color: 'text-red-700',   bg: 'bg-red-50',   icon: UserX    },
  staff_eliminado:   { label: 'Staff eliminado',   color: 'text-red-700',   bg: 'bg-red-50',   icon: UserX    },
  staff_editado:         { label: 'Staff editado',       color: 'text-blue-700',  bg: 'bg-blue-50',   icon: Edit2       },
  staff_rol_cambiado:    { label: '⚠ Cambio de rol',     color: 'text-red-700',   bg: 'bg-red-100',  icon: ShieldAlert },
  bono_regla_creada:     { label: 'Regla de bono',        color: 'text-green-700', bg: 'bg-green-50',  icon: DollarSign  },
  bono_regla_modificada: { label: 'Bono modificado',      color: 'text-yellow-700',bg: 'bg-yellow-50', icon: DollarSign  },
  bono_regla_eliminada:  { label: 'Bono eliminado',       color: 'text-red-700',   bg: 'bg-red-50',    icon: DollarSign  },
  staff_creado: { label: 'Staff dado de alta', color: 'text-green-700', bg: 'bg-green-50', icon: UserPlus },
  //Sucursales
  room_creado:    { label: 'Room creado',    color: 'text-green-700', bg: 'bg-green-50', icon: LayoutGrid },
  room_editado:   { label: 'Room editado',   color: 'text-blue-700',  bg: 'bg-blue-50',  icon: LayoutGrid },
  room_eliminado: { label: 'Room eliminado', color: 'text-red-700', bg: 'bg-red-50', icon: LayoutGrid },
  sucursal_creada:    { label: 'Sucursal creada',    color: 'text-green-700', bg: 'bg-green-50', icon: MapPin },
  sucursal_editada:   { label: 'Sucursal editada',   color: 'text-blue-700',  bg: 'bg-blue-50',  icon: MapPin },
  sucursal_eliminada: { label: 'Sucursal eliminada', color: 'text-red-700', bg: 'bg-red-50', icon: MapPin },
  
  clase_editada: { label: 'Clase editada', color: 'text-orange-700', bg: 'bg-orange-50', icon: Edit2 },
}

const TABLAS = ['todas', 'clases', 'reservas', 'clientes', 'membresias', 'pagos', 'paquetes', 'ventas', 'insumos', 'staff']

interface StaffOpt { id: string; nombre: string; primer_apellido: string | null }

export default function ActividadPage() {
  const { sucursalId } = useSucursal()
  const [logs,        setLogs]        = useState<any[]>([])
  const [loading,     setLoading]     = useState(true)
  const [tablaFiltro, setTablaFiltro] = useState('todas')
  const [busqueda,    setBusqueda]    = useState('')
  const [staffFiltro, setStaffFiltro] = useState('')
  const [soloStaff,   setSoloStaff]   = useState(true)
  const [desde,       setDesde]       = useState('')
  const [hasta,       setHasta]       = useState('')
  const [pagina,      setPagina]      = useState(0)
  const [staffList,   setStaffList]   = useState<StaffOpt[]>([])
  const POR_PAGINA = 50

  useEffect(() => {
    supabase.from('staff').select('id, nombre, primer_apellido').order('nombre')
      .then(({ data }) => setStaffList(data || []))
  }, [])

  const fetchLogs = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (sucursalId)              params.set('sucursal', sucursalId)
    if (tablaFiltro !== 'todas') params.set('tabla', tablaFiltro)
    if (busqueda)                params.set('busqueda', busqueda)
    if (staffFiltro)             params.set('staff', staffFiltro)
    if (soloStaff)               params.set('soloStaff', '1')
    if (desde)                   params.set('desde', desde)
    if (hasta)                   params.set('hasta', hasta)
    params.set('pagina', String(pagina))

    try {
      const res  = await fetch(`/api/actividad?${params}`)
      const data = await res.json()
      setLogs(Array.isArray(data) ? data : [])
    } catch {
      setLogs([])
    }
    setLoading(false)
  }

  useEffect(() => { fetchLogs() }, [sucursalId, tablaFiltro, staffFiltro, soloStaff, desde, hasta, pagina])
  useEffect(() => {
    const t = setTimeout(() => { setPagina(0); fetchLogs() }, 400)
    return () => clearTimeout(t)
  }, [busqueda])

  const quien = (log: any) => {
    if (log.staff) {
      const n = `${log.staff.nombre} ${log.staff.primer_apellido || ''}`.trim()
      const ini = (log.staff.nombre?.[0] || '') + (log.staff.primer_apellido?.[0] || '')
      return { nombre: n, iniciales: ini.toUpperCase(), sistema: false }
    }
    return { nombre: 'Automático', iniciales: '', sistema: true }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Actividad</h1>
          <p className="text-sm text-gray-500 mt-1">Quién hizo qué en el sistema y cuándo</p>
        </div>
        <button onClick={fetchLogs}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-700 transition">
          <Activity size={16} />
          Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar: cliente, clase, paquete..."
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-400 w-72"
          />
          <select value={staffFiltro} onChange={e => { setStaffFiltro(e.target.value); setPagina(0) }}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-400">
            <option value="">Todo el staff</option>
            {staffList.map(s => (
              <option key={s.id} value={s.id}>{s.nombre} {s.primer_apellido || ''}</option>
            ))}
          </select>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Del</span>
            <input type="date" value={desde} onChange={e => { setDesde(e.target.value); setPagina(0) }}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none" />
            <span>al</span>
            <input type="date" value={hasta} onChange={e => { setHasta(e.target.value); setPagina(0) }}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none" />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none ml-auto">
            <input type="checkbox" checked={soloStaff}
              onChange={e => { setSoloStaff(e.target.checked); setPagina(0) }} />
            Solo acciones de staff
          </label>
        </div>
        <div className="flex gap-2 flex-wrap">
          {TABLAS.map(t => (
            <button key={t}
              onClick={() => { setTablaFiltro(t); setPagina(0) }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition capitalize ${
                tablaFiltro === t
                  ? 'bg-gray-900 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'
              }`}>
              {t === 'todas' ? 'Todas' : t}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 text-sm">Cargando...</div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Activity size={40} className="text-gray-200" />
            <p className="text-gray-400 text-sm">Sin actividad con estos filtros</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Quién</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Acción</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Detalle</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Cuándo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map(log => {
                  const cfg  = TIPO_CONFIG[log.tipo] || { label: log.tipo, color: 'text-gray-700', bg: 'bg-gray-100', icon: Activity }
                  const Icon = cfg.icon
                  const q    = quien(log)
                  return (
                    <tr key={log.id} className="hover:bg-gray-50 transition align-top">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {q.sistema ? (
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                              <Bot size={14} className="text-gray-400" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-black">
                              {q.iniciales || <User size={14} />}
                            </div>
                          )}
                          <div>
                            <p className={`text-sm font-bold ${q.sistema ? 'text-gray-400' : 'text-gray-900'}`}>{q.nombre}</p>
                            {log.staff?.rol && (
                              <p className="text-[11px] text-gray-400 capitalize">{String(log.staff.rol).replace('_', ' ')}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold ${cfg.bg} ${cfg.color}`}>
                          <Icon size={12} />
                          {cfg.label}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-700">{log.descripcion}</p>
                        {log.metadata && (
                          <details className="mt-1">
                            <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">Ver detalles</summary>
                            <pre className="text-xs text-gray-500 mt-1 bg-gray-50 rounded-lg p-2 overflow-auto max-w-md">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </details>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-500">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: es })}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(log.created_at).toLocaleString('es-MX', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City',
                          })}
                        </p>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {!loading && logs.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">Página {pagina + 1}</p>
            <div className="flex gap-2">
              <button onClick={() => setPagina(p => Math.max(0, p - 1))} disabled={pagina === 0}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-bold text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition">
                ← Anterior
              </button>
              <button onClick={() => setPagina(p => p + 1)} disabled={logs.length < POR_PAGINA}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-bold text-gray-600 disabled:opacity-40 hover:bg-gray-50 transition">
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
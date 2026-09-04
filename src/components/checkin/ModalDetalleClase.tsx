'use client'
import { useState, useEffect } from 'react'
import { supabase }            from '@/lib/supabase'
import { X, CheckCircle2, Clock, XCircle, Sparkles, Globe, CreditCard } from 'lucide-react'

interface Props {
  clase:     any
  onClose:   () => void
  onCheckin: () => void
}

const ORIGEN_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  'Navy':         { label: 'Navy',      color: 'text-gray-700',   bg: 'bg-gray-100'    },
  'Wellhub':      { label: 'Wellhub',   color: 'text-green-700',  bg: 'bg-green-100'   },
  'TotalPass':    { label: 'TotalPass', color: 'text-blue-700',   bg: 'bg-blue-100'    },
  'Clase Muestra':{ label: '🎯 Muestra', color: 'text-purple-700', bg: 'bg-purple-100' },
}

export default function ModalDetalleClase({ clase, onClose, onCheckin }: Props) {
  const [asistentes, setAsistentes] = useState<any[]>([])
  const [loading,    setLoading]    = useState(true)
  const [mapa,       setMapa]       = useState<any>(null)
  const [tab,        setTab]        = useState<'lista' | 'mapa'>('lista')
  const [procesando, setProcesando] = useState(false)

  const ahora    = new Date()
  const inicio   = new Date(clase.horario)
  const fin      = new Date(inicio.getTime() + clase.duracion_minutos * 60000)
  const terminada = ahora > fin

  const fetchAsistentes = async () => {
    setLoading(true)

    // Reservas de la clase
    const { data: reservas } = await supabase.from('reservas')
        .select(`
            id, estatus, origen, es_clase_muestra, spot_id,
            clientes!inner(id, nombre_completo, plan, paquete_id, paquetes(nombre))
        `)
        .eq('clase_id', clase.id)
        .neq('estatus', 'Cancelada')

    // Asistencias registradas
    const { data: asistencias } = await supabase.from('asistencias')
      .select('cliente_id, fecha_checkin, es_clase_muestra')
      .eq('clase_id', clase.id)

    // Room spots
    if (clase.rooms?.id) {
      const { data: room } = await supabase.from('rooms')
        .select('layout, ancho, alto, room_spots(id, numero, fila, columna, tipo, bloqueado)')
        .eq('id', clase.rooms.id).single()
      setMapa(room)
    }

    const asistenciasMap = new Map(asistencias?.map(a => [a.cliente_id, a]) || [])

    const lista = (reservas || []).map(r => {
      const cliente    = Array.isArray(r.clientes) ? r.clientes[0] : r.clientes
        const asistio    = asistenciasMap.has(cliente?.id)    // ← cliente no r.clientes
        const asistencia = asistenciasMap.get(cliente?.id) 
      
      let origen = 'Navy'
      if (r.es_clase_muestra)       origen = 'Clase Muestra'
      else if (r.origen === 'Wellhub')   origen = 'Wellhub'
      else if (r.origen === 'TotalPass') origen = 'TotalPass'

      return {
        ...r,
        clientes: cliente,
        asistio,
        asistencia,
        origen,
        estado: asistio ? 'asistio' : terminada ? 'no_show' : 'pendiente',
      }
    })

    setAsistentes(lista)
    setLoading(false)
  }

  useEffect(() => { fetchAsistentes() }, [clase.id])

  const handleMarcarNoShow = async () => {
    if (!terminada) return
    setProcesando(true)
    const pendientes = asistentes.filter(a => !a.asistio)
    for (const a of pendientes) {
      await supabase.from('reservas').update({ estatus: 'No Show' }).eq('id', a.id)
    }
    await fetchAsistentes()
    onCheckin()
    setProcesando(false)
  }

  const hora  = inicio.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  const horaFin = fin.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

  const asistieron = asistentes.filter(a => a.asistio).length
  const pendientes = asistentes.filter(a => !a.asistio).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm"/>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-black text-gray-900">{clase.nombre_clase}</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {hora} – {horaFin} · {clase.rooms?.nombre} · {clase.staff?.nombre} {clase.staff?.primer_apellido}
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition">
              <X size={18}/>
            </button>
          </div>

          {/* Contadores */}
          <div className="flex items-center gap-3 mt-4">
            <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-xl">
              <CheckCircle2 size={13} className="text-emerald-500"/>
              <span className="text-xs font-black text-emerald-700">{asistieron} asistieron</span>
            </div>
            <div className="flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-xl">
              <Clock size={13} className="text-gray-500"/>
              <span className="text-xs font-black text-gray-600">{pendientes} pendientes</span>
            </div>
            <div className="flex items-center gap-1.5 bg-gray-100 px-3 py-1.5 rounded-xl">
              <span className="text-xs font-black text-gray-500">{asistentes.length}/{clase.capacidad_max} total</span>
            </div>
            {terminada && pendientes > 0 && (
              <button onClick={handleMarcarNoShow} disabled={procesando}
                className="ml-auto flex items-center gap-1.5 bg-red-500 text-white px-3 py-1.5 rounded-xl text-xs font-black hover:bg-red-600 transition disabled:opacity-40">
                <XCircle size={13}/> {procesando ? 'Marcando...' : `Marcar ${pendientes} No Show`}
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            {(['lista', 'mapa'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-xl text-xs font-black transition ${
                  tab === t ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}>
                {t === 'lista' ? '📋 Lista' : '🗺️ Mapa'}
              </button>
            ))}
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-12 text-center text-gray-400 text-sm">Cargando...</div>
          ) : tab === 'lista' ? (
            <div className="divide-y divide-gray-50">
              {asistentes.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-sm italic">Sin reservas para esta clase</div>
              ) : asistentes.map(a => {
                const cfg = ORIGEN_CONFIG[a.origen] || ORIGEN_CONFIG['Navy']
                return (
                  <div key={a.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50">
                    {/* Estado */}
                    <div className="flex-shrink-0">
                      {a.estado === 'asistio' ? (
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                          <CheckCircle2 size={16} className="text-emerald-600"/>
                        </div>
                      ) : a.estado === 'no_show' ? (
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                          <XCircle size={16} className="text-red-500"/>
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <Clock size={16} className="text-gray-400"/>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-gray-900">{a.clientes?.nombre_completo}</p>
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {a.clientes?.paquetes?.nombre || 'Sin paquete'}
                        {a.asistencia?.fecha_checkin && (
                          <span className="text-emerald-500 ml-2">
                            · Check-in {new Date(a.asistencia.fecha_checkin).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Estado label */}
                    <span className={`text-[10px] font-black px-2 py-1 rounded-full flex-shrink-0 ${
                      a.estado === 'asistio'  ? 'bg-emerald-100 text-emerald-700' :
                      a.estado === 'no_show'  ? 'bg-red-100 text-red-600' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {a.estado === 'asistio' ? 'Asistió' : a.estado === 'no_show' ? 'No Show' : 'Pendiente'}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : (
            // Mapa
            <div className="p-6">
              {!mapa ? (
                <p className="text-center text-gray-400 text-sm py-8">Sin mapa configurado para este room</p>
              ) : (
                <>
                  <p className="text-xs text-gray-400 mb-4">Los nombres aparecen en los spots reservados</p>
                  <div className="overflow-auto">
                    <MapaConNombres
                      mapa={mapa}
                      reservas={asistentes}
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MapaConNombres({ mapa, reservas }: { mapa: any; reservas: any[] }) {
  const CELL = 52
  const GAP  = 6

  const layoutCeldas = Array.isArray(mapa?.layout) ? mapa.layout : []
  const roomSpots    = mapa?.room_spots || []

  // Mapa de spot_id → reserva
  const spotMap = new Map(reservas.filter(r => r.spot_id).map(r => [r.spot_id, r]))

  const maxCol = layoutCeldas.length ? Math.max(...layoutCeldas.map((s: any) => s.columna)) : 0
  const maxFil = layoutCeldas.length ? Math.max(...layoutCeldas.map((s: any) => s.fila))    : 0
  const gridW  = (maxCol + 1) * (CELL + GAP)
  const gridH  = (maxFil + 1) * (CELL + GAP)

  return (
    <div style={{ position: 'relative', width: gridW, height: gridH }}>
      {layoutCeldas.map((celda: any, i: number) => {
        const left = celda.columna * (CELL + GAP)
        const top  = celda.fila    * (CELL + GAP)

        if (celda.tipo === 'Coach') return (
          <div key={i} style={{ position: 'absolute', left, top, width: CELL, height: CELL }}
            className="flex items-center justify-center rounded-xl bg-gray-800 text-lg">🎤</div>
        )
        if (celda.tipo === 'Entrada') return (
          <div key={i} style={{ position: 'absolute', left, top, width: CELL, height: CELL }}
            className="flex items-center justify-center rounded-xl bg-gray-100 text-lg">🚪</div>
        )

        const spot    = roomSpots.find((rs: any) => rs.fila === celda.fila && rs.columna === celda.columna)
        if (!spot) return null

        const reserva = spotMap.get(spot.id)
        const nombre  = reserva?.clientes?.nombre_completo?.split(' ')[0] || null
        const asistio = reserva?.estado === 'asistio'
        const noShow  = reserva?.estado === 'no_show'

        return (
          <div key={i} title={reserva?.clientes?.nombre_completo || spot.numero}
            style={{ position: 'absolute', left, top, width: CELL, height: CELL }}
            className={`rounded-xl border-2 text-[9px] font-bold flex flex-col items-center justify-center gap-0.5 ${
              nombre
                ? asistio ? 'bg-emerald-500 border-emerald-600 text-white'
                : noShow  ? 'bg-red-200 border-red-300 text-red-700'
                : 'bg-indigo-500 border-indigo-600 text-white'
                : 'bg-white border-gray-200 text-gray-400'
            }`}>
            <span className="text-[10px]">{spot.numero}</span>
            {nombre && <span className="truncate w-full text-center px-0.5" style={{ fontSize: 8 }}>{nombre}</span>}
          </div>
        )
      })}
    </div>
  )
}
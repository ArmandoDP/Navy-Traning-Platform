'use client'
// Botón "Agregar cliente" dentro de la ventana de la clase.
// - Clase por empezar: reserva normal.
// - Clase que empezó hace menos de 15 min: el cliente llegó tarde → se crea la reserva y queda como ASISTIDA.
// - Se puede aunque la clase esté llena (recepción/gerencia/dirección hacen excepciones).
// - El lugar se elige del mapa real del salón y se guarda en reservas.spot_id (igual que la app).
import { useState, useEffect } from 'react'
import { X, Search, Check, AlertCircle, Snowflake } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { logActividad } from '@/lib/log-actividad'
import { faseDeClase, traducirErrorReserva, MINUTOS_TOLERANCIA } from '@/lib/ventanaReserva'

interface Props {
  isOpen:    boolean
  clase:     any            // fila de `clases` (id, room_id, horario, capacidad_max, sucursal_id, coach_id, estado, nombre_clase)
  reservas:  any[]          // reservas actuales de la clase (para saber quién ya está y cuántos lugares van)
  onClose:   () => void
  onSuccess: () => void
}

const CELL = 48
const GAP  = 6
const ESTATUS_LIBRES = ['Cancelada', 'Cancelado']

export default function ModalAgregarClienteClase({ isOpen, clase, reservas, onClose, onSuccess }: Props) {
  const { staff } = useAuth()
  const [busqueda,  setBusqueda]  = useState('')
  const [clientes,  setClientes]  = useState<any[]>([])
  const [cliente,   setCliente]   = useState<any | null>(null)
  const [layout,    setLayout]    = useState<any[]>([])
  const [roomSpots, setRoomSpots] = useState<any[]>([])
  const [ocupados,  setOcupados]  = useState<string[]>([])
  const [spotSel,   setSpotSel]   = useState<any | null>(null)
  const [cargandoMapa, setCargandoMapa] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error,     setError]     = useState('')

  const { fase, minutos } = clase?.horario ? faseDeClase(clase.horario) : { fase: 'antes' as const, minutos: 0 }
  const ocupadas = (reservas || []).filter(r => !ESTATUS_LIBRES.includes(r.estatus) && !r.lista_espera).length
  const llena    = clase ? ocupadas >= (clase.capacidad_max || 0) : false

  const yaEsta = cliente
    ? (reservas || []).find(r => r.cliente_id === cliente.id && !ESTATUS_LIBRES.includes(r.estatus))
    : null

  const reset = () => { setBusqueda(''); setClientes([]); setCliente(null); setSpotSel(null); setError('') }

  // Mapa del salón + lugares ocupados
  const cargarMapa = async () => {
    if (!clase?.id) return
    setCargandoMapa(true)
    const [{ data: room }, { data: res }] = await Promise.all([
      clase.room_id
        ? supabase.from('rooms').select('layout, room_spots(id, numero, tipo, fila, columna, bloqueado)').eq('id', clase.room_id).single()
        : Promise.resolve({ data: null as any }),
      supabase.from('reservas').select('spot_id, estatus').eq('clase_id', clase.id).not('spot_id', 'is', null),
    ])
    setLayout(Array.isArray(room?.layout) ? room.layout : [])
    setRoomSpots(room?.room_spots || [])
    // Ocupado = cualquier reserva que no esté cancelada (incluye 'Asistió', que el mapa del modal de muestra omitía)
    setOcupados((res || []).filter((r: any) => !ESTATUS_LIBRES.includes(r.estatus)).map((r: any) => r.spot_id))
    setCargandoMapa(false)
  }

  useEffect(() => { if (isOpen) { reset(); cargarMapa() } }, [isOpen, clase?.id])

  // Buscar cliente
  useEffect(() => {
    if (busqueda.length < 2) { setClientes([]); return }
    const t = setTimeout(async () => {
      const limpio = busqueda.replace(/[,%()]/g, ' ').trim()
      const { data } = await supabase.from('clientes')
        .select('id, nombre_completo, email, plan, nombre_plan, clases_restantes, estatus, membresias(estatus)')
        .eq('estatus', 'Activo')
        .or(`nombre_completo.ilike.%${limpio}%,email.ilike.%${limpio}%`)
        .order('nombre_completo').limit(10)
      setClientes((data || []).map((c: any) => ({
        ...c,
        pausada: (c.membresias || []).some((m: any) => m.estatus === 'Pausada') && !(c.membresias || []).some((m: any) => m.estatus === 'Activa'),
      })))
    }, 300)
    return () => clearTimeout(t)
  }, [busqueda])

  const confirmar = async () => {
    if (!cliente || !clase) return
    setError('')
    if (cliente.pausada)  { setError('La membresía de este cliente está PAUSADA. Reanúdala desde su ficha antes de agregarlo.'); return }
    if (yaEsta)           { setError('Este cliente ya tiene reserva en la clase. Usa el botón Check-in de la lista.'); return }
    // Se vuelve a revisar el tiempo al momento de confirmar (el modal pudo quedar abierto)
    const f = faseDeClase(clase.horario)
    if (f.fase === 'cerrada') { setError(`Ya pasaron más de ${MINUTOS_TOLERANCIA} minutos desde que empezó la clase.`); return }

    setGuardando(true)
    try {
      // El lugar pudo ocuparse mientras el modal estaba abierto (la base de datos no lo valida para reservas del CRM)
      if (spotSel) {
        const { data: tomado } = await supabase.from('reservas').select('id')
          .eq('clase_id', clase.id).eq('spot_id', spotSel.id).not('estatus', 'in', '("Cancelada","Cancelado")').limit(1)
        if (tomado && tomado.length > 0) {
          setError('Ese lugar acaba de ser tomado. Elige otro.'); setSpotSel(null); await cargarMapa(); setGuardando(false); return
        }
      }

      const { data: reserva, error: errIns } = await supabase.from('reservas').insert([{
        cliente_id:   cliente.id,
        clase_id:     clase.id,
        estatus:      'Confirmada',
        lista_espera: false,
        origen:       'CRM',
        spot_id:      spotSel?.id ?? null,
      }]).select().single()
      if (errIns || !reserva) { setError(traducirErrorReserva(errIns?.message || '')); setGuardando(false); return }

      // Llegó tarde: queda como clase asistida (mismo proceso que el botón Check-in)
      if (f.fase === 'tarde') {
        const { error: errAs } = await supabase.from('asistencias').insert([{
          cliente_id:       cliente.id,
          clase_id:         clase.id,
          fecha_checkin:    new Date().toISOString(),
          sucursal_id:      clase.sucursal_id || null,
          staff_id:         clase.coach_id || null,
          es_clase_muestra: false,
        }])
        if (errAs) alert(`Se creó la reserva, pero NO se pudo guardar en el historial de asistencias: ${errAs.message}`)
        const { error: errUp } = await supabase.from('reservas').update({ estatus: 'Asistió' }).eq('id', reserva.id)
        if (errUp) alert(`Se creó la reserva, pero no se pudo marcar como asistida: ${errUp.message}`)
      }

      // Sincronizar cupos (Wellhub / TotalPass)
      try {
        await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/sync/cupos`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clase_id: clase.id }),
        })
      } catch (e) { console.warn('Error sincronizando cupos:', e) }

      // Aviso de confirmación solo si todavía no empieza (a quien ya está en la clase no se le manda)
      if (f.fase === 'antes') {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/reservas/confirmar-notificacion`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reserva_id: reserva.id, cliente_id: cliente.id, clase_id: clase.id }),
          })
        } catch (e) { console.warn('Error enviando notificación:', e) }
      }

      await logActividad({
        tipo:        'reserva_creada_crm',
        descripcion: `${staff?.nombre} ${staff?.primer_apellido} agregó a ${cliente.nombre_completo} a "${clase.nombre_clase}"` +
                     (f.fase === 'tarde' ? ` (llegó ${f.minutos} min tarde, registrado como asistido)` : '') +
                     (llena ? ' — clase llena, excepción' : ''),
        tabla:       'reservas',
        accion:      'INSERT',
        metadata:    { clase_id: clase.id, cliente_id: cliente.id, nombre_clase: clase.nombre_clase, llegada_tarde: f.fase === 'tarde', clase_llena: llena, lugar: spotSel?.numero ?? null },
        sucursal_id: clase.sucursal_id,
        staff_id:    staff?.id,
      })

      onSuccess(); onClose()
    } finally {
      setGuardando(false)
    }
  }

  if (!isOpen || !clase) return null

  const maxCol = layout.length ? Math.max(...layout.map((s: any) => s.columna)) : 0
  const maxFil = layout.length ? Math.max(...layout.map((s: any) => s.fila))    : 0
  const libres = roomSpots.filter(s => !s.bloqueado && !ocupados.includes(s.id)).length

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-900/45 backdrop-blur-[2px] p-4">
      <div className="bg-white w-full max-w-lg rounded-[24px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="flex justify-between items-start px-6 py-5 bg-[#171B24] text-white">
          <div>
            <h2 className="text-lg font-black tracking-tight">Agregar cliente</h2>
            <p className="text-xs text-white/55 mt-0.5">{(clase.nombre_clase || '').trim()} · {ocupadas}/{clase.capacidad_max} lugares</p>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-xl text-white/60 hover:bg-white/10 hover:text-white"><X size={16}/></button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto">
          {fase === 'cerrada' ? (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-xs font-bold">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5"/>
              Esta clase empezó hace {minutos} min. Solo se puede agregar a alguien durante los primeros {MINUTOS_TOLERANCIA} minutos.
            </div>
          ) : (
            <>
              {fase === 'tarde' && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-gray-800 text-xs font-bold">
                  La clase empezó hace {minutos} min. Se creará la reserva y quedará como <u>clase asistida</u>.
                </div>
              )}
              {llena && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-800 text-xs font-bold">
                  La clase está llena ({ocupadas}/{clase.capacidad_max}). Se puede agregar como excepción y quedará registrado.
                </div>
              )}

              {/* Cliente */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Cliente</p>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                  <input autoFocus placeholder="Buscar por nombre o email..."
                    className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-gray-400 bg-gray-50"
                    value={busqueda} onChange={e => { setBusqueda(e.target.value); setCliente(null); setError('') }}/>
                </div>
                {!cliente && clientes.length > 0 && (
                  <div className="mt-2 space-y-1 max-h-44 overflow-y-auto">
                    {clientes.map(c => (
                      <button key={c.id} onClick={() => setCliente(c)}
                        className="w-full text-left px-3 py-2 rounded-xl flex items-center gap-3 hover:bg-gray-50 border border-transparent">
                        <div className="w-8 h-8 rounded-[10px] bg-[#171B24] text-white flex items-center justify-center text-xs font-black flex-shrink-0">{c.nombre_completo.charAt(0)}</div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-900 truncate">{c.nombre_completo}</p>
                          <p className="text-xs text-gray-400 truncate">{c.email}</p>
                        </div>
                        {c.pausada && <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800"><Snowflake size={10}/> PAUSADA</span>}
                      </button>
                    ))}
                  </div>
                )}
                {cliente && (
                  <div className={`mt-2 rounded-xl px-4 py-3 flex items-center gap-3 border ${cliente.pausada ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                    <Check size={14} className={cliente.pausada ? 'text-amber-600' : 'text-emerald-600'}/>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-900">{cliente.nombre_completo}</p>
                      <p className="text-xs text-gray-500">
                        {cliente.pausada ? 'Membresía PAUSADA: no se puede agregar' : (cliente.nombre_plan || cliente.plan || 'Sin plan')}
                        {!cliente.pausada && cliente.clases_restantes != null && ` · ${cliente.clases_restantes} clases restantes`}
                      </p>
                    </div>
                    <button onClick={() => { setCliente(null); setBusqueda('') }} className="text-xs text-gray-400 hover:text-gray-700">Cambiar</button>
                  </div>
                )}
                {yaEsta && (
                  <p className="mt-2 text-xs font-bold text-red-600">Este cliente ya tiene reserva en esta clase ({yaEsta.estatus}). Usa el Check-in de la lista.</p>
                )}
              </div>

              {/* Lugar */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                  Lugar {roomSpots.length > 0 && `· ${libres} libres de ${roomSpots.filter(s => !s.bloqueado).length}`}
                </p>
                {cargandoMapa ? (
                  <p className="text-xs text-gray-400 py-6 text-center">Cargando mapa del salón...</p>
                ) : layout.length === 0 ? (
                  <p className="text-xs text-gray-400 bg-gray-50 rounded-xl p-4 text-center">Este salón no tiene mapa de lugares. Se agregará sin lugar.</p>
                ) : (
                  <div className="bg-gray-50 rounded-2xl p-3 overflow-auto">
                    <div style={{ position: 'relative', width: (maxCol + 1) * (CELL + GAP), height: (maxFil + 1) * (CELL + GAP) }}>
                      {layout.map((celda: any, i: number) => {
                        const left = celda.columna * (CELL + GAP), top = celda.fila * (CELL + GAP)
                        if (celda.tipo === 'Coach')   return <div key={i} style={{ position: 'absolute', left, top, width: CELL, height: CELL }} className="flex items-center justify-center rounded-xl bg-gray-800 text-lg">🎤</div>
                        if (celda.tipo === 'Entrada') return <div key={i} style={{ position: 'absolute', left, top, width: CELL, height: CELL }} className="flex items-center justify-center rounded-xl bg-gray-100 text-lg">🚪</div>
                        const spot = roomSpots.find((rs: any) => rs.fila === celda.fila && rs.columna === celda.columna)
                        if (!spot) return null
                        const tomado = ocupados.includes(spot.id) || spot.bloqueado
                        const sel = spotSel?.id === spot.id
                        return (
                          <button key={i} disabled={tomado} onClick={() => setSpotSel(sel ? null : spot)}
                            style={{ position: 'absolute', left, top, width: CELL, height: CELL }}
                            className={`rounded-xl border-2 text-xs font-bold transition flex items-center justify-center ${
                              tomado ? 'bg-gray-200 border-gray-200 text-gray-400 cursor-not-allowed line-through'
                              : sel  ? 'bg-[#171B24] border-[#171B24] text-white scale-105'
                              :        'bg-white border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                            {spot.numero}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
                {layout.length > 0 && (
                  <p className="text-[11px] text-gray-400 mt-2">
                    {spotSel ? `Lugar elegido: ${spotSel.numero}` : libres === 0 ? 'No quedan lugares libres: se agregará sin lugar.' : 'Si no eliges lugar, se agrega sin lugar asignado.'}
                  </p>
                )}
              </div>
            </>
          )}

          {error && <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-xs font-bold"><AlertCircle size={14} className="flex-shrink-0 mt-0.5"/>{error}</div>}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50">Cancelar</button>
          <div className="flex-1"/>
          <button onClick={confirmar} disabled={guardando || fase === 'cerrada' || !cliente || cliente.pausada || !!yaEsta}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#171B24] hover:brightness-125 text-white font-black rounded-xl text-sm disabled:opacity-40">
            <Check size={15}/>
            {guardando ? 'Agregando...' : fase === 'tarde' ? 'Agregar y marcar asistencia' : 'Agregar a la clase'}
          </button>
        </div>
      </div>
    </div>
  )
}
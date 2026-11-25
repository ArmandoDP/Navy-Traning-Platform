'use client'
// src/components/clases/TabAsistencia.tsx — quién reservó, quién llegó y acciones de recepción.
// Se actualiza en vivo (el drawer escucha los cambios y le pasa las reservas nuevas).
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, Check, UserX, XCircle, Loader2, UserPlus, HelpCircle, Minus, Plus, Undo2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { backend } from '@/lib/backend'
import ModalAsignarFitpass from './ModalAsignarFitpass'
import { NEGRO, CANALES, canalDe, iniciales } from './marca'

interface Props {
  reservas:          any[]
  asistencias:       any[]
  historialClientes: Record<string, number>
  checkingIn:        string | boolean | null
  onCheckIn:         (reserva: any) => void
  onNoShow:          (reservaId: string) => void                 // registra un No Show (NO cancela la reserva)
  puedeMarcarNoShow?: boolean                                    // solo cuando la clase ya empezó
  onCancelarReserva?: (reserva: any) => Promise<string | null>   // cancelar a petición del cliente; devuelve error o null
  puedeCancelarReserva?: boolean
  onAgregar?:        () => void
  llegoTarde?:       boolean
  clase?:            any
  onFitpassCambio?:  (msg?: string) => void   // recargar la clase después de asignar o ajustar lugares de Fitpass
  puedeAjustarFitpass?: boolean
}

type Filtro = 'todos' | 'llegar' | 'llegaron' | 'noshow' | 'canceladas'
type Historial = Record<string, { total: number; ultima?: string }>

// Qué tan seguido viene (clases tomadas ANTES de esta)
const NIVELES = [
  { hasta: 0,        label: 'Primera vez', ayuda: 'Nunca ha tomado una clase en Navy. Dale la bienvenida.', bg: '#FEF3C7', color: '#92400E' },
  { hasta: 1,        label: '2ª clase',    ayuda: 'Regresó por más.',                                        bg: '#F3F4F6', color: '#374151' },
  { hasta: 4,        label: 'Empezando',   ayuda: 'De 3 a 5 clases: está armando su rutina.',               bg: '#F3F4F6', color: '#374151' },
  { hasta: 10,       label: 'Regular',     ayuda: 'De 6 a 11 clases.',                                       bg: '#E5E7EB', color: '#1F2937' },
  { hasta: 20,       label: 'Frecuente',   ayuda: 'De 12 a 21 clases.',                                      bg: '#E5E7EB', color: '#111827' },
  { hasta: Infinity, label: 'Veterano',    ayuda: 'Más de 21 clases.',                                       bg: NEGRO,     color: '#FFFFFF' },
]
const nivelDe = (previas: number) => NIVELES.find(n => previas <= n.hasta)!
const quitar = (s = '') => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const hace = (iso?: string) => {
  if (!iso) return null
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  return d <= 0 ? 'hoy' : d === 1 ? 'ayer' : d < 30 ? `hace ${d} días` : `hace ${Math.floor(d / 30)} ${Math.floor(d / 30) === 1 ? 'mes' : 'meses'}`
}

export default function TabAsistencia({ reservas, asistencias, historialClientes, checkingIn, onCheckIn, onNoShow,
  puedeMarcarNoShow = true, onCancelarReserva, puedeCancelarReserva, onAgregar, llegoTarde, clase, onFitpassCambio, puedeAjustarFitpass }: Props) {
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [busca, setBusca] = useState('')
  const [historial, setHistorial] = useState<Historial>({})
  const [verLeyenda, setVerLeyenda] = useState(false)
  const [aCancelar, setACancelar] = useState<any>(null)
  const [cancelando, setCancelando] = useState(false)
  const [errorCancelar, setErrorCancelar] = useState('')
  const [asignando, setAsignando] = useState<{ reserva_id: string; numero?: number | null } | null>(null)
  const [ajustando, setAjustando] = useState(false)
  const [errorFitpass, setErrorFitpass] = useState('')

  // Lugares de Fitpass apartados que todavía no tienen persona
  const esApartadoFitpass = (r: any) => (r.origen || '') === 'Fitpass' && !(r.clientes?.id || r.cliente_id) && r.estatus !== 'Cancelada' && !r.lista_espera
  const apartados = reservas.filter(esApartadoFitpass).sort((a, b) => (a.lugar ?? 999) - (b.lugar ?? 999))
  const fitpassTotal = reservas.filter(r => (r.origen || '') === 'Fitpass' && r.estatus !== 'Cancelada' && !r.lista_espera).length

  const ajustarFitpass = async (lugares: number) => {
    if (!clase?.id || lugares < 0) return
    setAjustando(true); setErrorFitpass('')
    try { await backend('/fitpass/apartar', { body: { clase_id: clase.id, lugares } }); onFitpassCambio?.() }
    catch (e: any) { setErrorFitpass(e.message) }
    setAjustando(false)
  }
  const desasignar = async (r: any) => {
    if (!confirm(`¿Quitar a ${r.clientes?.nombre_completo || 'esta persona'} del lugar de Fitpass? El lugar vuelve a quedar apartado.`)) return
    try { await backend('/fitpass/desasignar', { body: { reserva_id: r.id } }); onFitpassCambio?.() }
    catch (e: any) { setErrorFitpass(e.message) }
  }

  // Una reserva por cliente: si canceló y volvió a reservar, vale la activa
  // (sin memoización manual: el React Compiler de Next la hace solo)
  const elegida = new Map<string, any>()
  for (const r of reservas.filter(x => !x.lista_espera && !esApartadoFitpass(x))) {
    const clave = r.clientes?.id ? `c:${r.clientes.id}` : `r:${r.id}`
    const actual = elegida.get(clave)
    if (!actual || (actual.estatus === 'Cancelada' && r.estatus !== 'Cancelada')) elegida.set(clave, r)
  }
  const unicas = [...elegida.values()]
  const idsClientes = [...new Set(unicas.map(r => r.clientes?.id || r.cliente_id).filter(Boolean))].sort().join(',')
  const claseActual = unicas[0]?.clase_id

  // Clases que cada cliente ya tomó ANTES de esta (de cualquier canal; sin canceladas ni faltas)
  // Depende de la lista de clientes (texto), no del arreglo: así no se vuelve a consultar en cada render
  useEffect(() => {
    const ids = idsClientes ? idsClientes.split(',') : []
    if (!ids.length) return
    supabase.from('reservas')
      .select('cliente_id, clase_id, estatus, clases!inner(horario)')
      .in('cliente_id', ids)
      .not('estatus', 'in', '("Cancelada","No Show")')
      .lt('clases.horario', new Date().toISOString())
      .limit(10000)
      .then(({ data }: { data: any }) => {
        const h: Historial = {}
        for (const r of (data as any[]) || []) {
          if (r.clase_id === claseActual) continue
          const x = h[r.cliente_id] || (h[r.cliente_id] = { total: 0 })
          x.total++
          const horario = r.clases?.horario
          if (horario && (!x.ultima || horario > x.ultima)) x.ultima = horario
        }
        setHistorial(h)
      })
  }, [idsClientes, claseActual])

  const estaPresente = (r: any) => {
    const cid = r.clientes?.id || r.cliente_id
    return r.estatus === 'Asistió' || asistencias.some(a => (cid && a.cliente_id === cid) || a.reserva_id === r.id)
  }
  const horaLlegada = (r: any) => {
    const cid = r.clientes?.id || r.cliente_id
    const a = asistencias.find(x => cid && x.cliente_id === cid)
    return a?.fecha_checkin ? new Date(a.fecha_checkin).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Mexico_City' }) : null
  }
  const previasDe = (cid?: string) => Math.max(historial[cid || '']?.total ?? 0, cid && historialClientes[cid] ? historialClientes[cid] - 1 : 0)

  const activos    = unicas.filter(r => r.estatus !== 'Cancelada')
  const cancelados = unicas.filter(r => r.estatus === 'Cancelada')
  const presentes  = activos.filter(estaPresente)
  const noShows    = activos.filter(r => !estaPresente(r) && r.estatus === 'No Show')
  const pendientes = activos.filter(r => !estaPresente(r) && r.estatus !== 'No Show')
  const primeraVez = activos.filter(r => (r.clientes?.id || r.cliente_id) && previasDe(r.clientes?.id || r.cliente_id) === 0).length

  const base = filtro === 'llegar' ? pendientes : filtro === 'llegaron' ? presentes : filtro === 'noshow' ? noShows
             : filtro === 'canceladas' ? cancelados : [...pendientes, ...presentes, ...noShows]
  const q = quitar(busca)
  const lista = base.filter(r => !q || quitar(r.clientes?.nombre_completo || r.nombre_externo || '').includes(q) || quitar(r.clientes?.email || '').includes(q))

  const confirmarCancelacion = async () => {
    if (!aCancelar || !onCancelarReserva) return
    setCancelando(true); setErrorCancelar('')
    const err = await onCancelarReserva(aCancelar)
    setCancelando(false)
    if (err) setErrorCancelar(err); else setACancelar(null)
  }

  const FILTROS: [Filtro, string, number][] = [
    ['todos', 'Todos', activos.length], ['llegar', 'Por llegar', pendientes.length], ['llegaron', 'Llegaron', presentes.length],
    ['noshow', 'No show', noShows.length], ['canceladas', 'Canceladas', cancelados.length],
  ]

  return (
    <div className="p-5">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar en esta clase…"
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-gray-400" />
        </div>
        {onAgregar && (
          <button onClick={onAgregar} className="flex items-center gap-1.5 rounded-xl px-3.5 text-sm font-black text-white hover:brightness-125" style={{ background: NEGRO }}>
            <UserPlus size={14} /> {llegoTarde ? 'Llegó tarde' : 'Agregar'}
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {FILTROS.filter(([v, , n]) => v === 'todos' || n > 0).map(([v, l, n]) => (
          <button key={v} onClick={() => setFiltro(v)}
            className={`rounded-xl px-2.5 py-1 text-xs font-bold transition ${filtro === v ? 'text-white' : 'bg-[#F4F5F7] text-gray-600 hover:text-gray-900'}`}
            style={filtro === v ? { background: NEGRO } : undefined}>
            {l} <span className="opacity-60">{n}</span>
          </button>
        ))}
        <button onClick={() => setVerLeyenda(v => !v)} className="ml-auto flex items-center gap-1 text-[11px] font-bold text-gray-400 hover:text-gray-700">
          <HelpCircle size={12} /> Etiquetas
        </button>
      </div>

      <div className="mt-2 flex items-center gap-3 text-[11px]">
        <span className="flex items-center gap-1.5 font-bold text-emerald-600"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> En vivo · se actualiza solo</span>
        {primeraVez > 0 && <span className="font-bold text-amber-700">{primeraVez} {primeraVez === 1 ? 'viene' : 'vienen'} por primera vez</span>}
      </div>

      <AnimatePresence>
        {verLeyenda && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-2 space-y-1.5 rounded-xl bg-gray-50 p-3">
              <p className="text-[11px] font-black text-gray-700">Qué tan seguido viene (sus clases anteriores en Navy, de cualquier canal)</p>
              {NIVELES.map(n => (
                <p key={n.label} className="flex items-center gap-2 text-[11px] text-gray-500">
                  <span className="rounded-md px-1.5 py-0.5 text-[10px] font-black" style={{ background: n.bg, color: n.color }}>{n.label}</span> {n.ayuda}
                </p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {(fitpassTotal > 0 || puedeAjustarFitpass) && clase && (fitpassTotal > 0 || clase.estado === 'Activa') && (
        <div className="mt-3 rounded-[18px] border p-3.5" style={{ borderColor: fitpassTotal ? '#FDBA74' : '#E5E7EB', background: fitpassTotal ? '#FFF7ED' : '#FFFFFF' }}>
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-black text-gray-900">
              <span className="grid h-6 w-6 place-items-center rounded-lg text-[11px] font-black text-white" style={{ background: CANALES.fitpass.color }}>F</span>
              Fitpass{fitpassTotal ? ` · ${fitpassTotal} ${fitpassTotal === 1 ? 'lugar' : 'lugares'}` : ''}
            </p>
            <div className="flex items-center gap-2">
              {fitpassTotal > 0 && <span className="text-[11px] text-gray-500">{fitpassTotal - apartados.length} {fitpassTotal - apartados.length === 1 ? 'asignado' : 'asignados'} · {apartados.length} {apartados.length === 1 ? 'libre' : 'libres'}</span>}
              {puedeAjustarFitpass && clase.estado === 'Activa' && (
                <div className="flex items-center overflow-hidden rounded-lg border border-gray-200 bg-white">
                  <button onClick={() => ajustarFitpass(fitpassTotal - 1)} disabled={ajustando || apartados.length === 0} title="Quitar un lugar apartado"
                    className="px-2 py-1 text-gray-500 hover:bg-gray-50 disabled:opacity-30"><Minus size={12} /></button>
                  <span className="px-1 text-xs font-black text-gray-900">{ajustando ? <Loader2 size={11} className="animate-spin" /> : fitpassTotal}</span>
                  <button onClick={() => ajustarFitpass(fitpassTotal + 1)} disabled={ajustando} title="Apartar un lugar más"
                    className="px-2 py-1 text-gray-500 hover:bg-gray-50 disabled:opacity-30"><Plus size={12} /></button>
                </div>
              )}
            </div>
          </div>
          {fitpassTotal === 0 && <p className="mt-1 text-[11px] text-gray-500">Esta clase no tiene lugares apartados para Fitpass.</p>}
          {apartados.map(a => (
            <div key={a.id} className="mt-2 flex items-center gap-3 rounded-xl bg-white px-3 py-2">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] border-2 border-dashed text-xs font-black" style={{ borderColor: CANALES.fitpass.color, color: CANALES.fitpass.color }}>
                {a.lugar ?? 'F'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-orange-800">Lugar libre</p>
                <p className="text-[11px] text-gray-500">Apartado para Fitpass{a.lugar ? ` · lugar ${a.lugar}` : ''}</p>
              </div>
              {clase.estado === 'Activa' && (
                <button onClick={() => setAsignando({ reserva_id: a.id, numero: a.lugar })}
                  className="rounded-xl px-3.5 py-1.5 text-xs font-black text-white hover:brightness-110" style={{ background: CANALES.fitpass.color }}>
                  Asignar
                </button>
              )}
            </div>
          ))}
          {errorFitpass && <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{errorFitpass}</p>}
        </div>
      )}

      {reservas.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-black text-gray-900">Sin reservas</p>
          <p className="mt-1 text-sm text-gray-500">Nadie ha reservado esta clase todavía.</p>
        </div>
      ) : lista.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">Nadie con ese filtro.</p>
      ) : (
        <div className="mt-2">
          <AnimatePresence initial={false}>
            {lista.map(r => {
              const cliente = r.clientes
              const cid = cliente?.id || r.cliente_id
              const nombre = cliente?.nombre_completo || r.nombre_externo || '—'
              const presente = estaPresente(r)
              const cancelada = r.estatus === 'Cancelada'
              const canal = canalDe(r.origen, r.es_clase_muestra)
              const previas = cid ? previasDe(cid) : 0
              const nivel = nivelDe(previas)
              const ultima = hace(historial[cid]?.ultima)
              const lugar = r.lugar ?? r.room_spots?.numero
              const guardando = typeof checkingIn === 'boolean' ? checkingIn
                : Boolean(checkingIn && [r.id, cid].filter(Boolean).map(String).includes(String(checkingIn)))
              const plataforma = /wellhub|totalpass/i.test(r.origen || '')
              return (
                <motion.div key={r.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: cancelada ? 0.45 : 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-3 border-t border-gray-100 py-3 first:border-t-0">
                  <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-[13px] text-xs font-black text-white" style={{ background: NEGRO }}>
                    {iniciales(nombre)}
                    {presente && <span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full border-2 border-white bg-emerald-500"><Check size={9} className="text-white" /></span>}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm font-black text-gray-900">
                      {nombre}
                      {cliente?.is_founding_member && <span className="text-amber-500" title="Founding Member">★</span>}
                      {cid && <span className="rounded-md px-1.5 py-0.5 text-[10px] font-black" style={{ background: nivel.bg, color: nivel.color }} title={nivel.ayuda}>{nivel.label}</span>}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-gray-500">
                      <span className="rounded-md px-1.5 py-px text-[10px] font-black" style={{ background: canal.fondo, color: canal.texto }}>{canal.label}</span>
                      {lugar ? <span>· Lugar {lugar}</span> : null}
                      {cid ? <span>· {previas === 0 ? 'su primera clase' : `${previas} antes${ultima ? `, la última ${ultima}` : ''}`}</span> : <span>· Invitado externo</span>}
                    </p>
                  </div>
                  {cancelada ? <span className="text-[11px] italic text-gray-400">Cancelada</span>
                  : presente ? (
                    <div className="flex shrink-0 items-center gap-1">
                      <span className="flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-700">
                        <Check size={11} /> Llegó{horaLlegada(r) ? ` ${horaLlegada(r)}` : ''}
                      </span>
                      {(r.origen || '') === 'Fitpass' && (
                        <button onClick={() => desasignar(r)} title="Se asignó por error: quitarle el lugar (vuelve a quedar apartado)"
                          className="rounded-xl p-1.5 text-gray-300 hover:bg-orange-50 hover:text-orange-600"><Undo2 size={14} /></button>
                      )}
                    </div>
                  ) : (
                    <div className="flex shrink-0 items-center gap-1">
                      {r.estatus === 'No Show' && <span className="rounded-lg bg-rose-100 px-2 py-1 text-[11px] font-black text-rose-700">No show</span>}
                      <button onClick={() => onCheckIn(r)} disabled={guardando} title={r.estatus === 'No Show' ? 'Si llegó tarde, el Check-in corrige el No Show' : undefined}
                        className="flex items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-black text-white transition hover:brightness-125 disabled:opacity-50" style={{ background: NEGRO }}>
                        {guardando ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Check-in
                      </button>
                      {r.estatus !== 'No Show' && (
                        <button onClick={() => onNoShow(r.id)} disabled={!puedeMarcarNoShow}
                          title={puedeMarcarNoShow ? 'No llegó: se registra como No Show (no cancela la reserva)' : 'Disponible cuando empiece la clase'}
                          className="rounded-xl border border-gray-200 px-2.5 py-1.5 text-[11px] font-black text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-30">
                          <UserX size={11} className="mr-0.5 inline" /> No show
                        </button>
                      )}
                      {(r.origen || '') === 'Fitpass' && (
                        <button onClick={() => desasignar(r)} title="Quitarle el lugar (vuelve a quedar apartado para Fitpass)"
                          className="rounded-xl p-1.5 text-gray-300 hover:bg-orange-50 hover:text-orange-600"><Undo2 size={15} /></button>
                      )}
                      {puedeCancelarReserva && onCancelarReserva && r.estatus !== 'No Show' && (r.origen || '') !== 'Fitpass' && (
                        <button onClick={() => { setErrorCancelar(''); setACancelar(r) }} disabled={plataforma}
                          title={plataforma ? `Es de ${r.origen}: se cancela desde la app de ${r.origen}` : 'Cancelar a petición del cliente: se le regresa su clase'}
                          className="rounded-xl p-1.5 text-gray-300 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30">
                          <XCircle size={15} />
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      <ModalAsignarFitpass lugar={asignando} clase={clase} onClose={() => setAsignando(null)}
        onListo={msg => { setAsignando(null); onFitpassCambio?.(msg) }} />

      {aCancelar && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40" onClick={() => !cancelando && setACancelar(null)} />
          <motion.div initial={{ y: 12, scale: 0.97, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} className="relative w-full max-w-sm space-y-4 rounded-[22px] bg-white p-6 shadow-2xl">
            <p className="text-base font-black text-gray-900">¿Cancelar la reserva de {aCancelar.clientes?.nombre_completo || 'este cliente'}?</p>
            <p className="text-sm leading-relaxed text-gray-500">Sin penalización: se le regresa su clase, se libera su lugar y le llega una notificación.</p>
            {errorCancelar && <p className="rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700">{errorCancelar}</p>}
            <div className="flex gap-2">
              <button onClick={() => setACancelar(null)} disabled={cancelando} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-bold text-gray-700">Volver</button>
              <button onClick={confirmarCancelacion} disabled={cancelando}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white disabled:opacity-50">
                {cancelando && <Loader2 size={13} className="animate-spin" />} Cancelar reserva
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
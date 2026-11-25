'use client'
// Detalle de una clase: encabezado con su estado en vivo, y pestañas Detalle, Asistencia, Lista de espera y Actividad.
// Todo se actualiza solo (Supabase Realtime): reservas, check-ins y cambios a la clase aparecen sin cerrar el drawer.
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Pencil, UserPlus, Ban, RefreshCw, Rocket, Check } from 'lucide-react'
import { supabase }   from '@/lib/supabase'
import ToastExito     from '@/components/ToastExito'
import TabAsistencia from './TabAsistencia'
import TabListaEspera from './TabListaEspera'
import { useAuth }       from '@/context/AuthContext'
import { logActividad }  from '@/lib/log-actividad'
import ModalEditarClase from '../ModalEditarClase'
import ModalCancelarClase from './ModalCancelarClase'
import TabActividad from './TabActividad'
import ModalAgregarClienteClase from './ModalAgregarClienteClase'
import ModalCambiarCoach from '@/components/clases/ModalCambiarCoach'
import { faseDeClase } from '@/lib/ventanaReserva'
import { NEGRO, CANALES, ORDEN_CANALES, canalDe, faseActual, iniciales, fechaLarga, horaCorta } from './marca'

interface Props {
  isOpen:    boolean
  claseId:   string | null
  onClose:   () => void
  onSuccess: () => void
}

type Tab = 'detalle' | 'asistencia' | 'espera' | 'actividad'

export default function DrawerDetalleClase({ isOpen, claseId, onClose, onSuccess }: Props) {
  const [tab,               setTab]               = useState<Tab>('detalle')
  const [loading,           setLoading]           = useState(true)
  const [toast,             setToast]             = useState(false)
  const [clase,             setClase]             = useState<any>(null)
  const [reservas,          setReservas]          = useState<any[]>([])
  const [asistencias,       setAsistencias]       = useState<any[]>([])
  const [enEspera,          setEnEspera]          = useState(0)
  const [checkingIn,        setCheckingIn]        = useState<string | null>(null)
  const [historialClientes, setHistorialClientes] = useState<Record<string, number>>({})
  const [sincronizado,      setSincronizado]      = useState(false)
  const [toastError,        setToastError]        = useState(false)
  const [toastMsg,          setToastMsg]          = useState('')
  const [publicandoWellhub,   setPublicandoWellhub]   = useState(false)
  const [publicandoTotalpass, setPublicandoTotalpass] = useState(false)
  const [wellhubExito,        setWellhubExito]        = useState(false)
  const [totalpassExito, setTotalpassExito] = useState(false)
  const { staff } = useAuth()
  const [modalEditar, setModalEditar] = useState(false)
  const [modalCancelar, setModalCancelar] = useState(false)
  const [modalAgregar,  setModalAgregar]  = useState(false)
  const [modalCoach,    setModalCoach]    = useState(false)
  const [ahora,         setAhora]         = useState(Date.now())
  const puedeEditar   = ['direccion', 'gerente'].includes(staff?.rol || '')                // editar: dirección y gerentes
  const puedeCancelar = ['direccion', 'gerente', 'staff_navy'].includes(staff?.rol || '')  // cancelar: también recepción
  const esAdmin = puedeCancelar
  const yaCargo = useRef(false)

  // Solo muestra "cargando" la primera vez; las recargas (en vivo o después de una acción) son silenciosas
  const fetchData = async () => {
    if (!claseId) return
    if (!yaCargo.current) setLoading(true)
    try {
      const [{ data: claseData }, { data: reservasData }, { data: asistData }, { data: spotsCRM }, { count: espera }] = await Promise.all([
        supabase.from('clases')
          .select('*, totalpass_occurrence_uuid, wellhub_slot_id, publicar_wellhub, staff(id, nombre, primer_apellido, nivel, foto_url), categorias_clase(nombre, color), sucursales(nombre)')
          .eq('id', claseId).single(),
        supabase.from('reservas')
          .select(`
            *,
            room_spots(numero),
            clientes(
              id, nombre_completo, email, plan, origen,
              is_founding_member, fecha_alta_original,
              paquetes(nombre)
            )
          `)
          .eq('clase_id', claseId).order('created_at'),
        supabase.from('asistencias').select('*').eq('clase_id', claseId),
        // Lugares que el CRM guardó al reservar (tabla spots): la app guarda el suyo en la propia reserva (spot_id)
        supabase.from('spots').select('numero, cliente_id').eq('clase_id', claseId),
        supabase.from('lista_espera').select('id', { count: 'exact', head: true }).eq('clase_id', claseId).eq('estatus', 'Esperando'),
      ])

      if (claseData) setClase(claseData)
      // Lugar de cada reserva: el de la app (spot_id → room_spots), el guardado en la reserva, o el que eligió el CRM (tabla spots)
      const lugarCRM: Record<string, any> = {}
      for (const s of (spotsCRM as any[]) || []) if (s?.cliente_id && s?.numero != null) lugarCRM[s.cliente_id] = s.numero
      if (reservasData) setReservas(reservasData.map((r: any) => ({
        ...r,
        lugar: r.room_spots?.numero ?? r.spot_numero ?? (r.estatus === 'Cancelada' ? null : (lugarCRM[r.cliente_id] ?? null)),
      })))
      if (asistData) setAsistencias(asistData)
      setEnEspera(espera || 0)

      // Historial de asistencias totales por cliente
      const clienteIds = (reservasData || []).map((r: any) => r.clientes?.id || r.cliente_id).filter(Boolean)
      if (clienteIds.length > 0) {
        const { data: historial } = await supabase.from('asistencias').select('cliente_id').in('cliente_id', clienteIds)
        const conteo: Record<string, number> = {}
        for (const a of historial || []) if (a.cliente_id) conteo[a.cliente_id] = (conteo[a.cliente_id] || 0) + 1
        setHistorialClientes(conteo)
      }
      yaCargo.current = true
    } catch (e) {
      console.error('Error cargando datos de la clase:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isOpen || !claseId) return
    yaCargo.current = false
    setTab('detalle'); setClase(null); setReservas([]); setAsistencias([]); setSincronizado(false)
    fetchData()
    // En vivo: reservas, asistencias, lista de espera y la propia clase
    let espera: ReturnType<typeof setTimeout> | null = null
    const recargar = () => { if (espera) clearTimeout(espera); espera = setTimeout(() => fetchData(), 400) }
    const canal = supabase.channel(`clase-detalle-${claseId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas',     filter: `clase_id=eq.${claseId}` }, recargar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'asistencias',  filter: `clase_id=eq.${claseId}` }, recargar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lista_espera', filter: `clase_id=eq.${claseId}` }, recargar)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'clases',  filter: `id=eq.${claseId}` }, recargar)
      .subscribe()
    return () => { if (espera) clearTimeout(espera); supabase.removeChannel(canal) }
  }, [isOpen, claseId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reloj para el estado de la clase ("en 48 min", "faltan 20 min")
  useEffect(() => {
    if (!isOpen) return
    const t = setInterval(() => setAhora(Date.now()), 30000)
    return () => clearInterval(t)
  }, [isOpen])

  // ── CHECK-IN ROBUSTO ─────────────────────────────────────────────────────────
  const handleCheckIn = async (param: any) => {
    const reservaObj = typeof param === 'object' ? param : null
    const reservaId  = reservaObj?.id || (typeof param === 'string' ? param : null)
    const clienteId  = reservaObj?.clientes?.id || reservaObj?.cliente_id || (!reservaObj ? param : null)
    const origen     = (reservaObj?.origen || reservaObj?.clientes?.origen || '').toLowerCase()

    // Usar la reservaId o en su defecto clienteId para que coincida con keyUnica en TabAsistencia
    const checkKey = reservaId || clienteId
    setCheckingIn(checkKey)

    try {
      // 1. Insertar en tabla asistencias
      if (clienteId) {
        // OJO: la tabla `asistencias` NO tiene columna reserva_id. Mandarla hacía fallar todo el insert
        // (desde el 22-sep no se guardó ninguna asistencia) mientras la reserva sí quedaba como 'Asistió'.
        const payloadAsistencia: any = {
          cliente_id:       clienteId,
          clase_id:         claseId,
          fecha_checkin:    new Date().toISOString(),
          sucursal_id:      clase?.sucursal_id || null,
          staff_id:         clase?.coach_id || null,
          es_clase_muestra: reservaObj?.es_clase_muestra || false,
        }

        const { error: errAsistencia } = await supabase
          .from('asistencias')
          .insert([payloadAsistencia])

        if (errAsistencia) {
          // Antes solo se dejaba en consola y nadie se enteraba de que no se guardaba
          console.error('Error guardando la asistencia:', errAsistencia)
          alert(`El check-in se marcó en la reserva, pero NO se pudo guardar en el historial de asistencias: ${errAsistencia.message}`)
        }
      }

      // 2. Actualizar estatus en la tabla reservas
      if (reservaId) {
        const { error: errRes } = await supabase
          .from('reservas')
          .update({ estatus: 'Asistió' })
          .eq('id', reservaId)
          
        if (errRes) console.error('Error actualizando reserva:', errRes)
      } else if (clienteId && claseId) {
        await supabase
          .from('reservas')
          .update({ estatus: 'Asistió' })
          .eq('clase_id', claseId)
          .eq('cliente_id', clienteId)
      }

      // 3. Notificar a Wellhub si el canal es Wellhub
      if (origen === 'wellhub') {
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || ''
        if (baseUrl) {
          fetch(`${baseUrl}/wellhub/checkin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              reserva_id:         reservaId,
              wellhub_booking_id: reservaObj?.wellhub_booking_id || reservaObj?.booking_id,
              cliente_id:         clienteId,
              clase_id:           claseId,
            }),
          }).catch(e => console.warn('Error al comunicar con API Wellhub:', e))
        }
      }

    } catch (err) {
      console.error('Error general en check-in:', err)
    } finally {
      setCheckingIn(null)
      await fetchData()
      onSuccess()
    }
  }

  // No-show: el cliente no llegó. Solo cambia el estatus de la reserva a 'No Show'; NO la cancela
  // (no libera el lugar ni regresa la clase). Si llega tarde, el Check-in la pasa a 'Asistió'.
  const handleMarcarNoShow = async (reservaId: string) => {
    const { error } = await supabase.from('reservas').update({ estatus: 'No Show' }).eq('id', reservaId)
    if (error) {
      console.error('Error marcando No Show:', error)
      alert(`No se pudo registrar el No Show: ${error.message}`)
      return
    }
    await fetchData()
    onSuccess()
  }
  const claseIniciada = Boolean(clase?.horario) && new Date(clase.horario).getTime() <= Date.now()

  // Cancelar la reserva de un cliente que lo pide en sucursal (sin límite de horario, se le regresa la clase)
  const handleCancelarReservaCliente = async (r: any): Promise<string | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/clases/cancelar-reserva`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ reserva_id: r.id, motivo: 'Lo pidió en sucursal' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return data.detail || 'No se pudo cancelar la reserva'
      await fetchData()
      onSuccess()
      return null
    } catch {
      return 'No se pudo conectar con el servidor. Intenta de nuevo.'
    }
  }

  const handleActualizarHorarioWellhub = async () => {
    if (!clase || !claseId) return
    try {
      const res = await fetch('/api/wellhub/actualizar-slot', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId:     clase.wellhub_slot_id,
          horario:    clase.horario,
          sucursalId: clase.sucursal_id,
          coach:      clase.staff ? `${clase.staff.nombre} ${clase.staff.primer_apellido}`.trim() : undefined,
        }),
      })
      fetchData()
      if (res.ok) setSincronizado(true)
    } catch (e) {
      console.error('Error actualizando horario Wellhub:', e)
    }

    await logActividad({
      tipo:        'clase_wellhub_actualizada',
      descripcion: `${staff?.nombre} ${staff?.primer_apellido} actualizó horario en Wellhub de "${clase?.nombre_clase}"`,
      tabla:       'clases',
      accion:      'UPDATE',
      metadata:    { clase_id: claseId, nombre: clase?.nombre_clase, horario: clase?.horario },
      sucursal_id: clase?.sucursal_id,
      staff_id:    staff?.id,
    })
  }

  const handlePublicarWellhub = async () => {
    if (!clase || !claseId || publicandoWellhub) return
    setPublicandoWellhub(true)
    try {
      const res = await fetch('/api/wellhub/publicar-clase', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claseId,
          nombre:          clase.nombre_clase,
          descripcion:     clase.descripcion || clase.nombre_clase,
          horario:         clase.horario,
          duracionMinutos: clase.duracion_minutos,
          capacidadMax:    clase.capacidad_max,
        }),
      })
      if (res.ok) {
        setWellhubExito(true)
        fetchData()
        setTimeout(() => setWellhubExito(false), 3000)
      }
    } catch (e) {
      console.error('Error publicando en Wellhub:', e)
    }
    
    await logActividad({
      tipo:        'clase_publicada_wellhub',
      descripcion: `${staff?.nombre} ${staff?.primer_apellido} publicó "${clase?.nombre_clase}" en Wellhub`,
      tabla:       'clases',
      accion:      'UPDATE',
      metadata:    { clase_id: claseId, nombre: clase?.nombre_clase, horario: clase?.horario },
      sucursal_id: clase?.sucursal_id,
      staff_id:    staff?.id,
    })
    setPublicandoWellhub(false)
  }

  const handlePublicarTotalpass = async () => {
    if (!clase || !claseId || publicandoTotalpass) return
    setPublicandoTotalpass(true)
    try {
      const payload = {
        clase_id:         claseId,
        sucursal_id:      clase.sucursal_id,
        nombre:           clase.nombre_clase,
        descripcion:      clase.descripcion || clase.nombre_clase,
        horario:          clase.horario,
        duracion_minutos: clase.duracion_minutos,
        capacidad_max:    clase.capacidad_max,
        coach:            clase.staff ? `${clase.staff.nombre} ${clase.staff.primer_apellido}` : 'Navy Coach',
      }
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/totalpass-booking/publicar-clase`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      if (res.ok) {
        await fetchData()
        setTotalpassExito(true)
        setTimeout(() => setTotalpassExito(false), 3000)
      } else {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        setToastError(true)
        setToastMsg(err.detail || 'Error al publicar en TotalPass')
      }
    } catch (e) {
      console.error('Error publicando en TotalPass:', e)
    }

    await logActividad({
      tipo:        'clase_publicada_totalpass',
      descripcion: `${staff?.nombre} ${staff?.primer_apellido} publicó "${clase?.nombre_clase}" en TotalPass`,
      tabla:       'clases',
      accion:      'UPDATE',
      metadata:    { clase_id: claseId, nombre: clase?.nombre_clase, horario: clase?.horario },
      sucursal_id: clase?.sucursal_id,
      staff_id:    staff?.id,
    })
    setPublicandoTotalpass(false)
  }


  if (!isOpen) return null

  // ── Números de la clase ────────────────────────────────────────────────────
  const presente = (r: any) => {
    const cid = r.clientes?.id || r.cliente_id
    return r.estatus === 'Asistió' || asistencias.some(a => cid && a.cliente_id === cid)
  }
  const activas   = reservas.filter(r => r.estatus !== 'Cancelada' && !r.lista_espera)
  const llegaron  = activas.filter(presente).length
  const noShows   = activas.filter(r => r.estatus === 'No Show' && !presente(r)).length
  const cupo      = clase?.capacidad_max || 0
  const enWellhub   = !!clase?.wellhub_slot_id
  const enTotalpass = !!clase?.totalpass_occurrence_uuid
  const fase = faseActual(clase?.horario, clase?.duracion_minutos || 60, ahora)
  const porCanal: Record<string, number> = {}
  for (const r of activas) { const c = canalDe(r.origen, r.es_clase_muestra).clave; porCanal[c] = (porCanal[c] || 0) + 1 }
  const coachNombre = clase?.staff ? `${clase.staff.nombre} ${clase.staff.primer_apellido || ''}`.trim() : (clase?.instructor || '')
  const puedeAgregar = puedeCancelar && clase?.estado === 'Activa' && clase?.horario && faseDeClase(clase.horario).fase !== 'cerrada'

  const TABS: { key: Tab; label: string; n?: number }[] = [
    { key: 'detalle', label: 'Detalle' },
    { key: 'asistencia', label: 'Asistencia', n: activas.length },
    { key: 'espera', label: 'Lista de espera', n: enEspera },
    { key: 'actividad', label: 'Actividad' },
  ]

  return (
    <>
      {toast && <ToastExito titulo="Listo" mensaje={toastMsg || 'Los cambios se guardaron correctamente.'} onClose={() => { setToast(false); setToastMsg('') }} />}
      {toastError && <ToastExito titulo="Error" mensaje={toastMsg} onClose={() => { setToastError(false); setToastMsg('') }} />}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} className="fixed inset-0 z-40 bg-gray-900/35 backdrop-blur-[2px]" />

      <motion.aside initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        className="fixed bottom-3 right-3 top-3 z-50 flex w-[min(600px,calc(100vw-24px))] flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl">

        {/* ── Encabezado ── */}
        <header className="shrink-0 px-6 pb-5 pt-5 text-white" style={{ background: NEGRO }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs text-white/55 first-letter:uppercase">{clase ? `${clase.sucursales?.nombre || ''} · ${fechaLarga(clase.horario)}` : ' '}</p>
              <h2 className="mt-0.5 truncate text-[26px] font-black leading-tight tracking-tight">{loading && !clase ? 'Cargando…' : (clase?.nombre_clase || '').trim()}</h2>
              {clase && (
                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold">
                  <span className="rounded-lg bg-white px-2 py-0.5 text-gray-900">{horaCorta(clase.horario)} · {clase.duracion_minutos} min</span>
                  {clase.salon && <span className="rounded-lg bg-white/10 px-2 py-0.5">{clase.salon}</span>}
                  {clase.categorias_clase && <span className="rounded-lg bg-white/10 px-2 py-0.5">{clase.categorias_clase.nombre}</span>}
                  {clase.estado !== 'Activa'
                    ? <span className="rounded-lg bg-rose-500/25 px-2 py-0.5 text-rose-200">{clase.estado}</span>
                    : <span className={`rounded-lg px-2 py-0.5 ${fase.fase === 'curso' ? 'bg-white text-gray-900' : fase.fase === 'antes' ? 'bg-emerald-400/20 text-emerald-300' : 'bg-white/10 text-white/60'}`}>
                        {fase.fase === 'curso' && <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500 align-middle" />}{fase.texto}
                      </span>}
                </div>
              )}
            </div>
            <button onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white/60 transition hover:bg-white/10 hover:text-white"><X size={18} /></button>
          </div>
          {clase && (
            <div className="mt-4 grid grid-cols-4 gap-2">
              {[['Reservas', `${activas.length}/${cupo}`], ['Llegaron', String(llegaron)], ['No-show', String(noShows)], ['En espera', String(enEspera)]].map(([t, v]) => (
                <div key={t} className="rounded-2xl bg-white/[.07] px-3 py-2.5">
                  <p className="text-[11px] text-white/55">{t}</p>
                  <motion.b key={v} initial={{ y: 4, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="block text-xl font-black tabular-nums">{v}</motion.b>
                </div>
              ))}
            </div>
          )}
        </header>

        {/* ── Pestañas ── */}
        <nav className="flex shrink-0 gap-1 border-b border-gray-100 px-4 py-2.5">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`relative rounded-xl px-3 py-1.5 text-[13px] font-bold transition ${tab === t.key ? 'text-white' : 'text-gray-500 hover:text-gray-900'}`}>
              {tab === t.key && <motion.span layoutId="clase-tab" className="absolute inset-0 rounded-xl" style={{ background: NEGRO }} transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <span className="relative">{t.label}{t.n ? <span className={`ml-1 text-[11px] ${tab === t.key ? 'text-white/60' : 'text-gray-400'}`}>{t.n}</span> : null}</span>
            </button>
          ))}
        </nav>

        {/* ── Contenido ── */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading && !clase && <div className="flex h-40 items-center justify-center gap-2 text-gray-400"><RefreshCw size={15} className="animate-spin" /> Cargando…</div>}

          {tab === 'detalle' && clase && (
            <div className="space-y-3 p-5">
              {/* Coach */}
              <div className="flex items-center gap-3 rounded-[18px] border border-gray-200 p-3.5">
                {clase.staff?.foto_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={clase.staff.foto_url} alt="" className="h-11 w-11 rounded-[14px] object-cover" />
                  : <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] text-sm font-black text-white" style={{ background: NEGRO }}>{coachNombre ? iniciales(coachNombre) : '—'}</span>}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-gray-900">{coachNombre || 'Sin coach asignado'}</p>
                  <p className="text-xs text-gray-500">{clase.staff ? `Coach${clase.staff.nivel ? ` · ${clase.staff.nivel}` : ''}` : 'Asigna a alguien para que se le pague'}</p>
                </div>
                {puedeEditar && clase.estado !== 'Cancelada' && (
                  <button onClick={() => setModalCoach(true)} className="rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50">
                    {clase.staff ? 'Cambiar' : 'Asignar'}
                  </button>
                )}
              </div>

              {/* Ocupación por canal */}
              <div className="rounded-[18px] border border-gray-200 p-4">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-black text-gray-900">Ocupación</p>
                  <p className="text-xs text-gray-500"><b className="text-gray-900">{activas.length} de {cupo}</b> · {Math.max(0, cupo - activas.length)} libres</p>
                </div>
                <div className="mt-2.5 flex h-2.5 overflow-hidden rounded-full bg-gray-100">
                  {ORDEN_CANALES.filter(c => porCanal[c]).map(c => (
                    <motion.i key={c} initial={{ width: 0 }} animate={{ width: `${(porCanal[c] / Math.max(cupo, activas.length, 1)) * 100}%` }} transition={{ duration: 0.6 }}
                      className="block h-full" style={{ background: CANALES[c].color }} />
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                  {ORDEN_CANALES.filter(c => porCanal[c]).map(c => (
                    <span key={c} className="flex items-center gap-1.5 text-[11px] text-gray-600">
                      <span className="h-2 w-2 rounded-[3px]" style={{ background: CANALES[c].color }} />{CANALES[c].label} <b className="text-gray-900">{porCanal[c]}</b>
                    </span>
                  ))}
                  {activas.length === 0 && <span className="text-[11px] text-gray-400">Todavía nadie ha reservado.</span>}
                </div>
              </div>

              {/* Plataformas */}
              <div className="rounded-[18px] border border-gray-200 p-4">
                <p className="mb-1 text-sm font-black text-gray-900">Plataformas</p>
                <Plataforma letra="W" nombre="Wellhub" color={CANALES.wellhub.color} publicada={enWellhub} reservas={porCanal.wellhub || 0}
                  publicando={publicandoWellhub} exito={wellhubExito} onPublicar={handlePublicarWellhub}
                  extra={enWellhub && (
                    <button onClick={handleActualizarHorarioWellhub} disabled={sincronizado}
                      className="text-[11px] font-bold text-gray-500 hover:text-gray-900 disabled:text-gray-400">
                      {sincronizado ? '✓ Horario sincronizado' : '↻ Sincronizar horario'}
                    </button>
                  )} />
                <Plataforma letra="T" nombre="TotalPass" color={CANALES.totalpass.color} publicada={enTotalpass} reservas={porCanal.totalpass || 0}
                  publicando={publicandoTotalpass} exito={totalpassExito} onPublicar={handlePublicarTotalpass} />
              </div>

              {clase.descripcion && (
                <p className="rounded-[18px] bg-gray-50 px-4 py-3 text-sm leading-relaxed text-gray-600">{clase.descripcion}</p>
              )}

              {/* Acciones */}
              <div className="flex flex-wrap gap-2 pt-1">
                {puedeEditar && (
                  <button onClick={() => setModalEditar(true)} className="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black text-white transition hover:brightness-125" style={{ background: NEGRO }}>
                    <Pencil size={14} /> Editar clase
                  </button>
                )}
                {puedeAgregar && (
                  <button onClick={() => setModalAgregar(true)} className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50">
                    <UserPlus size={14} /> Agregar cliente
                  </button>
                )}
                {esAdmin && clase.estado === 'Activa' && (
                  <button onClick={() => setModalCancelar(true)} className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold text-rose-600 hover:border-rose-200 hover:bg-rose-50">
                    <Ban size={14} /> Cancelar clase
                  </button>
                )}
              </div>
            </div>
          )}

          {tab === 'asistencia' && clase && (
            <TabAsistencia
              reservas={reservas}
              asistencias={asistencias}
              historialClientes={historialClientes}
              checkingIn={checkingIn}
              onCheckIn={handleCheckIn}
              onNoShow={handleMarcarNoShow}
              puedeMarcarNoShow={claseIniciada}
              onCancelarReserva={handleCancelarReservaCliente}
              puedeCancelarReserva={puedeCancelar}
              onAgregar={puedeAgregar ? () => setModalAgregar(true) : undefined}
              llegoTarde={clase?.horario ? faseDeClase(clase.horario).fase === 'tarde' : false}
              clase={clase}
              puedeAjustarFitpass={puedeEditar}
              onFitpassCambio={(msg?: string) => { fetchData(); onSuccess(); if (msg) { setToastMsg(msg); setToast(true) } }}
            />
          )}
          {tab === 'espera' && claseId && <TabListaEspera claseId={claseId} onCambio={fetchData} />}
          {tab === 'actividad' && claseId && <TabActividad claseId={claseId} />}
        </div>
      </motion.aside>

      <ModalEditarClase isOpen={modalEditar} claseId={claseId} onClose={() => setModalEditar(false)} onSuccess={() => { fetchData(); onSuccess() }} />
      {modalCancelar && claseId && esAdmin && (
        <ModalCancelarClase claseId={claseId} onClose={() => setModalCancelar(false)}
          onHecho={() => { setModalCancelar(false); onSuccess(); onClose() }} />
      )}
      <ModalCambiarCoach claseId={claseId} abierto={modalCoach} onClose={() => setModalCoach(false)}
        onCambiado={(r: any) => {
          setModalCoach(false)
          setToastMsg(`Ahora la da ${r.coach}.${r.avisados?.length ? ` Se avisó por correo a ${r.avisados.join(' y ')}.` : ''}`)
          setToast(true)
          fetchData()
          onSuccess()
        }} />
      <ModalAgregarClienteClase isOpen={modalAgregar} clase={clase} reservas={reservas}
        onClose={() => setModalAgregar(false)} onSuccess={async () => { await fetchData(); onSuccess() }} />
    </>
  )
}

function Plataforma({ letra, nombre, color, publicada, reservas, publicando, exito, onPublicar, extra }: {
  letra: string; nombre: string; color: string; publicada: boolean; reservas: number
  publicando: boolean; exito: boolean; onPublicar: () => void; extra?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3 border-t border-gray-100 py-3 first-of-type:border-t-0">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] text-sm font-black text-white" style={{ background: publicada || publicando ? color : '#D1D5DB' }}>{letra}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-gray-900">{nombre}</p>
        <p className="text-xs text-gray-500">{publicada ? `Publicada · ${reservas} ${reservas === 1 ? 'reserva' : 'reservas'}` : 'No publicada'}</p>
        {extra}
      </div>
      <AnimatePresence mode="wait">
        {exito ? (
          <motion.span key="ok" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1 text-[11px] font-black text-white">
            <Check size={12} /> ¡Publicada!
          </motion.span>
        ) : publicada ? (
          <motion.span key="dia" className="flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-700"><Check size={12} /> Al día</motion.span>
        ) : (
          <motion.button key="pub" onClick={onPublicar} disabled={publicando}
            className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black text-white transition hover:brightness-110 disabled:opacity-70" style={{ background: color }}>
            {publicando ? <><RefreshCw size={12} className="animate-spin" /> Publicando…</> : <><Rocket size={12} /> Publicar</>}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
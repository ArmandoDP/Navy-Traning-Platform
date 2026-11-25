'use client'
// src/components/DrawerCrearClase.tsx — crear una clase (nombres del catálogo), con lugares apartados para Fitpass.
// Se publica en la app de Navy, Wellhub y TotalPass; los lugares de Fitpass ya salen ocupados en todas.
import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { backend } from '@/lib/backend'
import { X, Minus, Plus, CalendarPlus, CheckCircle2, XCircle, Loader2, AlertTriangle, Settings } from 'lucide-react'
import { logActividad } from '@/lib/log-actividad'
import { useAuth } from '@/context/AuthContext'
import ModalGestionNombresClase from '@/components/clases/ModalGestionNombresClase'
import { NEGRO, CANALES } from '@/components/clases/marca'

interface Coach    { id: string; nombre: string; primer_apellido: string; nivel?: string | null }
interface Sucursal { id: string; nombre: string }
interface Room     { id: string; nombre: string; capacidad: number }

interface Props {
  isOpen:      boolean
  onClose:     () => void
  onSuccess:   () => void
  sucursalId?: string
}

const DURACIONES = [45, 50, 60, 70, 75, 85, 90]
const VACIO = { nombre_clase: '', coach_id: '', room_id: '', fecha: '', hora: '', duracion_minutos: 60, capacidad_max: 0, descripcion: '' }
const inputCls = 'w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-400 focus:bg-white'
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL

type Resultado = { estado: 'ok' | 'error' | 'omitida'; mensaje?: string }

// CDMX es UTC-6 todo el año: la hora capturada siempre es hora de CDMX, sin importar la computadora
const aIso = (fecha: string, hora: string) => new Date(`${fecha}T${hora}:00-06:00`)
const fechaTexto = (d: Date | null) => d ? d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Mexico_City' }) : ''
const horaTexto = (d: Date | null) => d ? d.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Mexico_City' }) : ''

export default function DrawerCrearClase({ isOpen, onClose, onSuccess, sucursalId }: Props) {
  const { staff } = useAuth()
  const esDireccion = String(staff?.rol || '').trim().toLowerCase() === 'direccion'

  const [coaches,         setCoaches]         = useState<Coach[]>([])
  const [sucursales,      setSucursales]      = useState<Sucursal[]>([])
  const [rooms,           setRooms]           = useState<Room[]>([])
  const [spots,           setSpots]           = useState<{ numero: number; bloqueado: boolean }[]>([])
  const [opcionesNombres, setOpcionesNombres] = useState<string[]>([])
  const [modalGestion,    setModalGestion]    = useState(false)
  const [sucursal,        setSucursal]        = useState(sucursalId || '')
  const [form,            setForm]            = useState({ ...VACIO })
  const [conFitpass,      setConFitpass]      = useState(false)
  const [lugaresFitpass,  setLugaresFitpass]  = useState(2)
  const [choque,          setChoque]          = useState<any>(null)
  const [repetida,        setRepetida]        = useState<any>(null)
  const [creando,         setCreando]         = useState(false)
  const [error,           setError]           = useState('')
  const [resultado,       setResultado]       = useState<{ wellhub: Resultado; totalpass: Resultado; fitpass: Resultado | null } | null>(null)

  const set = (k: keyof typeof VACIO, v: any) => setForm(p => ({ ...p, [k]: v }))

  const cargarCatalogos = async () => {
    const { data } = await supabase.from('catalogos_clases').select('nombre').eq('estatus', 'Activo').order('nombre')
    setOpcionesNombres(data && data.length ? data.map((d: any) => d.nombre) : [
      'HYBRID LOWER BODY', 'HYBRID UPPER BODY', 'HYBRID FULL BODY', 'HYROX', 'FORCE',
      'CALISTHENICS UPPER BODY', 'CALISTHENICS FULL BODY', 'CALISTHENICS LOWER BODY',
    ])
  }

  useEffect(() => {
    if (!isOpen) return
    setSucursal(sucursalId || ''); setForm({ ...VACIO }); setResultado(null); setError(''); setChoque(null)
    setConFitpass(false); setLugaresFitpass(2)
    cargarCatalogos()
    Promise.all([
      supabase.from('staff').select('id, nombre, primer_apellido, nivel').eq('tipo', 'Coach').eq('estatus', 'Activo').order('nombre'),
      supabase.from('sucursales').select('id, nombre').eq('estatus', 'Activa').order('nombre'),
    ]).then(([{ data: c }, { data: s }]: any[]) => { setCoaches(c || []); setSucursales(s || []) })
  }, [isOpen, sucursalId])

  useEffect(() => {
    setRooms([]); set('room_id', '')
    if (!sucursal) return
    supabase.from('rooms').select('id, nombre, capacidad').eq('sucursal_id', sucursal).eq('estatus', 'Activo').order('nombre')
      .then(({ data }: any) => setRooms(data || []))
  }, [sucursal])

  // Lugares del room (para mostrar cuáles se apartan para Fitpass)
  useEffect(() => {
    setSpots([])
    if (!form.room_id) return
    supabase.from('room_spots').select('numero, bloqueado').eq('room_id', form.room_id).order('numero')
      .then(({ data }: any) => setSpots(data || []))
  }, [form.room_id])

  const room   = rooms.find(r => r.id === form.room_id)
  const coach  = coaches.find(c => c.id === form.coach_id)
  const inicio = form.fecha && form.hora ? aIso(form.fecha, form.hora) : null
  const fin    = inicio ? new Date(inicio.getTime() + form.duracion_minutos * 60000) : null
  const enPasado   = !!inicio && inicio.getTime() < Date.now()
  const cupoExcede = !!room && form.capacidad_max > room.capacidad
  const fitpass    = conFitpass ? Math.min(lugaresFitpass, form.capacidad_max) : 0
  const libresSpots = spots.filter(s => !s.bloqueado)
  const numerosFitpass = new Set(libresSpots.slice(-fitpass).map(s => s.numero))

  useEffect(() => {
    setChoque(null)
    if (!inicio || !fin || !form.room_id) return
    const t = setTimeout(async () => {
      const desde = new Date(inicio.getTime() - 3 * 3600000).toISOString()
      const { data } = await supabase.from('clases').select('id, nombre_clase, horario, duracion_minutos')
        .eq('room_id', form.room_id).eq('estado', 'Activa').gte('horario', desde).lt('horario', fin.toISOString())
      setChoque(((data as any[]) || []).find((c: any) => {
        const ci = new Date(c.horario).getTime(), cf = ci + (c.duracion_minutos || 60) * 60000
        return ci < fin.getTime() && cf > inicio.getTime()
      }) || null)
    }, 300)
    return () => clearTimeout(t)
  }, [form.fecha, form.hora, form.duracion_minutos, form.room_id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setRepetida(null)
    if (!inicio || !sucursal || !form.nombre_clase.trim()) return
    const t = setTimeout(async () => {
      const { data } = await supabase.from('clases').select('id, nombre_clase, staff(nombre)')
        .eq('sucursal_id', sucursal).eq('estado', 'Activa').eq('horario', inicio.toISOString())
      const norm = (x: string) => (x || '').replace(/\s+/g, ' ').trim().toUpperCase()
      setRepetida(((data as any[]) || []).find((c: any) => norm(c.nombre_clase) === norm(form.nombre_clase)) || null)
    }, 300)
    return () => clearTimeout(t)
  }, [form.nombre_clase, form.fecha, form.hora, sucursal]) // eslint-disable-line react-hooks/exhaustive-deps

  const elegirRoom = (r: Room) => {
    set('room_id', r.id)
    if (!form.capacidad_max || form.capacidad_max > r.capacidad) set('capacidad_max', r.capacidad)
  }

  const faltan = [
    !form.nombre_clase.trim() && 'nombre', !sucursal && 'sucursal', !form.room_id && 'room',
    !form.fecha && 'fecha', !form.hora && 'hora', form.capacidad_max < 1 && 'cupo',
  ].filter(Boolean) as string[]
  const puedeCrear = faltan.length === 0 && !enPasado && !cupoExcede && !creando && !repetida && fitpass < form.capacidad_max + 1

  const crear = async () => {
    if (!puedeCrear || !inicio) return
    setCreando(true); setError('')
    const nombre = form.nombre_clase.replace(/\s+/g, ' ').trim()
    const horario = inicio.toISOString()
    const nombreCoach = coach ? `${coach.nombre} ${coach.primer_apellido || ''}`.trim() : ''

    const { data: clase, error: e } = await supabase.from('clases').insert([{
      nombre_clase: nombre, coach_id: form.coach_id || null, sucursal_id: sucursal, room_id: form.room_id,
      instructor: nombreCoach, salon: room?.nombre || 'Sala Principal', duracion_minutos: form.duracion_minutos,
      capacidad_max: form.capacidad_max, descripcion: form.descripcion.trim(), es_recurrente: false,
      estado: 'Activa', tipo_clase: 'General', horario, publicar_wellhub: true, publicar_totalpass: true,
    }]).select().single()

    if (e || !clase) {
      setError((!e && !clase) || e?.code === 'PGRST116'
        ? 'Ya existe esa misma clase a esa hora en esta sucursal: no se creó otra.'
        : e?.message || 'No se pudo crear la clase')
      setCreando(false); return
    }

    // 1. Lugares de Fitpass (antes de publicar, para que las plataformas ya los vean ocupados)
    let fp: Resultado | null = null
    if (fitpass > 0) {
      fp = await backend('/fitpass/apartar', { body: { clase_id: clase.id, lugares: fitpass } })
        .then(() => ({ estado: 'ok' as const })).catch((x: any) => ({ estado: 'error' as const, mensaje: x.message }))
    }

    // 2. Publicar
    const wellhub: Resultado = await fetch('/api/wellhub/publicar-clase', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claseId: clase.id, nombre, descripcion: form.descripcion, horario,
        duracionMinutos: form.duracion_minutos, capacidadMax: form.capacidad_max }),
    }).then(async r => r.ok ? { estado: 'ok' as const } : { estado: 'error' as const, mensaje: (await r.json().catch(() => ({}))).error || `Error ${r.status}` })
      .catch((x: any) => ({ estado: 'error' as const, mensaje: x.message }))

    const totalpass: Resultado = await fetch(`${BACKEND}/totalpass-booking/publicar-clase`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clase_id: clase.id, sucursal_id: sucursal, nombre, descripcion: form.descripcion, horario,
        duracion_minutos: form.duracion_minutos, capacidad_max: form.capacidad_max, coach: nombreCoach || 'Navy Coach' }),
    }).then(async r => r.ok ? { estado: 'ok' as const } : { estado: 'error' as const, mensaje: (await r.json().catch(() => ({}))).detail || `Error ${r.status}` })
      .catch((x: any) => ({ estado: 'error' as const, mensaje: x.message }))

    // 3. Cupos al día en todas las plataformas (descuenta los lugares de Fitpass)
    if (fitpass > 0) {
      await fetch(`${BACKEND}/sync/cupos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clase_id: clase.id }) }).catch(() => {})
    }

    await logActividad({
      tipo: 'clase_creada',
      descripcion: `${staff?.nombre} ${staff?.primer_apellido} creó la clase "${nombre}"${fitpass ? ` con ${fitpass} lugares de Fitpass` : ''}`,
      tabla: 'clases', accion: 'INSERT',
      metadata: { clase_id: clase.id, nombre, horario, duracion: form.duracion_minutos, capacidad: form.capacidad_max,
        fitpass, wellhub: wellhub.estado, totalpass: totalpass.estado },
      sucursal_id: sucursal, staff_id: staff?.id,
    })
    setResultado({ wellhub, totalpass, fitpass: fp })
    setCreando(false)
    onSuccess()
  }

  const nombreSucursal = sucursales.find(s => s.id === sucursal)?.nombre

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="fixed inset-0 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div onClick={onClose} className="absolute inset-0 bg-gray-900/35 backdrop-blur-[2px]" />
          <motion.aside initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="absolute bottom-3 right-3 top-3 flex w-[min(600px,calc(100vw-24px))] flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl">

            {/* Encabezado: cómo va quedando */}
            <header className="shrink-0 px-6 py-5 text-white" style={{ background: NEGRO }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-white/55">Nueva clase</p>
                  <h2 className="mt-0.5 truncate text-2xl font-black tracking-tight">{form.nombre_clase.trim() || 'Elige la clase'}</h2>
                  <p className="mt-1 truncate text-xs text-white/60 first-letter:uppercase">
                    {[nombreSucursal, room?.nombre, inicio && `${fechaTexto(inicio)} · ${horaTexto(inicio)}`, `${form.duracion_minutos} min`].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <button onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white/60 hover:bg-white/10 hover:text-white"><X size={18} /></button>
              </div>
            </header>

            {resultado ? (
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#F4F5F7] p-5">
                <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-[20px] bg-white p-6 text-center shadow-sm">
                  <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50"><CheckCircle2 size={28} className="text-emerald-500" /></div>
                  <p className="text-lg font-black text-gray-900">¡Clase creada!</p>
                  <p className="mt-1 text-sm text-gray-500">{form.nombre_clase.trim()} · {fechaTexto(inicio)} · {horaTexto(inicio)}</p>
                </motion.div>
                {([['Wellhub', resultado.wellhub, CANALES.wellhub.color], ['TotalPass', resultado.totalpass, CANALES.totalpass.color],
                   ...(resultado.fitpass ? [['Fitpass', resultado.fitpass, CANALES.fitpass.color]] : [])] as [string, Resultado, string][]).map(([n, r, color]) => (
                  <div key={n} className="flex items-start gap-3 rounded-[18px] bg-white p-4 shadow-sm">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-black text-white" style={{ background: color }}>{n[0]}</div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-gray-900">{n}</p>
                      {r.estado === 'ok'
                        ? <p className="flex items-center gap-1 text-xs font-bold text-emerald-600"><CheckCircle2 size={12} /> {n === 'Fitpass' ? `${fitpass} lugares apartados (ya salen ocupados en todas las plataformas)` : 'Publicada: sus usuarios ya la pueden reservar'}</p>
                        : <>
                            <p className="flex items-center gap-1 text-xs font-bold text-rose-600"><XCircle size={12} /> {n === 'Fitpass' ? 'No se apartaron los lugares' : 'No se pudo publicar'}</p>
                            <p className="mt-0.5 text-[11px] text-gray-500">{r.mensaje}. {n === 'Fitpass' ? 'Ábrela y ajústalos en Asistencia → Fitpass.' : `Ábrela en el calendario y usa "Publicar" en ${n} para reintentar.`}</p>
                          </>}
                    </div>
                  </div>
                ))}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => { setResultado(null); setForm(p => ({ ...VACIO, room_id: p.room_id, duracion_minutos: p.duracion_minutos, capacidad_max: p.capacidad_max, coach_id: p.coach_id })) }}
                    className="flex-1 rounded-xl border border-gray-200 bg-white py-3 text-sm font-bold text-gray-700 hover:bg-gray-50">Crear otra</button>
                  <button onClick={onClose} className="flex-1 rounded-xl py-3 text-sm font-black text-white" style={{ background: NEGRO }}>Listo</button>
                </div>
              </div>
            ) : (
              <>
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#F4F5F7] p-4">
                  <Seccion titulo="Clase" derecha={esDireccion && (
                    <button type="button" onClick={() => setModalGestion(true)} className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-900">
                      <Settings size={13} /> Administrar nombres
                    </button>
                  )}>
                    <div className="flex flex-wrap gap-1.5">
                      {opcionesNombres.length === 0 && <p className="text-xs italic text-gray-400">Cargando nombres…</p>}
                      {opcionesNombres.map(n => (
                        <Opcion key={n} on={form.nombre_clase.trim() === n} onClick={() => set('nombre_clase', n)}>{n}</Opcion>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Campo label="Sucursal">
                        {sucursalId
                          ? <div className={`${inputCls} text-gray-700`}>{nombreSucursal || '…'}</div>
                          : <select className={inputCls} value={sucursal} onChange={e => setSucursal(e.target.value)}>
                              <option value="">Elegir</option>
                              {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                            </select>}
                      </Campo>
                      <Campo label="Coach">
                        <select className={inputCls} value={form.coach_id} onChange={e => set('coach_id', e.target.value)}>
                          <option value="">Sin asignar</option>
                          {coaches.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.primer_apellido}{c.nivel ? ` · ${c.nivel}` : ''}</option>)}
                        </select>
                      </Campo>
                    </div>
                  </Seccion>

                  <Seccion titulo="Room">
                    {!sucursal ? <p className="text-xs italic text-gray-400">Primero elige la sucursal</p>
                      : rooms.length === 0 ? <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">Esta sucursal no tiene rooms: crea uno en Sucursales.</p>
                      : (
                        <div className="grid grid-cols-2 gap-2">
                          {rooms.map(r => {
                            const on = form.room_id === r.id
                            return (
                              <button key={r.id} type="button" onClick={() => elegirRoom(r)}
                                className={`rounded-xl border px-3.5 py-2.5 text-left transition ${on ? 'border-[#171B24] text-white' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                                style={on ? { background: NEGRO } : undefined}>
                                <p className="truncate text-sm font-black">{r.nombre}</p>
                                <p className={`text-[11px] ${on ? 'text-white/60' : 'text-gray-400'}`}>{r.capacidad} lugares</p>
                              </button>
                            )
                          })}
                        </div>
                      )}
                  </Seccion>

                  <Seccion titulo="Cuándo">
                    <div className="grid grid-cols-2 gap-3">
                      <Campo label="Fecha"><input type="date" className={inputCls} value={form.fecha} onChange={e => set('fecha', e.target.value)} /></Campo>
                      <Campo label="Hora de inicio"><input type="time" className={inputCls} value={form.hora} onChange={e => set('hora', e.target.value)} /></Campo>
                    </div>
                    <Campo label="Duración">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {DURACIONES.map(d => <Opcion key={d} chica on={form.duracion_minutos === d} onClick={() => set('duracion_minutos', d)}>{d} min</Opcion>)}
                        <Contador valor={form.duracion_minutos} paso={5} min={5} onCambio={v => set('duracion_minutos', v)} sufijo="min" />
                      </div>
                    </Campo>
                    {inicio && fin && <p className="text-xs text-gray-500 first-letter:uppercase"><span>{fechaTexto(inicio)}</span>, de <b>{horaTexto(inicio)}</b> a <b>{horaTexto(fin)}</b></p>}
                    {enPasado && <Aviso>Esa fecha y hora ya pasaron.</Aviso>}
                    {repetida && <Aviso>Ya existe <b>{(repetida.nombre_clase || '').trim()}</b> a esa hora en esta sucursal{repetida.staff ? ` (con ${repetida.staff.nombre})` : ''}. No se puede crear otra igual.</Aviso>}
                    {choque && <Aviso>Ya hay <b>{(choque.nombre_clase || '').trim()}</b> en este room a las {horaTexto(new Date(choque.horario))}. Revisa que no la estés duplicando.</Aviso>}
                  </Seccion>

                  <Seccion titulo="Cupo">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs text-gray-500">{room ? `El room tiene ${room.capacidad} lugares` : 'Elige un room para ver sus lugares'}</p>
                      <Contador valor={form.capacidad_max} paso={1} min={0} onCambio={v => set('capacidad_max', v)} sufijo="lugares" />
                    </div>
                    {cupoExcede && <Aviso>El cupo no puede ser mayor a los {room?.capacidad} lugares del room.</Aviso>}
                  </Seccion>

                  {/* Fitpass */}
                  <section className="space-y-3 rounded-[18px] border bg-white p-4 shadow-sm transition" style={{ borderColor: conFitpass ? CANALES.fitpass.color : 'transparent' }}>
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] text-sm font-black text-white" style={{ background: CANALES.fitpass.color }}>F</span>
                      <div className="flex-1">
                        <p className="text-sm font-black text-gray-900">Apartar lugares para Fitpass</p>
                        <p className="text-xs text-gray-500">Se ven ocupados en la app, Wellhub y TotalPass. Recepción los asigna cuando llegan.</p>
                      </div>
                      <button type="button" role="switch" aria-checked={conFitpass} onClick={() => setConFitpass(v => !v)}
                        className={`relative h-6 w-11 shrink-0 rounded-full transition ${conFitpass ? '' : 'bg-gray-200'}`} style={conFitpass ? { background: NEGRO } : undefined}>
                        <motion.span layout className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow" style={{ left: conFitpass ? 22 : 2 }} />
                      </button>
                    </div>
                    <AnimatePresence initial={false}>
                      {conFitpass && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-3 overflow-hidden">
                          <div className="flex flex-wrap items-center gap-3">
                            <Contador valor={lugaresFitpass} paso={1} min={1} onCambio={v => setLugaresFitpass(Math.min(v, Math.max(1, form.capacidad_max)))} sufijo="lugares" />
                            <p className="text-xs text-gray-500">Quedan <b className="text-gray-900">{Math.max(0, form.capacidad_max - fitpass)}</b> para Navy, Wellhub y TotalPass</p>
                          </div>
                          {libresSpots.length > 0 ? (
                            <>
                              <div className="flex flex-wrap gap-1">
                                {libresSpots.slice(0, Math.max(form.capacidad_max, fitpass)).map(s => {
                                  const fp = numerosFitpass.has(s.numero)
                                  return (
                                    <motion.span key={s.numero} layout className="grid h-7 w-7 place-items-center rounded-lg text-[11px] font-black transition"
                                      style={fp ? { background: CANALES.fitpass.color, color: '#fff' } : { background: '#F4F5F7', color: '#9CA3AF' }}>{s.numero}</motion.span>
                                  )
                                })}
                              </div>
                              <p className="text-[11px] text-gray-400">Se apartan solos los últimos lugares libres del room.</p>
                            </>
                          ) : form.room_id ? <p className="text-[11px] text-gray-400">Este room no tiene mapa de lugares: se apartan sin número.</p> : null}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>

                  <Seccion titulo="Descripción" opcional>
                    <textarea rows={2} placeholder="Qué se trabaja, nivel, qué traer…" value={form.descripcion} onChange={e => set('descripcion', e.target.value)} className={`${inputCls} resize-none`} />
                  </Seccion>

                  <Seccion titulo="Se publica en">
                    <div className="flex flex-wrap gap-2">
                      {[['Navy app', NEGRO], ['Wellhub', CANALES.wellhub.color], ['TotalPass', CANALES.totalpass.color]].map(([n, c]) => (
                        <span key={n} className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black text-white" style={{ background: c }}><CheckCircle2 size={12} /> {n}</span>
                      ))}
                    </div>
                    <p className="text-[11px] text-gray-400">Toda clase nueva se publica en las tres. Los lugares se comparten entre todas.</p>
                  </Seccion>

                  {error && <p className="rounded-xl bg-rose-50 p-3 text-xs font-medium text-rose-700">{error}</p>}
                </div>

                <footer className="flex items-center justify-between gap-3 border-t border-gray-100 bg-white px-6 py-4">
                  <p className="min-w-0 truncate text-xs text-gray-400">{faltan.length ? `Falta: ${faltan.join(', ')}` : 'Todo listo'}</p>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50">Cancelar</button>
                    <button type="button" onClick={crear} disabled={!puedeCrear}
                      className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-black text-white transition hover:brightness-125 disabled:opacity-40" style={{ background: NEGRO }}>
                      {creando ? <><Loader2 size={15} className="animate-spin" /> Creando y publicando…</> : <><CalendarPlus size={15} /> Crear y publicar</>}
                    </button>
                  </div>
                </footer>
              </>
            )}
          </motion.aside>
          <ModalGestionNombresClase isOpen={modalGestion} onClose={() => setModalGestion(false)} onRefresh={cargarCatalogos} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Seccion({ titulo, opcional, derecha, children }: { titulo: string; opcional?: boolean; derecha?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-[18px] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-black text-gray-900">{titulo}{opcional && <span className="ml-1.5 text-[11px] font-bold text-gray-400">opcional</span>}</p>
        {derecha}
      </div>
      {children}
    </section>
  )
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><p className="text-xs font-bold text-gray-500">{label}</p>{children}</div>
}

function Opcion({ on, onClick, chica, children }: { on: boolean; onClick: () => void; chica?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`rounded-xl border font-black transition ${chica ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-xs'} ${on ? 'border-[#171B24] text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}
      style={on ? { background: NEGRO } : undefined}>
      {children}
    </button>
  )
}

function Contador({ valor, paso, min, onCambio, sufijo }: { valor: number; paso: number; min: number; onCambio: (v: number) => void; sufijo: string }) {
  return (
    <div className="flex items-center overflow-hidden rounded-xl border border-gray-200 bg-white">
      <button type="button" onClick={() => onCambio(Math.max(min, valor - paso))} className="px-2.5 py-2 text-gray-500 hover:bg-gray-50"><Minus size={13} /></button>
      <input type="number" value={valor} onChange={e => onCambio(Math.max(min, Number(e.target.value) || 0))} className="w-12 text-center text-sm font-black text-gray-900 outline-none" />
      <span className="pr-1 text-[11px] text-gray-400">{sufijo}</span>
      <button type="button" onClick={() => onCambio(valor + paso)} className="px-2.5 py-2 text-gray-500 hover:bg-gray-50"><Plus size={13} /></button>
    </div>
  )
}

function Aviso({ children }: { children: React.ReactNode }) {
  return <p className="flex gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800"><AlertTriangle size={14} className="mt-0.5 shrink-0" /><span>{children}</span></p>
}
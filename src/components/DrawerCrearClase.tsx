'use client'
// src/components/DrawerCrearClase.tsx — crear una clase (nombres predeterminados por catálogo)
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Minus, Plus, CalendarPlus, Clock, Users, MapPin, DoorOpen, Sparkles, CheckCircle2, XCircle, Loader2, AlertTriangle, Globe, Settings } from 'lucide-react'
import { logActividad } from '@/lib/log-actividad'
import { useAuth } from '@/context/AuthContext'
import ModalGestionNombresClase from '@/components/clases/ModalGestionNombresClase'

interface Coach    { id: string; nombre: string; primer_apellido: string }
interface Sucursal { id: string; nombre: string }
interface Room     { id: string; nombre: string; capacidad: number }

interface Props {
  isOpen:      boolean
  onClose:     () => void
  onSuccess:   () => void
  sucursalId?: string
}

const DURACIONES = [45, 50, 60, 75, 90]
const VACIO = { nombre_clase: '', coach_id: '', room_id: '', fecha: '', hora: '', duracion_minutos: 60, capacidad_max: 0, descripcion: '' }
const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-100 bg-white transition'

type Resultado = { estado: 'ok' | 'error' | 'omitida'; mensaje?: string }

export default function DrawerCrearClase({ isOpen, onClose, onSuccess, sucursalId }: Props) {
  const { staff } = useAuth()
  
  // Validar rol de Dirección exacto
  const rolStaff = String(staff?.rol || '').trim().toLowerCase()
  const esDireccion = rolStaff === 'direccion' || Boolean((staff as any)?.es_direccion)

  const [coaches,          setCoaches]          = useState<Coach[]>([])
  const [sucursales,       setSucursales]       = useState<Sucursal[]>([])
  const [rooms,            setRooms]            = useState<Room[]>([])
  const [opcionesNombres,  setOpcionesNombres]  = useState<string[]>([])
  const [modalGestion,     setModalGestion]     = useState(false)
  const [sucursal,         setSucursal]         = useState(sucursalId || '')
  const [form,             setForm]             = useState({ ...VACIO })
  const [choque,           setChoque]           = useState<any>(null)
  const [repetida,         setRepetida]         = useState<any>(null)
  const [creando,          setCreando]          = useState(false)
  const [error,            setError]            = useState('')
  const [resultado,        setResultado]        = useState<{ wellhub: Resultado; totalpass: Resultado } | null>(null)

  const set = (k: keyof typeof VACIO, v: any) => setForm(p => ({ ...p, [k]: v }))

  // Cargar catálogo global de nombres de clases desde la base de datos
  const cargarCatalogos = async () => {
    const { data } = await supabase.from('catalogos_clases').select('nombre').eq('estatus', 'Activo').order('nombre')
    if (data && data.length > 0) {
      setOpcionesNombres(data.map(d => d.nombre))
    } else {
      // Fallback por si la tabla está vacía inicialmente
      setOpcionesNombres([
        'HYBRID LOWER BODY',
        'HYBRID UPPER BODY',
        'HYBRID FULL BODY',
        'HYROX',
        'FORCE',
        'CALISTHENICS UPPER BODY',
        'CALISTHENICS FULL BODY',
        'CALISTHENICS LOWER BODY'
      ])
    }
  }

  // Al abrir el drawer
  useEffect(() => {
    if (!isOpen) return
    setSucursal(sucursalId || ''); setForm({ ...VACIO }); setResultado(null); setError(''); setChoque(null)
    cargarCatalogos()
    Promise.all([
      supabase.from('staff').select('id, nombre, primer_apellido').eq('tipo', 'Coach').eq('estatus', 'Activo').order('nombre'),
      supabase.from('sucursales').select('id, nombre').eq('estatus', 'Activa').order('nombre'),
    ]).then(([{ data: c }, { data: s }]) => { setCoaches(c || []); setSucursales(s || []) })
  }, [isOpen, sucursalId])

  // Rooms de la sucursal
  useEffect(() => {
    setRooms([]); set('room_id', '')
    if (!sucursal) return
    supabase.from('rooms').select('id, nombre, capacidad').eq('sucursal_id', sucursal).eq('estatus', 'Activo').order('nombre')
      .then(({ data }) => setRooms(data || []))
  }, [sucursal])

  const room   = rooms.find(r => r.id === form.room_id)
  const coach  = coaches.find(c => c.id === form.coach_id)
  const inicio = form.fecha && form.hora ? new Date(`${form.fecha}T${form.hora}`) : null
  const fin    = inicio ? new Date(inicio.getTime() + form.duracion_minutos * 60000) : null
  const enPasado = !!inicio && inicio.getTime() < Date.now()
  const cupoExcede = !!room && form.capacidad_max > room.capacidad

  // Validaciones choque / repetida
  useEffect(() => {
    setChoque(null)
    if (!inicio || !fin || !form.room_id) return
    const t = setTimeout(async () => {
      const desde = new Date(inicio.getTime() - 3 * 3600000).toISOString()
      const { data } = await supabase.from('clases').select('id, nombre_clase, horario, duracion_minutos')
        .eq('room_id', form.room_id).eq('estado', 'Activa').gte('horario', desde).lt('horario', fin.toISOString())
      const cruza = (data || []).find((c: any) => {
        const ci = new Date(c.horario).getTime(), cf = ci + (c.duracion_minutos || 60) * 60000
        return ci < fin.getTime() && cf > inicio.getTime()
      })
      setChoque(cruza || null)
    }, 300)
    return () => clearTimeout(t)
  }, [form.fecha, form.hora, form.duracion_minutos, form.room_id])

  useEffect(() => {
    setRepetida(null)
    if (!inicio || !sucursal || !form.nombre_clase.trim()) return
    const t = setTimeout(async () => {
      const { data } = await supabase.from('clases').select('id, nombre_clase, staff(nombre)')
        .eq('sucursal_id', sucursal).eq('estado', 'Activa').eq('horario', inicio.toISOString())
      const norm = (x: string) => (x || '').replace(/\s+/g, ' ').trim().toUpperCase()
      setRepetida((data || []).find((c: any) => norm(c.nombre_clase) === norm(form.nombre_clase)) || null)
    }, 300)
    return () => clearTimeout(t)
  }, [form.nombre_clase, form.fecha, form.hora, sucursal])

  const elegirRoom = (r: Room) => {
    set('room_id', r.id)
    if (!form.capacidad_max || form.capacidad_max > r.capacidad) set('capacidad_max', r.capacidad)
  }

  const faltan = [
    !form.nombre_clase.trim() && 'nombre de clase', !sucursal && 'sucursal', !form.room_id && 'room',
    !form.fecha && 'fecha', !form.hora && 'hora', form.capacidad_max < 1 && 'cupo',
  ].filter(Boolean) as string[]
  const puedeCrear = faltan.length === 0 && !enPasado && !cupoExcede && !creando && !repetida

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

    const wellhub: Resultado = await fetch('/api/wellhub/publicar-clase', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claseId: clase.id, nombre, descripcion: form.descripcion, horario,
        duracionMinutos: form.duracion_minutos, capacidadMax: form.capacidad_max }),
    }).then(async r => r.ok ? { estado: 'ok' as const } : { estado: 'error' as const, mensaje: (await r.json().catch(() => ({}))).error || `Error ${r.status}` })
      .catch((x: any) => ({ estado: 'error' as const, mensaje: x.message }))

    const totalpass: Resultado = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/totalpass-booking/publicar-clase`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clase_id: clase.id, sucursal_id: sucursal, nombre, descripcion: form.descripcion, horario,
        duracion_minutos: form.duracion_minutos, capacidad_max: form.capacidad_max, coach: nombreCoach || 'Navy Coach' }),
    }).then(async r => r.ok ? { estado: 'ok' as const } : { estado: 'error' as const, mensaje: (await r.json().catch(() => ({}))).detail || `Error ${r.status}` })
      .catch((x: any) => ({ estado: 'error' as const, mensaje: x.message }))

    await logActividad({
      tipo: 'clase_creada',
      descripcion: `${staff?.nombre} ${staff?.primer_apellido} creó la clase "${nombre}"`,
      tabla: 'clases', accion: 'INSERT',
      metadata: { clase_id: clase.id, nombre, horario, duracion: form.duracion_minutos, capacidad: form.capacidad_max,
        wellhub: wellhub.estado, totalpass: totalpass.estado },
      sucursal_id: sucursal, staff_id: staff?.id,
    })
    setResultado({ wellhub, totalpass })
    setCreando(false)
    onSuccess()
  }

  const nombreSucursal = sucursales.find(s => s.id === sucursal)?.nombre
  const fechaTexto = inicio ? inicio.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }) : ''
  const horaTexto = (d: Date | null) => d ? d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : ''

  if (!isOpen) return null

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" />
      <div className="fixed top-0 right-0 z-50 h-full w-full max-w-lg bg-[#F8F9FB] shadow-2xl flex flex-col">

        {/* Encabezado */}
        <div className="flex items-center gap-3 px-6 py-5 bg-white border-b border-gray-100">
          <div className="w-11 h-11 rounded-2xl bg-gray-900 flex items-center justify-center"><CalendarPlus size={20} className="text-white" /></div>
          <div className="flex-1">
            <h2 className="text-lg font-black text-gray-900">Nueva clase</h2>
            <p className="text-xs text-gray-400">Se publica en la app de Navy, Wellhub y TotalPass</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={18} /></button>
        </div>

        {resultado ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3"><CheckCircle2 size={28} className="text-emerald-500" /></div>
              <p className="text-lg font-black text-gray-900">¡Clase creada!</p>
              <p className="text-sm text-gray-500 mt-1">{form.nombre_clase.trim()} · <span className="capitalize">{fechaTexto}</span> · {horaTexto(inicio)}</p>
            </div>
            {([['Wellhub', resultado.wellhub, '#FF5A5F'], ['TotalPass', resultado.totalpass, '#16a34a']] as const).map(([n, r, color]) => (
              <div key={n} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm" style={{ backgroundColor: color }}>{n[0]}</div>
                <div className="flex-1">
                  <p className="text-sm font-black text-gray-900">{n}</p>
                  {r.estado === 'ok'
                    ? <p className="text-xs text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 size={12} /> Publicada: sus usuarios ya la pueden reservar</p>
                    : <>
                        <p className="text-xs text-red-600 font-bold flex items-center gap-1"><XCircle size={12} /> No se pudo publicar</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{r.mensaje}. Ábrela en el calendario y usa "Publicar en {n}" para reintentar.</p>
                      </>}
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <button onClick={() => { setResultado(null); setForm(p => ({ ...VACIO, room_id: p.room_id, duracion_minutos: p.duracion_minutos, capacidad_max: p.capacidad_max, coach_id: p.coach_id })) }}
                className="flex-1 py-3 border border-gray-200 bg-white rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50">Crear otra</button>
              <button onClick={onClose} className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold">Listo</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">

              {/* 1. La clase (Nombres exclusivamente seleccionables) */}
              <Seccion 
                numero={1} 
                titulo="La clase" 
                icono={<Sparkles size={14} />}
                derecha={
                  esDireccion && (
                    <button
                      type="button"
                      onClick={() => setModalGestion(true)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-100 transition"
                    >
                      <Settings size={13} /> Administrar opciones
                    </button>
                  )
                }
              >
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Selecciona el nombre de la clase</p>
                  
                  {opcionesNombres.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">Cargando nombres predeterminados...</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {opcionesNombres.map(n => {
                        const seleccionada = form.nombre_clase.trim() === n
                        return (
                          <button
                            key={n}
                            type="button"
                            onClick={() => set('nombre_clase', n)}
                            className={`px-3 py-2 rounded-xl text-xs font-black border transition uppercase text-left ${
                              seleccionada 
                                ? 'bg-gray-900 text-white border-gray-900 shadow-sm' 
                                : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
                            }`}
                          >
                            {n}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Campo label="Sucursal">
                    {sucursalId ? (
                      <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 text-gray-700"><MapPin size={13} className="text-gray-400" />{nombreSucursal || '…'}</div>
                    ) : (
                      <select className={inputCls} value={sucursal} onChange={e => setSucursal(e.target.value)}>
                        <option value="">Elegir</option>
                        {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                      </select>
                    )}
                  </Campo>
                  <Campo label="Coach">
                    <select className={inputCls} value={form.coach_id} onChange={e => set('coach_id', e.target.value)}>
                      <option value="">Sin asignar</option>
                      {coaches.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.primer_apellido}</option>)}
                    </select>
                  </Campo>
                </div>
              </Seccion>

              {/* 2. Room */}
              <Seccion numero={2} titulo="Room" icono={<DoorOpen size={14} />}>
                {!sucursal ? <p className="text-xs text-gray-400 italic">Primero elige la sucursal</p>
                  : rooms.length === 0 ? <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2">Esta sucursal no tiene rooms: crea uno en Sucursales.</p>
                  : (
                    <div className="grid grid-cols-2 gap-2">
                      {rooms.map(r => {
                        const on = form.room_id === r.id
                        return (
                          <button key={r.id} type="button" onClick={() => elegirRoom(r)}
                            className={`text-left rounded-xl border-2 px-3 py-2.5 transition ${on ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-100 bg-white hover:border-gray-300'}`}>
                            <p className="text-sm font-black truncate">{r.nombre}</p>
                            <p className={`text-[11px] ${on ? 'text-white/60' : 'text-gray-400'}`}>{r.capacidad} lugares</p>
                          </button>
                        )
                      })}
                    </div>
                  )}
              </Seccion>

              {/* 3. Cuándo */}
              <Seccion numero={3} titulo="Cuándo" icono={<Clock size={14} />}>
                <div className="grid grid-cols-2 gap-3">
                  <Campo label="Fecha"><input type="date" className={inputCls} value={form.fecha} onChange={e => set('fecha', e.target.value)} /></Campo>
                  <Campo label="Hora de inicio"><input type="time" className={inputCls} value={form.hora} onChange={e => set('hora', e.target.value)} /></Campo>
                </div>
                <Campo label="Duración">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {DURACIONES.map(d => (
                      <button key={d} type="button" onClick={() => set('duracion_minutos', d)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${form.duracion_minutos === d ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                        {d} min
                      </button>
                    ))}
                    <Contador valor={form.duracion_minutos} paso={5} min={5} onCambio={v => set('duracion_minutos', v)} sufijo="min" />
                  </div>
                </Campo>
                {inicio && fin && <p className="text-xs text-gray-500"><span className="capitalize">{fechaTexto}</span>, de <b>{horaTexto(inicio)}</b> a <b>{horaTexto(fin)}</b></p>}
                {enPasado && <Aviso>Esa fecha y hora ya pasaron.</Aviso>}
                {repetida && (
                  <Aviso>Ya existe <b>{(repetida.nombre_clase || '').trim()}</b> a esa hora en esta sucursal{repetida.staff ? ` (con ${repetida.staff.nombre})` : ''}. No se puede crear otra igual.</Aviso>
                )}
                {choque && (
                  <Aviso>Ya hay <b>{(choque.nombre_clase || '').trim()}</b> en este room a las {horaTexto(new Date(choque.horario))}. Revisa que no la estés duplicando.</Aviso>
                )}
              </Seccion>

              {/* 4. Cupo */}
              <Seccion numero={4} titulo="Cupo" icono={<Users size={14} />}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-gray-500">{room ? `El room tiene ${room.capacidad} lugares` : 'Elige un room para ver sus lugares'}</p>
                  <Contador valor={form.capacidad_max} paso={1} min={0} onCambio={v => set('capacidad_max', v)} sufijo="lugares" />
                </div>
                {cupoExcede && <Aviso>El cupo no puede ser mayor a los {room?.capacidad} lugares del room.</Aviso>}
              </Seccion>

              {/* 5. Descripción */}
              <Seccion numero={5} titulo="Descripción" opcional>
                <textarea rows={2} placeholder="Qué se trabaja, nivel, qué traer…" value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
                  className={`${inputCls} resize-none`} />
              </Seccion>

              {/* 6. Plataformas */}
              <Seccion numero={6} titulo="Dónde se publica" icono={<Globe size={14} />}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Plataforma nombre="App Navy" color="#171B24" texto="Clientes con plan" />
                  <Plataforma nombre="Wellhub" color="#FF5A5F" texto="Usuarios de Wellhub" />
                  <Plataforma nombre="TotalPass" color="#16a34a" texto="Usuarios de TotalPass" />
                </div>
                <p className="text-[11px] text-gray-400">Toda clase nueva se publica en las tres, para que nadie se quede sin verla. Los lugares se comparten entre todas.</p>
              </Seccion>

              {/* Resumen */}
              {inicio && room && form.nombre_clase.trim() && (
                <div className="rounded-2xl bg-gray-900 text-white p-4">
                  <p className="text-[10px] tracking-widest font-bold text-gray-400">ASÍ QUEDA</p>
                  <p className="text-lg font-black mt-1 uppercase">{form.nombre_clase.trim()}</p>
                  <p className="text-sm text-gray-300 capitalize">{fechaTexto} · {horaTexto(inicio)} – {horaTexto(fin)}</p>
                  <p className="text-xs text-gray-400 mt-1">{nombreSucursal} · {room.nombre} · {form.capacidad_max} lugares · {coach ? `${coach.nombre} ${coach.primer_apellido}` : 'Coach por asignar'}</p>
                </div>
              )}

              {error && <p className="text-xs text-red-600 bg-red-50 rounded-xl p-3 font-medium">{error}</p>}
            </div>

            {/* Pie */}
            <div className="px-6 py-4 bg-white border-t border-gray-100 space-y-2">
              {faltan.length > 0 && <p className="text-[11px] text-gray-400 text-center">Falta: {faltan.join(', ')}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button type="button" onClick={crear} disabled={!puedeCrear}
                  className="flex-[2] py-3 bg-gray-900 hover:bg-gray-700 text-white rounded-xl text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2 transition">
                  {creando ? <><Loader2 size={15} className="animate-spin" /> Creando y publicando…</> : <><CalendarPlus size={15} /> Crear y publicar</>}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal de administración exclusiva para Dirección */}
      <ModalGestionNombresClase
        isOpen={modalGestion}
        onClose={() => setModalGestion(false)}
        onRefresh={cargarCatalogos}
      />
    </>
  )
}

function Seccion({ numero, titulo, icono, opcional, derecha, children }: { numero: number; titulo: string; icono?: React.ReactNode; opcional?: boolean; derecha?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-gray-900 text-white text-[10px] font-black flex items-center justify-center">{numero}</span>
          <p className="text-sm font-black text-gray-900 flex items-center gap-1.5">{titulo} {icono && <span className="text-gray-400">{icono}</span>}</p>
          {opcional && <span className="text-[10px] text-gray-400 font-bold">OPCIONAL</span>}
        </div>
        {derecha}
      </div>
      {children}
    </div>
  )
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{label}</p>{children}</div>
}

function Contador({ valor, paso, min, onCambio, sufijo }: { valor: number; paso: number; min: number; onCambio: (v: number) => void; sufijo: string }) {
  return (
    <div className="flex items-center border border-gray-200 rounded-xl bg-white overflow-hidden">
      <button type="button" onClick={() => onCambio(Math.max(min, valor - paso))} className="px-2.5 py-2 text-gray-500 hover:bg-gray-50"><Minus size={13} /></button>
      <input type="number" value={valor} onChange={e => onCambio(Math.max(min, Number(e.target.value) || 0))}
        className="w-12 text-center text-sm font-black text-gray-900 outline-none" />
      <span className="text-[11px] text-gray-400 pr-1">{sufijo}</span>
      <button type="button" onClick={() => onCambio(valor + paso)} className="px-2.5 py-2 text-gray-500 hover:bg-gray-50"><Plus size={13} /></button>
    </div>
  )
}

function Plataforma({ nombre, color, texto }: { nombre: string; color: string; texto: string }) {
  return (
    <div className="relative rounded-2xl border-2 p-3 overflow-hidden" style={{ borderColor: color }}>
      <div className="absolute -right-4 -top-4 w-14 h-14 rounded-full opacity-10" style={{ backgroundColor: color }} />
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-xs" style={{ backgroundColor: color }}>{nombre[0]}</div>
        <CheckCircle2 size={16} className="ml-auto" style={{ color }} />
      </div>
      <p className="text-sm font-black text-gray-900 mt-2">{nombre}</p>
      <p className="text-[11px] text-gray-500">{texto}</p>
      <p className="text-[10px] font-bold mt-1" style={{ color }}>SIEMPRE SE PUBLICA</p>
    </div>
  )
}

function Aviso({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 flex gap-2"><AlertTriangle size={14} className="shrink-0 mt-0.5" /><span>{children}</span></p>
}
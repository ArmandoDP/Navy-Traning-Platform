'use client'
import { useState, useEffect } from 'react'
import {
  X, Users, Clock, MapPin,
  UserCheck, UserX, CheckCircle2, Flame,
  Star, Pencil, Activity
} from 'lucide-react'
import { supabase }   from '@/lib/supabase'
import ToastExito     from '@/components/ToastExito'
import TabAsistencia from './TabAsistencia'

interface Props {
  isOpen:    boolean
  claseId:   string | null
  onClose:   () => void
  onSuccess: () => void
}

type Tab = 'detalle' | 'asistencia' | 'editar'

const inputCls  = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400 bg-gray-50 transition"
const selectCls = `${inputCls} appearance-none cursor-pointer`

// ── Helpers ────────────────────────────────────────────────────────────────
function getBadgeCanal(origen: string | null, esMuestra: boolean) {
  if (esMuestra)                                          return { label: 'Muestra',   cls: 'bg-purple-100 text-purple-700' }
  if (origen === 'Wellhub'   || origen === 'wellhub')    return { label: 'Wellhub',   cls: 'bg-pink-100 text-pink-600' }
  if (origen === 'TotalPass' || origen === 'totalpass')  return { label: 'TotalPass', cls: 'bg-green-100 text-green-700' }
  return { label: 'Navy', cls: 'bg-gray-900 text-white' }
}

function getEtiquetaExperiencia(total: number) {
  if (total === 1)        return { label: '1ª clase 🌟', cls: 'bg-yellow-100 text-yellow-700' }
  if (total <= 3)         return { label: 'Nuevo',       cls: 'bg-blue-100 text-blue-600' }
  if (total <= 10)        return { label: 'Regular',     cls: 'bg-indigo-100 text-indigo-600' }
  return                         { label: 'Veterano 💪', cls: 'bg-emerald-100 text-emerald-700' }
}

function getNumClaseLabel(total: number) {
  if (total === 1) return 'Primera clase'
  if (total === 2) return '2ª clase'
  if (total === 3) return '3ª clase'
  return `Clase #${total}`
}

export default function DrawerDetalleClase({ isOpen, claseId, onClose, onSuccess }: Props) {
  const [tab,              setTab]              = useState<Tab>('detalle')
  const [loading,          setLoading]          = useState(true)
  const [saving,           setSaving]           = useState(false)
  const [toast,            setToast]            = useState(false)
  const [clase,            setClase]            = useState<any>(null)
  const [reservas,         setReservas]         = useState<any[]>([])
  const [asistencias,      setAsistencias]      = useState<any[]>([])
  const [coaches,          setCoaches]          = useState<any[]>([])
  const [checkingIn,       setCheckingIn]       = useState<string | null>(null)
  const [historialClientes, setHistorialClientes] = useState<Record<string, number>>({})
  const [sincronizado, setSincronizado] = useState(false)
  const [toastError, setToastError] = useState(false)
  const [toastMsg, setToastMsg]  = useState('')

  const [form, setForm] = useState({
    nombre_clase:     '',
    coach_id:         '',
    fecha:            '',
    hora:             '',
    duracion_minutos: 60,
    capacidad_max:    0,
    descripcion:      '',
    salon:            '',
    estado:           'Activa',
  })

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  const fetchData = async () => {
    if (!claseId) return
    setLoading(true)

    const [{ data: claseData }, { data: reservasData }, { data: asistData }, { data: coachData }] = await Promise.all([
      supabase.from('clases')
        .select('*, totalpass_occurrence_uuid, wellhub_slot_id, totalpass_occurrence_uuid, publicar_wellhub, staff(id, nombre, primer_apellido), categorias_clase(nombre, color), sucursales(nombre)')
        .eq('id', claseId).single(),
      supabase.from('reservas')
        .select(`
          *,
          clientes(
            id, nombre_completo, email, plan, origen,
            is_founding_member, fecha_alta_original,
            paquetes(nombre)
          )
        `)
        .eq('clase_id', claseId).order('created_at'),
      supabase.from('asistencias').select('*').eq('clase_id', claseId),
      supabase.from('staff').select('id, nombre, primer_apellido').eq('tipo', 'Coach').eq('estatus', 'Activo').order('nombre'),
    ])

    if (claseData) {
      setClase(claseData)
      const h = new Date(claseData.horario)
      setForm({
        nombre_clase:     claseData.nombre_clase     || '',
        coach_id:         claseData.coach_id         || '',
        fecha:            h.toISOString().split('T')[0],
        hora:             h.toTimeString().slice(0, 5),
        duracion_minutos: claseData.duracion_minutos || 60,
        capacidad_max:    claseData.capacidad_max    || 0,
        descripcion:      claseData.descripcion      || '',
        salon:            claseData.salon            || '',
        estado:           claseData.estado           || 'Activa',
      })
    }
    if (reservasData)   setReservas(reservasData)
    if (asistData)      setAsistencias(asistData)
    if (coachData)      setCoaches(coachData)

    // Historial de asistencias totales por cliente
    const clienteIds = (reservasData || []).map((r: any) => r.clientes?.id).filter(Boolean)
    if (clienteIds.length > 0) {
      const { data: historial } = await supabase
        .from('asistencias')
        .select('cliente_id')
        .in('cliente_id', clienteIds)

      const conteo: Record<string, number> = {}
      for (const a of historial || []) {
        conteo[a.cliente_id] = (conteo[a.cliente_id] || 0) + 1
      }
      setHistorialClientes(conteo)
    }

    setLoading(false)
  }

  useEffect(() => {
    if (isOpen && claseId) { setTab('detalle'); fetchData() }
  }, [isOpen, claseId])

  const handleCheckIn = async (clienteId: string) => {
    setCheckingIn(clienteId)
    const yaAsistio = asistencias.some(a => a.cliente_id === clienteId)
    if (yaAsistio) { setCheckingIn(null); return }
    await supabase.from('asistencias').insert([{
      cliente_id:    clienteId,
      clase_id:      claseId,
      fecha_checkin: new Date().toISOString(),
    }])
    await supabase.from('reservas').update({ estatus: 'Confirmada' })
      .eq('clase_id', claseId).eq('cliente_id', clienteId)
    fetchData()
    setCheckingIn(null)
  }

  const handleCancelarReserva = async (reservaId: string) => {
    await supabase.from('reservas').update({ estatus: 'Cancelada' }).eq('id', reservaId)
    fetchData()
  }

  const handleGuardar = async () => {
    if (!claseId) return
    setSaving(true)
    const horario = new Date(`${form.fecha}T${form.hora}`).toISOString()
    const coach   = coaches.find(c => c.id === form.coach_id)
    await supabase.from('clases').update({
      nombre_clase:     form.nombre_clase,
      coach_id:         form.coach_id || null,
      instructor:       coach ? `${coach.nombre} ${coach.primer_apellido}` : '',
      horario,
      duracion_minutos: form.duracion_minutos,
      capacidad_max:    form.capacidad_max,
      descripcion:      form.descripcion,
      salon:            form.salon,
      estado:           form.estado,
    }).eq('id', claseId)
    setSaving(false)
    setToast(true)
    onSuccess()
    fetchData()
  }

  const handleCancelarClase = async () => {
    if (!claseId) return
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/clases/cancelar`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ clase_id: claseId }),
      })
      const data = await res.json()
      console.log('Clase cancelada:', data)
    } catch (e) {
      console.error('Error cancelando clase:', e)
    }
    fetchData()
    onSuccess()
  }

  const handleActualizarHorarioWellhub = async () => {
    if (!clase || !claseId) return
    try {
      const res = await fetch('/api/wellhub/actualizar-slot', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          slotId:      clase.wellhub_slot_id,
          horario:     clase.horario,
          sucursalId:  clase.sucursal_id,
        }),
      })
      const data = await res.json()
      console.log('Horario actualizado:', data)
      fetchData()
      if (res.ok) setSincronizado(true)
    } catch (e) {
      console.error('Error actualizando horario Wellhub:', e)
    }
  }

  const handlePublicarWellhub = async () => {
    if (!clase || !claseId) return
    try {
      const res = await fetch('/api/wellhub/publicar-clase', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          claseId,
          nombre:          clase.nombre_clase,
          descripcion:     clase.descripcion || clase.nombre_clase,
          horario:         clase.horario,
          duracionMinutos: clase.duracion_minutos,
          capacidadMax:    clase.capacidad_max,
        }),
      })
      if (res.ok) fetchData()
    } catch (e) {
      console.error('Error publicando en Wellhub:', e)
    }
  }

  const handlePublicarTotalpass = async () => {
    if (!clase || !claseId) return
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
        setClase(null)
        await fetchData()
        setToast(true)
        setToastMsg('Clase publicada en TotalPass')
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        setToastError(true)
        setToastMsg(err.detail || 'Error al publicar en TotalPass')
      }
    } catch (e) {
      console.error('Error publicando en TotalPass:', e)
    }
  }

  if (!isOpen) return null

  const totalReservas    = reservas.filter(r => r.estatus !== 'Cancelada').length
  const totalAsistencias = asistencias.length
  const ocupacion        = clase?.capacidad_max > 0 ? Math.round((totalReservas / clase.capacidad_max) * 100) : 0
  const enWellhub        = !!clase?.wellhub_slot_id
  const enTotalpass =   !!clase?.totalpass_occurrence_uuid

  return (
    <>
      {toast && (
        <ToastExito titulo="Clase actualizada" mensaje="Los cambios se guardaron correctamente." onClose={() => setToast(false)} />
      )}

      <div onClick={onClose} className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" />

      <div className="fixed top-0 right-0 z-50 h-full w-full max-w-xl bg-white shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-black text-gray-900">
                {loading ? '...' : clase?.nombre_clase}
              </h2>
              {clase?.categorias_clase && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold"
                  style={{ backgroundColor: `${clase.categorias_clase.color}20`, color: clase.categorias_clase.color }}>
                  {clase.categorias_clase.nombre}
                </span>
              )}
              {enWellhub && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-orange-50 text-orange-500 border border-orange-100">
                  Wellhub ✓
                </span>
              )}
              {enTotalpass && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-blue-50 text-blue-500 border border-blue-100">
                  TotalPass ✓
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {clase?.sucursales?.nombre} · {clase?.horario
                ? new Date(clase.horario).toLocaleDateString('es-MX', { weekday: 'long', day: '2-digit', month: 'long' })
                : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-400">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {([
            { key: 'detalle',    label: '📋 Detalle' },
            { key: 'asistencia', label: `👥 Asistencia (${totalReservas})` },
            { key: 'editar',     label: '✏️ Editar' },
          ] as { key: Tab; label: string }[]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-3 text-xs font-bold transition border-b-2 ${
                tab === t.key ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Tab Detalle ── */}
          {tab === 'detalle' && !loading && clase && (
            <div className="px-6 py-5 space-y-5">
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Reservas',    val: `${totalReservas}/${clase.capacidad_max}`, color: 'text-gray-900' },
                  { label: 'Asistencias', val: totalAsistencias,  color: 'text-emerald-600' },
                  { label: 'No-shows',    val: Math.max(0, totalReservas - totalAsistencias), color: 'text-red-500' },
                  { label: 'Ocupación',   val: `${ocupacion}%`,   color: 'text-indigo-600' },
                ].map(m => (
                  <div key={m.label} className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">{m.label}</p>
                    <p className={`text-xl font-black mt-0.5 ${m.color}`}>{m.val}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Clock size={15} className="text-gray-400 flex-shrink-0" />
                  <span>
                    {new Date(clase.horario).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    {' · '}
                    {new Date(clase.horario).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    {' · '}
                    {clase.duracion_minutos} min
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <MapPin size={15} className="text-gray-400 flex-shrink-0" />
                  <span>{clase.salon || 'Sala Principal'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Users size={15} className="text-gray-400 flex-shrink-0" />
                  <span>Coach: {clase.staff ? `${clase.staff.nombre} ${clase.staff.primer_apellido}` : clase.instructor || '—'}</span>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-bold text-gray-500">Ocupación</p>
                  <p className="text-xs text-gray-400">{totalReservas}/{clase.capacidad_max}</p>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${Math.min(ocupacion, 100)}%` }} />
                </div>
              </div>
              {clase.descripcion && (
                <p className="text-sm text-gray-500 bg-gray-50 rounded-xl px-4 py-3">{clase.descripcion}</p>
              )}
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <p className="text-xs font-black text-gray-500 uppercase tracking-wide">Plataformas externas</p>
                </div>
                <div className="divide-y divide-gray-50">
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-900">Wellhub</span>
                      {enWellhub
                        ? <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-500">✓ Publicada · Slot {clase.wellhub_slot_id}</span>
                        : <span className="text-xs text-gray-400">No publicada</span>}
                    </div>
                    {!enWellhub && (
                      <button onClick={handlePublicarWellhub}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg bg-orange-50 text-orange-500 hover:bg-orange-100 transition">
                        Publicar
                      </button>
                    )}
                    {enWellhub && (
                      <button onClick={handleActualizarHorarioWellhub}
                        disabled={sincronizado}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${
                          sincronizado 
                            ? 'bg-emerald-50 text-emerald-600 cursor-default' 
                            : 'bg-pink-50 text-pink-600 hover:bg-pink-100'
                        }`}>
                        {sincronizado ? '✓ Horario sincronizado' : 'Sincronizar horario'}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-900">TotalPass</span>
                      {enTotalpass
                        ? <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-500">✓ Publicada</span>
                        : <span className="text-xs text-gray-400">No publicada</span>}
                    </div>
                    {!enTotalpass && clase?.sucursal_id && (
                      <button onClick={handlePublicarTotalpass}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 transition">
                        Publicar
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  clase.estado === 'Activa' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                }`}>
                  {clase.estado}
                </span>
                {clase.estado === 'Activa' && (
                  <button onClick={handleCancelarClase}
                    className="text-xs font-bold text-red-400 hover:text-red-600 transition">
                    Cancelar clase
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Tab Asistencia ── */}
          {tab === 'asistencia' && (
            <TabAsistencia
              reservas={reservas}
              asistencias={asistencias}
              historialClientes={historialClientes}
              checkingIn={checkingIn}
              onCheckIn={handleCheckIn}
              onCancelar={handleCancelarReserva}
            />
          )}

          {/* ── Tab Editar ── */}
          {tab === 'editar' && (
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Nombre de la clase</label>
                <input className={inputCls} value={form.nombre_clase}
                  onChange={e => set('nombre_clase', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Coach</label>
                <select className={selectCls} value={form.coach_id} onChange={e => set('coach_id', e.target.value)}>
                  <option value="">Seleccionar</option>
                  {coaches.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre} {c.primer_apellido}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Fecha</label>
                  <input type="date" className={inputCls} value={form.fecha}
                    onChange={e => set('fecha', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Hora</label>
                  <input type="time" className={inputCls} value={form.hora}
                    onChange={e => set('hora', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Duración (min)</label>
                  <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50 overflow-hidden">
                    <button type="button" onClick={() => set('duracion_minutos', Math.max(5, form.duracion_minutos - 5))}
                      className="px-3 py-2.5 text-gray-400 hover:bg-gray-100">−</button>
                    <span className="flex-1 text-center text-sm font-medium text-gray-900">{form.duracion_minutos}</span>
                    <button type="button" onClick={() => set('duracion_minutos', form.duracion_minutos + 5)}
                      className="px-3 py-2.5 text-gray-400 hover:bg-gray-100">+</button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Capacidad máx</label>
                  <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50 overflow-hidden">
                    <button type="button" onClick={() => set('capacidad_max', Math.max(0, form.capacidad_max - 1))}
                      className="px-3 py-2.5 text-gray-400 hover:bg-gray-100">−</button>
                    <span className="flex-1 text-center text-sm font-medium text-gray-900">{form.capacidad_max}</span>
                    <button type="button" onClick={() => set('capacidad_max', form.capacidad_max + 1)}
                      className="px-3 py-2.5 text-gray-400 hover:bg-gray-100">+</button>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Salón / Room</label>
                <input className={inputCls} value={form.salon}
                  onChange={e => set('salon', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Estatus</label>
                <select className={selectCls} value={form.estado} onChange={e => set('estado', e.target.value)}>
                  <option value="Activa">Activa</option>
                  <option value="Cancelada">Cancelada</option>
                  <option value="Finalizada">Finalizada</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Descripción</label>
                <textarea rows={3} className={`${inputCls} resize-none`}
                  value={form.descripcion} onChange={e => set('descripcion', e.target.value)} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {tab === 'editar' && (
          <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
            <button onClick={onClose}
              className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button onClick={handleGuardar} disabled={saving}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition"
              style={{ backgroundColor: '#171B24' }}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        )}
        {toast && (
          <ToastExito
            titulo="TotalPass"
            mensaje={toastMsg}
            onClose={() => setToast(false)}
          />
        )}
        {toastError && (
          <ToastExito
            titulo="Error en TotalPass"
            mensaje={toastMsg}
            onClose={() => setToastError(false)}
          />
        )}
      </div>
    </>
  )
}
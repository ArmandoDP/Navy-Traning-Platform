'use client'
// src/components/ModalEditarClase.tsx
import { useEffect, useState } from 'react'
import { X, AlertTriangle, Lock, CheckCircle2, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth }  from '@/context/AuthContext'

interface Props {
  isOpen:    boolean
  claseId:   string | null
  onClose:   () => void
  onSuccess: () => void
}

// CDMX es UTC-6 todo el año
const aLocal = (iso: string) => {
  const d = new Date(new Date(iso).getTime() - 6 * 3600 * 1000).toISOString()
  return { fecha: d.slice(0, 10), hora: d.slice(11, 16) }
}
const aIso = (fecha: string, hora: string) => new Date(`${fecha}T${hora}:00-06:00`).toISOString()

export default function ModalEditarClase({ isOpen, claseId, onClose, onSuccess }: Props) {
  const { esGlobal } = useAuth()
  const [clase,     setClase]     = useState<any>(null)
  const [coaches,   setCoaches]   = useState<any[]>([])
  const [reservas,  setReservas]  = useState(0)
  const [spots,     setSpots]     = useState<number | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [error,     setError]     = useState('')
  const [resultado, setResultado] = useState<any>(null)

  const [form, setForm] = useState({
    nombre: '', coach_id: '', capacidad_max: 0, fecha: '', hora: '', duracion_minutos: 60,
  })
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (!isOpen || !claseId) return
    setError(''); setResultado(null)

    const cargar = async () => {
      const { data: c } = await supabase.from('clases')
        .select('id, nombre_clase, horario, duracion_minutos, capacidad_max, coach_id, room_id, sucursal_id, wellhub_slot_id, totalpass_occurrence_uuid')
        .eq('id', claseId).single()
      if (!c) return
      setClase(c)
      const { fecha, hora } = aLocal(c.horario)
      setForm({
        nombre:           c.nombre_clase?.trim() || '',
        coach_id:         c.coach_id || '',
        capacidad_max:    c.capacidad_max,
        fecha, hora,
        duracion_minutos: c.duracion_minutos,
      })

      const { count } = await supabase.from('reservas')
        .select('id', { count: 'exact', head: true })
        .eq('clase_id', claseId).neq('estatus', 'Cancelada')
      setReservas(count || 0)

      if (c.room_id) {
        const { count: s } = await supabase.from('room_spots')
          .select('id', { count: 'exact', head: true })
          .eq('room_id', c.room_id).eq('bloqueado', false)
        setSpots(s ?? null)
      }

      const { data: st } = await supabase.from('staff')
        .select('id, nombre, primer_apellido, tipo')
        .eq('estatus', 'Activo').order('nombre')
      const lista = st || []
      const soloCoaches = lista.filter(s => String(s.tipo || '').toLowerCase().includes('coach'))
      setCoaches(soloCoaches.length ? soloCoaches : lista)
    }
    cargar()
  }, [isOpen, claseId])

  if (!isOpen) return null

  if (!esGlobal) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div onClick={onClose} className="absolute inset-0 bg-black/50" />
        <div className="relative bg-white rounded-2xl p-8 max-w-sm w-full text-center">
          <Lock className="mx-auto text-gray-400 mb-3" />
          <p className="font-bold text-gray-900">Solo dirección puede editar clases</p>
          <button onClick={onClose} className="mt-6 w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-sm">Entendido</button>
        </div>
      </div>
    )
  }

  const conReservas  = reservas > 0
  const original     = clase ? aLocal(clase.horario) : { fecha: '', hora: '' }
  const cambiaHora   = !!clase && (form.fecha !== original.fecha || form.hora !== original.hora)
  const cambiaNombre = !!clase && form.nombre.trim() !== (clase.nombre_clase || '').trim()
  const cambiaCoach  = !!clase && (form.coach_id || null) !== (clase.coach_id || null)
  const avisara      = conReservas && (cambiaNombre || cambiaCoach)
  const excedeSpots  = spots !== null && spots > 0 && Number(form.capacidad_max) > spots

  const handleGuardar = async () => {
    if (!clase) return
    setError('')

    const body: any = { clase_id: clase.id }
    if (cambiaNombre) body.nombre = form.nombre.trim()
    if (cambiaCoach)  body.coach_id = form.coach_id || null
    if (Number(form.capacidad_max) !== clase.capacidad_max) body.capacidad_max = Number(form.capacidad_max)
    if (!conReservas && cambiaHora) body.horario = aIso(form.fecha, form.hora)
    if (!conReservas && Number(form.duracion_minutos) !== clase.duracion_minutos) body.duracion_minutos = Number(form.duracion_minutos)

    if (Object.keys(body).length === 1) { setError('No hay cambios que guardar'); return }
    if (body.capacidad_max !== undefined && body.capacidad_max < reservas) {
      setError(`La capacidad no puede ser menor a las ${reservas} reservas activas`); return
    }
    if (excedeSpots && !confirm(`El room solo tiene ${spots} lugares. Los clientes de la app no podrán elegir lugar después del ${spots}. ¿Continuar?`)) return
    if (avisara && !confirm(`Se avisará por correo y notificación a ${reservas} cliente(s) con reserva. ¿Continuar?`)) return

    setGuardando(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/clases/actualizar`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body:    JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Error al guardar')
      setResultado(data)
      onSuccess()
    } catch (e: any) {
      setError(e.message)
    }
    setGuardando(false)
  }

  const estado = (v: any) => {
    if (!v) return '—'
    if (v.error) return `❌ ${v.error}`
    if (v.estado) return v.estado
    return Object.entries(v).filter(([k]) => k !== 'nuevo_uuid').map(([k, x]) => `${k} ${x}`).join(' · ') || '✅'
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-black text-gray-900">Editar clase</h2>
            <p className="text-xs text-gray-400 mt-0.5">Se actualiza en CRM, app, Wellhub y TotalPass</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={16} /></button>
        </div>

        {resultado ? (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="text-green-500" />
              <p className="font-bold text-gray-900">Clase actualizada</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1.5">
              <p><b>Wellhub:</b> {estado(resultado.plataformas?.wellhub)}</p>
              <p><b>TotalPass:</b> {estado(resultado.plataformas?.totalpass)}</p>
              <p><b>Cupos:</b> {resultado.plataformas?.cupos?.ok ? `✅ ${resultado.plataformas.cupos.total} reservas` : estado(resultado.plataformas?.cupos)}</p>
              {resultado.notificados > 0 && <p><b>Avisados:</b> {resultado.notificados} cliente(s)</p>}
            </div>
            {resultado.advertencias?.map((a: string) => (
              <p key={a} className="text-xs text-amber-700 bg-amber-50 rounded-lg p-3">⚠ {a}</p>
            ))}
            <button onClick={onClose} className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-sm">Cerrar</button>
          </div>
        ) : !clase ? (
          <div className="p-10 text-center text-sm text-gray-400">Cargando...</div>
        ) : (
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-2 text-sm bg-gray-50 rounded-xl px-4 py-3">
              <Users size={16} className="text-gray-400" />
              <span><b>{reservas}</b> reservas activas{spots !== null ? ` · room de ${spots} lugares` : ''}</span>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Nombre</label>
              <input value={form.nombre} onChange={e => set('nombre', e.target.value)}
                className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-400" />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Coach</label>
              <select value={form.coach_id} onChange={e => set('coach_id', e.target.value)}
                className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-400">
                <option value="">Sin coach</option>
                {coaches.map(c => (
                  <option key={c.id} value={c.id}>{`${c.nombre} ${c.primer_apellido || ''}`.replace(/\s+/g, ' ').trim()}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Cupos</label>
              <input type="number" min={Math.max(1, reservas)} value={form.capacidad_max}
                onChange={e => set('capacidad_max', e.target.value)}
                className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-400" />
              <p className="text-xs text-gray-400 mt-1">Mínimo {Math.max(1, reservas)} (reservas actuales)</p>
              {excedeSpots && (
                <p className="text-xs text-amber-700 mt-1">⚠ El room tiene {spots} lugares; en la app no podrán elegir lugar después del {spots}.</p>
              )}
            </div>

            <div className={conReservas ? 'opacity-50' : ''}>
              <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                Fecha, hora y duración {conReservas && <Lock size={11} />}
              </label>
              <div className="mt-1 grid grid-cols-3 gap-2">
                <input type="date" value={form.fecha} disabled={conReservas} onChange={e => set('fecha', e.target.value)}
                  className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none" />
                <input type="time" value={form.hora} disabled={conReservas} onChange={e => set('hora', e.target.value)}
                  className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none" />
                <input type="number" min={15} step={5} value={form.duracion_minutos} disabled={conReservas}
                  onChange={e => set('duracion_minutos', e.target.value)}
                  className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none" />
              </div>
              {conReservas && (
                <p className="text-xs text-gray-500 mt-1">Con reservas no se puede mover la hora. Si hace falta, cancela la clase (avisa a todos sin no-show) y crea una nueva.</p>
              )}
            </div>

            {avisara && (
              <div className="flex gap-2 text-xs text-indigo-700 bg-indigo-50 rounded-xl p-3">
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                Se avisará por correo y notificación a los {reservas} clientes con reserva.
              </div>
            )}

            {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl p-3">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleGuardar} disabled={guardando}
                className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold disabled:opacity-50">
                {guardando ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
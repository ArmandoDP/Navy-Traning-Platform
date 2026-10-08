'use client'
// src/components/clientes/ModalFechasMembresia.tsx
import { useEffect, useState } from 'react'
import { X, CalendarClock, Hourglass, Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth }  from '@/context/AuthContext'

interface Props {
  isOpen:      boolean
  membresiaId: string | null
  onClose:     () => void
  onSuccess:   () => void
}

const fmt = (d?: string | null) =>
  d ? new Date(`${d}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export default function ModalFechasMembresia({ isOpen, membresiaId, onClose, onSuccess }: Props) {
  const { esGlobal } = useAuth()
  const [m,         setM]         = useState<any>(null)
  const [inicio,    setInicio]    = useState('')
  const [fin,       setFin]       = useState('')
  const [espera,    setEspera]    = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error,     setError]     = useState('')

  useEffect(() => {
    if (!isOpen || !membresiaId) return
    setError('')
    supabase.from('membresias')
      .select('id, fecha_inicio, fecha_fin, fecha_compra, activacion_pendiente, activada_at, stripe_subscription_id, paquetes(nombre, vigencia_dias)')
      .eq('id', membresiaId).single()
      .then(({ data }) => {
        setM(data)
        setInicio(data?.fecha_inicio || '')
        setFin(data?.fecha_fin || '')
        setEspera(!!data?.activacion_pendiente)
      })
  }, [isOpen, membresiaId])

  // Al cambiar el inicio, se sugiere el fin con la vigencia del paquete
  const cambiarInicio = (v: string) => {
    setInicio(v)
    const dias = m?.paquetes?.vigencia_dias
    if (v && dias) {
      const d = new Date(`${v}T12:00:00`)
      d.setDate(d.getDate() + dias)
      setFin(d.toISOString().slice(0, 10))
    }
  }

  const guardar = async () => {
    setGuardando(true); setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/membresias/fechas`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify(espera
          ? { membresia_id: membresiaId, activacion_pendiente: true }
          : { membresia_id: membresiaId, fecha_inicio: inicio, fecha_fin: fin, activacion_pendiente: false }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'No se pudo guardar')
      onSuccess(); onClose()
    } catch (e: any) { setError(e.message) }
    setGuardando(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center"><CalendarClock size={18} className="text-indigo-600" /></div>
            <div>
              <h2 className="text-base font-black text-gray-900">Fechas de la membresía</h2>
              <p className="text-xs text-gray-400">{m?.paquetes?.nombre} · {m?.paquetes?.vigencia_dias} días</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={16} /></button>
        </div>

        {!esGlobal ? (
          <div className="p-8 text-center">
            <Lock className="mx-auto text-gray-400 mb-3" />
            <p className="font-bold text-gray-900">Solo dirección puede cambiar fechas</p>
          </div>
        ) : !m ? (
          <div className="p-10 text-center text-sm text-gray-400">Cargando...</div>
        ) : (
          <div className="p-6 space-y-5">
            <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1">
              <p><span className="text-gray-400">Comprada:</span> <b>{fmt(m.fecha_compra)}</b></p>
              {m.activacion_pendiente
                ? <p className="text-amber-700 font-bold flex items-center gap-1.5"><Hourglass size={14} /> En espera de su primera reserva</p>
                : <p><span className="text-gray-400">Vigente:</span> <b>{fmt(m.fecha_inicio)} → {fmt(m.fecha_fin)}</b></p>}
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={espera} onChange={e => setEspera(e.target.checked)} className="mt-1" />
              <span>
                <span className="text-sm font-bold text-gray-900">Arranca con su primera reserva</span>
                <span className="block text-xs text-gray-500">Empieza a contar el día que reserve su primera clase.</span>
              </span>
            </label>

            {!espera && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Inicio</label>
                  <input type="date" value={inicio} onChange={e => cambiarInicio(e.target.value)}
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-400" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Fin</label>
                  <input type="date" value={fin} onChange={e => setFin(e.target.value)}
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-400" />
                </div>
              </div>
            )}

            {m.stripe_subscription_id && (
              <p className="text-xs text-indigo-700 bg-indigo-50 rounded-xl p-3">
                Tiene renovación automática: el siguiente cobro de Stripe se moverá a la nueva fecha de fin.
              </p>
            )}

            {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl p-3">{error}</p>}

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button onClick={guardar} disabled={guardando || (!espera && (!inicio || !fin))}
                className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold disabled:opacity-50">
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
'use client'
import { useState } from 'react'
import { X, Snowflake, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

interface Props {
  isOpen: boolean
  membresia: any
  clienteId: string
  onClose: () => void
  onSuccess: () => void
}

const MOTIVOS = ['Solicitud del cliente', 'Lesión / Incapacidad médica', 'Viaje', 'Otro']

export default function ModalPausarMembresia({ isOpen, membresia, clienteId, onClose, onSuccess }: Props) {
  const [dias, setDias] = useState<number>(10)
  const [motivo, setMotivo] = useState<string>(MOTIVOS[0])
  const [notas, setNotas] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const { staff } = useAuth()

  if (!isOpen || !membresia) return null

  // Normalización limpia de la fecha de vencimiento base a medianoche (00:00:00)
  const fechaFinBaseStr = membresia.fecha_fin ? membresia.fecha_fin.slice(0, 10) : new Date().toISOString().slice(0, 10)
  const [year, month, day] = fechaFinBaseStr.split('-').map(Number)
  
  // Sumar los días de pausa sobre la fecha limpia
  const fechaCalculada = new Date(year, month - 1, day)
  fechaCalculada.setDate(fechaCalculada.getDate() + Number(dias || 0))

  const nuevaFechaFinStr = fechaCalculada.toISOString().split('T')[0]

  const handlePausar = async () => {
    if (dias <= 0) {
      alert('Ingresa un número de días válido.')
      return
    }
    setLoading(true)

    try {
      // 1. Registro de auditoría de la pausa
      await supabase.from('membresia_pausas').insert({
        cliente_id: clienteId,
        membresia_id: membresia.id,
        dias_pausados: dias,
        fecha_inicio_pausa: new Date().toISOString(),
        fecha_fin_original: fechaFinBaseStr,
        nueva_fecha_fin: nuevaFechaFinStr,
        motivo: `${motivo}${notas ? ` - ${notas}` : ''}`,
        evento: 'PAUSA',
        creado_por: staff?.id || null,
      })

      // 2. Actualizar el estado de la membresía en Supabase (Asignación directa de días de esta pausa)
      await supabase
        .from('membresias')
        .update({
          estatus: 'Pausada',
          fecha_inicio_pausa: new Date().toISOString(),
          dias_pausa_programados: dias, // ✅ Muestra exactamente los días autorizados sin acumular pruebas pasadas
          fecha_fin_original: membresia.fecha_fin_original || fechaFinBaseStr,
          fecha_fin: nuevaFechaFinStr,
        })
        .eq('id', membresia.id)

      // 3. Sincronizar la ficha del cliente en Supabase
      await supabase
        .from('clientes')
        .update({
          estatus: 'Activo',
          fecha_vencimiento_membresia: nuevaFechaFinStr,
          fecha_venc_plan: nuevaFechaFinStr,
        })
        .eq('id', clienteId)

      // 4. Notificar al backend según el canal de pago (Stripe, Wellhub, TotalPass)
      try {
        await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/membresias/pausar-canal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            membresia_id: membresia.id,
            cliente_id: clienteId,
            canal: membresia.origen || 'Navy',
            stripe_subscription_id: membresia.stripe_subscription_id,
            dias_pausa: dias,
            nueva_fecha_fin: nuevaFechaFinStr,
          }),
        })
      } catch (e) {
        console.warn('Error notificando la pausa al backend multicanal:', e)
      }

      setLoading(false)
      onSuccess()
      onClose()
    } catch (error: any) {
      alert('Error al pausar la membresía: ' + error.message)
      setLoading(false)
    }
  }

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Snowflake size={18} />
              </div>
              <h2 className="text-base font-black text-gray-900">Pausar Membresía</h2>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition">
              <X size={16} />
            </button>
          </div>

          {/* Form */}
          <div className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Número de días a pausar *</label>
              <input
                type="number"
                min="1"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-400 bg-gray-50 font-bold"
                value={dias}
                onChange={e => setDias(Math.max(1, parseInt(e.target.value) || 0))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Motivo de la pausa</label>
              <select
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-400 bg-gray-50 cursor-pointer"
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
              >
                {MOTIVOS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Notas / Detalles opcionales</label>
              <textarea
                rows={2}
                placeholder="Añade notas o aclaraciones de la pausa..."
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-400 bg-gray-50 resize-none"
                value={notas}
                onChange={e => setNotas(e.target.value)}
              />
            </div>

            {/* Previsualización */}
            <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-blue-900 font-bold">
                <Calendar size={13} /> Previsualización del cambio
              </div>
              <p className="text-xs text-gray-600">
                Vencimiento actual: <span className="font-semibold text-gray-800">{fechaFinBaseStr}</span>
              </p>
              <p className="text-xs text-blue-700 font-bold">
                Nuevo vencimiento recalculado: <span className="underline">{nuevaFechaFinStr}</span> (+{dias} días)
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handlePausar}
              disabled={loading || dias <= 0}
              className="flex-1 py-2.5 bg-gray-900 rounded-xl text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-40 transition"
            >
              {loading ? 'Guardando...' : 'Confirmar Pausa'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
'use client'
import { useState } from 'react'
import { X, PlayCircle, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

interface Props {
  isOpen: boolean
  membresia: any
  clienteId: string
  onClose: () => void
  onSuccess: () => void
}

type TipoReanudacion = 'original' | 'proporcional'

export default function ModalReanudarMembresia({ isOpen, membresia, clienteId, onClose, onSuccess }: Props) {
  const [tipo, setTipo] = useState<TipoReanudacion>('original')
  const [loading, setLoading] = useState(false)
  const { staff } = useAuth()

  if (!isOpen || !membresia) return null

  // 1. OBTENER FECHAS
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)

  // Fecha fin original (sin extensiones)
  const fechaFinOriginalStr = membresia.fecha_fin_original 
    ? membresia.fecha_fin_original.slice(0, 10) 
    : (membresia.fecha_fin ? membresia.fecha_fin.slice(0, 10) : hoy.toISOString().slice(0, 10))

  // Fecha en que arrancó la pausa
  const fechaInicioPausaStr = membresia.fecha_inicio_pausa 
    ? membresia.fecha_inicio_pausa.slice(0, 10) 
    : hoy.toISOString().slice(0, 10)

  // 2. CÁLCULO DE DÍAS TRANSCURRIDOS REALES
  const [yP, mP, dP] = fechaInicioPausaStr.split('-').map(Number)
  const fechaInicioPausa = new Date(yP, mP - 1, dP)
  fechaInicioPausa.setHours(0, 0, 0, 0)

  const diffTime = Math.max(0, hoy.getTime() - fechaInicioPausa.getTime())
  const diasTranscurridosPausa = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  // 3. CÁLCULO DE NUEVA FECHA DE VENCIMIENTO SEGÚN LA OPCIÓN
  const [yO, mO, dO] = fechaFinOriginalStr.split('-').map(Number)
  
  // Opción 1: Vigencia Original (restaura la fecha sin sumar nada)
  const fechaOriginalObj = new Date(yO, mO - 1, dO)
  const fechaOriginalCalculadaStr = fechaOriginalObj.toISOString().split('T')[0]

  // Opción 2: Proporcional (Fecha Original + Días Reales que estuvo pausado)
  const fechaProporcionalObj = new Date(yO, mO - 1, dO)
  fechaProporcionalObj.setDate(fechaProporcionalObj.getDate() + diasTranscurridosPausa)
  const fechaProporcionalCalculadaStr = fechaProporcionalObj.toISOString().split('T')[0]

  // Fecha final que se guardará según la elección activa
  const fechaFinFinalStr = tipo === 'original' ? fechaOriginalCalculadaStr : fechaProporcionalCalculadaStr

  const handleReanudar = async () => {
    setLoading(true)
    try {
      const fechaActualIso = new Date().toISOString()

      // 1. Auditoría de la reanudación
      await supabase.from('membresia_pausas').insert({
        cliente_id: clienteId,
        membresia_id: membresia.id,
        dias_pausados: tipo === 'proporcional' ? diasTranscurridosPausa : 0,
        fecha_inicio_pausa: fechaInicioPausaStr,
        fecha_fin_original: fechaFinOriginalStr,
        nueva_fecha_fin: fechaFinFinalStr,
        motivo: `Reanudación (${tipo === 'original' ? 'Restaurar vigencia original' : `Ajuste proporcional de ${diasTranscurridosPausa} días`})`,
        evento: 'REANUDAR',
        creado_por: staff?.id || null,
      })

      // 2. Reactivar Membresía en Supabase
      await supabase
        .from('membresias')
        .update({
          estatus: 'Activa',
          fecha_inicio_pausa: null,
          dias_pausa_programados: 0,
          fecha_fin: fechaFinFinalStr,
        })
        .eq('id', membresia.id)

      // 3. Reactivar Ficha del Cliente en Supabase
      await supabase
        .from('clientes')
        .update({
          estatus: 'Activo',
          fecha_vencimiento_membresia: fechaFinFinalStr,
          fecha_venc_plan: fechaFinFinalStr,
        })
        .eq('id', clienteId)

      // 4. Notificar Backend (Stripe / Canales)
      try {
        await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/membresias/reanudar-canal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            membresia_id: membresia.id,
            cliente_id: clienteId,
            canal: membresia.origen || 'Navy',
            stripe_subscription_id: membresia.stripe_subscription_id,
            tipo_reanudacion: tipo,
            dias_reales_pausa: diasTranscurridosPausa,
            nueva_fecha_fin: fechaFinFinalStr,
          }),
        })
      } catch (e) {
        console.warn('Error notificando reanudación al backend:', e)
      }

      setLoading(false)
      onSuccess()
      onClose()
    } catch (error: any) {
      alert('Error al reanudar la membresía: ' + error.message)
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
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <PlayCircle size={18} />
              </div>
              <h2 className="text-base font-black text-gray-900">Reanudar Membresía</h2>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition">
              <X size={16} />
            </button>
          </div>

          {/* Form / Opción Selección */}
          <div className="p-6 space-y-4">
            <p className="text-xs text-gray-500 font-medium">
              Selecciona cómo deseas ajustar el vencimiento al reactivar al cliente:
            </p>

            <div className="space-y-3">
              {/* OPCIÓN 1: Restaurar vigencia original */}
              <label
                onClick={() => setTipo('original')}
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                  tipo === 'original'
                    ? 'border-gray-900 bg-gray-50/80 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="tipo_reanudacion"
                  checked={tipo === 'original'}
                  onChange={() => setTipo('original')}
                  className="mt-1 text-gray-900 focus:ring-gray-900 cursor-pointer"
                />
                <div>
                  <p className="text-xs font-bold text-gray-900">Restaurar vigencia original</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Establece el vencimiento exacto del paquete (<span className="font-semibold text-gray-700">{fechaOriginalCalculadaStr}</span>).
                  </p>
                </div>
              </label>

              {/* OPCIÓN 2: Ajuste proporcional por pausa */}
              <label
                onClick={() => setTipo('proporcional')}
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                  tipo === 'proporcional'
                    ? 'border-gray-900 bg-gray-50/80 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="tipo_reanudacion"
                  checked={tipo === 'proporcional'}
                  onChange={() => setTipo('proporcional')}
                  className="mt-1 text-gray-900 focus:ring-gray-900 cursor-pointer"
                />
                <div>
                  <p className="text-xs font-bold text-gray-900">Ajuste proporcional por pausa</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Suma únicamente los <span className="font-bold text-indigo-600">{diasTranscurridosPausa} días</span> transcurridos en pausa. Nueva fecha: <span className="font-bold text-indigo-600">{fechaProporcionalCalculadaStr}</span>.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleReanudar}
              disabled={loading}
              className="flex-1 py-2.5 bg-gray-900 rounded-xl text-xs font-bold text-white hover:bg-gray-800 disabled:opacity-40 transition"
            >
              {loading ? 'Reanudando...' : 'Reanudar Plan'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
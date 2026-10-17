'use client'
import { useState } from 'react'
import { X, Play } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

interface Props {
  isOpen: boolean
  membresia: any
  clienteId: string
  onClose: () => void
  onSuccess: () => void
}

export default function ModalReanudarMembresia({ isOpen, membresia, clienteId, onClose, onSuccess }: Props) {
  const [opcion, setOpcion] = useState<'revertir' | 'proporcional'>('revertir')
  const [loading, setLoading] = useState(false)
  const { staff } = useAuth()

  if (!isOpen || !membresia) return null

  // 1. Fecha de inicio real y vigencia limpia
  const fechaInicioStr = membresia.fecha_inicio ? membresia.fecha_inicio.slice(0, 10) : new Date().toISOString().slice(0, 10)
  const vigenciaDias = membresia.paquetes?.vigencia_dias || 90

  // 2. Fecha fin original sin vicios
  const [yInit, mInit, dInit] = fechaInicioStr.split('-').map(Number)
  const fechaFinCalculadaOriginal = new Date(yInit, mInit - 1, dInit)
  fechaFinCalculadaOriginal.setDate(fechaFinCalculadaOriginal.getDate() + vigenciaDias)
  const fechaFinLimpiaStr = fechaFinCalculadaOriginal.toISOString().split('T')[0]

  // 3. Días reales transcurridos en pausa
  const fechaInicioPausa = membresia.fecha_inicio_pausa ? new Date(membresia.fecha_inicio_pausa) : new Date()
  const hoy = new Date()
  const diffTiempo = Math.max(0, hoy.getTime() - fechaInicioPausa.getTime())
  const diasTranscurridosPausa = Math.ceil(diffTiempo / (1000 * 3600 * 24))

  // 4. Nueva fecha según la opción elegida
  const fechaProporcional = new Date(fechaFinCalculadaOriginal)
  fechaProporcional.setDate(fechaProporcional.getDate() + diasTranscurridosPausa)
  const fechaProporcionalStr = fechaProporcional.toISOString().split('T')[0]

  const nuevaFechaFinFinal = opcion === 'revertir' ? fechaFinLimpiaStr : fechaProporcionalStr

  const handleReanudar = async () => {
    setLoading(true)

    try {
      // 1. Auditoría
      await supabase.from('membresia_pausas').insert({
        cliente_id: clienteId,
        membresia_id: membresia.id,
        dias_pausados: diasTranscurridosPausa,
        fecha_inicio_pausa: membresia.fecha_inicio_pausa,
        fecha_fin_original: fechaFinLimpiaStr,
        nueva_fecha_fin: nuevaFechaFinFinal,
        motivo: opcion === 'revertir' 
          ? 'Reanudación por error de staff (Restaurar a vigencia original)' 
          : `Reanudación con ajuste proporcional (+${diasTranscurridosPausa} días de pausa)`,
        evento: 'REANUDACION',
        creado_por: staff?.id || null,
      })

      // 2. Actualizar la membresía a 'Activa' y resetear los campos de pausa
      await supabase
        .from('membresias')
        .update({
          estatus: 'Activa',
          fecha_fin_pausa: new Date().toISOString(),
          fecha_inicio_pausa: null, // ✅ Se limpia la fecha de inicio de pausa
          dias_pausa_programados: 0, // ✅ Resetea el contador para que no arrastre acumulados a futuras pausas
          fecha_fin_original: fechaFinLimpiaStr,
          fecha_fin: nuevaFechaFinFinal,
        })
        .eq('id', membresia.id)

      // 3. Actualizar la tabla clientes
      await supabase
        .from('clientes')
        .update({
          estatus: 'Activo',
          fecha_vencimiento_membresia: nuevaFechaFinFinal,
          fecha_venc_plan: nuevaFechaFinFinal,
        })
        .eq('id', clienteId)

      // 4. Notificar al backend multicanal para reanudar cobro/acceso
      try {
        await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/membresias/reanudar-canal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            membresia_id: membresia.id,
            cliente_id: clienteId,
            canal: membresia.origen || 'Navy',
            stripe_subscription_id: membresia.stripe_subscription_id,
            nueva_fecha_fin: nuevaFechaFinFinal,
            opcion,
          }),
        })
      } catch (e) {
        console.warn('Error notificando la reanudación al backend:', e)
      }

      setLoading(false)
      onSuccess()
      onClose()
    } catch (error: any) {
      alert('Error al reanudar membresía: ' + error.message)
      setLoading(false)
    }
  }

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <Play size={18} />
              </div>
              <h2 className="text-base font-black text-gray-900">Reanudar Membresía</h2>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition">
              <X size={16} />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <p className="text-xs text-gray-500">
              Selecciona cómo deseas ajustar el vencimiento al reactivar al cliente:
            </p>

            <div className="space-y-3">
              <label 
                onClick={() => setOpcion('revertir')}
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                  opcion === 'revertir' ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input type="radio" name="opcion_reanudar" checked={opcion === 'revertir'} onChange={() => {}} className="mt-1" />
                <div>
                  <p className="text-xs font-bold text-gray-900">Restaurar vigencia original ({vigenciaDias} días)</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Establece el vencimiento exacto del paquete (<span className="font-semibold text-gray-800">{fechaFinLimpiaStr}</span>).
                  </p>
                </div>
              </label>

              <label 
                onClick={() => setOpcion('proporcional')}
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                  opcion === 'proporcional' ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input type="radio" name="opcion_reanudar" checked={opcion === 'proporcional'} onChange={() => {}} className="mt-1" />
                <div>
                  <p className="text-xs font-bold text-gray-900">Ajuste proporcional por pausa</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Suma únicamente los <span className="font-semibold text-gray-800">{diasTranscurridosPausa} días</span> transcurridos en pausa. Nueva fecha: <span className="font-semibold text-indigo-600">{fechaProporcionalStr}</span>.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50">
              Cancelar
            </button>
            <button onClick={handleReanudar} disabled={loading} className="flex-1 py-2.5 bg-gray-900 rounded-xl text-sm font-bold text-white hover:bg-gray-800 disabled:opacity-40">
              {loading ? 'Procesando...' : 'Reanudar Plan'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
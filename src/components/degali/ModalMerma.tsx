'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X } from 'lucide-react'
import { logActividad } from '@/lib/log-actividad'
import { useAuth } from '@/context/AuthContext'

interface Props {
  insumo:     any
  sucursalId: string | null
  onClose:    () => void
  onSuccess:  () => void
}

const MOTIVO_CORTESIA = 'Cortesía autorizada'
const MOTIVOS = ['Caducidad', 'Error de preparación', 'Daño', 'Derrame', MOTIVO_CORTESIA, 'Otro']

export default function ModalMerma({ insumo, sucursalId, onClose, onSuccess }: Props) {
  const [cantidad,  setCantidad]  = useState('')
  const [motivo,    setMotivo]    = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error,     setError]     = useState('')
  const [autoriza,  setAutoriza]  = useState('')                 // staff que autorizó la cortesía
  const [detalle,   setDetalle]   = useState('')                 // para quién / por qué
  const [gerencia,  setGerencia]  = useState<any[]>([])          // gerentes y dirección que pueden autorizar
  const { staff } = useAuth()
  const esCortesia = motivo === MOTIVO_CORTESIA

  // Una cortesía la autoriza Gerencia: se listan los gerentes de la sucursal y Dirección
  useEffect(() => {
    if (!esCortesia || gerencia.length) return
    supabase.from('staff')
      .select('id, nombre, primer_apellido, rol, sucursal_asignada_id, staff_sucursales(sucursal_id)')
      .in('rol', ['gerente', 'direccion']).eq('estatus', 'Activo')
      .then(({ data }) => {
        const lista = (data || []).filter((g: any) =>
          g.rol === 'direccion' || g.sucursal_asignada_id === sucursalId ||
          (g.staff_sucursales || []).some((x: any) => x.sucursal_id === sucursalId))
        setGerencia(lista)
        // Si quien registra es gerente o dirección, él mismo la autoriza
        if (staff && (staff.rol === 'gerente' || staff.rol === 'direccion')) setAutoriza(staff.id)
      })
  }, [esCortesia])

  const handleGuardar = async () => {
    if (!cantidad || !motivo) return
    if (esCortesia && (!autoriza || !detalle.trim())) { setError('Una cortesía necesita quién la autoriza y para quién fue.'); return }
    setGuardando(true); setError('')

    const { error: errMerma } = await supabase.from('merma').insert({
      sucursal_id: sucursalId,
      insumo_id:   insumo.insumos?.id,
      cantidad:    parseFloat(cantidad),
      motivo,
      fecha:       new Date().toISOString().split('T')[0],
      // Solo en cortesías (así el resto de mermas funciona igual aunque falte actualizar la base)
      ...(esCortesia ? { autorizado_por: autoriza, detalle: detalle.trim(), registrado_por: staff?.id } : {}),
    })
    if (errMerma) {
      setError(esCortesia && /autorizado_por|detalle|registrado_por/.test(errMerma.message)
        ? 'Falta actualizar la base de datos para registrar cortesías. Avisa a sistemas.'
        : 'No se pudo registrar la merma: ' + errMerma.message)
      setGuardando(false)
      return
    }

    await supabase
      .from('inventario_insumos')
      .update({
        stock_actual: Math.max(0, insumo.stock_actual - parseFloat(cantidad)),
        updated_at:   new Date().toISOString(),
      })
      .eq('id', insumo.id)

    await logActividad({
      tipo:        'merma_registrada',
      descripcion: `${staff?.nombre} ${staff?.primer_apellido} registró merma de "${insumo.insumos?.nombre}" — ${cantidad} ${insumo.insumos?.unidad || 'unidades'}`,
      tabla:       'merma',
      accion:      'INSERT',
      metadata:    { 
        insumo_id: insumo.insumos?.id,
        nombre:    insumo.insumos?.nombre,
        cantidad:  parseFloat(cantidad),
        motivo,
        ...(esCortesia ? { autorizado_por: autoriza, detalle: detalle.trim() } : {}),
      },
      sucursal_id: sucursalId,
      staff_id:    staff?.id,
    })
    setGuardando(false)
    onSuccess()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm z-10 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h3 className="text-base font-black text-gray-900">Registrar merma</h3>
            <p className="text-xs text-gray-400 mt-0.5">{insumo.insumos?.nombre}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="bg-amber-50 rounded-xl px-4 py-3 flex justify-between text-sm">
            <span className="text-amber-700">Stock actual</span>
            <span className="font-black text-amber-900">{insumo.stock_actual} {insumo.insumos?.unidad}</span>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              Cantidad a restar ({insumo.insumos?.unidad})
            </label>
            <input
              type="number" min="0" max={insumo.stock_actual} placeholder="0"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-400"
              value={cantidad}
              onChange={e => setCantidad(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Motivo</label>
            <div className="flex gap-2 flex-wrap">
              {MOTIVOS.map(m => (
                <button key={m} onClick={() => setMotivo(m)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                    motivo === m ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:border-gray-400'
                  }`}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          {esCortesia && (
            <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
              <p className="text-xs font-bold text-amber-700">Una cortesía debe estar autorizada por Gerencia</p>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Autorizada por</label>
                <select value={autoriza} onChange={e => setAutoriza(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-400 bg-white">
                  <option value="">Elige quién la autorizó…</option>
                  {gerencia.map(g => (
                    <option key={g.id} value={g.id}>{g.nombre} {g.primer_apellido} · {g.rol === 'direccion' ? 'Dirección' : 'Gerente'}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Para quién o por qué</label>
                <input value={detalle} onChange={e => setDetalle(e.target.value)} placeholder="Ej. Cliente con queja, invitado del coach…"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-400 bg-white" />
              </div>
            </div>
          )}

          {error && <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-gray-100">
          <button
            onClick={handleGuardar}
            disabled={!cantidad || !motivo || guardando}
            className="w-full py-3 rounded-xl text-sm font-black text-white disabled:opacity-40 transition bg-amber-500 hover:bg-amber-600">
            {guardando ? 'Guardando...' : 'Registrar merma'}
          </button>
        </div>
      </div>
    </div>
  )
}
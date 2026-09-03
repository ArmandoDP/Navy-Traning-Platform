'use client'
import { Calendar, RefreshCw, Pause, RotateCcw, Gift, Clock, XCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase }        from '@/lib/supabase'
import { useAuth }         from '@/context/AuthContext'
import ToastExito          from '@/components/ToastExito'
import ModalPagoSucursal   from '@/components/clientes/ModalPagoSucursal'

interface Props { cliente: any; reservas: any[]; onRefresh?: () => void }

export default function TabMembresia({ cliente, reservas, onRefresh }: Props) {
  const { staff } = useAuth()
  const esDireccion = staff?.rol === 'direccion'

  const [toast,           setToast]           = useState<string | null>(null)
  const [modalPago,       setModalPago]        = useState(false)
  const [modalPaquete,    setModalPaquete]     = useState(false)
  const [paquetes,        setPaquetes]         = useState<any[]>([])
  const [paqueteSel,      setPaqueteSel]       = useState('')
  const [asignando,       setAsignando]        = useState(false)
  const [loadingPaq,      setLoadingPaq]       = useState(false)
  const [cancelarRenov,   setCancelarRenov]    = useState(false)
  const [membresiaActiva, setMembresiaActiva]  = useState<any>(null)
  const [membresiaEnCola, setMembresiaEnCola]  = useState<any>(null)
  const [loadingMemb,     setLoadingMemb]      = useState(true)

  const fechaVenc    = cliente.fecha_vencimiento_memb || cliente.fecha_venc_plan
  const diasVenc     = fechaVenc ? Math.ceil((new Date(fechaVenc).getTime() - Date.now()) / (1000*3600*24)) : null
  const clasesUsadas = reservas.filter(r => r.estatus === 'Confirmada').length
  const clasesTotal  = cliente.paquetes?.numero_clases || null

  useEffect(() => {
    fetchMembresias()
  }, [cliente.id])

  const fetchMembresias = async () => {
    setLoadingMemb(true)
    const { data } = await supabase
      .from('membresias')
      .select('*, paquetes(nombre, vigencia_dias, es_recurrente), renovacion_cancelada')
      .eq('cliente_id', cliente.id)
      .in('estatus', ['Activa'])
      .order('fecha_inicio', { ascending: true })

    if (data && data.length > 0) {
      const hoy = new Date().toISOString().split('T')[0]
      const activa  = data.find(m => m.fecha_inicio <= hoy)
      const enCola  = data.find(m => m.fecha_inicio > hoy)
      setMembresiaActiva(activa || null)
      setMembresiaEnCola(enCola || null)
    }
    setLoadingMemb(false)
  }

  const abrirModalPaquete = async () => {
    setLoadingPaq(true)
    setModalPaquete(true)
    const { data } = await supabase.from('paquetes')
      .select('id, nombre, vigencia_dias, paquete_precios!inner(sucursal_id, activo)')
      .eq('estatus', 'Activo')
      .eq('visible_en_app', true)
      .eq('paquete_precios.sucursal_id', cliente.sucursal_id)
      .eq('paquete_precios.activo', true)
      .order('nombre')
    setPaquetes(data || [])
    setLoadingPaq(false)
  }

  const handleCancelarRenovacion = async () => {
    if (!membresiaActiva) return
    await supabase.from('membresias')
      .update({ renovacion_cancelada: true })
      .eq('id', membresiaActiva.id)
    fetchMembresias()
    setToast('Renovación automática cancelada')
  }

  const handleReactivarRenovacion = async () => {
    if (!membresiaActiva) return
    await supabase.from('membresias')
      .update({ renovacion_cancelada: false })
      .eq('id', membresiaActiva.id)
    fetchMembresias()
    setToast('Renovación automática reactivada')
  }

  const handleAsignarPaquete = async () => {
    if (!paqueteSel) return
    setAsignando(true)

    const paquete = paquetes.find(p => p.id === paqueteSel)
    if (!paquete) { setAsignando(false); return }

    let fechaInicio = new Date()
    if (fechaVenc && new Date(fechaVenc) > fechaInicio) {
      fechaInicio = new Date(fechaVenc)
    }
    const fechaFin = new Date(fechaInicio)
    fechaFin.setDate(fechaFin.getDate() + paquete.vigencia_dias)

    await supabase.from('membresias').insert({
      cliente_id:    cliente.id,
      paquete_id:    paqueteSel,
      fecha_inicio:  fechaInicio.toISOString().split('T')[0],
      fecha_fin:     fechaFin.toISOString().split('T')[0],
      estatus:       'Activa',
      precio_pagado: 0,
      origen:        'Cortesia',
    })

    await supabase.from('clientes').update({
      plan:            paquete.nombre,
      paquete_id:      paqueteSel,
      fecha_venc_plan: fechaFin.toISOString().split('T')[0],
    }).eq('id', cliente.id)

    await supabase.from('pagos').insert({
      cliente_id:  cliente.id,
      monto:       0,
      estatus:     'Completado',
      metodo_pago: 'Cortesía',
      canal:       'Navy',
      concepto:    `Cortesía — ${paquete.nombre}`,
      fecha_pago:  new Date().toISOString().split('T')[0],
      sucursal_id: cliente.sucursal_id,
    })

    // Cancelar renovación automática si se pidió
    if (cancelarRenov && membresiaActiva) {
      await supabase.from('membresias')
        .update({ renovacion_cancelada: true })
        .eq('id', membresiaActiva.id)
    }

    // Enviar correo
    const fechaInicioDisplay = fechaInicio.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
    const fechaFinDisplay    = fechaFin.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
    const tieneMembresia     = fechaVenc && new Date(fechaVenc) > new Date()

    await fetch('/api/correo/paquete-cortesia', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email:           cliente.email,
        nombre:          cliente.nombre_completo,
        paquete_nombre:  paquete.nombre,
        vigencia_dias:   paquete.vigencia_dias,
        fecha_inicio:    fechaInicioDisplay,
        fecha_fin:       fechaFinDisplay,
        tiene_membresia: tieneMembresia,
      }),
    })

    setModalPaquete(false)
    setPaqueteSel('')
    setCancelarRenov(false)
    setAsignando(false)
    fetchMembresias()
    onRefresh?.()
    setToast('Paquete asignado y correo enviado ✓')
  }

  return (
    <div className="space-y-5">
      {toast && <ToastExito titulo="✓ Listo" mensaje={toast} onClose={() => setToast(null)} duracion={3000} />}

      <ModalPagoSucursal
        isOpen={modalPago}
        cliente={cliente}
        onClose={() => setModalPago(false)}
        onSuccess={() => setModalPago(false)}
      />

      {/* Modal asignar paquete */}
      {modalPaquete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setModalPaquete(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4">
            <div>
              <h3 className="text-lg font-black text-gray-900 mb-1">Asignar paquete gratis</h3>
              <p className="text-xs text-gray-400">
                {fechaVenc && new Date(fechaVenc) > new Date()
                  ? `Se activará al terminar el plan actual (${new Date(fechaVenc).toLocaleDateString('es-MX')})`
                  : 'Se activará inmediatamente'}
              </p>
            </div>

            {loadingPaq ? (
              <div className="py-8 text-center text-gray-400 text-sm">Cargando paquetes...</div>
            ) : (
              <select
                value={paqueteSel}
                onChange={e => setPaqueteSel(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-400 bg-gray-50">
                <option value="">Seleccionar paquete</option>
                {paquetes.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre} — {p.vigencia_dias} días</option>
                ))}
              </select>
            )}

            {/* Toggle cancelar renovación */}
            {membresiaActiva?.paquetes?.es_recurrente && !membresiaActiva?.renovacion_cancelada && (
              <label className="flex items-center gap-3 cursor-pointer bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
                <input type="checkbox" checked={cancelarRenov}
                  onChange={e => setCancelarRenov(e.target.checked)}
                  className="w-4 h-4 rounded" />
                <div>
                  <p className="text-xs font-bold text-orange-700">Cancelar renovación automática</p>
                  <p className="text-[11px] text-orange-500">No se cobrará al terminar el plan actual</p>
                </div>
              </label>
            )}

            <div className="flex gap-2">
              <button onClick={() => { setModalPaquete(false); setCancelarRenov(false) }}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button onClick={handleAsignarPaquete} disabled={!paqueteSel || asignando}
                className="flex-1 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-700 transition disabled:opacity-40">
                {asignando ? 'Asignando...' : 'Asignar gratis'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plan actual */}
      <div className="border border-gray-100 rounded-2xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-gray-400 font-medium mb-1">Plan actual</p>
            <p className="text-lg font-black text-gray-900">{cliente.plan || '—'}</p>
          </div>
          <p className="text-xl font-black text-gray-900">
            ${cliente.valor_cliente ? Number(cliente.valor_cliente).toLocaleString() : '—'}
          </p>
        </div>

        {clasesTotal && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
              <span>Clases usadas</span>
              <span className="font-bold text-gray-800">{clasesUsadas}/{clasesTotal}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-gray-900 h-2 rounded-full transition-all"
                style={{ width: `${Math.min((clasesUsadas/clasesTotal)*100, 100)}%` }} />
            </div>
          </div>
        )}

        {fechaVenc && (
          <div className="flex items-center gap-2 text-sm mb-4">
            <Calendar size={14} className="text-gray-400"/>
            <span className="font-bold text-gray-700">
              Vence el {new Date(fechaVenc).toLocaleDateString('es-MX', { year:'numeric', month:'2-digit', day:'2-digit' }).replace(/\//g,'-')}
            </span>
            {diasVenc !== null && (
              <span className={`text-xs font-medium ${diasVenc <= 7 ? 'text-orange-500' : 'text-gray-400'}`}>
                · En {diasVenc} días
              </span>
            )}
          </div>
        )}

        {/* Estado renovación automática */}
        {esDireccion && membresiaActiva?.paquetes?.es_recurrente && (
          <div className={`flex items-center justify-between px-3 py-2.5 rounded-xl mb-4 ${
            membresiaActiva.renovacion_cancelada
              ? 'bg-red-50 border border-red-100'
              : 'bg-emerald-50 border border-emerald-100'
          }`}>
            <div>
              <p className={`text-xs font-bold ${membresiaActiva.renovacion_cancelada ? 'text-red-600' : 'text-emerald-700'}`}>
                Renovación automática {membresiaActiva.renovacion_cancelada ? 'cancelada' : 'activa'}
              </p>
              <p className="text-[11px] text-gray-400">
                {membresiaActiva.renovacion_cancelada
                  ? 'No se cobrará al terminar el período'
                  : 'Se cobrará automáticamente al vencer'}
              </p>
            </div>
            {membresiaActiva.renovacion_cancelada ? (
              <button onClick={handleReactivarRenovacion}
                className="text-xs font-bold px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition">
                Reactivar
              </button>
            ) : (
              <button onClick={handleCancelarRenovacion}
                className="text-xs font-bold px-2.5 py-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition">
                Cancelar
              </button>
            )}
          </div>
        )}

        {/* Botones acción */}
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setModalPago(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white transition"
            style={{ backgroundColor: '#171B24' }}>
            <RefreshCw size={12}/> Renovar / cambiar plan
          </button>

          {esDireccion && (
            <button onClick={abrirModalPaquete}
              className="flex items-center gap-1.5 px-3 py-2 border border-emerald-200 bg-emerald-50 rounded-xl text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition">
              <Gift size={12}/> Asignar paquete gratis
            </button>
          )}

          <button onClick={() => setToast('Pausar membresía estará disponible próximamente.')}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition">
            <Pause size={12}/> Pausar membresía
          </button>
          <button onClick={() => setToast('Reembolsos estarán disponibles con la integración de Stripe.')}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition">
            <RotateCcw size={12}/> Reembolsar
          </button>
        </div>
      </div>

      {/* Paquete en cola */}
      {membresiaEnCola && (
        <div className="border border-dashed border-indigo-200 bg-indigo-50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} className="text-indigo-500" />
            <p className="text-xs font-black text-indigo-600 uppercase tracking-wide">Próximo paquete en cola</p>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Paquete</span>
              <span className="text-xs font-bold text-gray-900">{membresiaEnCola.paquetes?.nombre}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Inicia el</span>
              <span className="text-xs font-bold text-gray-900">
                {new Date(membresiaEnCola.fecha_inicio).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Termina el</span>
              <span className="text-xs font-bold text-gray-900">
                {new Date(membresiaEnCola.fecha_fin).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-gray-500">Costo</span>
              <span className="text-xs font-bold text-emerald-600">
                {membresiaEnCola.precio_pagado === 0 ? '🎁 Cortesía' : `$${membresiaEnCola.precio_pagado.toLocaleString()}`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Políticas */}
      <div className="border border-gray-100 rounded-2xl p-4">
        <p className="text-xs font-bold text-gray-500 mb-4">Políticas aplicadas</p>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Cancelación gratuita', val: '4hrs antes'      },
            { label: 'Cargo No-Show',        val: '$35,000'         },
            { label: 'Bloqueo de cuenta',    val: 'Tras 3 No-Shows' },
            { label: 'Renovación Auto',      val: membresiaActiva?.renovacion_cancelada ? 'Cancelada' : 'Activa' },
          ].map(p => (
            <div key={p.label}>
              <p className="text-xs text-gray-400">{p.label}</p>
              <p className="text-sm font-bold text-gray-800 mt-0.5">{p.val}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
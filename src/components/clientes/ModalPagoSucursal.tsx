'use client'
import { useState, useEffect } from 'react'
import { X, RefreshCw, CheckCircle2, CreditCard, Banknote, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Props {
  isOpen:    boolean
  cliente:   any
  onClose:   () => void
  onSuccess: () => void
}

const METODOS = [
  { key: 'Efectivo', icon: Banknote,    label: 'Efectivo' },
  { key: 'Terminal', icon: CreditCard,  label: 'Terminal' },
]

function calcularFechaFin(fechaInicio: string, diasVigencia: number): string {
  const d = new Date(fechaInicio)
  d.setDate(d.getDate() + diasVigencia)
  return d.toISOString().split('T')[0]
}

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function ModalPagoSucursal({ isOpen, cliente, onClose, onSuccess }: Props) {
  const [paso,               setPaso]               = useState<'form' | 'resumen' | 'exito'>('form')
  const [paquetes,           setPaquetes]           = useState<any[]>([])
  const [paqueteId,          setPaqueteId]          = useState('')
  const [metodo,             setMetodo]             = useState('Efectivo')
  const [monto,              setMonto]              = useState('')
  const [referencia,         setReferencia]         = useState('')
  const [notas,              setNotas]              = useState('')
  const [loading,            setLoading]            = useState(false)
  const [loadingPaquetes,    setLoadingPaquetes]    = useState(false)
  const [error,              setError]              = useState('')
  const [membresiaActiva,    setMembresiaActiva]    = useState<any>(null)

  const paqueteSel = paquetes.find(p => p.id === paqueteId)

  // Fechas de la nueva membresía
  const hoy          = new Date().toISOString().split('T')[0]
  const fechaVenc    = cliente.fecha_venc_plan || cliente.fecha_vencimiento_memb
  const tieneMemb    = fechaVenc && new Date(fechaVenc) > new Date()
  const fechaInicio  = tieneMemb ? fechaVenc : hoy
  const fechaFin     = paqueteSel?.vigencia_dias ? calcularFechaFin(fechaInicio, paqueteSel.vigencia_dias) : ''

  useEffect(() => {
    if (!isOpen) return
    setPaso('form')
    setPaqueteId('')
    setMonto('')
    setReferencia('')
    setNotas('')
    setError('')
    setMetodo('Efectivo')

    const fetchData = async () => {
      setLoadingPaquetes(true)

      // Membresía activa
      const { data: memb } = await supabase
        .from('membresias')
        .select('*, paquetes(nombre)')
        .eq('cliente_id', cliente.id)
        .eq('estatus', 'Activa')
        .order('fecha_fin', { ascending: false })
        .limit(1)
        .single()
      setMembresiaActiva(memb || null)

      // Paquetes disponibles para la sucursal
      const sucursalId = cliente.sucursal_id
      let q = supabase
        .from('paquetes')
        .select('id, nombre, descripcion, vigencia_dias, clases_incluidas, acceso_total, acceso_sucursal_hermana, penalizacion_noshow, monto_penalizacion, es_recurrente, paquete_precios!inner(precio_app, sucursal_id, activo)')
        .eq('estatus', 'Activo')
        .eq('visible_en_app', true)
        .eq('paquete_precios.activo', true)
        .order('nombre')

      if (sucursalId) q = q.eq('paquete_precios.sucursal_id', sucursalId)

      const { data } = await q
      setPaquetes(data || [])
      setLoadingPaquetes(false)
    }
    fetchData()
  }, [isOpen, cliente.id])

  // Auto-llenar monto con precio del paquete
  const handleSelectPaquete = (id: string) => {
    setPaqueteId(id)
    const p = paquetes.find(x => x.id === id)
    const precio = p?.paquete_precios?.[0]?.precio_app || p?.paquete_precios?.precio_app || ''
    setMonto(precio?.toString() || '')
  }

  const handleGuardar = async () => {
    setLoading(true)
    setError('')

    try {
      // 1. Registrar pago
      const { error: errPago } = await supabase.from('pagos').insert({
        cliente_id:  cliente.id,
        monto:       Number(monto),
        metodo_pago: metodo,
        fecha_pago:  new Date().toISOString(),
        estatus:     'Completado',
        concepto:    `Pago en sucursal · ${paqueteSel?.nombre}`,
        canal:       'Navy',
        sucursal_id: cliente.sucursal_id || null,
        metadata:    referencia ? { referencia, notas } : notas ? { notas } : null,
      })
      if (errPago) throw new Error('Error al registrar el pago')

      // 2. Si tiene membresía activa y el nuevo plan empieza hoy → desactivar anterior
      if (!tieneMemb && membresiaActiva) {
        await supabase.from('membresias')
          .update({ estatus: 'Inactiva' })
          .eq('id', membresiaActiva.id)
      }

      // 3. Crear nueva membresía (activa si empieza hoy, en cola si empieza después)
      const { error: errMemb } = await supabase.from('membresias').insert({
        cliente_id:    cliente.id,
        paquete_id:    paqueteId,
        fecha_inicio:  fechaInicio,
        fecha_fin:     fechaFin,
        estatus:       'Activa',
        precio_pagado: Number(monto),
        origen:        'Sucursal',
        notas:         notas || null,
      })
      if (errMemb) throw new Error('Error al crear membresía')

      // 4. Actualizar cliente
      await supabase.from('clientes').update({
        plan:                   paqueteSel?.nombre,
        paquete_id:             paqueteId,
        fecha_venc_plan:        fechaFin,
        fecha_vencimiento_memb: fechaFin,
      }).eq('id', cliente.id)

      await fetch('/api/correo/bienvenida-cliente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:  cliente.email,
          nombre: cliente.nombre_completo,
        }),
      })

      // 5. Enviar correo comprobante
      await fetch('/api/correo/pago-sucursal', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:          cliente.email,
          nombre:         cliente.nombre_completo,
          paquete_nombre: paqueteSel?.nombre,
          vigencia_dias:  paqueteSel?.vigencia_dias,
          fecha_inicio:   fmtFecha(fechaInicio),
          fecha_fin:      fmtFecha(fechaFin),
          monto:          Number(monto),
          metodo_pago:    metodo,
          referencia:     referencia || null,
          tiene_membresia_previa: tieneMemb,
        }),
      })

      setPaso('exito')
      onSuccess()
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <p className="text-sm font-black text-gray-900">
              {paso === 'exito' ? 'Pago registrado' : paso === 'resumen' ? 'Confirmar pago' : 'Renovar / cambiar plan'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{cliente?.nombre_completo}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        {/* ── ÉXITO ── */}
        {paso === 'exito' && (
          <div className="px-6 py-10 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center">
              <CheckCircle2 size={32} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-lg font-black text-gray-900">¡Membresía activada!</p>
              <p className="text-sm text-gray-400 mt-1">
                Se envió el comprobante a <strong>{cliente?.email}</strong>
              </p>
            </div>
            <div className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Plan</span>
                <span className="font-bold text-gray-900">{paqueteSel?.nombre}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Vigencia</span>
                <span className="font-bold text-gray-900">{fmtFecha(fechaInicio)} → {fmtFecha(fechaFin)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Monto</span>
                <span className="font-bold text-emerald-600">${Number(monto).toLocaleString()} MXN</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Método</span>
                <span className="font-bold text-gray-900">{metodo}</span>
              </div>
            </div>
            <button onClick={onClose}
              className="mt-2 px-8 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-700 transition">
              Cerrar
            </button>
          </div>
        )}

        {/* ── RESUMEN ── */}
        {paso === 'resumen' && (
          <div className="overflow-y-auto px-6 py-5 space-y-4">
            {/* Paquete elegido */}
            <div className="bg-gray-900 rounded-2xl p-5 text-white">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Plan seleccionado</p>
              <p className="text-xl font-black">{paqueteSel?.nombre}</p>
              <p className="text-3xl font-black mt-2">${Number(monto).toLocaleString()} <span className="text-sm font-normal text-gray-400">MXN</span></p>
            </div>

            {/* Beneficios */}
            <div className="border border-gray-100 rounded-xl p-4 space-y-2.5">
              <p className="text-xs font-black text-gray-500 uppercase tracking-wide">Beneficios incluidos</p>
              {[
                paqueteSel?.clases_incluidas   ? `${paqueteSel.clases_incluidas} clases incluidas` : 'Acceso ilimitado a clases',
                `Vigencia de ${paqueteSel?.vigencia_dias} días`,
                paqueteSel?.acceso_total             && 'Acceso a todas las salas',
                paqueteSel?.acceso_sucursal_hermana  && 'Acceso a sucursal hermana',
                paqueteSel?.es_recurrente            && 'Renovación automática',
              ].filter(Boolean).map((b, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{b as string}</span>
                </div>
              ))}
              {paqueteSel?.descripcion && (
                <p className="text-xs text-gray-400 pt-1 border-t border-gray-100">{paqueteSel.descripcion}</p>
              )}
            </div>

            {/* Activación */}
            <div className="border border-gray-100 rounded-xl p-4 space-y-2.5">
              <p className="text-xs font-black text-gray-500 uppercase tracking-wide">Activación</p>
              {tieneMemb && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  <span className="text-amber-500 text-xs font-bold">⏳ En cola</span>
                  <span className="text-xs text-amber-700">El plan se activará al vencer el actual</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Inicia</span>
                <span className="font-bold text-gray-900">{fmtFecha(fechaInicio)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Vence</span>
                <span className="font-bold text-gray-900">{fmtFecha(fechaFin)}</span>
              </div>
            </div>

            {/* Pago */}
            <div className="border border-gray-100 rounded-xl p-4 space-y-2.5">
              <p className="text-xs font-black text-gray-500 uppercase tracking-wide">Detalle del pago</p>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Método</span>
                <span className="font-bold text-gray-900">{metodo}</span>
              </div>
              {referencia && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">No. Operación</span>
                  <span className="font-bold text-gray-900 font-mono">{referencia}</span>
                </div>
              )}
              {notas && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Notas</span>
                  <span className="text-gray-700 text-right max-w-[200px]">{notas}</span>
                </div>
              )}
            </div>

            {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

            <div className="flex gap-2 pt-1">
              <button onClick={() => setPaso('form')}
                className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition">
                ← Editar
              </button>
              <button onClick={handleGuardar} disabled={loading}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition disabled:opacity-50"
                style={{ backgroundColor: '#171B24' }}>
                {loading ? <RefreshCw size={14} className="animate-spin mx-auto" /> : 'Confirmar y registrar'}
              </button>
            </div>
          </div>
        )}

        {/* ── FORM ── */}
        {paso === 'form' && (
          <div className="overflow-y-auto px-6 py-5 space-y-4">

            {/* Info membresía actual */}
            {membresiaActiva && (
              <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Plan actual</p>
                  <p className="text-sm font-bold text-gray-900">{membresiaActiva.paquetes?.nombre}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Vence</p>
                  <p className="text-xs font-bold text-gray-700">{fmtFecha(membresiaActiva.fecha_fin)}</p>
                </div>
              </div>
            )}

            {tieneMemb && (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5">
                <span className="text-amber-500 text-xs">⏳</span>
                <p className="text-xs text-amber-700 font-medium">El nuevo plan se activará al terminar el actual el <strong>{fmtFecha(fechaVenc)}</strong></p>
              </div>
            )}

            {/* Paquete */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Paquete</label>
              {loadingPaquetes ? (
                <div className="py-4 text-center text-gray-400 text-xs">Cargando paquetes...</div>
              ) : (
                <select
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 bg-gray-50 outline-none focus:border-gray-400"
                  value={paqueteId}
                  onChange={e => handleSelectPaquete(e.target.value)}>
                  <option value="">Seleccionar paquete</option>
                  {paquetes.map(p => {
                    const precio = Array.isArray(p.paquete_precios) ? p.paquete_precios[0]?.precio_app : p.paquete_precios?.precio_app
                    return (
                      <option key={p.id} value={p.id}>
                        {p.nombre} — {p.vigencia_dias}d {precio ? `· $${Number(precio).toLocaleString()}` : ''}
                      </option>
                    )
                  })}
                </select>
              )}
            </div>

            {/* Preview paquete seleccionado */}
            {paqueteSel && (
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-2">
                <p className="text-xs font-black text-gray-500 uppercase tracking-wide">Beneficios</p>
                {[
                  paqueteSel?.clases_incluidas  ? `${paqueteSel.clases_incluidas} clases` : 'Acceso ilimitado',
                  `${paqueteSel?.vigencia_dias} días de vigencia`,
                  paqueteSel?.acceso_total            && 'Acceso a todas las salas',
                  paqueteSel?.acceso_sucursal_hermana && 'Acceso a sucursal hermana',
                  paqueteSel?.es_recurrente           && 'Renovación automática',
                ].filter(Boolean).map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle2 size={12} className="text-emerald-500 flex-shrink-0" />
                    <span className="text-xs text-gray-600">{b as string}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Método de pago */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Método de pago</label>
              <div className="flex gap-2">
                {METODOS.map(({ key, icon: Icon, label }) => (
                  <button key={key} onClick={() => setMetodo(key)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold border transition ${
                      metodo === key ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}>
                    <Icon size={13} /> {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Monto */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Monto</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input type="number"
                  className="w-full border border-gray-200 rounded-xl pl-7 pr-3 py-2.5 text-sm text-gray-900 bg-gray-50 outline-none focus:border-gray-400"
                  placeholder="0"
                  value={monto}
                  onChange={e => setMonto(e.target.value)} />
              </div>
            </div>

            {/* Número de operación */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">
                No. de operación / ticket
                {metodo === 'Terminal' && <span className="text-red-500 ml-0.5">*</span>}
                {metodo === 'Efectivo' && <span className="text-gray-400 font-normal ml-1">(opcional)</span>}
              </label>
              <input type="text"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 bg-gray-50 outline-none focus:border-gray-400"
                placeholder="Ej. TXN-001234"
                value={referencia}
                onChange={e => setReferencia(e.target.value)} />
            </div>

            {/* Notas */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Notas <span className="text-gray-400 font-normal">(opcional)</span></label>
              <textarea rows={2}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 bg-gray-50 outline-none focus:border-gray-400 resize-none"
                placeholder="Observaciones del pago..."
                value={notas}
                onChange={e => setNotas(e.target.value)} />
            </div>

            {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

            <div className="flex gap-2 pt-1 pb-2">
              <button onClick={onClose}
                className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!paqueteId)            { setError('Selecciona un paquete'); return }
                  if (!monto || Number(monto) <= 0) { setError('Ingresa el monto'); return }
                  if (metodo === 'Terminal' && !referencia) { setError('Ingresa el número de operación'); return }
                  setError('')
                  setPaso('resumen')
                }}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition"
                style={{ backgroundColor: '#171B24' }}>
                Ver resumen <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
'use client'
// src/components/clientes/ModalPagoSucursal.tsx — cobrar un paquete en recepción
// Prioridad: tarjeta guardada → enviar cobro a su app → terminal (respaldo, solo dirección)
import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { X, RefreshCw, CheckCircle2, CreditCard, ChevronRight, Smartphone, Wallet,
         Copy, Lock, AlertTriangle, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { logActividad } from '@/lib/log-actividad'
import { useAuth } from '@/context/AuthContext'

interface Props { isOpen: boolean; cliente: any; onClose: () => void; onSuccess: () => void }

type Metodo = 'tarjeta' | 'app' | 'Terminal'
type Paso   = 'form' | 'resumen' | 'esperando' | 'exito'

// Mientras Navy deja de usar la terminal, solo dirección la ve
const TERMINAL_SOLO_DIRECCION = true
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL

async function api(path: string, method: 'GET' | 'POST' = 'GET', body?: any) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${BACKEND}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || 'No se pudo completar el cobro')
  return data
}

function calcularFechaFin(fechaInicio: string, dias: number) {
  const d = new Date(`${fechaInicio}T12:00:00`); d.setDate(d.getDate() + dias)
  return d.toISOString().split('T')[0]
}
const fmtFecha = (iso: string) => iso
  ? new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'
const dinero = (n: any) => `$${Number(n || 0).toLocaleString('es-MX')}`
const precioDe = (p: any) => Array.isArray(p?.paquete_precios) ? p.paquete_precios[0]?.precio_app : p?.paquete_precios?.precio_app

export default function ModalPagoSucursal({ isOpen, cliente, onClose, onSuccess }: Props) {
  const { staff } = useAuth()
  const esDireccion = staff?.rol === 'direccion'

  const [paso,            setPaso]            = useState<Paso>('form')
  const [paquetes,        setPaquetes]        = useState<any[]>([])
  const [paqueteId,       setPaqueteId]       = useState('')
  const [metodo,          setMetodo]          = useState<Metodo>('app')
  const [monto,           setMonto]           = useState('')
  const [referencia,      setReferencia]      = useState('')
  const [notas,           setNotas]           = useState('')
  const [loading,         setLoading]         = useState(false)
  const [loadingPaquetes, setLoadingPaquetes] = useState(false)
  const [error,           setError]           = useState('')
  const [membresiaActiva, setMembresiaActiva] = useState<any>(null)
  const [opciones,        setOpciones]        = useState<any>(null)
  const [solicitud,       setSolicitud]       = useState<any>(null)
  const [qr,              setQr]              = useState('')
  const [copiado,         setCopiado]         = useState(false)
  const [resultado,       setResultado]       = useState<any>(null)

  const paqueteSel = paquetes.find(p => p.id === paqueteId)
  const enLinea    = metodo === 'tarjeta' || metodo === 'app'
  const precio     = Number(precioDe(paqueteSel) || 0)

  const hoy         = new Date(Date.now() - 6 * 3600 * 1000).toISOString().split('T')[0]
  const fechaVenc   = cliente.fecha_venc_plan || cliente.fecha_vencimiento_memb
  const tieneMemb   = !!fechaVenc && fechaVenc > hoy
  const fechaInicio = tieneMemb ? fechaVenc : hoy
  const fechaFin    = paqueteSel?.vigencia_dias ? calcularFechaFin(fechaInicio, paqueteSel.vigencia_dias) : ''

  const METODOS: { key: Metodo; icon: any; label: string; desc: string; deshabilitado?: string }[] = [
    { key: 'tarjeta', icon: Wallet, label: 'Su tarjeta guardada',
      desc: opciones?.tarjeta ? `${opciones.tarjeta.marca} •••• ${opciones.tarjeta.ultimos4 || ''}` : 'No tiene tarjeta guardada',
      deshabilitado: opciones && !opciones.tarjeta ? 'Primero que pague una vez desde su app' : undefined },
    { key: 'app', icon: Smartphone, label: 'Enviar cobro a su app',
      desc: opciones?.tiene_app ? 'Le llega una notificación y un correo' : 'Le llega por correo y con un QR' },
    ...(!TERMINAL_SOLO_DIRECCION || esDireccion
      ? [{ key: 'Terminal' as Metodo, icon: CreditCard, label: 'Terminal', desc: 'Solo como respaldo' }] : []),
  ]

  useEffect(() => {
    if (!isOpen) return
    setPaso('form'); setPaqueteId(''); setMonto(''); setReferencia(''); setNotas('')
    setError(''); setSolicitud(null); setQr(''); setResultado(null); setOpciones(null)

    const cargar = async () => {
      setLoadingPaquetes(true)
      const { data: memb } = await supabase.from('membresias').select('*, paquetes(nombre)')
        .eq('cliente_id', cliente.id).eq('estatus', 'Activa').order('fecha_fin', { ascending: false }).limit(1).maybeSingle()
      setMembresiaActiva(memb || null)

      // En sucursal se pueden vender también los paquetes ocultos en la app
      let q = supabase.from('paquetes')
        .select('id, nombre, descripcion, vigencia_dias, clases_incluidas, acceso_total, acceso_sucursal_hermana, penalizacion_noshow, monto_penalizacion, es_recurrente, paquete_precios!inner(precio_app, sucursal_id, activo)')
        .eq('estatus', 'Activo').eq('paquete_precios.activo', true).order('nombre')
      if (cliente.sucursal_id) q = q.eq('paquete_precios.sucursal_id', cliente.sucursal_id)
      const { data } = await q
      setPaquetes(data || [])
      setLoadingPaquetes(false)

      try {
        const op = await api(`/cobros/opciones/${cliente.id}`)
        setOpciones(op)
        setMetodo(op.tarjeta ? 'tarjeta' : 'app')
      } catch {
        setOpciones({ tarjeta: null, tiene_app: !!cliente.supabase_user_id })
        setMetodo('app')
      }
    }
    cargar()
  }, [isOpen, cliente.id])

  // Esperar a que pague desde su app (se revisa cada 3 segundos)
  useEffect(() => {
    if (paso !== 'esperando' || !solicitud?.id) return
    const t = setInterval(async () => {
      try {
        const s = await api(`/cobros/solicitudes/${solicitud.id}`)
        if (s.estatus === 'Pagada') {
          clearInterval(t)
          setResultado({ metodo: 'Pagó desde su app', monto: s.monto })
          setPaso('exito'); onSuccess()
        } else if (s.estatus === 'Cancelada' || s.estatus === 'Expirada') {
          clearInterval(t)
          setError(s.estatus === 'Expirada' ? 'El cobro venció sin pagarse.' : 'El cobro se canceló.')
          setPaso('form')
        }
      } catch { /* se reintenta en la siguiente vuelta */ }
    }, 3000)
    return () => clearInterval(t)
  }, [paso, solicitud?.id])

  const elegirPaquete = (id: string) => {
    setPaqueteId(id)
    setMonto(String(precioDe(paquetes.find(x => x.id === id)) || ''))
  }

  const irAResumen = () => {
    if (!paqueteId) return setError('Selecciona un paquete')
    if (metodo === 'tarjeta' && !opciones?.tarjeta) return setError('El cliente no tiene tarjeta guardada')
    if (!enLinea && (!monto || Number(monto) <= 0)) return setError('Ingresa el monto')
    if (metodo === 'Terminal' && !referencia) return setError('Ingresa el número de operación')
    setError(''); setPaso('resumen')
  }

  // ── Cobros en línea ──
  const cobrarTarjeta = async () => {
    const r = await api('/cobros/paquete-tarjeta', 'POST', { cliente_id: cliente.id, paquete_id: paqueteId })
    setResultado(r); setPaso('exito'); onSuccess()
  }

  const enviarCobro = async () => {
    const s = await api('/cobros/solicitudes', 'POST', { cliente_id: cliente.id, paquete_id: paqueteId })
    setSolicitud(s)
    setQr(await QRCode.toDataURL(s.url_pago, { width: 260, margin: 1, color: { dark: '#171B24', light: '#ffffff' } }))
    setPaso('esperando')
  }

  const cancelarCobro = async () => {
    if (solicitud?.id) await api(`/cobros/solicitudes/${solicitud.id}/cancelar`, 'POST').catch(() => {})
    setSolicitud(null); setPaso('form')
  }

  // ── Terminal (registro manual, solo dirección) ──
  const registrarManual = async () => {
    const { error: errPago } = await supabase.from('pagos').insert({
      cliente_id: cliente.id, monto: Number(monto), metodo_pago: metodo, fecha_pago: new Date().toISOString(),
      estatus: 'Completado', concepto: `Pago en sucursal · ${paqueteSel?.nombre}`, canal: 'Navy',
      sucursal_id: cliente.sucursal_id || null,
      metadata: referencia ? { referencia, notas } : notas ? { notas } : null,
    })
    if (errPago) throw new Error('Error al registrar el pago')

    const { error: errMemb } = await supabase.from('membresias').insert({
      cliente_id: cliente.id, paquete_id: paqueteId, fecha_inicio: fechaInicio, fecha_fin: fechaFin,
      estatus: 'Activa', precio_pagado: Number(monto), origen: 'Sucursal', notas: notas || null,
    })
    if (errMemb) throw new Error('Error al crear la membresía')

    await supabase.from('clientes').update({
      plan: paqueteSel?.nombre, paquete_id: paqueteId, fecha_venc_plan: fechaFin, fecha_vencimiento_memb: fechaFin,
    }).eq('id', cliente.id)

    await logActividad({
      tipo: 'pago_sucursal',
      descripcion: `${staff?.nombre} ${staff?.primer_apellido} registró pago de $${monto} (${metodo}) para "${cliente.nombre_completo}" — ${paqueteSel?.nombre}`,
      tabla: 'pagos', accion: 'INSERT',
      metadata: { cliente_id: cliente.id, monto: Number(monto), metodo, paquete: paqueteSel?.nombre,
                  referencia: referencia || null, fecha_inicio: fechaInicio, fecha_fin: fechaFin },
      sucursal_id: cliente.sucursal_id || null, staff_id: staff?.id,
    })
    fetch('/api/correo/pago-sucursal', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cliente.email, nombre: cliente.nombre_completo, paquete_nombre: paqueteSel?.nombre,
        vigencia_dias: paqueteSel?.vigencia_dias, fecha_inicio: fmtFecha(fechaInicio), fecha_fin: fmtFecha(fechaFin),
        monto: Number(monto), metodo_pago: metodo, referencia: referencia || null, tiene_membresia_previa: tieneMemb,
      }),
    }).catch(() => {})
    // El backend recalcula su plan, vencimiento y estado
    api(`/clientes-estado/sincronizar/${cliente.id}`, 'POST').catch(() => {})
    setResultado({ metodo, monto: Number(monto) })
    setPaso('exito'); onSuccess()
  }

  const confirmar = async () => {
    setLoading(true); setError('')
    try {
      if (metodo === 'tarjeta') await cobrarTarjeta()
      else if (metodo === 'app') await enviarCobro()
      else await registrarManual()
    } catch (e: any) { setError(e.message) }
    setLoading(false)
  }

  const copiar = async () => {
    if (!solicitud?.url_pago) return
    await navigator.clipboard?.writeText(solicitud.url_pago)
    setCopiado(true); setTimeout(() => setCopiado(false), 2000)
  }

  if (!isOpen) return null

  const beneficios = paqueteSel ? [
    paqueteSel.clases_incluidas ? `${paqueteSel.clases_incluidas} clases incluidas` : 'Acceso ilimitado a clases',
    `Vigencia de ${paqueteSel.vigencia_dias} días`,
    paqueteSel.acceso_total && 'Acceso a todas las salas',
    paqueteSel.acceso_sucursal_hermana && 'Acceso a sucursal hermana',
    paqueteSel.es_recurrente && 'Renovación automática con su tarjeta',
  ].filter(Boolean) as string[] : []

  const titulo = { form: 'Cobrar paquete', resumen: 'Confirmar cobro', esperando: 'Esperando su pago', exito: 'Cobro completado' }[paso]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={paso === 'esperando' ? undefined : onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <p className="text-sm font-black text-gray-900">{titulo}</p>
            <p className="text-xs text-gray-400 mt-0.5">{cliente?.nombre_completo}</p>
          </div>
          {paso !== 'esperando' && (
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition"><X size={16} className="text-gray-400" /></button>
          )}
        </div>

        {/* ── ÉXITO ── */}
        {paso === 'exito' && (
          <div className="px-6 py-10 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center">
              <CheckCircle2 size={32} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-lg font-black text-gray-900">{resultado?.programado ? '¡Renovación programada!' : '¡Pago recibido!'}</p>
              <p className="text-sm text-gray-400 mt-1">
                {resultado?.programado
                  ? <>Se cobrará el <b>{resultado.programado}</b>, cuando termine su plan actual.</>
                  : <>Su plan quedó activo y se envió el comprobante a <b>{cliente?.email}</b>.</>}
              </p>
            </div>
            <div className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-left space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Plan</span><span className="font-bold text-gray-900">{paqueteSel?.nombre}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Monto</span><span className="font-bold text-emerald-600">{dinero(resultado?.monto ?? monto)} MXN</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Método</span><span className="font-bold text-gray-900">{resultado?.metodo || metodo}</span></div>
            </div>
            {enLinea && <p className="text-xs text-gray-400">Su tarjeta quedó guardada para sus renovaciones, The Galley y penalizaciones.</p>}
            <button onClick={onClose} className="mt-2 px-8 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-700 transition">Cerrar</button>
          </div>
        )}

        {/* ── ESPERANDO PAGO DESDE SU APP ── */}
        {paso === 'esperando' && solicitud && (
          <div className="overflow-y-auto px-6 py-6 space-y-5 text-center">
            <div className="flex items-center justify-center gap-2 text-sm font-bold text-indigo-700 bg-indigo-50 rounded-xl py-3">
              <Loader2 size={15} className="animate-spin" /> Esperando que pague… se actualiza solo
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900">{dinero(solicitud.monto)}</p>
              <p className="text-sm text-gray-500">{solicitud.paquete}</p>
            </div>
            <div className="text-left bg-gray-50 rounded-xl p-4 space-y-2 text-sm text-gray-700">
              {opciones?.dispositivos > 0
                ? <p className="flex gap-2"><Smartphone size={15} className="text-gray-400 mt-0.5 shrink-0" />Le llegó una <b>notificación a su app</b>: que la abra y pague ahí.</p>
                : <p className="flex gap-2"><AlertTriangle size={15} className="text-amber-500 mt-0.5 shrink-0" />No tiene notificaciones activas; que escanee el QR o revise su correo.</p>}
              <p className="flex gap-2"><CheckCircle2 size={15} className="text-gray-400 mt-0.5 shrink-0" />También le llegó un <b>correo</b> a {cliente.email} con el botón para pagar.</p>
            </div>
            {qr && (
              <div className="flex flex-col items-center gap-2">
                <img src={qr} alt="QR para pagar" className="w-44 h-44 rounded-xl border border-gray-100" />
                <p className="text-xs text-gray-400">O que lo escanee con la cámara de su celular</p>
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={copiar} className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50">
                <Copy size={13} /> {copiado ? '¡Copiado!' : 'Copiar enlace'}
              </button>
              <button onClick={cancelarCobro} className="flex-1 py-2.5 border border-red-200 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50">
                Cancelar cobro
              </button>
            </div>
            <p className="text-[11px] text-gray-400">Puedes cerrar esta ventana después de cancelar; si el cliente paga, su plan se activa solo.</p>
          </div>
        )}

        {/* ── RESUMEN ── */}
        {paso === 'resumen' && (
          <div className="overflow-y-auto px-6 py-5 space-y-4">
            <div className="bg-gray-900 rounded-2xl p-5 text-white">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Plan</p>
              <p className="text-xl font-black">{paqueteSel?.nombre}</p>
              <p className="text-3xl font-black mt-2">{dinero(enLinea ? precio : monto)} <span className="text-sm font-normal text-gray-400">MXN</span></p>
            </div>
            <div className="border border-gray-100 rounded-xl p-4 space-y-2.5">
              <p className="text-xs font-black text-gray-500 uppercase tracking-wide">Cómo se cobra</p>
              {metodo === 'tarjeta' && <p className="text-sm text-gray-700">Se cobra en este momento a su <b>{opciones?.tarjeta?.marca} •••• {opciones?.tarjeta?.ultimos4}</b> y le llega su comprobante.</p>}
              {metodo === 'app' && <p className="text-sm text-gray-700">Le llega el cobro a su app y por correo. Paga desde su celular y <b>su tarjeta queda guardada</b>. Tú ves aquí cuando pague.</p>}
              {!enLinea && <p className="text-sm text-gray-700">Se registra como pago en <b>{metodo}</b>{referencia ? ` (operación ${referencia})` : ''}.</p>}
              {paqueteSel?.es_recurrente && enLinea && <p className="text-xs text-indigo-700 bg-indigo-50 rounded-lg px-3 py-2">Plan con renovación automática: se le volverá a cobrar al terminar cada periodo.</p>}
            </div>
            {!enLinea && (
              <div className="border border-gray-100 rounded-xl p-4 space-y-2 text-sm">
                {tieneMemb && <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">⏳ Se activa al terminar su plan actual</p>}
                <div className="flex justify-between"><span className="text-gray-500">Inicia</span><span className="font-bold">{fmtFecha(fechaInicio)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Vence</span><span className="font-bold">{fmtFecha(fechaFin)}</span></div>
              </div>
            )}
            {error && <p className="text-xs text-red-600 bg-red-50 rounded-xl p-3 font-medium">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button onClick={() => { setError(''); setPaso('form') }} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50">← Editar</button>
              <button onClick={confirmar} disabled={loading} className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50" style={{ backgroundColor: '#171B24' }}>
                {loading ? <RefreshCw size={14} className="animate-spin mx-auto" />
                  : metodo === 'tarjeta' ? `Cobrar ${dinero(precio)}`
                  : metodo === 'app' ? 'Enviar cobro' : 'Confirmar y registrar'}
              </button>
            </div>
          </div>
        )}

        {/* ── FORMULARIO ── */}
        {paso === 'form' && (
          <div className="overflow-y-auto px-6 py-5 space-y-4">
            {membresiaActiva && (
              <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 flex items-center justify-between">
                <div><p className="text-xs text-gray-400">Plan actual</p><p className="text-sm font-bold text-gray-900">{membresiaActiva.paquetes?.nombre}</p></div>
                <div className="text-right"><p className="text-xs text-gray-400">Vence</p><p className="text-xs font-bold text-gray-700">{fmtFecha(membresiaActiva.fecha_fin)}</p></div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Paquete</label>
              {loadingPaquetes ? <div className="py-4 text-center text-gray-400 text-xs">Cargando paquetes...</div> : (
                <select className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 bg-gray-50 outline-none focus:border-gray-400"
                  value={paqueteId} onChange={e => elegirPaquete(e.target.value)}>
                  <option value="">Seleccionar paquete</option>
                  {paquetes.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} — {p.vigencia_dias}d {precioDe(p) ? `· ${dinero(precioDe(p))}` : ''}</option>
                  ))}
                </select>
              )}
              {beneficios.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {beneficios.map(b => <span key={b} className="text-[11px] px-2 py-1 rounded-lg bg-gray-50 text-gray-600">{b}</span>)}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">¿Cómo va a pagar?</label>
              {!opciones ? (
                <div className="py-4 text-center text-gray-400 text-xs flex items-center justify-center gap-2"><Loader2 size={13} className="animate-spin" /> Revisando sus métodos de pago…</div>
              ) : (
                <div className="space-y-2">
                  {METODOS.map(({ key, icon: Icon, label, desc, deshabilitado }) => {
                    const activo = metodo === key
                    return (
                      <button key={key} type="button" disabled={!!deshabilitado} onClick={() => { setMetodo(key); setError('') }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition ${
                          activo ? 'border-gray-900 bg-gray-900 text-white' : deshabilitado ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`}>
                        <Icon size={18} className="shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold">{label}</p>
                          <p className={`text-[11px] ${activo ? 'text-gray-300' : 'text-gray-400'}`}>{deshabilitado || desc}</p>
                        </div>
                        {(key === 'tarjeta' || key === 'app') && !deshabilitado && (
                          <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${activo ? 'bg-white/20' : 'bg-emerald-50 text-emerald-600'}`}>Recomendado</span>
                        )}
                        {key === 'Terminal' && <Lock size={13} className="opacity-50" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {!enLinea && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">Monto</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input type="number" className="w-full border border-gray-200 rounded-xl pl-7 pr-3 py-2.5 text-sm bg-gray-50 outline-none focus:border-gray-400"
                      value={monto} onChange={e => setMonto(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">
                    No. de operación / ticket {metodo === 'Terminal' ? <span className="text-red-500">*</span> : <span className="text-gray-400 font-normal">(opcional)</span>}
                  </label>
                  <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 outline-none focus:border-gray-400"
                    placeholder="Ej. TXN-001234" value={referencia} onChange={e => setReferencia(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">Notas <span className="text-gray-400 font-normal">(opcional)</span></label>
                  <textarea rows={2} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 outline-none focus:border-gray-400 resize-none"
                    value={notas} onChange={e => setNotas(e.target.value)} />
                </div>
              </>
            )}

            {error && <p className="text-xs text-red-600 bg-red-50 rounded-xl p-3 font-medium">{error}</p>}
            <div className="flex gap-2 pt-1 pb-2">
              <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button onClick={irAResumen} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: '#171B24' }}>
                Continuar <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
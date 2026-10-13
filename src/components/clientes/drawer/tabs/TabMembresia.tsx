'use client'
// src/components/clientes/drawer/tabs/TabMembresia.tsx — membresía del cliente (ficha)
import { useState, useEffect, ReactNode } from 'react'
import { Calendar, RefreshCw, Pause, RotateCcw, Gift, Clock, Repeat, CreditCard, Ban, Layers, History,
         Ticket, MapPin, AlertTriangle, CheckCircle2, XCircle, Hourglass } from 'lucide-react'
import { supabase }        from '@/lib/supabase'
import { useAuth }         from '@/context/AuthContext'
import ToastExito          from '@/components/ToastExito'
import ModalPagoSucursal   from '@/components/clientes/ModalPagoSucursal'
import ModalFechasMembresia from '@/components/clientes/ModalFechasMembresia'
import { logActividad }    from '@/lib/log-actividad'

interface Props { cliente: any; reservas: any[]; onRefresh?: () => void }

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL
const hoyCDMX = () => new Date(Date.now() - 6 * 3600 * 1000).toISOString().split('T')[0]
const fecha   = (d?: string | null, largo = true) => d
  ? new Date(`${d.slice(0, 10)}T12:00:00`).toLocaleDateString('es-MX', largo ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'short' })
  : '—'
const dias    = (d?: string | null) => d ? Math.ceil((new Date(`${d.slice(0, 10)}T23:59:59`).getTime() - Date.now()) / 86400000) : null
const dinero  = (n: any) => `$${Number(n || 0).toLocaleString('es-MX')}`
const esMigracion = (m: any) => String(m?.origen || '').toLowerCase().includes('migr')

async function backend(path: string, body?: any) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${BACKEND}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || 'No se pudo completar')
  return data
}

const SEL = '*, paquetes(nombre, vigencia_dias, es_recurrente, clases_incluidas, penalizacion_noshow, monto_penalizacion, acceso_total, acceso_sucursal_hermana)'

// ── Piezas visuales ───────────────────────────────────────────────────────────
function Tarjeta({ icon, titulo, ayuda, derecha, children }: { icon: ReactNode; titulo: string; ayuda?: string; derecha?: ReactNode; children: ReactNode }) {
  return (
    <section className="border border-gray-100 rounded-2xl p-5 bg-white">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-8 h-8 rounded-xl bg-gray-50 text-gray-500 flex items-center justify-center shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-gray-900">{titulo}</p>
          {ayuda && <p className="text-[11px] text-gray-400 leading-4 mt-0.5">{ayuda}</p>}
        </div>
        {derecha}
      </div>
      {children}
    </section>
  )
}

function Accion({ icon, titulo, desc, onClick, tono = 'normal', bloqueado }:
  { icon: ReactNode; titulo: string; desc: string; onClick?: () => void; tono?: 'oscuro' | 'normal' | 'verde' | 'indigo'; bloqueado?: string }) {
  const estilos = {
    oscuro: 'bg-gray-900 border-gray-900 text-white hover:bg-gray-800',
    normal: 'bg-white border-gray-200 text-gray-800 hover:border-gray-300',
    verde:  'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-800 hover:bg-indigo-100',
  }[tono]
  return (
    <button onClick={bloqueado ? undefined : onClick} disabled={!!bloqueado}
      className={`text-left rounded-2xl border p-3.5 transition ${bloqueado ? 'bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed' : estilos}`}>
      <div className="flex items-center gap-2 text-sm font-black">{icon}{titulo}</div>
      <p className={`text-[11px] mt-1 leading-4 ${tono === 'oscuro' && !bloqueado ? 'text-gray-300' : 'opacity-70'}`}>{bloqueado || desc}</p>
    </button>
  )
}

export default function TabMembresia({ cliente, reservas, onRefresh }: Props) {
  const { staff } = useAuth()
  const esDireccion = staff?.rol === 'direccion'

  const [toast,         setToast]         = useState<string | null>(null)
  const [modalPago,     setModalPago]     = useState(false)
  const [modalPaquete,  setModalPaquete]  = useState(false)
  const [paquetes,      setPaquetes]      = useState<any[]>([])
  const [paqueteSel,    setPaqueteSel]    = useState('')
  const [asignando,     setAsignando]     = useState(false)
  const [loadingPaq,    setLoadingPaq]    = useState(false)
  const [cancelarRenov, setCancelarRenov] = useState(false)
  const [membresias,    setMembresias]    = useState<any[]>([])
  const [loading,       setLoading]       = useState(true)
  const [membFechas,    setMembFechas]    = useState<string | null>(null)
  const [noShows,       setNoShows]       = useState(0)
  const [cambiandoRenov, setCambiandoRenov] = useState(false)
  const [seccion, setSeccion] = useState<'plan' | 'reglas' | 'historial'>('plan')

  useEffect(() => { cargar() }, [cliente.id])

  const cargar = async () => {
    setLoading(true)
    const [{ data }, { count }] = await Promise.all([
      supabase.from('membresias').select(SEL).eq('cliente_id', cliente.id).order('fecha_inicio', { ascending: false }),
      supabase.from('penalizaciones_noshow').select('id', { count: 'exact', head: true }).eq('cliente_id', cliente.id).eq('estatus', 'Pendiente'),
    ])
    setMembresias(data || [])
    setNoShows(count || 0)
    setLoading(false)
  }

  const recargarTodo = () => { cargar(); onRefresh?.() }
  const sincronizar = () => backend(`/clientes-estado/sincronizar/${cliente.id}`).catch(() => {})

  // ── Plan actual: lo que pagó, luego lo que ya corre, luego lo que vence más tarde ──
  const hoy = hoyCDMX()
  const vigentes = membresias.filter(m => m.estatus === 'Activa' && (m.activacion_pendiente || (m.fecha_fin || '') >= hoy))
  const ordenadas = [...vigentes].sort((a, b) =>
    Number(esMigracion(a)) - Number(esMigracion(b)) ||
    Number((b.fecha_inicio || '') <= hoy) - Number((a.fecha_inicio || '') <= hoy) ||
    (b.fecha_fin || '').localeCompare(a.fecha_fin || '') ||
    Number(b.precio_pagado || 0) - Number(a.precio_pagado || 0))
  const actual  = ordenadas.find(m => m.activacion_pendiente || (m.fecha_inicio || '') <= hoy) || null
  const enCola  = vigentes.filter(m => m.id !== actual?.id && !m.activacion_pendiente && (m.fecha_inicio || '') > hoy)
                          .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio))[0] || null
  const historial = membresias.filter(m => m.id !== actual?.id && m.id !== enCola?.id)
  const ultimaVencida = !actual ? historial.find(m => m.estatus !== 'Cancelada') : null

  const paq      = actual?.paquetes || {}
  const restan   = actual && !actual.activacion_pendiente ? dias(actual.fecha_fin) : null
  const usadas   = actual ? reservas.filter(r => r.membresia_id === actual.id && r.estatus !== 'Cancelada').length : 0
  const total    = paq.clases_incluidas || null
  const pctTiempo = actual && !actual.activacion_pendiente && actual.fecha_inicio && actual.fecha_fin
    ? Math.min(100, Math.max(0, Math.round((Date.now() - new Date(`${actual.fecha_inicio}T00:00:00`).getTime()) /
        (new Date(`${actual.fecha_fin}T23:59:59`).getTime() - new Date(`${actual.fecha_inicio}T00:00:00`).getTime()) * 100)))
    : 0

  const estado = !actual
    ? (ultimaVencida ? { t: 'Vencido', c: 'bg-red-500/15 text-red-300', i: XCircle } : { t: 'Sin plan', c: 'bg-white/10 text-gray-300', i: XCircle })
    : actual.activacion_pendiente ? { t: 'En espera de su primera reserva', c: 'bg-amber-400/15 text-amber-300', i: Hourglass }
    : (restan ?? 99) <= 7 ? { t: `Vence en ${restan} ${restan === 1 ? 'día' : 'días'}`, c: 'bg-orange-400/15 text-orange-300', i: AlertTriangle }
    : { t: 'Vigente', c: 'bg-emerald-400/15 text-emerald-300', i: CheckCircle2 }
  const EstadoIcon = estado.i

  // ── Renovación automática (también se cancela/reactiva en Stripe) ──
  const cambiarRenovacion = async (cancelar: boolean) => {
    if (!actual) return
    setCambiandoRenov(true)
    try {
      const r = await backend(`/cobros/renovacion/${actual.id}`, { cancelar })
      setToast(cancelar
        ? (r.en_stripe ? 'Renovación cancelada: Stripe ya no le cobrará' : 'Renovación cancelada')
        : (r.en_stripe ? 'Renovación reactivada en Stripe' : 'Renovación reactivada'))
      recargarTodo()
    } catch (e: any) { setToast(e.message) }
    setCambiandoRenov(false)
  }

  // ── Regalar un paquete (cortesía) ──
  const abrirCortesia = async () => {
    setLoadingPaq(true); setModalPaquete(true)
    // Para cortesías se pueden usar también paquetes ocultos en la app
    let q = supabase.from('paquetes').select('id, nombre, vigencia_dias, paquete_precios!inner(sucursal_id, activo)')
      .eq('estatus', 'Activo').eq('paquete_precios.activo', true).order('nombre')
    if (cliente.sucursal_id) q = q.eq('paquete_precios.sucursal_id', cliente.sucursal_id)
    const { data } = await q
    setPaquetes(data || []); setLoadingPaq(false)
  }

  const fechaFinCubierta = vigentes.map(m => m.fecha_fin).filter(Boolean).sort().pop()
  const asignarCortesia = async () => {
    const paquete = paquetes.find(p => p.id === paqueteSel)
    if (!paquete) return
    setAsignando(true)
    const inicio = fechaFinCubierta && fechaFinCubierta > hoy ? fechaFinCubierta : hoy
    const finD = new Date(`${inicio}T12:00:00`); finD.setDate(finD.getDate() + paquete.vigencia_dias)
    const fin = finD.toISOString().split('T')[0]

    await supabase.from('membresias').insert({
      cliente_id: cliente.id, paquete_id: paqueteSel, fecha_inicio: inicio, fecha_fin: fin,
      estatus: 'Activa', precio_pagado: 0, origen: 'Cortesia',
    })
    await supabase.from('pagos').insert({
      cliente_id: cliente.id, monto: 0, estatus: 'Completado', metodo_pago: 'Cortesía', canal: 'Navy',
      concepto: `Cortesía — ${paquete.nombre}`, fecha_pago: hoy, sucursal_id: cliente.sucursal_id,
    })
    if (cancelarRenov && actual) await backend(`/cobros/renovacion/${actual.id}`, { cancelar: true }).catch(() => {})
    fetch('/api/correo/paquete-cortesia', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cliente.email, nombre: cliente.nombre_completo, paquete_nombre: paquete.nombre,
        vigencia_dias: paquete.vigencia_dias, fecha_inicio: fecha(inicio), fecha_fin: fecha(fin),
        tiene_membresia: !!(fechaFinCubierta && fechaFinCubierta > hoy),
      }),
    }).catch(() => {})
    await logActividad({
      tipo: 'paquete_asignado_cortesia',
      descripcion: `${staff?.nombre} ${staff?.primer_apellido} regaló "${paquete.nombre}" a "${cliente.nombre_completo}"`,
      tabla: 'membresias', accion: 'INSERT',
      metadata: { cliente_id: cliente.id, paquete: paquete.nombre, inicio, fin },
      sucursal_id: cliente.sucursal_id || null, staff_id: staff?.id,
    })
    await sincronizar()
    setModalPaquete(false); setPaqueteSel(''); setCancelarRenov(false); setAsignando(false)
    recargarTodo()
    setToast('Paquete regalado y correo enviado ✓')
  }

  // ── Reglas de su plan, con semáforo: ok (verde) · ojo (ámbar) · bloquea (rojo) ──
  type Nivel = 'ok' | 'ojo' | 'bloquea'
  const reglas: { icon: ReactNode; label: string; val: string; que: string; nivel: Nivel; accion?: { t: string; f: () => void } }[] = actual ? [
    ...(noShows > 0 ? [{
      icon: <Ban size={15} />, label: 'No Show sin pagar', nivel: 'bloquea' as Nivel,
      val: `${noShows} ${noShows === 1 ? 'pendiente' : 'pendientes'}`,
      que: 'No puede reservar en la app hasta que la pague desde su celular. Dirección puede condonarla en Editar cliente → Acceso y soporte.',
    }] : []),
    {
      icon: <Repeat size={15} />, label: 'Renovación automática',
      nivel: (paq.es_recurrente && !actual.stripe_subscription_id && !actual.renovacion_cancelada) ? 'ojo' as Nivel : 'ok' as Nivel,
      val: !paq.es_recurrente ? 'No aplica · pago único'
        : actual.renovacion_cancelada ? 'Cancelada'
        : actual.stripe_subscription_id ? `Se cobra el ${fecha(actual.fecha_fin, false)}` : 'Sin tarjeta guardada',
      que: !paq.es_recurrente ? 'Cuando termine, tendrá que comprar otro plan.'
        : actual.renovacion_cancelada ? 'No se le volverá a cobrar; al terminar tendrá que comprar otro plan.'
        : actual.stripe_subscription_id ? 'Stripe le cobra solo ese día y su plan se extiende.'
        : 'Al terminar no se cobrará solo. Cóbrale con su tarjeta o envíale el cobro a su app para guardarla.',
      accion: paq.es_recurrente && !actual.stripe_subscription_id && !actual.renovacion_cancelada ? { t: 'Cobrar con tarjeta', f: () => setModalPago(true) } : undefined,
    },
    {
      icon: <Ticket size={15} />, label: 'Clases',
      nivel: total && total - usadas <= 1 ? 'ojo' as Nivel : 'ok' as Nivel,
      val: total ? `${usadas} de ${total} usadas` : `Ilimitadas · ${usadas} reservadas`,
      que: total ? (total - usadas <= 0 ? 'Ya usó todas sus clases; necesita otro plan para seguir reservando.'
                                         : `Le ${total - usadas === 1 ? 'queda 1 clase' : `quedan ${total - usadas} clases`} hasta el ${fecha(actual.fecha_fin, false)}.`)
                 : 'Puede reservar todas las clases que quiera mientras su plan esté vigente.',
    },
    {
      icon: <Clock size={15} />, label: 'Cancelar una clase', nivel: 'ok' as Nivel, val: 'Hasta 12 h antes',
      que: 'Desde la app puede cancelar hasta 12 horas antes. Después, solo recepción puede cancelar.',
    },
    {
      icon: <AlertTriangle size={15} />, label: 'No Show', nivel: 'ok' as Nivel,
      val: paq.penalizacion_noshow ? `${dinero(paq.monto_penalizacion)} por falta` : 'Sin penalización',
      que: paq.penalizacion_noshow ? 'Si reserva y no llega, se le cobra solo a su tarjeta guardada.' : 'Su paquete no cobra por faltar a una clase.',
    },
    {
      icon: <MapPin size={15} />, label: 'Acceso', nivel: 'ok' as Nivel,
      val: [paq.acceso_total ? 'Todas las salas' : 'Salas de su paquete', paq.acceso_sucursal_hermana && 'sucursal hermana'].filter(Boolean).join(' + '),
      que: paq.acceso_sucursal_hermana ? 'También puede reservar en la sucursal hermana.' : 'Solo puede reservar en su sucursal.',
    },
  ] : []
  const alertas = reglas.filter(r => r.nivel !== 'ok')
  const SEMAFORO: Record<Nivel, { caja: string; punto: string; texto: string; etiqueta: string }> = {
    bloquea: { caja: 'bg-red-50 border-red-100',         punto: 'bg-red-500',     texto: 'text-red-700',     etiqueta: 'Bloquea' },
    ojo:     { caja: 'bg-amber-50 border-amber-100',     punto: 'bg-amber-400',   texto: 'text-amber-800',   etiqueta: 'Revisar' },
    ok:      { caja: 'bg-white border-gray-100',         punto: 'bg-emerald-500', texto: 'text-gray-800',    etiqueta: 'En orden' },
  }

  if (loading) return (
    <div className="space-y-4">{[200, 120, 160].map(h => <div key={h} className="rounded-2xl bg-gray-100 animate-pulse" style={{ height: h }} />)}</div>
  )

  return (
    <div className="space-y-4">
      {toast && <ToastExito titulo="✓ Listo" mensaje={toast} onClose={() => setToast(null)} duracion={3000} />}

      <ModalPagoSucursal isOpen={modalPago} cliente={cliente} onClose={() => setModalPago(false)}
        onSuccess={() => { setModalPago(false); recargarTodo() }} />
      <ModalFechasMembresia isOpen={!!membFechas} membresiaId={membFechas} onClose={() => setMembFechas(null)}
        onSuccess={recargarTodo} />

      {/* ── Secciones ── */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-gray-100 rounded-2xl sticky top-0 z-10">
        {([
          { k: 'plan',      t: 'Plan' },
          { k: 'reglas',    t: 'Reglas', n: alertas.length },
          { k: 'historial', t: 'Historial', n: historial.length },
        ] as const).map(x => (
          <button key={x.k} onClick={() => setSeccion(x.k)}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-black transition ${
              seccion === x.k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
            {x.t}
            {'n' in x && x.n > 0 && (
              <span className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] flex items-center justify-center ${
                x.k === 'reglas' ? (alertas.some(a => a.nivel === 'bloquea') ? 'bg-red-500 text-white' : 'bg-amber-400 text-white') : 'bg-gray-200 text-gray-600'}`}>{x.n}</span>
            )}
          </button>
        ))}
      </div>

      {seccion === 'plan' && alertas.length > 0 && (
        <button onClick={() => setSeccion('reglas')}
          className={`w-full flex items-center gap-3 text-left rounded-2xl border p-3.5 ${SEMAFORO[alertas.some(a => a.nivel === 'bloquea') ? 'bloquea' : 'ojo'].caja}`}>
          <AlertTriangle size={16} className={alertas.some(a => a.nivel === 'bloquea') ? 'text-red-500' : 'text-amber-500'} />
          <span className="flex-1 text-xs font-bold text-gray-800">
            {alertas.map(a => `${a.label}: ${a.val}`).join(' · ')}
          </span>
          <span className="text-[11px] font-black text-gray-500">Ver reglas →</span>
        </button>
      )}

      {seccion === 'plan' && <>
      {/* ── Plan actual ── */}
      <div className="rounded-3xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #171B24 0%, #262c3a 100%)' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black tracking-[0.18em] text-gray-400">PLAN ACTUAL</p>
            <p className="text-2xl font-black mt-1 truncate">{actual?.paquetes?.nombre || (ultimaVencida ? ultimaVencida.paquetes?.nombre : 'Sin plan')}</p>
            <p className="text-xs text-gray-400 mt-1">
              {actual
                ? [actual.precio_pagado ? dinero(actual.precio_pagado) : 'Sin costo', actual.origen && `vía ${actual.origen}`, paq.vigencia_dias && `${paq.vigencia_dias} días`].filter(Boolean).join(' · ')
                : ultimaVencida ? `Terminó el ${fecha(ultimaVencida.fecha_fin)}` : 'Todavía no compra un plan'}
            </p>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${estado.c}`}>
            <EstadoIcon size={12} /> {estado.t}
          </span>
        </div>

        {actual && !actual.activacion_pendiente && (
          <div className="mt-6">
            <div className="flex items-end justify-between mb-2">
              <div>
                <p className="text-4xl font-black leading-none">{Math.max(0, restan ?? 0)}</p>
                <p className="text-xs text-gray-400 mt-1">{restan === 1 ? 'día restante' : 'días restantes'}</p>
              </div>
              {total && (
                <div className="text-right">
                  <p className="text-2xl font-black leading-none">{Math.max(0, total - usadas)}</p>
                  <p className="text-xs text-gray-400 mt-1">clases disponibles</p>
                </div>
              )}
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className={`h-full rounded-full ${(restan ?? 99) <= 7 ? 'bg-orange-400' : 'bg-emerald-400'}`} style={{ width: `${pctTiempo}%` }} />
            </div>
            <div className="flex justify-between text-[11px] text-gray-400 mt-1.5">
              <span>Inició {fecha(actual.fecha_inicio, false)}</span>
              <span>Vence {fecha(actual.fecha_fin, false)}</span>
            </div>
          </div>
        )}

        {actual?.activacion_pendiente && (
          <div className="mt-5 bg-white/5 rounded-2xl p-4 text-sm text-gray-300 leading-5">
            ⏳ Su plan <b className="text-white">todavía no empieza a contar</b>. Arranca con sus {paq.vigencia_dias} días completos el día que reserve su primera clase
            {actual.fecha_compra ? <> (lo compró el {fecha(actual.fecha_compra)}; si no reserva, se activa solo a los 30 días)</> : null}.
          </div>
        )}

        {!actual && (
          <button onClick={() => setModalPago(true)} className="mt-5 w-full py-3 rounded-2xl bg-white text-gray-900 text-sm font-black hover:bg-gray-100 transition">
            Cobrarle un plan →
          </button>
        )}
      </div>

      {/* ── Renovación automática ── */}
      {actual && paq.es_recurrente && (
        <div className={`rounded-2xl border p-4 flex items-center gap-4 ${
          actual.renovacion_cancelada ? 'bg-red-50 border-red-100'
          : actual.stripe_subscription_id ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            actual.renovacion_cancelada ? 'bg-red-100 text-red-600' : actual.stripe_subscription_id ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
            {actual.stripe_subscription_id && !actual.renovacion_cancelada ? <Repeat size={18} /> : actual.renovacion_cancelada ? <XCircle size={18} /> : <CreditCard size={18} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-black ${actual.renovacion_cancelada ? 'text-red-700' : actual.stripe_subscription_id ? 'text-emerald-800' : 'text-amber-800'}`}>
              {actual.renovacion_cancelada ? 'Renovación automática cancelada'
                : actual.stripe_subscription_id ? 'Renovación automática activa' : 'Plan recurrente sin tarjeta'}
            </p>
            <p className="text-xs text-gray-600 mt-0.5 leading-4">
              {actual.renovacion_cancelada ? `No se le volverá a cobrar. Su plan termina el ${fecha(actual.fecha_fin)}.`
                : actual.stripe_subscription_id ? (actual.activacion_pendiente
                    ? 'El primer cobro se programa cuando arranque su plan.'
                    : `Stripe le cobra el ${fecha(actual.fecha_fin)} y su plan se extiende solo.`)
                : 'Al terminar no se cobrará solo. Cóbrale con su tarjeta o envíale el cobro a su app para guardarla.'}
            </p>
          </div>
          {esDireccion && actual.stripe_subscription_id && (
            <button onClick={() => cambiarRenovacion(!actual.renovacion_cancelada)} disabled={cambiandoRenov}
              className={`text-xs font-black px-3 py-2 rounded-xl transition disabled:opacity-50 shrink-0 ${
                actual.renovacion_cancelada ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-white border border-red-200 text-red-600 hover:bg-red-50'}`}>
              {cambiandoRenov ? '…' : actual.renovacion_cancelada ? 'Reactivar' : 'Cancelar renovación'}
            </button>
          )}
        </div>
      )}

      {/* ── Qué puedo hacer ── */}
      <Tarjeta icon={<Layers size={15} />} titulo="Acciones" ayuda="Lo que puedes hacer con la membresía de este cliente.">
        <div className="grid grid-cols-2 gap-2.5">
          <Accion tono="oscuro" icon={<RefreshCw size={14} />} titulo={actual ? 'Renovar o cambiar plan' : 'Cobrar un plan'}
            desc="Con su tarjeta, enviándole el cobro a su app o en efectivo" onClick={() => setModalPago(true)} />
          <Accion tono="indigo" icon={<Calendar size={14} />} titulo="Editar fechas"
            desc={actual ? `Mover el inicio o fin de ${actual.paquetes?.nombre}` : 'Necesita un plan activo'}
            onClick={() => actual && setMembFechas(actual.id)}
            bloqueado={!esDireccion ? 'Solo dirección' : !actual ? 'Necesita un plan activo' : undefined} />
          <Accion tono="verde" icon={<Gift size={14} />} titulo="Regalar un paquete" desc="Cortesía sin costo, con correo al cliente"
            onClick={abrirCortesia} bloqueado={!esDireccion ? 'Solo dirección' : undefined} />
          <Accion icon={<Pause size={14} />} titulo="Pausar membresía" desc="" bloqueado="Próximamente" />
          <Accion icon={<RotateCcw size={14} />} titulo="Reembolsar" desc="" bloqueado="Próximamente" />
        </div>
      </Tarjeta>

      {/* ── Próximo plan en cola ── */}
      {enCola && (
        <div className="rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/60 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0"><Clock size={18} /></div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black tracking-widest text-indigo-500">SIGUE DESPUÉS · YA PAGADO</p>
            <p className="text-sm font-black text-gray-900">{enCola.paquetes?.nombre}</p>
            <p className="text-xs text-gray-500">{fecha(enCola.fecha_inicio)} → {fecha(enCola.fecha_fin)}</p>
          </div>
          {esDireccion && (
            <button onClick={() => setMembFechas(enCola.id)} className="text-xs font-bold text-indigo-600 hover:underline shrink-0">Editar fechas</button>
          )}
        </div>
      )}

      </>}

      {/* ── Reglas de su plan ── */}
      {seccion === 'reglas' && (
        actual ? (
          <div className="space-y-2.5">
            <p className="text-[11px] text-gray-400 px-1">
              Lo que aplica para <b className="text-gray-700">{actual.paquetes?.nombre}</b>.
              <span className="inline-flex items-center gap-3 ml-2">
                <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />En orden</span>
                <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />Revisar</span>
                <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />Bloquea</span>
              </span>
            </p>
            {reglas.map(r => {
              const st = SEMAFORO[r.nivel]
              return (
                <div key={r.label} className={`rounded-2xl border p-4 flex gap-3.5 ${st.caja}`}>
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 text-gray-600 flex items-center justify-center">{r.icon}</div>
                    <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${st.punto}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">{r.label}</p>
                      {r.nivel !== 'ok' && <span className={`text-[10px] font-black uppercase ${st.texto}`}>{st.etiqueta}</span>}
                    </div>
                    <p className={`text-base font-black mt-0.5 ${st.texto}`}>{r.val}</p>
                    <p className="text-xs text-gray-500 mt-1 leading-4">{r.que}</p>
                    {r.accion && (
                      <button onClick={r.accion.f} className="mt-2.5 text-xs font-black px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-gray-800">{r.accion.t} →</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-10 bg-gray-50 rounded-2xl">Las reglas aparecen cuando tenga un plan activo.</p>
        )
      )}

      {/* ── Historial ── */}
      {seccion === 'historial' && <Tarjeta icon={<History size={15} />} titulo="Historial de planes" ayuda="Todos los planes que ha tenido, del más reciente al más antiguo.">
        {historial.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4 bg-gray-50 rounded-xl">Sin planes anteriores.</p>
        ) : (
          <div className="relative pl-5">
            <div className="absolute left-[7px] top-1 bottom-1 w-px bg-gray-200" />
            {historial.slice(0, 10).map(m => {
              const color = m.estatus === 'Cancelada' ? 'bg-red-400' : m.estatus === 'Activa' ? 'bg-emerald-500' : 'bg-gray-300'
              return (
                <div key={m.id} className="relative pb-4 last:pb-0">
                  <span className={`absolute -left-5 top-1 w-3.5 h-3.5 rounded-full border-2 border-white ${color}`} />
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-gray-900 truncate">{m.paquetes?.nombre || 'Paquete'}</p>
                      <p className="text-[11px] text-gray-400">{fecha(m.fecha_inicio, false)} → {fecha(m.fecha_fin, false)}{m.origen ? ` · ${m.origen}` : ''}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-gray-700">{m.precio_pagado ? dinero(m.precio_pagado) : 'Sin costo'}</p>
                      <p className={`text-[10px] font-black uppercase ${m.estatus === 'Cancelada' ? 'text-red-500' : m.estatus === 'Activa' ? 'text-emerald-600' : 'text-gray-400'}`}>{m.estatus}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Tarjeta>}

      {/* ── Regalar paquete (cortesía) ── */}
      {modalPaquete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setModalPaquete(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Gift size={18} /></div>
              <div>
                <h3 className="text-lg font-black text-gray-900">Regalar un paquete</h3>
                <p className="text-xs text-gray-400">
                  {fechaFinCubierta && fechaFinCubierta > hoy
                    ? `Empieza cuando termine lo que ya tiene (${fecha(fechaFinCubierta)}).`
                    : 'Empieza hoy.'} Sin costo; le llega un correo.
                </p>
              </div>
            </div>
            {loadingPaq ? <div className="py-8 text-center text-gray-400 text-sm">Cargando paquetes...</div> : (
              <select value={paqueteSel} onChange={e => setPaqueteSel(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-400 bg-gray-50">
                <option value="">Elige el paquete</option>
                {paquetes.map(p => <option key={p.id} value={p.id}>{p.nombre} — {p.vigencia_dias} días</option>)}
              </select>
            )}
            {actual?.paquetes?.es_recurrente && actual?.stripe_subscription_id && !actual?.renovacion_cancelada && (
              <label className="flex items-center gap-3 cursor-pointer bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
                <input type="checkbox" checked={cancelarRenov} onChange={e => setCancelarRenov(e.target.checked)} className="w-4 h-4 rounded" />
                <div>
                  <p className="text-xs font-bold text-orange-700">Cancelar su renovación automática</p>
                  <p className="text-[11px] text-orange-500">Stripe no le cobrará al terminar su plan actual</p>
                </div>
              </label>
            )}
            <div className="flex gap-2">
              <button onClick={() => { setModalPaquete(false); setCancelarRenov(false) }}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button onClick={asignarCortesia} disabled={!paqueteSel || asignando}
                className="flex-1 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-700 disabled:opacity-40">
                {asignando ? 'Regalando…' : 'Regalar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
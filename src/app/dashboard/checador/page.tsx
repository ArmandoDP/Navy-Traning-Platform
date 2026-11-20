'use client'
// src/app/dashboard/checador/page.tsx
// Módulo "Checador" del CRM: Front Desk muestra el QR y confirma quién entra.
// Solo Front Desk, gerentes y dirección (el backend lo valida).
import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { RefreshCw, MapPin, CalendarX, ScanLine } from 'lucide-react'
import { useSucursal } from '@/context/SucursalContext'
import { backend, SesionRequerida } from '@/lib/backend'

const TZ = 'America/Mexico_City'
const hora = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: TZ }) : '—'

const MOTIVOS_SISTEMA: Record<string, string> = {
  sin_clases:       'no tiene clases hoy',
  fuera_de_ventana: 'está fuera de su horario de clases',
  lejos:            'está lejos de la sucursal',
  sin_ubicacion:    'no compartió su ubicación',
  codigo_vencido:   'escaneó un código vencido',
  codigo_usado:     'escaneó un código ya usado',
  codigo_invalido:  'escaneó un código inválido',
}
const MOTIVOS_RECHAZO = ['No es la persona', 'No está en recepción']

export default function ChecadorPage() {
  const { sucursalId, sucursalActiva } = useSucursal()
  const [permitido, setPermitido] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [misSucursales, setMisSucursales] = useState<string[]>([])

  useEffect(() => {
    backend('/checador/sucursales')
      .then(r => { setMisSucursales((r.sucursales || []).map((s: any) => s.id)); setPermitido(true) })
      .catch(e => {
        setPermitido(false)
        setError(e instanceof SesionRequerida ? 'Tu sesión venció. Vuelve a iniciar sesión.' : e.message)
      })
  }, [])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Checador</h1>
        <p className="mt-0.5 text-sm text-gray-400">Entradas y salidas del staff con QR</p>
      </div>

      {permitido === null && (
        <div className="flex h-64 items-center justify-center gap-2 text-gray-400">
          <RefreshCw size={16} className="animate-spin" /> Cargando…
        </div>
      )}

      {permitido === false && (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500 shadow-sm">{error}</div>
      )}

      {permitido && !sucursalId && (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <p className="text-lg font-bold text-gray-900">Elige la sucursal de esta computadora</p>
          <p className="mt-1 text-sm text-gray-500">Usa el selector de sucursal de arriba. El QR que se muestre solo sirve para esa sucursal.</p>
        </div>
      )}

      {permitido && sucursalId && !misSucursales.includes(sucursalId) && (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <p className="text-lg font-bold text-gray-900">No tienes acceso al checador de {sucursalActiva?.nombre}</p>
          <p className="mt-1 text-sm text-gray-500">Elige una de tus sucursales en el selector de arriba.</p>
        </div>
      )}

      {permitido && sucursalId && misSucursales.includes(sucursalId) && (
        <Checador key={sucursalId} sucursalId={sucursalId} nombre={sucursalActiva?.nombre || ''} />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════

function Checador({ sucursalId, nombre }: { sucursalId: string; nombre: string }) {
  const quieto = useReducedMotion()
  const [qr, setQr] = useState<{ url: string; vida: number; n: number } | null>(null)
  const [datos, setDatos] = useState<any>({ por_confirmar: [], recientes: [], rechazados_sistema: [] })
  const [reloj, setReloj] = useState(new Date())
  const [aviso, setAviso] = useState<string | null>(null)
  const vistos = useRef<Set<string>>(new Set())
  const timerQr = useRef<ReturnType<typeof setTimeout> | null>(null)

  // QR de un solo uso: se renueva antes de vencer, y al instante cuando alguien lo usa
  const nuevoQr = useCallback(async () => {
    if (timerQr.current) clearTimeout(timerQr.current)
    try {
      const r = await backend('/checador/qr', { body: { sucursal_id: sucursalId } })
      setQr(q => ({ url: r.url, vida: r.vida_seg, n: (q?.n || 0) + 1 }))
      timerQr.current = setTimeout(nuevoQr, Math.max(3, r.vida_seg - 2) * 1000)
    } catch (e: any) {
      setAviso(e.message)
      timerQr.current = setTimeout(nuevoQr, 5000)
    }
  }, [sucursalId])

  useEffect(() => { nuevoQr(); return () => { if (timerQr.current) clearTimeout(timerQr.current) } }, [nuevoQr])

  // Lo que llega: cada 2 s
  useEffect(() => {
    let vivo = true
    const cargar = async () => {
      try {
        const d = await backend(`/checador/pendientes?sucursal_id=${sucursalId}`)
        if (!vivo) return
        const ids = [...d.por_confirmar, ...d.recientes, ...d.rechazados_sistema].map((x: any) => x.id)
        const hayNuevo = vistos.current.size > 0 && ids.some(id => !vistos.current.has(id))
        ids.forEach(id => vistos.current.add(id))
        setDatos(d)
        if (hayNuevo) nuevoQr()                      // alguien usó el QR: aparece otro
      } catch {}
    }
    cargar()
    const t = setInterval(cargar, 2000)
    return () => { vivo = false; clearInterval(t) }
  }, [sucursalId, nuevoQr])

  useEffect(() => { const t = setInterval(() => setReloj(new Date()), 1000); return () => clearInterval(t) }, [])
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(null), 5000); return () => clearTimeout(t) }, [aviso])

  const resolver = async (id: string, accion: 'confirmar' | 'rechazar', motivo?: string) => {
    try {
      await backend('/checador/confirmar', { body: { checada_id: id, accion, motivo } })
      setDatos((d: any) => ({ ...d, por_confirmar: d.por_confirmar.filter((x: any) => x.id !== id) }))
    } catch (e: any) { setAviso(e.message) }
  }

  const entradas = datos.recientes.filter((r: any) => r.tipo === 'entrada').length

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* ── QR */}
        <section className="flex flex-col items-center rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex w-full items-center justify-between">
            <span className="flex items-center gap-1.5 font-bold text-gray-800">
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" /> {nombre}
            </span>
            <span className="text-2xl font-black tabular-nums text-gray-900">
              {reloj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: TZ })}
            </span>
          </div>

          <div className="relative mt-8 w-full max-w-[360px]">
            {qr && <Cuenta key={`c${qr.n}`} vida={qr.vida} />}
            <div className="relative aspect-square w-full">
              <AnimatePresence mode="popLayout">
                {qr && (
                  <motion.div key={qr.n} className="absolute inset-0 p-2"
                    initial={quieto ? { opacity: 0 } : { opacity: 0, scale: 1.06, filter: 'blur(6px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    exit={quieto ? { opacity: 0 } : { opacity: 0, scale: 0.86, filter: 'blur(10px)' }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
                    <QRCodeSVG value={qr.url} size={512} level="M" fgColor="#111827" style={{ width: '100%', height: '100%' }} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <p className="mt-8 flex items-center gap-2 text-lg font-bold text-gray-900">
            <ScanLine size={20} className="text-indigo-600" /> Escanea con la cámara de tu celular
          </p>
          <p className="mt-1 max-w-sm text-center text-sm text-gray-500">
            Para entrar y para salir. El código cambia solo y cada uno sirve una sola vez.
          </p>
        </section>

        {/* ── Cola */}
        <section className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Por confirmar</h2>
              {datos.por_confirmar.length > 0 && (
                <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-sm font-bold text-indigo-600">{datos.por_confirmar.length}</span>
              )}
            </div>
            <div className="mt-3 space-y-3">
              <AnimatePresence initial={false}>
                {datos.por_confirmar.map((p: any) => (
                  <Tarjeta key={p.id} p={p} onConfirmar={() => resolver(p.id, 'confirmar')}
                           onRechazar={(m: string) => resolver(p.id, 'rechazar', m)} />
                ))}
              </AnimatePresence>
              {datos.por_confirmar.length === 0 && (
                <p className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                  Cuando alguien escanee, aparece aquí para que confirmes que es esa persona.
                </p>
              )}
            </div>
          </div>

          {datos.rechazados_sistema.length > 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="font-bold text-gray-900">No se registraron</h2>
              <ul className="mt-3 space-y-2">
                <AnimatePresence initial={false}>
                  {datos.rechazados_sistema.slice(0, 4).map((r: any) => (
                    <motion.li key={r.id} layout initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                      className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm">
                      <span className="flex items-center gap-2 text-rose-800">
                        {r.motivo === 'lejos' ? <MapPin size={15} /> : <CalendarX size={15} />}
                        <span><b>{r.nombre || 'Alguien'}</b> {MOTIVOS_SISTEMA[r.motivo] || r.detalle}</span>
                      </span>
                      <span className="tabular-nums text-rose-400">{hora(r.hora)}</span>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </div>
          )}

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Hoy</h2>
              <span className="text-sm text-gray-400">{entradas} entrada{entradas === 1 ? '' : 's'}</span>
            </div>
            <ul className="mt-3 max-h-[40vh] divide-y divide-gray-100 overflow-y-auto">
              {datos.recientes.map((r: any) => (
                <li key={r.id} className="flex items-center gap-3 py-2.5">
                  <span className="w-12 text-sm tabular-nums text-gray-400">{hora(r.hora)}</span>
                  <span className="flex-1 truncate font-semibold text-gray-800">{r.nombre}</span>
                  <Estado r={r} />
                </li>
              ))}
              {datos.recientes.length === 0 && <li className="py-2 text-sm text-gray-400">Todavía no hay movimientos hoy.</li>}
            </ul>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {aviso && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white shadow-xl">
            {aviso}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// Borde que se consume mientras el QR sigue vigente
function Cuenta({ vida }: { vida: number }) {
  return (
    <svg className="pointer-events-none absolute -inset-4 h-[calc(100%+2rem)] w-[calc(100%+2rem)]" viewBox="0 0 100 100" preserveAspectRatio="none">
      <rect x="1" y="1" width="98" height="98" rx="8" fill="none" stroke="#E5E7EB" strokeWidth="0.8" />
      <motion.rect x="1" y="1" width="98" height="98" rx="8" fill="none" stroke="#4F46E5" strokeWidth="0.8" strokeLinecap="round"
        initial={{ pathLength: 1 }} animate={{ pathLength: 0 }} transition={{ duration: vida, ease: 'linear' }} />
    </svg>
  )
}

// Alguien que acaba de escanear
function Tarjeta({ p, onConfirmar, onRechazar }: { p: any; onConfirmar: () => void; onRechazar: (m: string) => void }) {
  const [rechazando, setRechazando] = useState(false)
  const [otro, setOtro] = useState('')
  const quieto = useReducedMotion()
  const lejos = p.distancia_m != null && p.distancia_m > 300
  const noEsSuDia = p.dia_asignado === false

  return (
    <motion.article layout
      initial={quieto ? { opacity: 0 } : { opacity: 0, x: 60, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={quieto ? { opacity: 0 } : { opacity: 0, x: -40, height: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      className="relative overflow-hidden rounded-xl border border-indigo-200 bg-indigo-50/60 p-4">
      {!quieto && (
        <motion.span className="pointer-events-none absolute inset-0"
          style={{ background: 'linear-gradient(110deg, transparent 30%, rgba(79,70,229,0.12) 50%, transparent 70%)' }}
          initial={{ x: '-100%' }} animate={{ x: '100%' }} transition={{ duration: 1.2, ease: 'easeOut' }} />
      )}
      <div className="relative">
        <p className="text-xl font-black text-gray-900">{p.nombre}</p>
        <p className="text-sm text-gray-500">
          {p.tipo === 'entrada' ? 'Entrada' : 'Salida'} a las {hora(p.hora)}{p.nivel ? `, ${p.nivel}` : ''}
        </p>
        {(lejos || noEsSuDia) && (
          <p className="mt-1.5 text-sm font-semibold text-amber-600">
            {lejos ? `Su celular está a ${Math.round(p.distancia_m)} m. ` : ''}{noEsSuDia ? 'Hoy no es su día según su horario.' : ''}
          </p>
        )}
        {p.es_coach && p.clases?.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {p.clases.map((c: any) => (
              <span key={c.id} className="rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-xs font-medium text-gray-700">
                {c.nombre} {hora(c.horario)}
              </span>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {!rechazando ? (
          <motion.div key="botones" className="relative mt-4 grid grid-cols-[2fr_1fr] gap-2"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button onClick={onConfirmar}
              className="rounded-xl bg-emerald-500 py-3 font-black text-white transition hover:bg-emerald-600 active:scale-[0.98]">
              Confirmar
            </button>
            <button onClick={() => setRechazando(true)}
              className="rounded-xl border-2 border-rose-300 bg-white py-3 font-bold text-rose-600 transition hover:bg-rose-50 active:scale-[0.98]">
              No es él
            </button>
          </motion.div>
        ) : (
          <motion.div key="motivo" className="relative mt-4" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <p className="mb-2 text-sm text-gray-500">¿Por qué no se confirma?</p>
            <div className="flex flex-wrap gap-2">
              {MOTIVOS_RECHAZO.map(m => (
                <button key={m} onClick={() => onRechazar(m)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                  {m}
                </button>
              ))}
              <input value={otro} onChange={e => setOtro(e.target.value)} placeholder="Otro motivo"
                className="min-w-[9rem] flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
                onKeyDown={e => { if (e.key === 'Enter' && otro.trim()) onRechazar(otro.trim()) }} />
              <button disabled={!otro.trim()} onClick={() => onRechazar(otro.trim())}
                className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-40">
                Rechazar
              </button>
              <button onClick={() => setRechazando(false)} className="px-2 py-2 text-sm text-gray-400 hover:text-gray-600">Volver</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  )
}

function Estado({ r }: { r: any }) {
  const mapa: Record<string, [string, string]> = {
    confirmada: [r.tipo === 'salida' ? 'Salida' : 'Entrada', r.tipo === 'salida' ? 'text-indigo-600' : 'text-emerald-600'],
    automatica: [r.tipo === 'salida' ? 'Salida automática' : 'Entrada (primera del día)', 'text-gray-400'],
    manual:     ['Manual', 'text-amber-600'],
    rechazada:  ['Rechazada', 'text-rose-600'],
  }
  const [txt, clase] = mapa[r.estado] || [r.estado, 'text-gray-400']
  return <span className={`text-sm font-semibold ${clase}`}>{txt}</span>
}
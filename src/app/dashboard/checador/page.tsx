'use client'
// src/app/dashboard/checador/page.tsx
// Checador de staff: tablero de la sucursal para Front Desk + QR de un solo uso
// + pop-up para confirmar a quien acaba de escanear. Todo cabe en la ventana:
// las listas se desplazan por dentro.
import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'
import { useSucursal } from '@/context/SucursalContext'
import { backend, SesionRequerida } from '@/lib/backend'
import TarjetaQR, { QR } from '@/components/checador/frontdesk/TarjetaQR'
import Alertas from '@/components/checador/frontdesk/Alertas'
import ClasesHoy from '@/components/checador/frontdesk/ClasesHoy'
import AdentroAhora from '@/components/checador/frontdesk/AdentroAhora'
import Movimientos from '@/components/checador/frontdesk/Movimientos'
import FichaConfirmacion from '@/components/checador/frontdesk/FichaConfirmacion'
import { Kpi } from '@/components/checador/frontdesk/ui'
import { MOTIVOS_SISTEMA, TZ } from '@/components/checador/frontdesk/util'

// Alto de la ventana menos la barra superior del CRM (56 px) y el padding del contenido (2 × 24 px)
const ALTO = 'xl:h-[calc(100dvh-104px)]'

export default function ChecadorPage() {
  const { sucursalId, sucursalActiva } = useSucursal()
  const [permitido, setPermitido] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [misSucursales, setMisSucursales] = useState<string[]>([])
  const [operador, setOperador] = useState('')

  useEffect(() => {
    backend('/checador/sucursales')
      .then(r => { setMisSucursales((r.sucursales || []).map((s: any) => s.id)); setOperador(r.operador || ''); setPermitido(true) })
      .catch(e => {
        setPermitido(false)
        setError(e instanceof SesionRequerida ? 'Tu sesión venció. Vuelve a iniciar sesión.' : e.message)
      })
  }, [])

  if (permitido === null) return (
    <div className="flex h-64 items-center justify-center gap-2 text-gray-400"><RefreshCw size={16} className="animate-spin" /> Cargando checador…</div>
  )
  if (permitido === false) return <Aviso titulo="Checador de staff" texto={error || ''} />
  if (!sucursalId) return <Aviso titulo="Elige la sucursal de esta computadora" texto="Usa el selector de sucursal de arriba. El QR que se muestre solo sirve para esa sucursal." />
  if (!misSucursales.includes(sucursalId)) return <Aviso titulo={`No tienes acceso al checador de ${sucursalActiva?.nombre || 'esta sucursal'}`} texto="Elige una de tus sucursales en el selector de arriba." />

  return <Tablero key={sucursalId} sucursalId={sucursalId} nombre={sucursalActiva?.nombre || ''} operador={operador} />
}

function Aviso({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black text-gray-900">Checador</h1>
      <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
        <p className="text-lg font-bold text-gray-900">{titulo}</p>
        <p className="mt-1 text-sm text-gray-500">{texto}</p>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════

function Tablero({ sucursalId, nombre, operador }: { sucursalId: string; nombre: string; operador: string }) {
  const [qr, setQr] = useState<QR | null>(null)
  const [pend, setPend] = useState<any[]>([])
  const [tab, setTab] = useState<any>(null)
  const [ahora, setAhora] = useState(Date.now())
  const [aviso, setAviso] = useState<string | null>(null)
  const marca = useRef<string | null>(null)
  const timerQr = useRef<ReturnType<typeof setTimeout> | null>(null)

  // QR de un solo uso: se renueva antes de vencer, y al instante cuando alguien lo usa.
  // La cuenta regresiva usa el reloj de esta computadora (no el del servidor), para que no
  // marque "0 s" si la computadora tiene la hora desfasada.
  const nuevoQr = useCallback(async () => {
    if (timerQr.current) clearTimeout(timerQr.current)
    try {
      const r = await backend('/checador/qr', { body: { sucursal_id: sucursalId } })
      setQr(q => ({ url: r.url, vida: r.vida_seg, expira: Date.now() + r.vida_seg * 1000, n: (q?.n || 0) + 1 }))
      timerQr.current = setTimeout(nuevoQr, Math.max(3, r.vida_seg - 2) * 1000)
    } catch (e: any) {
      setAviso(e.message)
      timerQr.current = setTimeout(nuevoQr, 5000)
    }
  }, [sucursalId])

  const cargarTablero = useCallback(async () => {
    try { setTab(await backend(`/checador/tablero?sucursal_id=${sucursalId}`)) } catch {}
  }, [sucursalId])

  useEffect(() => { nuevoQr(); return () => { if (timerQr.current) clearTimeout(timerQr.current) } }, [nuevoQr])

  // Cada 2 s: quién espera confirmación. Si hubo un movimiento nuevo: QR nuevo y tablero al día.
  useEffect(() => {
    let vivo = true
    const revisar = async () => {
      try {
        const d = await backend(`/checador/pendientes?sucursal_id=${sucursalId}`)
        if (!vivo) return
        setPend(d.por_confirmar || [])
        if (marca.current !== null && d.ultimo_movimiento !== marca.current) { nuevoQr(); cargarTablero() }
        marca.current = d.ultimo_movimiento
      } catch {}
    }
    revisar(); cargarTablero()
    const a = setInterval(revisar, 2000)
    const b = setInterval(cargarTablero, 20000)
    return () => { vivo = false; clearInterval(a); clearInterval(b) }
  }, [sucursalId, nuevoQr, cargarTablero])

  useEffect(() => { const t = setInterval(() => setAhora(Date.now()), 1000); return () => clearInterval(t) }, [])
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(null), 5000); return () => clearTimeout(t) }, [aviso])

  const resolver = async (id: string, accion: 'confirmar' | 'rechazar', motivo?: string) => {
    try {
      await backend('/checador/confirmar', { body: { checada_id: id, accion, motivo } })
      setPend(p => p.filter(x => x.id !== id))
      cargarTablero()
    } catch (e: any) { setAviso(e.message) }
  }

  const fecha = new Date(ahora).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ }).replace(',', '')
  const [hh, mm, ss] = new Date(ahora).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: false, timeZone: TZ }).split(':')
  const k = tab?.kpis

  return (
    <div className={`flex flex-col gap-4 ${ALTO}`}>
      {/* Encabezado */}
      <div className="flex shrink-0 items-end justify-between">
        <div>
          <p className="text-sm text-gray-400">Checador de staff · {nombre}</p>
          <h1 className="mt-0.5 text-2xl font-black text-gray-900 first-letter:uppercase">{fecha}</h1>
        </div>
        <div className="text-right">
          <p className="text-4xl font-black leading-none tracking-tight text-gray-900 tabular-nums">
            {hh}:{mm}<span className="text-xl text-gray-400">:{ss}</span>
          </p>
          <p className="mt-1 text-xs text-gray-400">Hora del servidor</p>
        </div>
      </div>

      {/* Cuerpo: el QR a la izquierda y el tablero a la derecha, del mismo alto */}
      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[400px_minmax(0,1fr)]">
        <TarjetaQR qr={qr} ahora={ahora} ultima={tab?.ultima_entrada} />

        <section className="flex min-h-0 min-w-0 flex-col gap-3">
          <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi titulo="Adentro ahora" valor={k?.adentro} sub={k ? `${k.adentro_coaches} coaches · ${k.adentro_staff} staff` : ''} />
            <Kpi titulo="Entradas hoy" valor={k?.entradas} sub={k ? `${k.salidas} salida${k.salidas === 1 ? '' : 's'}` : ''} />
            <Kpi titulo="Clases hoy" valor={k?.clases} sub={k ? `${k.clases_terminadas} terminadas` : ''} />
            <Kpi titulo="No se registraron" valor={k?.rechazos} rojo={!!k?.rechazos}
                 sub={k?.rechazo_ejemplo ? `${k.rechazo_ejemplo.nombre || 'Alguien'} · ${MOTIVOS_SISTEMA[k.rechazo_ejemplo.motivo] || ''}` : 'Ninguno'} />
          </div>

          {(tab?.alertas || []).length > 0 && <Alertas alertas={tab.alertas} />}

          <div className="grid min-h-[420px] flex-1 gap-3 lg:grid-cols-[1.25fr_1fr] xl:min-h-0">
            <ClasesHoy clases={tab?.clases || []} />
            <div className="flex min-h-0 flex-col gap-3">
              <AdentroAhora adentro={tab?.adentro || []} />
              <Movimientos movimientos={tab?.movimientos || []} />
            </div>
          </div>
        </section>
      </div>

      {/* Pop-up de confirmación */}
      <AnimatePresence>
        {pend.length > 0 && (
          <motion.div className="fixed inset-0 z-[70] grid place-items-center bg-gray-900/40 p-4 backdrop-blur-[3px]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AnimatePresence mode="wait">
              <FichaConfirmacion key={pend[0].id} f={pend[0]} total={pend.length} operador={operador}
                onConfirmar={() => resolver(pend[0].id, 'confirmar')}
                onRechazar={(m: string) => resolver(pend[0].id, 'rechazar', m)} />
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {aviso && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white shadow-xl">
            {aviso}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
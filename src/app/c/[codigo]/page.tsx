'use client'
// src/app/c/[codigo]/page.tsx
// Lo que ve el coach / staff en su celular al escanear el QR de Front Desk.
import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion, animate } from 'framer-motion'
import { backend, SesionRequerida } from '@/lib/backend'

// ── Paleta ────────────────────────────────────────────────────────────────────
const C = {
  fondo:   '#0E2240',   // azul marino Navy
  capa:    '#16305A',
  linea:   '#244477',
  texto:   '#F2F5FA',
  suave:   '#9DB0CC',
  espera:  '#7FB2FF',
  ok:      '#34D399',
  error:   '#FB7185',
  aviso:   '#FBBF24',
}

const TZ = 'America/Mexico_City'
const hora = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: TZ }) : '—'

type Fase =
  | { tipo: 'ubicando' }
  | { tipo: 'enviando' }
  | { tipo: 'pendiente'; id: string; nombre: string; sucursal: string }
  | { tipo: 'confirmada'; datos: any }
  | { tipo: 'salida'; datos: any }
  | { tipo: 'rechazada'; motivo: string; nombre?: string }
  | { tipo: 'error'; motivo: string; titulo: string; mensaje: string; distancia?: number }
  | { tipo: 'sesion' }

const vibrar = (p: number | number[]) => { try { navigator.vibrate?.(p) } catch {} }

function ubicacion(): Promise<GeolocationPosition | null> {
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(resolve, () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 })
  })
}

// ══════════════════════════════════════════════════════════════════════════════
export default function EscaneoPage() {
  const { codigo } = useParams<{ codigo: string }>()
  const router = useRouter()
  const [fase, setFase] = useState<Fase>({ tipo: 'ubicando' })
  const yaEnvio = useRef(false)

  // 1. Ubicación → escanear
  useEffect(() => {
    if (yaEnvio.current || !codigo) return
    yaEnvio.current = true
    ;(async () => {
      const pos = await ubicacion()
      setFase({ tipo: 'enviando' })
      try {
        const r = await backend('/checador/escanear', {
          body: {
            codigo,
            latitud:     pos?.coords.latitude ?? null,
            longitud:    pos?.coords.longitude ?? null,
            precision_m: pos?.coords.accuracy ?? null,
          },
        })
        if (!r.ok) {
          vibrar([40, 60, 40])
          setFase({ tipo: 'error', motivo: r.motivo, titulo: r.titulo, mensaje: r.mensaje, distancia: r.distancia_m })
        } else if (r.tipo === 'salida') {
          vibrar(30)
          setFase({ tipo: 'salida', datos: r })
        } else if (r.estado === 'confirmada') {
          const datos = await backend(`/checador/estado/${r.checada_id}`)
          vibrar(30)
          setFase({ tipo: 'confirmada', datos })
        } else {
          setFase({ tipo: 'pendiente', id: r.checada_id, nombre: r.nombre, sucursal: r.sucursal })
        }
      } catch (e: any) {
        if (e instanceof SesionRequerida) setFase({ tipo: 'sesion' })
        else setFase({ tipo: 'error', motivo: 'otro', titulo: 'No se pudo registrar', mensaje: e.message })
      }
    })()
  }, [codigo])

  // 2. Mientras está pendiente, preguntar cada 1.5 s
  useEffect(() => {
    if (fase.tipo !== 'pendiente') return
    let vivo = true
    const inicio = Date.now()
    const t = setInterval(async () => {
      try {
        const d = await backend(`/checador/estado/${fase.id}`)
        if (!vivo) return
        if (d.estado === 'confirmada') { vibrar(30); setFase({ tipo: 'confirmada', datos: d }) }
        else if (d.estado === 'rechazada') { vibrar([40, 60, 40]); setFase({ tipo: 'rechazada', motivo: d.motivo, nombre: d.nombre }) }
        else if (Date.now() - inicio > 10 * 60 * 1000) {
          setFase({ tipo: 'error', motivo: 'tiempo', titulo: 'Front Desk no ha confirmado',
                    mensaje: 'Pídele a Front Desk que revise su pantalla. Tu entrada sigue registrada como pendiente.' })
        }
      } catch {}
    }, 1500)
    return () => { vivo = false; clearInterval(t) }
  }, [fase])

  return (
    <main className="min-h-[100dvh] w-full overflow-hidden" style={{ background: C.fondo, color: C.texto }}>
      <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-6 pb-10 pt-12">
        <AnimatePresence mode="wait">
          {(fase.tipo === 'ubicando' || fase.tipo === 'enviando') && (
            <Centro key="cargando">
              <Anillo color={C.espera} letra="" girando />
              <p className="mt-10 text-center text-lg font-semibold">
                {fase.tipo === 'ubicando' ? 'Confirmando que estás en la sucursal…' : 'Registrando…'}
              </p>
              {fase.tipo === 'ubicando' && (
                <p className="mt-2 text-center text-sm" style={{ color: C.suave }}>
                  Si tu celular lo pide, permite el acceso a tu ubicación.
                </p>
              )}
            </Centro>
          )}

          {fase.tipo === 'pendiente' && (
            <Centro key="pendiente">
              <Anillo color={C.espera} letra={(fase.nombre || '?').charAt(0)} radar />
              <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="mt-12 text-center text-2xl font-black tracking-tight">
                Esperando a Front Desk
              </motion.h1>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
                className="mt-2 text-center" style={{ color: C.suave }}>
                Tu entrada en {fase.sucursal} ya está registrada. En cuanto te confirmen, aquí aparece tu día.
              </motion.p>
            </Centro>
          )}

          {fase.tipo === 'confirmada' && <Bienvenida key="confirmada" datos={fase.datos} />}

          {fase.tipo === 'salida' && <Salida key="salida" datos={fase.datos} />}

          {fase.tipo === 'rechazada' && (
            <Centro key="rechazada">
              <Sacudida><Icono color={C.error} tipo="x" /></Sacudida>
              <h1 className="mt-10 text-center text-2xl font-black tracking-tight">Front Desk no confirmó tu entrada</h1>
              {fase.motivo && <p className="mt-3 text-center" style={{ color: C.suave }}>Motivo: {fase.motivo}</p>}
              <p className="mt-6 text-center text-sm" style={{ color: C.suave }}>Si es un error, acércate a Front Desk y vuelve a escanear.</p>
            </Centro>
          )}

          {fase.tipo === 'error' && fase.motivo === 'lejos' && (
            <Lejos key="lejos" titulo={fase.titulo} mensaje={fase.mensaje} distancia={fase.distancia || 0} />
          )}

          {fase.tipo === 'error' && fase.motivo !== 'lejos' && (
            <Centro key="error">
              <Sacudida>
                <Icono color={fase.motivo.startsWith('codigo') || fase.motivo === 'tiempo' ? C.aviso : C.error}
                       tipo={fase.motivo === 'sin_ubicacion' ? 'pin' : fase.motivo.startsWith('codigo') ? 'qr' : 'x'} />
              </Sacudida>
              <h1 className="mt-10 text-center text-2xl font-black tracking-tight">{fase.titulo}</h1>
              <p className="mt-3 text-center" style={{ color: C.suave }}>{fase.mensaje}</p>
              {fase.motivo === 'sin_ubicacion' && (
                <p className="mt-6 rounded-2xl p-4 text-sm leading-relaxed" style={{ background: C.capa, color: C.suave }}>
                  En iPhone: Ajustes → Privacidad → Localización → tu navegador → "Al usar la app".
                  En Android: toca el candado junto a la dirección y permite Ubicación. Luego vuelve a escanear.
                </p>
              )}
            </Centro>
          )}

          {fase.tipo === 'sesion' && (
            <Centro key="sesion">
              <Icono color={C.espera} tipo="llave" />
              <h1 className="mt-10 text-center text-2xl font-black tracking-tight">Inicia sesión una vez</h1>
              <p className="mt-3 text-center" style={{ color: C.suave }}>
                Entra con tu correo de Navy en este navegador. Después, cada vez que escanees, tu entrada se registra sola.
              </p>
              <button onClick={() => router.push('/login')}
                className="mt-8 w-full rounded-2xl py-4 text-base font-bold transition active:scale-[0.98]"
                style={{ background: C.texto, color: C.fondo }}>
                Iniciar sesión
              </button>
              <p className="mt-3 text-center text-xs" style={{ color: C.suave }}>
                El código que escaneaste ya venció; al terminar, escanea el de la pantalla otra vez.
              </p>
            </Centro>
          )}
        </AnimatePresence>
      </div>
    </main>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Piezas animadas
// ══════════════════════════════════════════════════════════════════════════════

function Centro({ children }: { children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-1 flex-col items-center justify-center">
      {children}
    </motion.section>
  )
}

/** El anillo que respira, con pulsos tipo radar mientras espera. */
function Anillo({ color, letra, radar = false, girando = false }: { color: string; letra: string; radar?: boolean; girando?: boolean }) {
  const quieto = useReducedMotion()
  return (
    <div className="relative grid h-44 w-44 place-items-center">
      {radar && !quieto && [0, 1, 2].map(i => (
        <motion.span key={i} className="absolute inset-0 rounded-full border-2" style={{ borderColor: color }}
          initial={{ scale: 1, opacity: 0.45 }} animate={{ scale: 2.1, opacity: 0 }}
          transition={{ duration: 2.4, delay: i * 0.8, repeat: Infinity, ease: 'easeOut' }} />
      ))}
      <motion.svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full"
        animate={quieto ? undefined : { rotate: 360 }}
        transition={{ duration: girando ? 1.4 : 6, repeat: Infinity, ease: 'linear' }}>
        <circle cx="50" cy="50" r="46" fill="none" stroke={color} strokeOpacity="0.18" strokeWidth="3" />
        <circle cx="50" cy="50" r="46" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
          strokeDasharray={girando ? '70 220' : '160 130'} />
      </motion.svg>
      <motion.div className="grid h-32 w-32 place-items-center rounded-full text-5xl font-black"
        style={{ background: C.capa, color }}
        animate={quieto ? undefined : { scale: [1, 1.04, 1] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}>
        {letra.toUpperCase()}
      </motion.div>
    </div>
  )
}

/** El círculo que se cierra y dibuja la palomita. */
function Palomita() {
  return (
    <div className="relative grid h-44 w-44 place-items-center">
      <motion.span className="absolute inset-0 rounded-full" style={{ background: C.ok }}
        initial={{ scale: 0.6, opacity: 0.35 }} animate={{ scale: 1.7, opacity: 0 }} transition={{ duration: 0.9, ease: 'easeOut' }} />
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <motion.circle cx="50" cy="50" r="46" fill="none" stroke={C.ok} strokeWidth="4" strokeLinecap="round"
          initial={{ pathLength: 0, rotate: -90 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{ originX: '50%', originY: '50%' }} />
        <motion.path d="M30 52 L44 66 L71 37" fill="none" stroke={C.ok} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35, delay: 0.45, ease: 'easeOut' }} />
      </svg>
    </div>
  )
}

function Sacudida({ children }: { children: React.ReactNode }) {
  const quieto = useReducedMotion()
  return (
    <motion.div animate={quieto ? undefined : { x: [0, -12, 12, -7, 7, 0] }} transition={{ duration: 0.5 }}>
      {children}
    </motion.div>
  )
}

function Icono({ color, tipo }: { color: string; tipo: 'x' | 'pin' | 'qr' | 'llave' | 'salida' }) {
  const trazos: Record<string, string> = {
    x:     'M34 34 L66 66 M66 34 L34 66',
    pin:   'M50 74 C50 74 30 54 30 42 a20 20 0 0 1 40 0 C70 54 50 74 50 74 Z M50 42 m-6 0 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0',
    qr:    'M32 32 h14 v14 h-14 Z M54 32 h14 v14 h-14 Z M32 54 h14 v14 h-14 Z M56 56 h4 M64 56 h4 M56 64 h12',
    llave: 'M42 50 a10 10 0 1 1 0.1 0 M52 50 H72 M64 50 v8 M70 50 v6',
    salida: 'M44 30 H32 V70 H44 M52 50 H74 M64 40 L74 50 L64 60',
  }
  return (
    <div className="grid h-36 w-36 place-items-center rounded-full" style={{ background: `${color}1f` }}>
      <svg viewBox="0 0 100 100" className="h-24 w-24">
        <motion.path d={trazos[tipo]} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, ease: 'easeOut' }} />
      </svg>
    </div>
  )
}

function Lejos({ titulo, mensaje, distancia }: { titulo: string; mensaje: string; distancia: number }) {
  const [km, setKm] = useState(0)
  useEffect(() => {
    const ctrl = animate(0, distancia / 1000, { duration: 1.1, ease: 'easeOut', onUpdate: v => setKm(v) })
    return () => ctrl.stop()
  }, [distancia])
  return (
    <Centro>
      <motion.div initial={{ y: -90, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 14 }}>
        <Icono color={C.aviso} tipo="pin" />
      </motion.div>
      <motion.span className="mt-4 h-2 w-20 rounded-full" style={{ background: `${C.aviso}33` }}
        initial={{ scaleX: 0.3 }} animate={{ scaleX: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.15 }} />
      <p className="mt-8 text-6xl font-black tabular-nums tracking-tight" style={{ color: C.aviso }}>{km.toFixed(1)} km</p>
      <h1 className="mt-3 text-center text-xl font-bold">{titulo.replace(/^Estás a [\d.]+ km de /, 'Estás lejos de ')}</h1>
      <p className="mt-2 text-center" style={{ color: C.suave }}>{mensaje}</p>
    </Centro>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// Confirmado: bienvenida + su día
// ══════════════════════════════════════════════════════════════════════════════

function Bienvenida({ datos }: { datos: any }) {
  const [listo, setListo] = useState(false)
  useEffect(() => { const t = setTimeout(() => setListo(true), 1100); return () => clearTimeout(t) }, [])

  return (
    <motion.section className="flex flex-1 flex-col" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <AnimatePresence mode="wait">
        {!listo ? (
          <motion.div key="check" className="flex flex-1 flex-col items-center justify-center"
            exit={{ opacity: 0, scale: 0.9, y: -30 }} transition={{ duration: 0.3 }}>
            <Palomita />
          </motion.div>
        ) : (
          <motion.div key="dia" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full" style={{ background: `${C.ok}26` }}>
                <svg viewBox="0 0 24 24" className="h-5 w-5"><path d="M5 12.5 9.5 17 19 7.5" fill="none" stroke={C.ok} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
              <p className="text-sm" style={{ color: C.suave }}>{datos.sucursal}, entrada a las {hora(datos.hora)}</p>
            </div>
            <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight">Bienvenido, {datos.nombre}</h1>

            {datos.vista === 'coach'
              ? <ClasesCoach clases={datos.clases || []} />
              : <DiaStaff turno={datos.turno} clases={datos.sucursal_hoy || []} />}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  )
}

function ClasesCoach({ clases }: { clases: any[] }) {
  const [abierta, setAbierta] = useState<string | null>(clases[0]?.id ?? null)
  const quieto = useReducedMotion()
  return (
    <div className="mt-8">
      <p className="mb-3 text-base font-semibold" style={{ color: C.suave }}>
        {clases.length === 1 ? 'Tu clase de hoy' : `Tus ${clases.length} clases de hoy`}
      </p>
      <div className="space-y-3">
        {clases.map((c, i) => {
          const llena = c.cupo > 0 ? Math.min(c.reservas / c.cupo, 1) : 0
          const abierto = abierta === c.id
          return (
            <motion.div key={c.id} layout
              initial={quieto ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: quieto ? 0 : 0.08 * i, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden rounded-3xl" style={{ background: C.capa }}>
              <button onClick={() => setAbierta(abierto ? null : c.id)} className="w-full p-5 text-left">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-3xl font-black tabular-nums tracking-tight">{hora(c.horario)}</span>
                  <span className="text-sm" style={{ color: C.suave }}>{c.duracion} min{c.room ? `, ${c.room}` : ''}</span>
                </div>
                <p className="mt-1 text-lg font-bold">{c.nombre}</p>
                <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full" style={{ background: C.linea }}>
                  <motion.div className="h-full rounded-full" style={{ background: C.ok }}
                    initial={{ width: 0 }} animate={{ width: `${llena * 100}%` }}
                    transition={{ delay: 0.25 + 0.08 * i, duration: 0.7, ease: 'easeOut' }} />
                </div>
                <p className="mt-2 text-sm" style={{ color: C.suave }}>
                  {c.reservas} de {c.cupo} reservados{c.lista_espera ? `, ${c.lista_espera} en lista de espera` : ''}
                </p>
              </button>
              <AnimatePresence initial={false}>
                {abierto && (
                  <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="border-t px-5" style={{ borderColor: C.linea }}>
                    {(c.alumnos || []).length === 0 && <li className="py-4 text-sm" style={{ color: C.suave }}>Todavía no hay reservas.</li>}
                    {(c.alumnos || []).map((a: any, j: number) => (
                      <li key={j} className="flex items-center justify-between gap-3 py-3 text-sm"
                          style={{ borderTop: j ? `1px solid ${C.linea}` : undefined }}>
                        <span className={a.lista_espera ? 'opacity-60' : ''}>{a.nombre}</span>
                        <span className="shrink-0 rounded-full px-2.5 py-0.5 text-xs"
                          style={{ background: C.fondo, color: a.lista_espera ? C.aviso : C.suave }}>
                          {a.lista_espera ? 'Lista de espera' : a.origen}
                        </span>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

function DiaStaff({ turno, clases }: { turno: any; clases: any[] }) {
  const [ahora, setAhora] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setAhora(Date.now()), 30000); return () => clearInterval(t) }, [])
  const mins = Math.max(0, Math.floor((ahora - new Date(turno?.entrada).getTime()) / 60000))
  const quieto = useReducedMotion()

  return (
    <div className="mt-8">
      <div className="rounded-3xl p-5" style={{ background: C.capa }}>
        <p className="text-sm" style={{ color: C.suave }}>Llevas</p>
        <p className="text-5xl font-black tabular-nums tracking-tight">{Math.floor(mins / 60)} h {String(mins % 60).padStart(2, '0')} min</p>
        <p className="mt-2 text-sm" style={{ color: C.suave }}>
          {turno?.salida_programada ? `Tu salida es a las ${hora(turno.salida_programada)}. Si se te olvida checar, se registra 10 min después.`
                                    : 'No tienes horario capturado para hoy: recuerda checar tu salida.'}
        </p>
      </div>

      <p className="mb-3 mt-8 text-base font-semibold" style={{ color: C.suave }}>Hoy en la sucursal</p>
      {clases.length === 0 && <p className="text-sm" style={{ color: C.suave }}>No hay clases programadas hoy.</p>}
      <ul className="space-y-2">
        {clases.map((c, i) => {
          const paso = new Date(c.horario).getTime() + c.duracion * 60000 < ahora
          return (
            <motion.li key={c.id} initial={quieto ? false : { opacity: 0, x: -12 }} animate={{ opacity: paso ? 0.45 : 1, x: 0 }}
              transition={{ delay: quieto ? 0 : 0.05 * i, duration: 0.35 }}
              className="flex items-center gap-4 rounded-2xl px-4 py-3" style={{ background: C.capa }}>
              <span className="w-14 shrink-0 text-lg font-black tabular-nums">{hora(c.horario)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{c.nombre}</span>
                <span className="block truncate text-sm" style={{ color: C.suave }}>
                  {c.coach || 'Sin coach asignado'}, {c.reservas}/{c.cupo}
                </span>
              </span>
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" title={c.coach_llego ? 'Ya llegó' : 'No ha llegado'}
                style={{ background: c.coach_llego ? C.ok : paso ? C.linea : C.aviso }} />
            </motion.li>
          )
        })}
      </ul>
      {clases.length > 0 && (
        <p className="mt-3 text-xs" style={{ color: C.suave }}>Punto verde: el coach ya checó. Amarillo: todavía no llega.</p>
      )}
    </div>
  )
}

function Salida({ datos }: { datos: any }) {
  const h = Math.floor((datos.minutos || 0) / 60), m = (datos.minutos || 0) % 60
  return (
    <Centro>
      <motion.div initial={{ rotate: -8, scale: 0.8, opacity: 0 }} animate={{ rotate: 0, scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}>
        <Icono color={C.espera} tipo="salida" />
      </motion.div>
      <h1 className="mt-10 text-center text-3xl font-black tracking-tight">Hasta luego, {datos.nombre}</h1>
      <p className="mt-2 text-center" style={{ color: C.suave }}>Tu salida de {datos.sucursal} quedó registrada.</p>
      <div className="mt-8 grid w-full grid-cols-3 overflow-hidden rounded-3xl text-center" style={{ background: C.capa }}>
        {[['Entrada', hora(datos.entrada)], ['Salida', hora(datos.salida)], ['Tiempo', `${h} h ${String(m).padStart(2, '0')}`]].map(([k, v]) => (
          <div key={k} className="p-4">
            <p className="text-xs" style={{ color: C.suave }}>{k}</p>
            <p className="mt-1 text-xl font-black tabular-nums">{v}</p>
          </div>
        ))}
      </div>
    </Centro>
  )
}
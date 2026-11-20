'use client'
// src/components/checador/vistas.tsx
// Piezas animadas del checador en el celular (las usan /c y /c/[codigo]).
import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion, animate } from 'framer-motion'

// Paleta de Navy: la misma del CRM (sidebar oscuro, blanco como color principal).
export const C = {
  fondo:   '#171B24',
  capa:    '#232B38',
  linea:   '#2A3344',
  texto:   '#FFFFFF',
  suave:   '#A0AABF',
  espera:  '#FFFFFF',
  ok:      '#34D399',
  error:   '#F87171',
  aviso:   '#FBBF24',
}

/** Marca de Navy arriba de cada pantalla (la misma del CRM). */
export function Marca({ detalle }: { detalle?: string | null }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-sm font-black text-black">N</span>
        <span className="text-sm font-black tracking-tight text-white">NAVY</span>
      </div>
      {detalle && <span className="text-sm" style={{ color: C.suave }}>{detalle}</span>}
    </div>
  )
}

const TZ = 'America/Mexico_City'
export const hora = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: TZ }) : '—'

// ══════════════════════════════════════════════════════════════════════════════
// Piezas animadas
// ══════════════════════════════════════════════════════════════════════════════

export function Centro({ children }: { children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-1 flex-col items-center justify-center">
      {children}
    </motion.section>
  )
}

/** El cuadro de Navy que respira, con pulsos hacia afuera y un trazo que recorre el borde mientras espera. */
export function Anillo({ color, letra, radar = false, girando = false }: { color: string; letra: string; radar?: boolean; girando?: boolean }) {
  const quieto = useReducedMotion()
  return (
    <div className="relative grid h-44 w-44 place-items-center">
      {radar && !quieto && [0, 1, 2].map(i => (
        <motion.span key={i} className="absolute inset-3 rounded-[2.25rem] border" style={{ borderColor: color }}
          initial={{ scale: 1, opacity: 0.35 }} animate={{ scale: 1.9, opacity: 0 }}
          transition={{ duration: 2.6, delay: i * 0.85, repeat: Infinity, ease: 'easeOut' }} />
      ))}
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        <rect x="3" y="3" width="94" height="94" rx="26" fill="none" stroke={color} strokeOpacity="0.14" strokeWidth="2" />
        <motion.rect x="3" y="3" width="94" height="94" rx="26" fill="none" stroke={color} strokeWidth="2.5"
          strokeLinecap="round" pathLength={100} strokeDasharray={girando ? '18 82' : '30 70'}
          animate={quieto ? undefined : { strokeDashoffset: [0, -100] }}
          transition={{ duration: girando ? 1.2 : 3.2, repeat: Infinity, ease: 'linear' }} />
      </svg>
      <motion.div className="grid h-28 w-28 place-items-center rounded-[1.75rem] text-5xl font-black"
        style={{ background: letra ? C.texto : C.capa, color: C.fondo }}
        animate={quieto ? undefined : { scale: [1, 1.035, 1] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}>
        {letra.toUpperCase()}
      </motion.div>
    </div>
  )
}

/** El círculo que se cierra y dibuja la palomita. */
export function Palomita() {
  return (
    <div className="relative grid h-44 w-44 place-items-center">
      <motion.span className="absolute inset-3 rounded-[2.25rem]" style={{ background: C.ok }}
        initial={{ scale: 0.7, opacity: 0.3 }} animate={{ scale: 1.6, opacity: 0 }} transition={{ duration: 0.9, ease: 'easeOut' }} />
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <motion.rect x="3" y="3" width="94" height="94" rx="26" fill="none" stroke={C.ok} strokeWidth="3.5" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, ease: 'easeOut' }} />
        <motion.path d="M30 52 L44 66 L71 37" fill="none" stroke={C.ok} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35, delay: 0.45, ease: 'easeOut' }} />
      </svg>
    </div>
  )
}

export function Sacudida({ children }: { children: React.ReactNode }) {
  const quieto = useReducedMotion()
  return (
    <motion.div animate={quieto ? undefined : { x: [0, -12, 12, -7, 7, 0] }} transition={{ duration: 0.5 }}>
      {children}
    </motion.div>
  )
}

export function Icono({ color, tipo }: { color: string; tipo: 'x' | 'pin' | 'qr' | 'llave' | 'salida' }) {
  const trazos: Record<string, string> = {
    x:     'M34 34 L66 66 M66 34 L34 66',
    pin:   'M50 74 C50 74 30 54 30 42 a20 20 0 0 1 40 0 C70 54 50 74 50 74 Z M50 42 m-6 0 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0',
    qr:    'M32 32 h14 v14 h-14 Z M54 32 h14 v14 h-14 Z M32 54 h14 v14 h-14 Z M56 56 h4 M64 56 h4 M56 64 h12',
    llave: 'M42 50 a10 10 0 1 1 0.1 0 M52 50 H72 M64 50 v8 M70 50 v6',
    salida: 'M44 30 H32 V70 H44 M52 50 H74 M64 40 L74 50 L64 60',
  }
  return (
    <div className="grid h-36 w-36 place-items-center rounded-[2rem]" style={{ background: `${color}1a` }}>
      <svg viewBox="0 0 100 100" className="h-24 w-24">
        <motion.path d={trazos[tipo]} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, ease: 'easeOut' }} />
      </svg>
    </div>
  )
}

export function Lejos({ titulo, mensaje, distancia }: { titulo: string; mensaje: string; distancia: number }) {
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

export function Bienvenida({ datos, conPalomita = true }: { datos: any; conPalomita?: boolean }) {
  const [listo, setListo] = useState(!conPalomita)
  useEffect(() => { if (!conPalomita) return; const t = setTimeout(() => setListo(true), 1100); return () => clearTimeout(t) }, [conPalomita])

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
              <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `${C.ok}26` }}>
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

export function ClasesCoach({ clases }: { clases: any[] }) {
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
                        <span className="shrink-0 rounded-md px-2 py-0.5 text-xs"
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

export function DiaStaff({ turno, clases }: { turno: any; clases: any[] }) {
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

export function Salida({ datos }: { datos: any }) {
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
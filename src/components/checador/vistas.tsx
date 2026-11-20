'use client'
// src/components/checador/vistas.tsx
// Piezas animadas del checador en el celular (las usan /c y /c/[codigo]).
import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion, animate } from 'framer-motion'

// Paleta de Navy: fondo blanco y detalles en negro, como el resto del CRM.
export const C = {
  fondo:   '#FFFFFF',
  capa:    '#F4F5F7',   // el gris de fondo del CRM
  linea:   '#E5E7EB',
  texto:   '#111827',
  suave:   '#6B7280',
  espera:  '#111827',
  ok:      '#10B981',
  error:   '#E11D48',
  aviso:   '#D97706',
}
const NEGRO_NAVY = '#171B24'  // el negro del sidebar del CRM

/** Logo oficial de Navy (versión blanca). Va en /public con este nombre. */
export const LOGO_NAVY_BLANCO = '/images/navy-white.png'

/** Marca de Navy arriba de cada pantalla: el logo oficial blanco sobre el negro de Navy
 *  (si el archivo todavía no está en /public, se muestra la "N" del CRM). */
export function Marca({ detalle }: { detalle?: string | null }) {
  const [sinLogo, setSinLogo] = useState(false)
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 min-w-9 place-items-center rounded-xl px-1.5" style={{ background: NEGRO_NAVY }}>
          {sinLogo ? (
            <span className="text-sm font-black text-white">N</span>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={LOGO_NAVY_BLANCO} alt="Navy Training Center" className="h-6 w-auto select-none"
                 draggable={false} onError={() => setSinLogo(true)} />
          )}
        </span>
        {sinLogo && <span className="text-sm font-black tracking-tight" style={{ color: C.texto }}>NAVY</span>}
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
        style={{ background: letra ? NEGRO_NAVY : C.capa, color: '#FFFFFF' }}
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
// Confirmado: "¡Listo!" y luego su día
// ══════════════════════════════════════════════════════════════════════════════

const saludo = () => {
  const h = Number(new Date().toLocaleString('es-MX', { hour: 'numeric', hour12: false, timeZone: TZ }))
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
}
const fechaHoy = () =>
  new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ }).replace(',', '')
const iniciales = (n: string) => (n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase()

function useAhora(ms = 1000) {
  const [t, setT] = useState(Date.now())
  useEffect(() => { const i = setInterval(() => setT(Date.now()), ms); return () => clearInterval(i) }, [ms])
  return t
}

export function Bienvenida({ datos, conPalomita = true }: { datos: any; conPalomita?: boolean }) {
  const [listo, setListo] = useState(!conPalomita)
  useEffect(() => { if (!conPalomita) return; const t = setTimeout(() => setListo(true), 1900); return () => clearTimeout(t) }, [conPalomita])

  return (
    <motion.section className="flex flex-1 flex-col" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <AnimatePresence mode="wait">
        {!listo ? (
          <motion.div key="listo" className="flex flex-1 flex-col items-center justify-center text-center"
            exit={{ opacity: 0, scale: 0.94, y: -24 }} transition={{ duration: 0.35 }}>
            <Palomita />
            <motion.h1 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, type: 'spring', stiffness: 260, damping: 20 }}
              className="mt-10 text-[40px] font-black leading-none tracking-tight">
              ¡Listo, {datos.nombre}!
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75 }}
              className="mt-3 text-[15px] leading-relaxed" style={{ color: C.suave }}>
              {datos.confirmado_por ? `${datos.confirmado_por} de Front Desk confirmó tu entrada` : 'Tu entrada quedó registrada'}
              <br />{hora(datos.hora)} · {datos.sucursal}
            </motion.p>
            <motion.div className="mt-7 flex gap-1.5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>
              {[0, 1, 2].map(i => (
                <motion.span key={i} className="h-1.5 rounded-full" style={{ background: C.texto }}
                  initial={{ width: 6, opacity: 0.25 }} animate={{ width: [6, 22, 6], opacity: [0.25, 1, 0.25] }}
                  transition={{ duration: 0.9, delay: 0.9 + i * 0.25, repeat: Infinity, repeatDelay: 0.3 }} />
              ))}
            </motion.div>
            <p className="mt-2.5 text-xs" style={{ color: C.suave }}>Abriendo tu día…</p>
          </motion.div>
        ) : (
          <motion.div key="dia" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
            <p className="mt-5 text-xs first-letter:uppercase" style={{ color: C.suave }}>{fechaHoy()}</p>
            <h1 className="mt-0.5 text-[32px] font-black leading-tight tracking-tight">{saludo()}, {datos.nombre}</h1>
            {datos.vista === 'coach'
              ? <ClasesCoach clases={datos.clases || []} quincena={datos.quincena} />
              : <DiaStaff turno={datos.turno} clases={datos.sucursal_hoy || []} quincena={datos.quincena} sucursal={datos.sucursal} />}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  )
}

/** Lista de alumnos que se despliega */
function Alumnos({ alumnos, oscuro = false }: { alumnos: any[]; oscuro?: boolean }) {
  return (
    <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
      {alumnos.length === 0 && <li className="pt-3 text-sm" style={{ color: oscuro ? 'rgba(255,255,255,.6)' : C.suave }}>Todavía no hay reservas.</li>}
      {alumnos.map((a: any, j: number) => (
        <li key={j} className="flex items-center justify-between gap-3 py-2.5 text-sm"
            style={{ borderTop: `1px solid ${oscuro ? 'rgba(255,255,255,.1)' : C.linea}` }}>
          <span className={a.lista_espera ? 'opacity-60' : ''}>{a.nombre}</span>
          <span className="shrink-0 rounded-md px-2 py-0.5 text-xs"
            style={{ background: oscuro ? 'rgba(255,255,255,.1)' : C.fondo, color: a.lista_espera ? C.aviso : oscuro ? 'rgba(255,255,255,.7)' : C.suave }}>
            {a.lista_espera ? 'Lista de espera' : a.origen}
          </span>
        </li>
      ))}
    </motion.ul>
  )
}

export function ClasesCoach({ clases, quincena }: { clases: any[]; quincena?: any }) {
  const ahora = useAhora(1000)
  const quieto = useReducedMotion()
  const [abierta, setAbierta] = useState<string | null>(null)

  const conTiempo = clases.map(c => {
    const ini = new Date(c.horario).getTime()
    return { ...c, ini, fin: ini + c.duracion * 60000 }
  })
  const proxima = conTiempo.find(c => c.fin > ahora)
  const despues = conTiempo.filter(c => c !== proxima && c.fin > ahora)
  const alumnosHoy = clases.reduce((a, c) => a + (c.reservas || 0), 0)

  let contador = '', leyenda = ''
  if (proxima) {
    if (proxima.ini > ahora) {
      const seg = Math.floor((proxima.ini - ahora) / 1000)
      const h = Math.floor(seg / 3600), m = Math.floor((seg % 3600) / 60), s2 = seg % 60
      contador = h > 0 ? `${h}:${String(m).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(s2).padStart(2, '0')}`
      leyenda = h > 0 ? 'horas para empezar' : 'min para empezar'
    } else {
      const resta = Math.ceil((proxima.fin - ahora) / 60000)
      contador = `${resta}`
      leyenda = 'min para terminar'
    }
  }
  const pct = proxima && proxima.cupo > 0 ? Math.min(100, (proxima.reservas / proxima.cupo) * 100) : 0

  return (
    <div className="mt-4">
      {proxima ? (
        <motion.div layout className="rounded-[26px] p-5 text-white" style={{ background: NEGRO_NAVY }}
          initial={quieto ? false : { opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}>
          <div className="flex justify-between text-[11px] font-semibold tracking-wide text-white/60">
            <span>{proxima.ini > ahora ? 'TU PRÓXIMA CLASE' : 'EN CURSO'}</span><span>{proxima.room || ''}</span>
          </div>
          <p className="mt-2 text-[19px] font-extrabold">{proxima.nombre} · {hora(proxima.horario)}</p>
          <div className="mt-1 flex items-end justify-between">
            <span className="text-[54px] font-black leading-none tracking-tight tabular-nums">{contador}</span>
            <span className="mb-1.5 text-[13px] text-white/75">{leyenda}</span>
          </div>
          <div className="mt-3.5 h-1.5 overflow-hidden rounded-full bg-white/20">
            <motion.i className="block h-full rounded-full bg-white" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.3, duration: 0.8 }} />
          </div>
          <button onClick={() => setAbierta(abierta === proxima.id ? null : proxima.id)}
            className="mt-2 flex w-full justify-between text-xs text-white/85">
            <span>{proxima.reservas} de {proxima.cupo} reservados</span>
            <span>{abierta === proxima.id ? 'Ocultar alumnos ↑' : 'Ver alumnos →'}</span>
          </button>
          <AnimatePresence initial={false}>
            {abierta === proxima.id && <Alumnos alumnos={proxima.alumnos || []} oscuro />}
          </AnimatePresence>
        </motion.div>
      ) : (
        <div className="rounded-[26px] p-6 text-white" style={{ background: NEGRO_NAVY }}>
          <p className="text-[11px] font-semibold tracking-wide text-white/60">HOY</p>
          <p className="mt-2 text-2xl font-black">Terminaste tus clases de hoy</p>
          <p className="mt-1 text-sm text-white/70">Recuerda checar tu salida en Front Desk.</p>
        </div>
      )}

      <div className="mt-3 grid grid-cols-3 gap-2">
        {[['Clases hoy', clases.length], ['Alumnos', alumnosHoy], ['Esta quincena', quincena?.clases ?? '—']].map(([t, v], i) => (
          <motion.div key={t as string} className="rounded-2xl p-3" style={{ background: C.capa }}
            initial={quieto ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.06 }}>
            <p className="text-[11px]" style={{ color: C.suave }}>{t}</p>
            <p className="text-xl font-black tracking-tight tabular-nums">{v}</p>
          </motion.div>
        ))}
      </div>

      {despues.length > 0 && <p className="mb-1 mt-4 text-sm font-extrabold">Después</p>}
      {despues.map((c, i) => {
        const abierto = abierta === c.id
        const avs = (c.alumnos || []).filter((a: any) => !a.lista_espera).slice(0, 4)
        return (
          <motion.div key={c.id} layout className="mt-2.5 rounded-[20px] px-4 py-3.5" style={{ background: C.capa }}
            initial={quieto ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.07 }}>
            <button onClick={() => setAbierta(abierto ? null : c.id)} className="w-full text-left">
              <div className="flex items-baseline justify-between">
                <b className="text-[22px] font-black tracking-tight tabular-nums">{hora(c.horario)}</b>
                <span className="text-xs" style={{ color: C.suave }}>{c.duracion} min{c.room ? ` · ${c.room}` : ''}</span>
              </div>
              <b className="text-base">{c.nombre}</b>
              <div className="mt-2.5 flex items-center justify-between">
                <div className="flex">
                  {avs.map((a: any, j: number) => (
                    <span key={j} className="grid h-[26px] w-[26px] place-items-center rounded-[9px] text-[10px] font-extrabold text-white"
                      style={{ background: NEGRO_NAVY, border: `2px solid ${C.capa}`, marginLeft: j ? -6 : 0 }}>{iniciales(a.nombre)}</span>
                  ))}
                  {c.reservas > avs.length && (
                    <span className="grid h-[26px] place-items-center rounded-[9px] px-1.5 text-[10px] font-extrabold"
                      style={{ background: C.linea, color: C.texto, border: `2px solid ${C.capa}`, marginLeft: avs.length ? -6 : 0 }}>
                      +{c.reservas - avs.length}
                    </span>
                  )}
                </div>
                <span className="text-[13px] font-bold">{c.reservas}/{c.cupo}{c.reservas >= c.cupo && c.cupo ? ' · llena' : ''}</span>
              </div>
            </button>
            <AnimatePresence initial={false}>{abierto && <Alumnos alumnos={c.alumnos || []} />}</AnimatePresence>
          </motion.div>
        )
      })}
    </div>
  )
}

export function DiaStaff({ turno, clases, quincena, sucursal }: { turno: any; clases: any[]; quincena?: any; sucursal?: string }) {
  const ahora = useAhora(30000)
  const quieto = useReducedMotion()
  const entrada = new Date(turno?.entrada).getTime()
  const salida = turno?.salida_programada ? new Date(turno.salida_programada).getTime() : null
  const mins = Math.max(0, Math.floor((ahora - entrada) / 60000))
  const faltan = salida ? Math.max(0, Math.ceil((salida - ahora) / 60000)) : null
  const pct = salida ? Math.min(100, Math.max(0, ((ahora - entrada) / (salida - entrada)) * 100)) : 0
  const hm = (m: number) => `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`

  const estado = (c: any) => {
    const ini = new Date(c.horario).getTime(), fin = ini + c.duracion * 60000
    if (fin < ahora) return { txt: 'Terminó', bg: C.linea, fg: C.suave, paso: true }
    if (c.coach_llego) return ini <= ahora ? { txt: 'En clase', bg: NEGRO_NAVY, fg: '#fff' } : { txt: 'Llegó', bg: '#D1FAE5', fg: '#047857' }
    if (ini - ahora <= 30 * 60000) return { txt: 'No ha llegado', bg: '#FEF3C7', fg: '#92400E' }
    return { txt: '—', bg: C.capa, fg: C.suave }
  }

  return (
    <div className="mt-4">
      <motion.div className="rounded-[26px] p-5 text-white" style={{ background: NEGRO_NAVY }}
        initial={quieto ? false : { opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}>
        <p className="text-[11px] font-semibold tracking-wide text-white/60">TU TURNO</p>
        <div className="mt-2 flex items-end justify-between">
          <span className="text-[44px] font-black leading-none tracking-tight tabular-nums">{hm(mins)}</span>
          {faltan != null && <span className="mb-1 text-[13px] text-white/75">faltan {hm(faltan)}</span>}
        </div>
        {salida ? (
          <>
            <div className="relative mt-4 h-2 rounded-full bg-white/20">
              <motion.i className="absolute inset-y-0 left-0 block rounded-full bg-white" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9 }} />
              <motion.span className="absolute -top-[5px] h-[18px] w-[18px] -translate-x-1/2 rounded-[7px] border-[3px]"
                style={{ background: C.ok, borderColor: NEGRO_NAVY }} initial={{ left: 0 }} animate={{ left: `${pct}%` }} transition={{ duration: 0.9 }} />
            </div>
            <div className="mt-2 flex justify-between text-xs text-white/85">
              <span>Entrada {hora(turno.entrada)}</span><span>Salida {hora(turno.salida_programada)}</span>
            </div>
          </>
        ) : (
          <p className="mt-3 text-sm text-white/70">Entraste a las {hora(turno?.entrada)}. No tienes horario capturado hoy: recuerda checar tu salida.</p>
        )}
      </motion.div>

      {quincena && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[['Días esta quincena', quincena.dias], ['Horas esta quincena', quincena.horas]].map(([t, v]) => (
            <div key={t as string} className="rounded-2xl p-3" style={{ background: C.capa }}>
              <p className="text-[11px]" style={{ color: C.suave }}>{t}</p>
              <p className="text-xl font-black tracking-tight tabular-nums">{v}</p>
            </div>
          ))}
        </div>
      )}

      <p className="mb-1 mt-5 text-sm font-extrabold">Hoy en {sucursal || 'la sucursal'}</p>
      {clases.length === 0 && <p className="text-sm" style={{ color: C.suave }}>No hay clases programadas hoy.</p>}
      {clases.map((c, i) => {
        const e = estado(c)
        return (
          <motion.div key={c.id} className="mt-2 flex items-center gap-3 rounded-[20px] px-3.5 py-3" style={{ background: C.capa }}
            initial={quieto ? false : { opacity: 0, x: -12 }} animate={{ opacity: e.paso ? 0.45 : 1, x: 0 }} transition={{ delay: 0.05 * i }}>
            <b className="w-[50px] shrink-0 text-[17px] font-black tabular-nums">{hora(c.horario)}</b>
            <div className="min-w-0 flex-1">
              <b className="block truncate text-sm">{c.nombre}</b>
              <p className="truncate text-xs" style={{ color: C.suave }}>{c.coach || 'Sin coach'} · {c.reservas}/{c.cupo}</p>
            </div>
            <span className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-extrabold" style={{ background: e.bg, color: e.fg }}>{e.txt}</span>
          </motion.div>
        )
      })}
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
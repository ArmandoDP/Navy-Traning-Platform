'use client'
// src/components/checador/frontdesk/FichaConfirmacion.tsx
// Pop-up con la ficha de quien acaba de escanear: coach (sus clases) o staff / The Galley (su horario).
import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { NEGRO, hora, horaCorta, MOTIVOS_RECHAZO, DIAS, ORDEN_SEMANA } from './util'

export default function FichaConfirmacion({ f, total, operador, onConfirmar, onRechazar }:
  { f: any; total: number; operador: string; onConfirmar: () => void; onRechazar: (m: string) => void }) {
  const quieto = useReducedMotion()
  const [rechazando, setRechazando] = useState(false)
  const [otro, setOtro] = useState('')
  const [enviando, setEnviando] = useState(false)

  const lejos = f.distancia_m != null && f.distancia_m > 300
  const noEsSuDia = !f.es_coach && f.dia_asignado === false
  const clases: any[] = f.clases || []
  const turnoHoy = f.horario?.hoy?.[0]
  const q = f.quincena || { dias: 0, horas: 0 }

  const ubicacion = f.distancia_m == null ? 'Sin dato' : f.distancia_m <= 300 ? 'En la sucursal' : `A ${Math.round(f.distancia_m)} m`
  const llegada = f.minutos_antes == null ? hora(f.hora)
    : f.minutos_antes > 0 ? `${f.minutos_antes} min antes`
    : f.minutos_antes < 0 ? `${-f.minutos_antes} min tarde` : 'A tiempo'

  const stats: [string, React.ReactNode][] = f.es_coach
    ? [['Ubicación', <><span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${f.distancia_m == null ? 'bg-gray-300' : lejos ? 'bg-amber-500' : 'bg-emerald-500'}`} />{ubicacion}</>],
       ['Clases hoy', `${clases.length} clase${clases.length === 1 ? '' : 's'}`],
       ['Primera clase', clases[0] ? hora(clases[0].horario) : '—']]
    : [['Turno de hoy', turnoHoy ? `${turnoHoy.entrada} – ${turnoHoy.salida}` : 'Sin turno'],
       ['Llegó', llegada],
       ['Esta quincena', `${q.dias} día${q.dias === 1 ? '' : 's'} · ${q.horas} h`]]

  const chips = f.es_coach ? ['Coach', f.nivel].filter(Boolean) : [f.puesto, f.tipo_pago].filter(Boolean)

  const accion = async (fn: () => void) => { if (enviando) return; setEnviando(true); await fn() }

  return (
    <motion.div className="w-full max-w-[600px] overflow-hidden rounded-[28px] bg-white shadow-2xl"
      initial={quieto ? { opacity: 0 } : { opacity: 0, y: 30, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={quieto ? { opacity: 0 } : { opacity: 0, y: -20, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 340, damping: 30 }}>

      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 text-[13px]">
        <span className="text-gray-500">Acaba de escanear · <b className="text-gray-900">entrada {hora(f.hora)}</b></span>
        <span className="rounded-full border border-gray-200 px-3 py-1 font-semibold text-gray-700">1 de {total} por confirmar</span>
      </div>

      {(lejos || noEsSuDia) && (
        <div className="mx-6 mt-4 flex gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            {lejos && `Su celular marcó a ${Math.round(f.distancia_m)} m de la sucursal. `}
            {noEsSuDia && 'Hoy no es su día según su horario. Si viene a cubrir a alguien, confírmalo; queda marcado para el gerente.'}
          </span>
        </div>
      )}

      <div className="px-6 pb-2 pt-6">
        <div className="flex items-center gap-4">
          <motion.div className="grid h-[76px] w-[76px] shrink-0 place-items-center rounded-[22px] text-[28px] font-black tracking-tight text-white"
            style={{ background: NEGRO }}
            initial={quieto ? false : { scale: 0.6, rotate: -8 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 16, delay: 0.08 }}>
            {f.iniciales}
          </motion.div>
          <div className="min-w-0">
            <h2 className="truncate text-[30px] font-black leading-tight tracking-tight text-gray-900">{f.nombre}</h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {chips.map((c: string, i: number) => (
                <span key={c} className={`rounded-full px-3 py-1 text-[13px] font-semibold ${i === 0 ? 'text-white' : 'border border-gray-200 text-gray-700'}`}
                      style={i === 0 ? { background: NEGRO } : undefined}>{c}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2.5">
          {stats.map(([t, v], i) => (
            <motion.div key={t} className="rounded-2xl bg-[#F4F5F7] px-3.5 py-3"
              initial={quieto ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 + i * 0.05 }}>
              <p className="text-xs text-gray-500">{t}</p>
              <b className="mt-0.5 flex items-center text-[17px] font-black tracking-tight text-gray-900">{v}</b>
            </motion.div>
          ))}
        </div>

        {f.es_coach ? (
          <>
            <p className="mt-5 text-sm font-extrabold text-gray-900">Sus clases de hoy</p>
            {clases.map((c: any, i: number) => {
              const pct = c.cupo > 0 ? Math.min(100, (c.reservas / c.cupo) * 100) : 0
              return (
                <motion.div key={c.id} className="grid grid-cols-[60px_minmax(0,1fr)_120px] items-center gap-3 border-t border-gray-100 py-3"
                  initial={quieto ? false : { opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.06 }}>
                  <b className="text-xl font-black tabular-nums text-gray-900">{horaCorta(c.horario)}</b>
                  <div className="min-w-0">
                    <b className="block truncate text-gray-900">{c.nombre}</b>
                    <p className="text-[13px] text-gray-500">{c.duracion} min{c.room ? ` · ${c.room}` : ''}</p>
                  </div>
                  <div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
                      <motion.i className="block h-full rounded-full" style={{ background: NEGRO }}
                        initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.3 + i * 0.06, duration: 0.6 }} />
                    </div>
                    <p className="mt-1 text-right text-xs text-gray-500">{c.reservas} de {c.cupo}{c.reservas >= c.cupo && c.cupo ? ' · llena' : ''}</p>
                  </div>
                </motion.div>
              )
            })}
          </>
        ) : (
          <>
            <p className="mt-5 text-sm font-extrabold text-gray-900">Su horario de la semana</p>
            <div className="mt-2.5 flex gap-1.5">
              {ORDEN_SEMANA.map(d => {
                const on = (f.horario?.dias || []).includes(d)
                const hoy = f.horario?.hoy_idx === d
                return (
                  <span key={d} className={`grid h-10 w-10 place-items-center rounded-xl text-[13px] font-extrabold ${on ? 'text-white' : 'bg-[#F4F5F7] text-gray-400'} ${hoy ? 'outline outline-2 outline-offset-2 outline-emerald-500' : ''}`}
                        style={on ? { background: NEGRO } : undefined}>{DIAS[d]}</span>
                )
              })}
            </div>
            {turnoHoy
              ? <p className="mt-3 text-[13px] text-gray-500">Si olvida checar su salida, se registra sola 10 min después de las {turnoHoy.salida}.</p>
              : (f.horario?.dias || []).length === 0 && <p className="mt-3 text-[13px] text-gray-500">Todavía no tiene horario capturado.</p>}
          </>
        )}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {!rechazando ? (
          <motion.div key="botones" className="grid grid-cols-[2fr_1fr] gap-2.5 px-6 pb-2 pt-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button onClick={() => accion(onConfirmar)} disabled={enviando}
              className="h-14 rounded-2xl text-base font-black text-white transition hover:brightness-125 active:scale-[0.98] disabled:opacity-60"
              style={{ background: NEGRO }}>
              Confirmar entrada
            </button>
            <button onClick={() => setRechazando(true)}
              className="h-14 rounded-2xl border-2 border-gray-200 text-base font-extrabold text-rose-600 transition hover:bg-rose-50 active:scale-[0.98]">
              No es él
            </button>
          </motion.div>
        ) : (
          <motion.div key="motivo" className="px-6 pb-2 pt-4" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <p className="mb-2 text-sm text-gray-500">¿Por qué no se confirma?</p>
            <div className="flex flex-wrap gap-2">
              {MOTIVOS_RECHAZO.map(m => (
                <button key={m} onClick={() => accion(() => onRechazar(m))}
                  className="rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">{m}</button>
              ))}
              <input value={otro} onChange={e => setOtro(e.target.value)} placeholder="Otro motivo"
                className="min-w-[9rem] flex-1 rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-gray-400"
                onKeyDown={e => { if (e.key === 'Enter' && otro.trim()) accion(() => onRechazar(otro.trim())) }} />
              <button disabled={!otro.trim()} onClick={() => accion(() => onRechazar(otro.trim()))}
                className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40">Rechazar</button>
              <button onClick={() => setRechazando(false)} className="px-2 py-2.5 text-sm text-gray-400 hover:text-gray-600">Volver</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <p className="pb-5 pt-2 text-center text-xs text-gray-400">Se registra con tu nombre{operador ? `: ${operador}` : ''}</p>
    </motion.div>
  )
}
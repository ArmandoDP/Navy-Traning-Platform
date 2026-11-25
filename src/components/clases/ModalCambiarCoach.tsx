'use client'
// src/components/clases/ModalCambiarCoach.tsx
// Cambiar el coach de una clase: elige quién la cubre, el motivo y si se avisa por correo.
// El cambio queda registrado (de ahí sale la suplencia en la quincena del coach).
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Search, AlertTriangle, Check, Mail, RefreshCw } from 'lucide-react'
import { backend } from '@/lib/backend'

const NEGRO = '#171B24'
const input = 'w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-400 focus:bg-white'
const quitar = (s = '') => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

export default function ModalCambiarCoach({ claseId, abierto, onClose, onCambiado }:
  { claseId: string | null; abierto: boolean; onClose: () => void; onCambiado: (r: any) => void }) {
  const [d, setD] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [coach, setCoach] = useState<string>('')
  const [motivo, setMotivo] = useState('')
  const [detalle, setDetalle] = useState('')
  const [avisar, setAvisar] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [choque, setChoque] = useState<string | null>(null)

  useEffect(() => {
    if (!abierto || !claseId) return
    setD(null); setError(null); setBusca(''); setCoach(''); setMotivo(''); setDetalle(''); setAvisar(true); setChoque(null)
    backend(`/cambio-coach/${claseId}/opciones`).then(setD).catch((e: any) => setError(e.message))
  }, [abierto, claseId])

  const elegido = d?.coaches.find((c: any) => c.id === coach)
  const q = quitar(busca)
  const lista = (d?.coaches || []).filter((c: any) => !q || quitar(c.nombre).includes(q))
  const listo = coach && motivo && (motivo !== 'Otro' || detalle.trim())

  const guardar = async (forzar = false) => {
    setGuardando(true); setError(null)
    try {
      const r = await backend(`/cambio-coach/${claseId}`, { body: { coach_id: coach, motivo, detalle, avisar, forzar } })
      onCambiado(r)
    } catch (e: any) {
      if (/ya tiene otra clase/.test(e.message)) setChoque(e.message)
      else setError(e.message)
    }
    setGuardando(false)
  }

  return (
    <AnimatePresence>
      {abierto && (
        <motion.div className="fixed inset-0 z-[80] grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-gray-900/45 backdrop-blur-[2px]" onClick={onClose} />
          <motion.div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl"
            initial={{ y: 20, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 10, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}>
            <header className="flex items-start justify-between gap-3 px-6 py-5 text-white" style={{ background: NEGRO }}>
              <div>
                <h3 className="text-lg font-black tracking-tight">Cambiar coach</h3>
                {d && <p className="mt-0.5 text-xs text-white/60">{d.clase.nombre} · {d.clase.cuando} · {d.clase.sucursal}</p>}
              </div>
              <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-xl text-white/60 hover:bg-white/10 hover:text-white"><X size={16} /></button>
            </header>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
              {!d && !error && <div className="flex h-32 items-center justify-center gap-2 text-gray-400"><RefreshCw size={15} className="animate-spin" /> Cargando…</div>}
              {d?.quincena_cerrada && (
                <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">La quincena de esta clase ya está cerrada: ya no se puede cambiar el coach.</p>
              )}
              {d && !d.quincena_cerrada && (
                <>
                  <div>
                    <p className="mb-1.5 text-xs font-bold text-gray-500">¿Quién la va a dar?</p>
                    {elegido ? (
                      <div className="flex items-center justify-between rounded-xl border border-[#171B24] px-3.5 py-2.5">
                        <div><b className="text-sm text-gray-900">{elegido.nombre}</b><span className="ml-2 text-xs text-gray-400">{elegido.nivel || 'Sin nivel'}</span></div>
                        <button onClick={() => { setCoach(''); setChoque(null) }} className="text-xs font-bold text-gray-500 hover:text-gray-900">Cambiar</button>
                      </div>
                    ) : (
                      <>
                        <div className="relative">
                          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input autoFocus value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar coach…" className={`${input} pl-9`} />
                        </div>
                        <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
                          {lista.map((c: any) => (
                            <button key={c.id} onClick={() => setCoach(c.id)}
                              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-gray-50">
                              <span className="text-sm"><b className="text-gray-900">{c.nombre}</b><span className="ml-2 text-xs text-gray-400">{c.nivel || 'Sin nivel'}</span></span>
                              <span className="flex gap-1 text-[10px] font-bold">
                                {c.ocupado && <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-amber-800">Tiene otra clase</span>}
                                {!c.de_la_sucursal && <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-gray-500">Otra sucursal</span>}
                              </span>
                            </button>
                          ))}
                          {lista.length === 0 && <p className="px-3 py-2 text-sm text-gray-400">Sin resultados.</p>}
                        </div>
                      </>
                    )}
                  </div>

                  <div>
                    <p className="mb-1.5 text-xs font-bold text-gray-500">Motivo</p>
                    <div className="flex flex-wrap gap-1.5">
                      {d.motivos.map((m: string) => (
                        <button key={m} onClick={() => setMotivo(m)}
                          className={`rounded-xl border px-3 py-1.5 text-[13px] font-bold transition ${motivo === m ? 'border-[#171B24] bg-[#171B24] text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>{m}</button>
                      ))}
                    </div>
                    {(motivo === 'Otro' || motivo) && (
                      <input value={detalle} onChange={e => setDetalle(e.target.value)} className={`${input} mt-2`}
                        placeholder={motivo === 'Otro' ? 'Escribe el motivo (obligatorio)' : 'Detalle (opcional)'} />
                    )}
                  </div>

                  <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-gray-200 p-3">
                    <input type="checkbox" checked={avisar} onChange={e => setAvisar(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#171B24]" />
                    <span className="text-sm"><b className="flex items-center gap-1.5 text-gray-900"><Mail size={13} /> Avisar por correo a los dos coaches</b>
                      <span className="block text-xs text-gray-500">Solo si la clase todavía no empieza.{elegido && !elegido.tiene_correo ? ` ${elegido.nombre} no tiene correo.` : ''}</span></span>
                  </label>

                  {choque && (
                    <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                      <span>{choque} ¿Cambiar de todos modos?</span>
                    </div>
                  )}

                  {d.historial.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs font-bold text-gray-500">Cambios anteriores de esta clase</p>
                      {d.historial.map((h: any, i: number) => (
                        <p key={i} className="border-t border-gray-100 py-1.5 text-xs text-gray-600">
                          <b>{h.antes}</b> → <b>{h.despues}</b> · {h.motivo}{h.detalle ? ` (${h.detalle})` : ''} · {h.quien}
                        </p>
                      ))}
                    </div>
                  )}
                </>
              )}
              {error && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</p>}
            </div>

            <footer className="flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-4">
              <button onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50">Cancelar</button>
              {choque ? (
                <button onClick={() => guardar(true)} disabled={guardando} className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-40">
                  {guardando ? 'Cambiando…' : 'Sí, cambiar'}
                </button>
              ) : (
                <button onClick={() => guardar(false)} disabled={!listo || guardando || d?.quincena_cerrada}
                  className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black text-white transition hover:brightness-125 disabled:opacity-40" style={{ background: NEGRO }}>
                  <Check size={15} /> {guardando ? 'Cambiando…' : 'Cambiar coach'}
                </button>
              )}
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
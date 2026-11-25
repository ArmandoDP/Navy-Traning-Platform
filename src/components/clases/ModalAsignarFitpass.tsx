'use client'
// src/components/clases/ModalAsignarFitpass.tsx
// Asignar un lugar apartado de Fitpass a quien llega a recepción. Si ya vino antes se busca;
// si es nueva se da de alta en 10 segundos (nombre y teléfono; correo y código opcionales).
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Search, Check, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { backend } from '@/lib/backend'
import { NEGRO, CANALES } from './marca'

const input = 'w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-400 focus:bg-white'

export default function ModalAsignarFitpass({ lugar, clase, onClose, onListo }:
  { lugar: { reserva_id: string; numero?: number | null } | null; clase: any; onClose: () => void; onListo: (msg: string) => void }) {
  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState<any[]>([])
  const [elegido, setElegido] = useState<any>(null)
  const [f, setF] = useState({ nombre: '', telefono: '', email: '', codigo: '' })
  const [guardando, setGuardando] = useState<null | 'solo' | 'llegada'>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!lugar) return
    setBusca(''); setResultados([]); setElegido(null); setF({ nombre: '', telefono: '', email: '', codigo: '' }); setError(null)
  }, [lugar])

  // Busca a quien ya vino antes (primero los de Fitpass)
  useEffect(() => {
    const q = busca.trim()
    if (q.length < 2) { setResultados([]); return }
    const t = setTimeout(async () => {
      const { data } = await supabase.from('clientes').select('id, nombre_completo, email, telefono, origen')
        .or(`nombre_completo.ilike.%${q}%,email.ilike.%${q}%,telefono.ilike.%${q.replace(/\D/g, '') || q}%`).limit(6)
      setResultados(((data as any[]) || []).sort((a, b) => (b.origen === 'Fitpass' ? 1 : 0) - (a.origen === 'Fitpass' ? 1 : 0)))
    }, 250)
    return () => clearTimeout(t)
  }, [busca])

  const nuevoValido = f.nombre.trim().length >= 3 && f.telefono.replace(/\D/g, '').length >= 10
  const listo = !!elegido || nuevoValido

  const asignar = async (llegada: boolean) => {
    setGuardando(llegada ? 'llegada' : 'solo'); setError(null)
    try {
      const r = await backend('/fitpass/asignar', { body: {
        reserva_id: lugar!.reserva_id, llegada,
        ...(elegido ? { cliente_id: elegido.id } : { nombre: f.nombre, telefono: f.telefono, email: f.email || null, codigo: f.codigo || null }),
      } })
      onListo(`${r.cliente.nombre} ${llegada ? 'ya está en la clase' : 'tiene su lugar'}${lugar?.numero ? ` (lugar ${lugar.numero})` : ''}.`)
    } catch (e: any) { setError(e.message) }
    setGuardando(null)
  }

  return (
    <AnimatePresence>
      {lugar && (
        <motion.div className="fixed inset-0 z-[80] grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-gray-900/45 backdrop-blur-[2px]" onClick={onClose} />
          <motion.div className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl"
            initial={{ y: 20, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 10, opacity: 0 }} transition={{ type: 'spring', stiffness: 340, damping: 30 }}>
            <header className="flex items-start justify-between gap-3 px-6 py-5 text-white" style={{ background: NEGRO }}>
              <div>
                <h3 className="flex items-center gap-2 text-lg font-black tracking-tight">
                  <span className="grid h-7 w-7 place-items-center rounded-lg text-xs font-black" style={{ background: CANALES.fitpass.color }}>F</span>
                  Asignar lugar{lugar.numero ? ` ${lugar.numero}` : ''} · Fitpass
                </h3>
                <p className="mt-0.5 text-xs text-white/55">{(clase?.nombre_clase || '').trim()}</p>
              </div>
              <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-xl text-white/60 hover:bg-white/10 hover:text-white"><X size={16} /></button>
            </header>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
              {elegido ? (
                <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <div><b className="text-sm text-gray-900">{elegido.nombre_completo}</b><p className="text-xs text-gray-500">{elegido.telefono || elegido.email || ''}</p></div>
                  <button onClick={() => setElegido(null)} className="text-xs font-bold text-gray-500 hover:text-gray-900">Cambiar</button>
                </div>
              ) : (
                <>
                  <div>
                    <p className="mb-1 text-xs font-bold text-gray-500">¿Ya vino antes?</p>
                    <div className="relative">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input autoFocus value={busca} onChange={e => setBusca(e.target.value)} placeholder="Nombre, teléfono o correo…" className={`${input} pl-9`} />
                    </div>
                    {resultados.length > 0 && (
                      <div className="mt-1.5 space-y-0.5">
                        {resultados.map(c => (
                          <button key={c.id} onClick={() => setElegido(c)} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-gray-50">
                            <span className="text-sm"><b className="text-gray-900">{c.nombre_completo}</b><span className="ml-2 text-xs text-gray-400">{c.telefono || c.email || ''}</span></span>
                            {c.origen === 'Fitpass' && <span className="rounded-md px-1.5 py-0.5 text-[10px] font-black" style={{ background: CANALES.fitpass.fondo, color: CANALES.fitpass.texto }}>Fitpass</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs font-bold text-gray-500">¿Es nueva? Captura sus datos</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input value={f.nombre} onChange={e => setF({ ...f, nombre: e.target.value })} placeholder="Nombre *" className={input} />
                      <input value={f.telefono} onChange={e => setF({ ...f, telefono: e.target.value.replace(/[^\d ]/g, '') })} placeholder="Teléfono *" inputMode="tel" className={input} />
                      <input value={f.email} onChange={e => setF({ ...f, email: e.target.value })} placeholder="Correo (opcional)" className={input} />
                      <input value={f.codigo} onChange={e => setF({ ...f, codigo: e.target.value })} placeholder="Código Fitpass (opcional)" className={input} />
                    </div>
                  </div>
                </>
              )}
              {error && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</p>}
            </div>

            <footer className="flex gap-2 border-t border-gray-100 px-6 py-4">
              <button onClick={() => asignar(false)} disabled={!listo || !!guardando}
                className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40">
                {guardando === 'solo' ? 'Asignando…' : 'Solo asignar'}
              </button>
              <button onClick={() => asignar(true)} disabled={!listo || !!guardando}
                className="flex flex-[1.4] items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-black text-white hover:bg-emerald-600 disabled:opacity-40">
                {guardando === 'llegada' ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Asignar y marcar llegada
              </button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
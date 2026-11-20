'use client'
// src/components/checador/frontdesk/AdentroAhora.tsx
import { AnimatePresence, motion } from 'framer-motion'
import { Tarjeta, Vacio } from './ui'
import { NEGRO, hora } from './util'

export default function AdentroAhora({ adentro }: { adentro: any[] }) {
  return (
    <Tarjeta titulo="Adentro ahora" extra={String(adentro.length)} className="flex-1">
      {adentro.length === 0 && <Vacio texto="Todavía no hay nadie adentro." />}
      <AnimatePresence initial={false}>
        {adentro.map((a: any) => (
          <motion.div key={a.nombre + a.desde} layout initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2.5 border-t border-gray-100 py-2 first:border-t-0">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-black text-white" style={{ background: NEGRO }}>{a.iniciales}</span>
            <div className="min-w-0 flex-1">
              <b className="block truncate text-sm text-gray-900">{a.nombre}</b>
              <p className="text-xs text-gray-500">desde {hora(a.desde)}</p>
            </div>
            <span className="shrink-0 rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-500">{a.puesto}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </Tarjeta>
  )
}
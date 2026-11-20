'use client'
// src/components/checador/frontdesk/ui.tsx
// Piezas básicas del tablero: número del día y tarjeta con lista desplazable.
import { motion } from 'framer-motion'

export function Kpi({ titulo, valor, sub, rojo }: { titulo: string; valor?: number; sub: string; rojo?: boolean }) {
  return (
    <div className="rounded-[18px] border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-gray-500">{titulo}</p>
      <motion.p key={valor} initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className={`mt-0.5 text-3xl font-black tracking-tight tabular-nums ${rojo ? 'text-rose-600' : 'text-gray-900'}`}>
        {valor ?? '–'}
      </motion.p>
      <p className="mt-0.5 truncate text-xs text-gray-500">{sub}</p>
    </div>
  )
}

/** Tarjeta que ocupa el alto disponible: el título queda fijo y la lista se desplaza por dentro. */
export function Tarjeta({ titulo, extra, children, className = '' }:
  { titulo: string; extra?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex min-h-0 flex-col rounded-[18px] border border-gray-200 bg-white shadow-sm ${className}`}>
      <div className="flex shrink-0 items-center justify-between px-4 pb-2 pt-4">
        <b className="text-gray-900">{titulo}</b>
        {extra && <span className="text-xs text-gray-400">{extra}</span>}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3 [scrollbar-width:thin]">{children}</div>
    </div>
  )
}

export function Vacio({ texto }: { texto: string }) {
  return <p className="py-3 text-sm text-gray-400">{texto}</p>
}
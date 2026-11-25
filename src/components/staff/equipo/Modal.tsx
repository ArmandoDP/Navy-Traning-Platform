'use client'
// src/components/staff/equipo/Modal.tsx
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { NEGRO } from './util'

export default function Modal({ abierto, titulo, subtitulo, onClose, children, pie, ancho = 'max-w-lg' }: {
  abierto: boolean; titulo: string; subtitulo?: string; onClose: () => void
  children: React.ReactNode; pie?: React.ReactNode; ancho?: string
}) {
  return (
    <AnimatePresence>
      {abierto && (
        <motion.div className="fixed inset-0 z-[70] grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-[2px]" onClick={onClose} />
          <motion.div className={`relative flex max-h-[90vh] w-full ${ancho} flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl`}
            initial={{ y: 20, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 10, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}>
            <header className="flex items-start justify-between gap-3 px-6 py-5 text-white" style={{ background: NEGRO }}>
              <div>
                <h3 className="text-lg font-black tracking-tight">{titulo}</h3>
                {subtitulo && <p className="mt-0.5 text-xs text-white/55">{subtitulo}</p>}
              </div>
              <button onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-white/60 hover:bg-white/10 hover:text-white"><X size={16} /></button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-6">{children}</div>
            {pie && <footer className="flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-4">{pie}</footer>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export const inputCls = 'w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-400 focus:bg-white'

export function BotonNegro({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...p} className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black text-white transition hover:brightness-125 disabled:opacity-40 ${p.className || ''}`}
      style={{ background: NEGRO }}>{children}</button>
  )
}

export function BotonBlanco({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...p} className={`flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:opacity-40 ${p.className || ''}`}>
      {children}
    </button>
  )
}
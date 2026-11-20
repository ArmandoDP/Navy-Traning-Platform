'use client'
// src/components/checador/frontdesk/Alertas.tsx
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { horaCorta } from './util'

export default function Alertas({ alertas }: { alertas: any[] }) {
  return (
    <div className="max-h-[120px] shrink-0 space-y-2 overflow-y-auto [scrollbar-width:thin]">
      <AnimatePresence initial={false}>
        {alertas.map((a: any, i: number) => (
          <motion.div key={`${a.clase}-${a.horario}`} layout
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-amber-200"><AlertTriangle size={16} /></span>
            {a.tipo === 'sin_coach'
              ? <span><b>{a.clase}</b> de las {horaCorta(a.horario)} no tiene coach asignado.</span>
              : <span><b>{a.coach || 'El coach'} no ha checado</b> y su clase de {a.clase} empieza a las {horaCorta(a.horario)}. Si no llega, avisa al gerente para cubrirla.</span>}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
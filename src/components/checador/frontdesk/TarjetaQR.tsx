'use client'
// src/components/checador/frontdesk/TarjetaQR.tsx
// La tarjeta negra con el QR de un solo uso. Ocupa todo el alto de la columna.
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { NEGRO, hora } from './util'

export type QR = { url: string; vida: number; expira: number; n: number }

const PASOS = [
  'Abre la cámara de tu celular y apunta al código',
  'Se abre tu checador con tu sesión de Navy',
  'Front Desk confirma que eres tú',
]

export default function TarjetaQR({ qr, ahora, ultima }: { qr: QR | null; ahora: number; ultima?: any }) {
  const quieto = useReducedMotion()
  const quedan = qr ? Math.max(0, Math.ceil((qr.expira - ahora) / 1000)) : 0

  return (
    <section className="flex h-full min-h-0 flex-col rounded-[22px] p-5 text-white" style={{ background: NEGRO }}>
      <div className="flex shrink-0 items-center justify-between">
        <span className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/navy-icon-white.png" alt="Navy" className="h-7 w-auto select-none" draggable={false} />
          <b className="text-[15px]">Escanea para checar</b>
        </span>
        <span className="text-xs text-white/60">Entrada y salida</span>
      </div>

      {/* El QR se ajusta al espacio que quede: siempre cuadrado */}
      <div className="mt-4 flex min-h-[220px] flex-1 items-center justify-center [container-type:size]">
        <div className="relative aspect-square w-[min(100cqw,100cqh)] overflow-hidden rounded-[20px] bg-white">
          <AnimatePresence mode="popLayout">
            {qr && (
              <motion.div key={qr.n} className="absolute inset-[6%]"
                initial={quieto ? { opacity: 0 } : { opacity: 0, scale: 1.06, filter: 'blur(6px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={quieto ? { opacity: 0 } : { opacity: 0, scale: 0.86, filter: 'blur(10px)' }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
                <QRCodeSVG value={qr.url} size={512} level="M" fgColor="#111827" style={{ width: '100%', height: '100%' }} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-4 h-1.5 shrink-0 overflow-hidden rounded-full bg-white/15">
        {qr && (
          <motion.i key={qr.n} className="block h-full rounded-full bg-white"
            initial={{ width: '100%' }} animate={{ width: '0%' }} transition={{ duration: qr.vida, ease: 'linear' }} />
        )}
      </div>
      <div className="mt-1.5 flex shrink-0 justify-between text-xs text-white/70">
        <span>Código de un solo uso</span><span className="tabular-nums">Nuevo en {quedan} s</span>
      </div>

      <div className="mt-4 shrink-0 space-y-2.5 border-t border-white/10 pt-4 text-sm">
        {PASOS.map((t, i) => (
          <p key={i} className="flex items-center gap-3">
            <b className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-white/10 text-xs">{i + 1}</b>{t}
          </p>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {ultima && (
          <motion.div key={ultima.hora} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mt-4 flex shrink-0 items-center gap-3 rounded-2xl bg-white/[.07] px-3.5 py-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-xs font-black text-black">{ultima.iniciales}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-white/60">Última entrada</p>
              <b className="block truncate text-sm">{ultima.nombre} · {hora(ultima.hora)}</b>
            </div>
            <span className="text-[11px] font-extrabold text-emerald-400">Confirmada</span>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
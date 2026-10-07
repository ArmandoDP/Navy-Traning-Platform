'use client'
// src/app/pago/completado/page.tsx
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL
const COLORES = ['#22c55e', '#86efac', '#ffffff', '#6366f1', '#fbbf24']

function Confeti() {
  const piezas = useMemo(() => Array.from({ length: 70 }, (_, i) => ({
    left:  Math.random() * 100,
    delay: Math.random() * 0.8,
    dur:   2.6 + Math.random() * 1.8,
    size:  6 + Math.random() * 6,
    rot:   Math.random() * 360,
    color: COLORES[i % COLORES.length],
    redondo: i % 3 === 0,
  })), [])
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {piezas.map((p, i) => (
        <span key={i} className="absolute top-[-20px] confeti"
          style={{
            left: `${p.left}%`, width: p.size, height: p.redondo ? p.size : p.size * 0.45,
            background: p.color, borderRadius: p.redondo ? '50%' : 2,
            animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, transform: `rotate(${p.rot}deg)`,
          }} />
      ))}
    </div>
  )
}

function Contenido() {
  const sp        = useSearchParams()
  const sessionId = sp.get('session_id')
  const canal     = sp.get('canal')
  const [estado, setEstado] = useState<any>(null)

  useEffect(() => {
    if (canal === 'app' && sessionId) {
      window.location.href = `navyapp://pago/completado?session_id=${sessionId}`
    }
    if (sessionId) {
      fetch(`${BACKEND}/stripe/sesion/${sessionId}`).then(r => r.json()).then(setEstado).catch(() => {})
    }
  }, [canal, sessionId])

  const oxxo  = estado?.estado === 'pendiente_oxxo'
  const color = oxxo ? '#f59e0b' : '#22c55e'

  return (
    <div className="min-h-screen bg-[#0a1628] flex items-center justify-center p-6 overflow-hidden">
      <style>{`
        @keyframes caer    { 0% { transform: translateY(0) rotate(0); opacity: 1 } 100% { transform: translateY(110vh) rotate(720deg); opacity: .9 } }
        @keyframes entrar  { 0% { transform: scale(0); opacity: 0 } 60% { transform: scale(1.12); opacity: 1 } 100% { transform: scale(1) } }
        @keyframes halo    { 0%, 100% { transform: scale(1); opacity: .55 } 50% { transform: scale(1.18); opacity: .15 } }
        @keyframes dibujar { to { stroke-dashoffset: 0 } }
        @keyframes subir   { from { transform: translateY(14px); opacity: 0 } to { transform: none; opacity: 1 } }
        .confeti { animation-name: caer; animation-timing-function: cubic-bezier(.25,.6,.5,1); animation-fill-mode: forwards }
        .entrar  { animation: entrar .6s cubic-bezier(.34,1.56,.64,1) both }
        .halo    { animation: halo 2.2s ease-in-out infinite }
        .trazo   { stroke-dasharray: 60; stroke-dashoffset: 60; animation: dibujar .5s .45s ease-out forwards }
        .subir   { animation: subir .5s ease-out both }
      `}</style>

      {!oxxo && estado && <Confeti />}

      <div className="relative w-full max-w-md text-center">
        <img src="/email/logo-navy.png" alt="Navy Training Center"
          className="mx-auto mb-10 h-10 w-auto subir" style={{ filter: 'brightness(0) invert(1)' }} />

        <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
          <div className="halo absolute inset-0 rounded-full" style={{ background: `${color}40` }} />
          <div className="entrar relative w-24 h-24 rounded-full flex items-center justify-center shadow-2xl" style={{ background: color }}>
            {oxxo ? (
              <span className="text-4xl">🧾</span>
            ) : (
              <svg width="46" height="46" viewBox="0 0 24 24" fill="none">
                <path className="trazo" d="M5 12.5l4.5 4.5L19 7.5" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        </div>

        <h1 className="text-white text-3xl font-black mt-8 subir" style={{ animationDelay: '.5s' }}>
          {oxxo ? 'Tu ficha OXXO está lista' : '¡Pago recibido!'}
        </h1>
        <p className="text-slate-400 mt-3 leading-relaxed subir" style={{ animationDelay: '.6s' }}>
          {oxxo
            ? 'Paga en cualquier OXXO en los próximos 3 días. Tu paquete se activa en cuanto se acredite.'
            : 'Te enviamos tu comprobante por correo. Tu paquete ya está listo en la app de Navy.'}
        </p>

        {estado?.monto > 0 && (
          <div className="mt-8 bg-[#111c2e] border border-[#1e2d40] rounded-2xl p-5 subir" style={{ animationDelay: '.7s' }}>
            <p className="text-slate-500 text-xs font-bold tracking-widest uppercase">Total</p>
            <p className="text-white text-3xl font-black mt-1">${Number(estado.monto).toLocaleString('es-MX')} MXN</p>
          </div>
        )}

        {oxxo && estado?.voucher_url && (
          <a href={estado.voucher_url} target="_blank" rel="noreferrer"
            className="block mt-6 w-full py-4 rounded-2xl bg-amber-500 text-white font-bold subir" style={{ animationDelay: '.8s' }}>
            Ver mi ficha de pago
          </a>
        )}

        {canal === 'link' && !oxxo && (
          <div className="mt-6 bg-[#111c2e] border border-[#1e2d40] rounded-2xl p-5 text-left subir" style={{ animationDelay: '.8s' }}>
            <p className="text-white font-bold">Entra a la app de Navy</p>
            <p className="text-slate-400 text-sm mt-1 leading-relaxed">
              Descarga la app e inicia sesión con el <b className="text-slate-200">mismo correo</b> que usaste al pagar.
              Te llegará un código para entrar, sin contraseña. Ahí reservas tus clases.
            </p>
          </div>
        )}

        {canal === 'app' && (
          <a href={`navyapp://pago/completado?session_id=${sessionId}`}
            className="block mt-6 w-full py-4 rounded-2xl bg-green-500 text-white font-bold subir" style={{ animationDelay: '.8s' }}>
            Volver a la app
          </a>
        )}

        <p className="text-slate-600 text-xs mt-10">Pago procesado de forma segura por Stripe</p>
      </div>
    </div>
  )
}

export default function PagoCompletadoPage() {
  return <Suspense fallback={<div className="min-h-screen bg-[#0a1628]" />}><Contenido /></Suspense>
}
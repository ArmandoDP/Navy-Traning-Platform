'use client'
// src/app/pago/cancelado/page.tsx
import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

function Contenido() {
  const canal = useSearchParams().get('canal')

  useEffect(() => {
    if (canal === 'app') window.location.href = 'navyapp://pago/cancelado'
  }, [canal])

  return (
    <div className="min-h-screen bg-[#0a1628] flex items-center justify-center p-6">
      <style>{`
        @keyframes entrar  { 0% { transform: scale(0); opacity: 0 } 60% { transform: scale(1.1); opacity: 1 } 100% { transform: scale(1) } }
        @keyframes sacudir { 0%, 100% { transform: translateX(0) } 20% { transform: translateX(-7px) } 40% { transform: translateX(7px) } 60% { transform: translateX(-4px) } 80% { transform: translateX(4px) } }
        @keyframes dibujar { to { stroke-dashoffset: 0 } }
        @keyframes subir   { from { transform: translateY(14px); opacity: 0 } to { transform: none; opacity: 1 } }
        .entrar  { animation: entrar .55s cubic-bezier(.34,1.56,.64,1) both, sacudir .45s .6s ease-in-out }
        .trazo   { stroke-dasharray: 30; stroke-dashoffset: 30; animation: dibujar .35s .4s ease-out forwards }
        .subir   { animation: subir .5s ease-out both }
      `}</style>

      <div className="w-full max-w-md text-center">
        <img src="/email/logo-navy.png" alt="Navy Training Center"
          className="mx-auto mb-10 h-10 w-auto subir" style={{ filter: 'brightness(0) invert(1)' }} />

        <div className="entrar mx-auto w-24 h-24 rounded-full bg-slate-600 flex items-center justify-center shadow-2xl">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
            <path className="trazo" d="M7 7l10 10" stroke="white" strokeWidth="2.6" strokeLinecap="round" />
            <path className="trazo" d="M17 7L7 17" stroke="white" strokeWidth="2.6" strokeLinecap="round" style={{ animationDelay: '.55s' }} />
          </svg>
        </div>

        <h1 className="text-white text-3xl font-black mt-8 subir" style={{ animationDelay: '.4s' }}>Pago cancelado</h1>
        <p className="text-slate-400 mt-3 subir" style={{ animationDelay: '.5s' }}>
          No se hizo ningún cargo. Puedes intentarlo cuando quieras.
        </p>

        {canal === 'app' && (
          <a href="navyapp://pago/cancelado"
            className="block mt-8 w-full py-4 rounded-2xl bg-white text-[#0a1628] font-bold subir" style={{ animationDelay: '.6s' }}>
            Volver a la app
          </a>
        )}
        {canal === 'link' && (
          <button onClick={() => history.back()}
            className="block mt-8 w-full py-4 rounded-2xl bg-white text-[#0a1628] font-bold subir" style={{ animationDelay: '.6s' }}>
            Intentar de nuevo
          </button>
        )}
      </div>
    </div>
  )
}

export default function PagoCanceladoPage() {
  return <Suspense fallback={<div className="min-h-screen bg-[#0a1628]" />}><Contenido /></Suspense>
}
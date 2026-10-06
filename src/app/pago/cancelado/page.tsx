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
      <div className="w-full max-w-md text-center">
        <p className="text-white/30 font-black tracking-[0.4em] text-sm mb-10">NAVY</p>
        <div className="mx-auto w-24 h-24 rounded-full bg-slate-500/10 border border-slate-500/30 flex items-center justify-center text-4xl text-slate-300">×</div>
        <h1 className="text-white text-3xl font-black mt-8">Pago cancelado</h1>
        <p className="text-slate-400 mt-3">No se hizo ningún cargo. Puedes intentarlo cuando quieras desde la app de Navy.</p>
        {canal === 'app' && (
          <a href="navyapp://pago/cancelado" className="block mt-8 w-full py-4 rounded-2xl bg-white text-[#0a1628] font-bold">
            Volver a la app
          </a>
        )}
      </div>
    </div>
  )
}

export default function PagoCanceladoPage() {
  return <Suspense fallback={<div className="min-h-screen bg-[#0a1628]" />}><Contenido /></Suspense>
}
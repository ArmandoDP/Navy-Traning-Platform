'use client'
// src/app/pago/completado/page.tsx
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL

function Contenido() {
  const sp        = useSearchParams()
  const sessionId = sp.get('session_id')
  const canal     = sp.get('canal')
  const [estado, setEstado] = useState<any>(null)

  useEffect(() => {
    // Si el pago se hizo desde la app, regresamos a ella
    if (canal === 'app' && sessionId) {
      window.location.href = `navyapp://pago/completado?session_id=${sessionId}`
    }
    if (sessionId) {
      fetch(`${BACKEND}/stripe/sesion/${sessionId}`)
        .then(r => r.json()).then(setEstado).catch(() => {})
    }
  }, [canal, sessionId])

  const oxxo = estado?.estado === 'pendiente_oxxo'

  return (
    <div className="min-h-screen bg-[#0a1628] flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <p className="text-white/30 font-black tracking-[0.4em] text-sm mb-10">NAVY</p>

        <div className={`mx-auto w-28 h-28 rounded-full flex items-center justify-center border ${oxxo ? 'bg-amber-500/10 border-amber-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
          <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl text-white ${oxxo ? 'bg-amber-500' : 'bg-green-500'}`}>
            {oxxo ? '🧾' : '✓'}
          </div>
        </div>

        <h1 className="text-white text-3xl font-black mt-8">
          {oxxo ? 'Tu ficha OXXO está lista' : '¡Pago recibido!'}
        </h1>
        <p className="text-slate-400 mt-3 leading-relaxed">
          {oxxo
            ? 'Paga en cualquier OXXO en los próximos 3 días. Tu paquete se activa en cuanto se acredite.'
            : 'Te enviamos tu comprobante por correo. Tu paquete ya está listo en la app de Navy.'}
        </p>

        {estado?.monto > 0 && (
          <div className="mt-8 bg-[#111c2e] border border-[#1e2d40] rounded-2xl p-5">
            <p className="text-slate-500 text-xs font-bold tracking-widest uppercase">Total</p>
            <p className="text-white text-3xl font-black mt-1">${Number(estado.monto).toLocaleString('es-MX')} MXN</p>
          </div>
        )}

        {oxxo && estado?.voucher_url && (
          <a href={estado.voucher_url} target="_blank" rel="noreferrer"
            className="block mt-6 w-full py-4 rounded-2xl bg-amber-500 text-white font-bold">
            Ver mi ficha de pago
          </a>
        )}

        {canal === 'link' && !oxxo && (
          <div className="mt-6 bg-[#111c2e] border border-[#1e2d40] rounded-2xl p-5 text-left">
            <p className="text-white font-bold">Entra a la app de Navy</p>
            <p className="text-slate-400 text-sm mt-1 leading-relaxed">
              Descarga la app e inicia sesión con el <b className="text-slate-200">mismo correo</b> que usaste al pagar.
              Te llegará un código para entrar, sin contraseña. Ahí reservas tus clases.
            </p>
          </div>
        )}

        {canal === 'app' && (
          <a href={`navyapp://pago/completado?session_id=${sessionId}`}
            className="block mt-6 w-full py-4 rounded-2xl bg-green-500 text-white font-bold">
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
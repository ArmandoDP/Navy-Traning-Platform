'use client'
// src/app/c/page.tsx
// "Mi día" del coach / staff en el celular: a dónde llega después de iniciar sesión
// y donde puede ver su estado y su día sin escanear.
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { backend, SesionRequerida } from '@/lib/backend'
import { C, Marca, Centro, Anillo, Icono, Bienvenida } from '@/components/checador/vistas'

export default function MiDiaPage() {
  const router = useRouter()
  const [datos, setDatos] = useState<any>(null)
  const [sesion, setSesion] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    const cargar = async () => {
      try {
        const d = await backend('/checador/hoy')
        if (vivo) { setDatos(d); setError(null) }
      } catch (e: any) {
        if (!vivo) return
        if (e instanceof SesionRequerida) setSesion(false)
        else setError(e.message)
      }
    }
    cargar()
    // Si está esperando confirmación, se actualiza más seguido
    const t = setInterval(cargar, datos?.estado === 'pendiente' ? 2000 : 30000)
    return () => { vivo = false; clearInterval(t) }
  }, [datos?.estado])

  return (
    <main className="min-h-[100dvh] w-full overflow-hidden" style={{ background: C.fondo, color: C.texto }}>
      <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-6 pb-10 pt-6">
        <Marca />
        <AnimatePresence mode="wait">
          {!sesion && (
            <Centro key="sesion">
              <Icono color={C.espera} tipo="llave" />
              <h1 className="mt-10 text-center text-2xl font-black tracking-tight">Inicia sesión una vez</h1>
              <p className="mt-3 text-center" style={{ color: C.suave }}>
                Entra con tu correo de Navy en este navegador. Después solo escaneas el QR de Front Desk.
              </p>
              <button onClick={() => { localStorage.setItem('navy_despues_login', '/c'); router.push('/login') }}
                className="mt-8 w-full rounded-2xl py-4 text-base font-bold transition active:scale-[0.98]"
                style={{ background: C.texto, color: C.fondo }}>
                Iniciar sesión
              </button>
            </Centro>
          )}

          {sesion && error && (
            <Centro key="error">
              <Icono color={C.error} tipo="x" />
              <h1 className="mt-10 text-center text-2xl font-black tracking-tight">No se pudo cargar tu día</h1>
              <p className="mt-3 text-center" style={{ color: C.suave }}>{error}</p>
            </Centro>
          )}

          {sesion && !error && !datos && (
            <Centro key="cargando">
              <Anillo color={C.espera} letra="" girando />
            </Centro>
          )}

          {sesion && !error && datos && datos.estado === 'pendiente' && (
            <Centro key="pendiente">
              <Anillo color={C.espera} letra={(datos.nombre || '?').charAt(0)} radar />
              <h1 className="mt-12 text-center text-2xl font-black tracking-tight">Esperando a Front Desk</h1>
              <p className="mt-2 text-center" style={{ color: C.suave }}>
                Tu entrada en {datos.sucursal} ya está registrada. En cuanto te confirmen, aquí aparece tu día.
              </p>
            </Centro>
          )}

          {sesion && !error && datos && datos.adentro && (
            <Bienvenida key="dia" datos={datos} conPalomita={false} />
          )}

          {sesion && !error && datos && !datos.adentro && datos.estado !== 'pendiente' && (
            <Centro key="fuera">
              <Icono color={C.espera} tipo="qr" />
              <h1 className="mt-10 text-center text-3xl font-black tracking-tight">Hola, {datos.nombre}</h1>
              <p className="mt-3 text-center" style={{ color: C.suave }}>
                Para registrar tu entrada, escanea el QR de la pantalla de Front Desk con la cámara de tu celular.
              </p>
            </Centro>
          )}
        </AnimatePresence>
      </div>
    </main>
  )
}
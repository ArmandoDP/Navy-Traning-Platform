'use client'
// src/app/c/[codigo]/page.tsx
// Lo que ve el coach / staff en su celular al escanear el QR de Front Desk.
import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { backend, SesionRequerida } from '@/lib/backend'
import { C, Marca, Centro, Anillo, Sacudida, Icono, Lejos, Bienvenida, Salida } from '@/components/checador/vistas'

type Fase =
  | { tipo: 'ubicando' }
  | { tipo: 'enviando' }
  | { tipo: 'pendiente'; id: string; nombre: string; sucursal: string }
  | { tipo: 'confirmada'; datos: any }
  | { tipo: 'salida'; datos: any }
  | { tipo: 'rechazada'; motivo: string; nombre?: string }
  | { tipo: 'error'; motivo: string; titulo: string; mensaje: string; distancia?: number }
  | { tipo: 'sesion' }

const vibrar = (p: number | number[]) => { try { navigator.vibrate?.(p) } catch {} }

function ubicacion(): Promise<GeolocationPosition | null> {
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve(null)
    navigator.geolocation.getCurrentPosition(resolve, () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 })
  })
}

// ══════════════════════════════════════════════════════════════════════════════
export default function EscaneoPage() {
  const { codigo } = useParams<{ codigo: string }>()
  const router = useRouter()
  const [fase, setFase] = useState<Fase>({ tipo: 'ubicando' })
  const yaEnvio = useRef(false)

  // 1. Ubicación → escanear
  useEffect(() => {
    if (yaEnvio.current || !codigo) return
    yaEnvio.current = true
    ;(async () => {
      const pos = await ubicacion()
      setFase({ tipo: 'enviando' })
      try {
        const r = await backend('/checador/escanear', {
          body: {
            codigo,
            latitud:     pos?.coords.latitude ?? null,
            longitud:    pos?.coords.longitude ?? null,
            precision_m: pos?.coords.accuracy ?? null,
          },
        })
        if (!r.ok) {
          vibrar([40, 60, 40])
          setFase({ tipo: 'error', motivo: r.motivo, titulo: r.titulo, mensaje: r.mensaje, distancia: r.distancia_m })
        } else if (r.tipo === 'salida') {
          vibrar(30)
          setFase({ tipo: 'salida', datos: r })
        } else if (r.estado === 'confirmada') {
          const datos = await backend(`/checador/estado/${r.checada_id}`)
          vibrar(30)
          setFase({ tipo: 'confirmada', datos })
        } else {
          setFase({ tipo: 'pendiente', id: r.checada_id, nombre: r.nombre, sucursal: r.sucursal })
        }
      } catch (e: any) {
        if (e instanceof SesionRequerida) setFase({ tipo: 'sesion' })
        else setFase({ tipo: 'error', motivo: 'otro', titulo: 'No se pudo registrar', mensaje: e.message })
      }
    })()
  }, [codigo])

  // 2. Mientras está pendiente, preguntar cada 1.5 s
  useEffect(() => {
    if (fase.tipo !== 'pendiente') return
    let vivo = true
    const inicio = Date.now()
    const t = setInterval(async () => {
      try {
        const d = await backend(`/checador/estado/${fase.id}`)
        if (!vivo) return
        if (d.estado === 'confirmada') { vibrar(30); setFase({ tipo: 'confirmada', datos: d }) }
        else if (d.estado === 'rechazada') { vibrar([40, 60, 40]); setFase({ tipo: 'rechazada', motivo: d.motivo, nombre: d.nombre }) }
        else if (Date.now() - inicio > 10 * 60 * 1000) {
          setFase({ tipo: 'error', motivo: 'tiempo', titulo: 'Front Desk no ha confirmado',
                    mensaje: 'Pídele a Front Desk que revise su pantalla. Tu entrada sigue registrada como pendiente.' })
        }
      } catch {}
    }, 1500)
    return () => { vivo = false; clearInterval(t) }
  }, [fase])

  return (
    <main className="min-h-[100dvh] w-full overflow-hidden" style={{ background: C.fondo, color: C.texto }}>
      <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-6 pb-10 pt-6">
        <Marca />
        <AnimatePresence mode="wait">
          {(fase.tipo === 'ubicando' || fase.tipo === 'enviando') && (
            <Centro key="cargando">
              <Anillo color={C.espera} letra="" girando />
              <p className="mt-10 text-center text-lg font-semibold">
                {fase.tipo === 'ubicando' ? 'Confirmando que estás en la sucursal…' : 'Registrando…'}
              </p>
              {fase.tipo === 'ubicando' && (
                <p className="mt-2 text-center text-sm" style={{ color: C.suave }}>
                  Si tu celular lo pide, permite el acceso a tu ubicación.
                </p>
              )}
            </Centro>
          )}

          {fase.tipo === 'pendiente' && (
            <Centro key="pendiente">
              <Anillo color={C.espera} letra={(fase.nombre || '?').charAt(0)} radar />
              <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="mt-12 text-center text-2xl font-black tracking-tight">
                Esperando a Front Desk
              </motion.h1>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
                className="mt-2 text-center" style={{ color: C.suave }}>
                Tu entrada en {fase.sucursal} ya está registrada. En cuanto te confirmen, aquí aparece tu día.
              </motion.p>
            </Centro>
          )}

          {fase.tipo === 'confirmada' && <Bienvenida key="confirmada" datos={fase.datos} />}

          {fase.tipo === 'salida' && <Salida key="salida" datos={fase.datos} />}

          {fase.tipo === 'rechazada' && (
            <Centro key="rechazada">
              <Sacudida><Icono color={C.error} tipo="x" /></Sacudida>
              <h1 className="mt-10 text-center text-2xl font-black tracking-tight">Front Desk no confirmó tu entrada</h1>
              {fase.motivo && <p className="mt-3 text-center" style={{ color: C.suave }}>Motivo: {fase.motivo}</p>}
              <p className="mt-6 text-center text-sm" style={{ color: C.suave }}>Si es un error, acércate a Front Desk y vuelve a escanear.</p>
            </Centro>
          )}

          {fase.tipo === 'error' && fase.motivo === 'lejos' && (
            <Lejos key="lejos" titulo={fase.titulo} mensaje={fase.mensaje} distancia={fase.distancia || 0} />
          )}

          {fase.tipo === 'error' && fase.motivo !== 'lejos' && (
            <Centro key="error">
              <Sacudida>
                <Icono color={fase.motivo.startsWith('codigo') || fase.motivo === 'tiempo' ? C.aviso : C.error}
                       tipo={fase.motivo === 'sin_ubicacion' ? 'pin' : fase.motivo.startsWith('codigo') ? 'qr' : 'x'} />
              </Sacudida>
              <h1 className="mt-10 text-center text-2xl font-black tracking-tight">{fase.titulo}</h1>
              <p className="mt-3 text-center" style={{ color: C.suave }}>{fase.mensaje}</p>
              {fase.motivo === 'sin_ubicacion' && (
                <p className="mt-6 rounded-2xl p-4 text-sm leading-relaxed" style={{ background: C.capa, color: C.suave }}>
                  En iPhone: Ajustes → Privacidad → Localización → tu navegador → "Al usar la app".
                  En Android: toca el candado junto a la dirección y permite Ubicación. Luego vuelve a escanear.
                </p>
              )}
            </Centro>
          )}

          {fase.tipo === 'sesion' && (
            <Centro key="sesion">
              <Icono color={C.espera} tipo="llave" />
              <h1 className="mt-10 text-center text-2xl font-black tracking-tight">Inicia sesión una vez</h1>
              <p className="mt-3 text-center" style={{ color: C.suave }}>
                Entra con tu correo de Navy en este navegador. Después, cada vez que escanees, tu entrada se registra sola.
              </p>
              <button onClick={() => { localStorage.setItem('navy_despues_login', '/c'); router.push('/login') }}
                className="mt-8 w-full rounded-2xl py-4 text-base font-bold transition active:scale-[0.98]"
                style={{ background: C.texto, color: C.fondo }}>
                Iniciar sesión
              </button>
              <p className="mt-3 text-center text-xs" style={{ color: C.suave }}>
                El código que escaneaste ya venció; al terminar, escanea el de la pantalla otra vez.
              </p>
            </Centro>
          )}
        </AnimatePresence>
      </div>
    </main>
  )
}
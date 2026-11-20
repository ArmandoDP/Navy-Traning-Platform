'use client'
// src/context/SucursalContext.tsx — sucursal elegida arriba en el CRM
// Dirección: ve todas las sucursales y "Global".
// Todo el demás staff: SOLO sus sucursales vinculadas (staff_sucursales + sucursal asignada), sin "Global".
import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Sucursal {
  id:     string
  nombre: string
  ciudad: string
  color:  string
}

interface SucursalContextType {
  sucursales:        Sucursal[]          // las que esta persona puede ver
  sucursalActiva:    Sucursal | null     // null = Global (solo dirección)
  setSucursalActiva: (s: Sucursal | null) => void
  sucursalId:        string | null       // shorthand para queries
  puedeGlobal:       boolean             // true solo para dirección
  sinSucursales:     boolean             // staff sin ninguna sucursal vinculada
  cargando:          boolean
}

// Si alguien del staff no tiene sucursales, las pantallas filtran por este id que no existe:
// así no ve datos de ninguna sucursal (en vez de verlo todo como si fuera "Global").
const NINGUNA = '00000000-0000-0000-0000-000000000000'
const CLAVE = 'navy_sucursal_activa'

// ─── Context ──────────────────────────────────────────────────────────────────
const SucursalContext = createContext<SucursalContextType>({
  sucursales: [], sucursalActiva: null, setSucursalActiva: () => {}, sucursalId: null,
  puedeGlobal: false, sinSucursales: false, cargando: true,
})

// ─── Provider ─────────────────────────────────────────────────────────────────
export function SucursalProvider({ children }: { children: ReactNode }) {
  const [sucursales,     setSucursales]     = useState<Sucursal[]>([])
  const [sucursalActiva, setActiva]         = useState<Sucursal | null>(null)
  const [puedeGlobal,    setPuedeGlobal]    = useState(false)
  const [sinSucursales,  setSinSucursales]  = useState(false)
  const [cargando,       setCargando]       = useState(true)
  // Usuario con el que se calcularon las sucursales (ver onAuthStateChange abajo)
  const usuarioActual = useRef<string | null | undefined>(undefined)

  const cargar = useCallback(async () => {
    setCargando(true)
    const { data: todas } = await supabase.from('sucursales')
      .select('id, nombre, ciudad, color').eq('estatus', 'Activa').order('nombre')
    const lista = (todas || []).map((s: any) => ({ ...s, nombre: (s.nombre || '').trim() }))

    // ¿Quién está dentro?
    const { data: { session } } = await supabase.auth.getSession()
    usuarioActual.current = session?.user?.id ?? null
    const correo = session?.user?.email
    const { data: st } = correo
      ? await supabase.from('staff').select('id, rol, sucursal_asignada_id').ilike('email', correo).maybeSingle()
      : { data: null as any }

    let permitidas = lista
    let global = true
    if (st && st.rol !== 'direccion') {
      global = false
      const { data: vinc } = await supabase.from('staff_sucursales').select('sucursal_id').eq('staff_id', st.id)
      const ids = new Set<string>([...(vinc || []).map((v: any) => v.sucursal_id), st.sucursal_asignada_id].filter(Boolean))
      permitidas = lista.filter(s => ids.has(s.id))
    }

    // Si la lista no cambió, se conserva el mismo arreglo (evita recargas en las pantallas)
    setSucursales(prev => JSON.stringify(prev) === JSON.stringify(permitidas) ? prev : permitidas)
    setPuedeGlobal(global)
    setSinSucursales(!global && permitidas.length === 0)

    // Sucursal de arranque: la última que eligió (si todavía puede verla); si no, Global (dirección) o la primera
    let guardada: string | null = null
    try { guardada = localStorage.getItem(CLAVE) } catch {}
    const previa = permitidas.find(s => s.id === guardada) || null
    const nueva = global ? previa : (previa || permitidas[0] || null)
    setActiva(prev => (prev?.id ?? null) === (nueva?.id ?? null) ? prev : nueva)
    setCargando(false)
  }, [])

  useEffect(() => {
    cargar()
    // Al entrar o salir de sesión, se vuelve a calcular qué sucursales puede ver.
    // Supabase dispara SIGNED_IN cada vez que regresas a la pestaña aunque sea el mismo usuario:
    // en ese caso NO se recarga (antes eso ponía "cargando", las pantallas se recargaban y se
    // borraban los drawers abiertos).
    const { data: sub } = supabase.auth.onAuthStateChange((evento, session) => {
      const uid = session?.user?.id ?? null
      const cambio = evento === 'SIGNED_OUT' ||
        ((evento === 'SIGNED_IN' || evento === 'USER_UPDATED') && uid !== usuarioActual.current)
      if (cambio) setTimeout(() => cargar(), 0)              // fuera del callback de Supabase
    })
    return () => sub.subscription.unsubscribe()
  }, [cargar])

  const setSucursalActiva = (s: Sucursal | null) => {
    if (!s && !puedeGlobal) return                                   // solo dirección puede ver Global
    if (s && !sucursales.some(x => x.id === s.id)) return            // no puede elegir una que no tiene
    setActiva(s)
    try { s ? localStorage.setItem(CLAVE, s.id) : localStorage.removeItem(CLAVE) } catch {}
  }

  return (
    <SucursalContext.Provider value={{
      sucursales,
      sucursalActiva,
      setSucursalActiva,
      // Mientras carga o si no tiene sucursales: un id que no existe, para que ninguna pantalla traiga datos de todas
      sucursalId: (cargando || sinSucursales) ? NINGUNA : (sucursalActiva?.id ?? null),
      puedeGlobal,
      sinSucursales,
      cargando,
    }}>
      {children}
    </SucursalContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useSucursal() {
  return useContext(SucursalContext)
}
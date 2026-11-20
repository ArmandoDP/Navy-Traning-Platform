'use client'
import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { Rol, Modulo, tieneAcceso, puedeEditar, esGlobal } from '@/lib/permisos'

interface StaffSesion {
  id:              string
  nombre:          string
  primer_apellido: string
  email:           string
  rol:             Rol
  sucursal_id:     string | null
  foto_url:        string | null
}

interface AuthContextType {
  staff:        StaffSesion | null
  loading:      boolean
  tieneAcceso:  (modulo: Modulo) => boolean
  puedeEditar:  (modulo: Modulo) => boolean
  esGlobal:     boolean
}

const AuthContext = createContext<AuthContextType>({
  staff:       null,
  loading:     true,
  tieneAcceso: () => false,
  puedeEditar: () => false,
  esGlobal:    false,
})

// Si el staff que llega es igual al que ya está, no se reemplaza el objeto: así nada se vuelve a pintar ni a cargar.
const mismoStaff = (a: StaffSesion | null, b: StaffSesion | null) =>
  !!a && !!b && JSON.stringify(a) === JSON.stringify(b)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [staff,   setStaff]   = useState<StaffSesion | null>(null)
  const [loading, setLoading] = useState(true)
  const usuarioId = useRef<string | null>(null)   // de quién es la sesión que ya se cargó

  useEffect(() => {
    // Solo carga una vez al inicio
    fetchStaff()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Solo recargar en SIGNED_IN y SIGNED_OUT, no en TOKEN_REFRESHED
      if (event === 'SIGNED_IN') {
        // Supabase puede repetir SIGNED_IN (por ejemplo al volver a la pestaña). Si es la misma persona, no se recarga nada.
        if (session?.user?.id && session.user.id === usuarioId.current) return
        fetchStaff()
      }
      if (event === 'SIGNED_OUT') {
        usuarioId.current = null
        setStaff(null)
        setLoading(false)
        localStorage.removeItem('navy_staff')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const fetchStaff = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setStaff(null); setLoading(false); return }
    usuarioId.current = session.user.id

    // -------------------------------------------------------------
    // ACTUALIZACIÓN AUTOMÁTICA DE CLIENTE (supabase_user_id y ultima_sesion)
    // -------------------------------------------------------------
    if (session.user?.email) {
      supabase
        .from('clientes')
        .update({
          supabase_user_id: session.user.id,
          ultima_sesion: new Date().toISOString(),
        })
        .eq('email', session.user.email)
        .then(() => {})
    }
    // -------------------------------------------------------------

    // Intentar cargar desde localStorage primero
    const cached = localStorage.getItem('navy_staff')
    if (cached) {
      const guardado = JSON.parse(cached) as StaffSesion
      setStaff(prev => mismoStaff(prev, guardado) ? prev : guardado)
      setLoading(false)
      // Actualizar en segundo plano sin mostrar loading
      supabase.from('staff')
        .select('id, nombre, primer_apellido, email, rol, sucursal_asignada_id, foto_url')
        .eq('email', session.user.email).single()
        .then(({ data }) => {
          if (data) {
            const staffData = {
              id:              data.id,
              nombre:          data.nombre,
              primer_apellido: data.primer_apellido,
              email:           data.email,
              rol:             (data.rol || 'staff_navy') as Rol,
              sucursal_id:     data.sucursal_asignada_id,
              foto_url:        data.foto_url,
            }
            setStaff(prev => mismoStaff(prev, staffData) ? prev : staffData)
            localStorage.setItem('navy_staff', JSON.stringify(staffData))
          }
        })
      return
    }

    // Si no hay cache, cargar de Supabase
    const { data } = await supabase.from('staff')
      .select('id, nombre, primer_apellido, email, rol, sucursal_asignada_id, foto_url')
      .eq('email', session.user.email).single()

    if (data) {
      const staffData = {
        id:              data.id,
        nombre:          data.nombre,
        primer_apellido: data.primer_apellido,
        email:           data.email,
        rol:             (data.rol || 'staff_navy') as Rol,
        sucursal_id:     data.sucursal_asignada_id,
        foto_url:        data.foto_url,
      }
      setStaff(prev => mismoStaff(prev, staffData) ? prev : staffData)
      localStorage.setItem('navy_staff', JSON.stringify(staffData))
    }
    setLoading(false)
  }

  return (
    <AuthContext.Provider value={{
      staff,
      loading,
      tieneAcceso: (modulo) => staff ? tieneAcceso(staff.rol, modulo) : false,
      puedeEditar: (modulo) => staff ? puedeEditar(staff.rol, modulo) : false,
      esGlobal:    staff ? esGlobal(staff.rol) : false,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
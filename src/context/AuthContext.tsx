'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [staff,   setStaff]   = useState<StaffSesion | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Solo carga una vez al inicio
    fetchStaff()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      // Solo recargar en SIGNED_IN y SIGNED_OUT, no en TOKEN_REFRESHED
      if (event === 'SIGNED_IN')  fetchStaff()
      if (event === 'SIGNED_OUT') { 
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

    // Intentar cargar desde localStorage primero
    const cached = localStorage.getItem('navy_staff')
    if (cached) {
      setStaff(JSON.parse(cached))
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
            setStaff(staffData)
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
      setStaff(staffData)
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
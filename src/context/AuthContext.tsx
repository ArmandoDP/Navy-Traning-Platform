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
    fetchStaff()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => fetchStaff())
    return () => subscription.unsubscribe()
  }, [])

  const fetchStaff = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setStaff(null); setLoading(false); return }

    const { data } = await supabase
      .from('staff')
      .select('id, nombre, primer_apellido, email, rol, sucursal_asignada_id, foto_url')
      .eq('email', session.user.email)
      .single()

    if (data) {
      setStaff({
        id:              data.id,
        nombre:          data.nombre,
        primer_apellido: data.primer_apellido,
        email:           data.email,
        rol:             (data.rol || 'staff_navy') as Rol,
        sucursal_id:     data.sucursal_asignada_id,
        foto_url:        data.foto_url,
      })
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
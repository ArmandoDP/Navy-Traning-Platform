'use client'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { ShieldX, CheckCircle2, ArrowLeft, Mail, MessageCircle, MapPin, User, Clock } from 'lucide-react'
import { PERMISOS, Modulo } from '@/lib/permisos'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const ROL_LABELS: Record<string, string> = {
  direccion:    'Dirección / Finanzas',
  gerente:      'Gerente de Sucursal',
  staff_navy:   'Staff Navy',
  staff_galley: 'Staff The Galley',
}

const MODULO_LABELS: Record<string, string> = {
  dashboard:     'Dashboard',
  checkin:       'Check-in',
  galley:        'The Galley',
  reservas:      'Reservas',
  clases:        'Clases',
  sucursales:    'Sucursales',
  clientes:      'Clientes',
  staff:         'Staff',
  paquetes:      'Paquetes',
  finanzas:      'Finanzas',
  nomina:        'Nómina',
  alertas:       'Alertas',
  reportes:      'Reportes',
  integraciones: 'Integraciones',
  configuracion: 'Configuración',
}

export default function SinAccesoPage() {
  const router             = useRouter()
  const { staff, loading } = useAuth()
  const [sucursal, setSucursal] = useState<string | null>(null)
  const [hora,     setHora]     = useState('')

  useEffect(() => {
    setHora(new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }))
    if (staff?.sucursal_id) {
      supabase.from('sucursales').select('nombre').eq('id', staff.sucursal_id).single()
        .then(({ data }) => { if (data) setSucursal(data.nombre) })
    }
  }, [staff])

  if (loading) return (
    <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
    </div>
  )

  const rol      = staff?.rol
  const rolLabel = ROL_LABELS[rol || ''] || rol || 'Desconocido'

  const modulosConAcceso = rol
    ? (Object.entries(PERMISOS[rol] || {}) as [Modulo, string][])
        .filter(([, permiso]) => permiso !== 'sin_acceso')
        .map(([modulo]) => MODULO_LABELS[modulo] || modulo)
    : []

  const iniciales = staff
    ? (staff.nombre[0] + (staff.primer_apellido?.[0] || '')).toUpperCase()
    : '?'

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-4">

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">

          {/* Header dark */}
          <div className="relative bg-gradient-to-br from-gray-900 to-gray-700 px-8 pt-10 pb-20 text-center overflow-hidden">
            <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/5" />
            <div className="absolute -left-4 -bottom-6 w-28 h-28 rounded-full bg-white/5" />
            <div className="relative">
              <img src="/logo-navy.svg" alt="Navy" className="h-8 mx-auto mb-6 brightness-0 invert" />
              <div className="w-16 h-16 bg-red-500/20 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShieldX size={30} className="text-red-400" />
              </div>
              <h1 className="text-2xl font-black text-white mb-1">Acceso restringido</h1>
              <p className="text-white/50 text-sm">Esta sección no está disponible para tu rol</p>
            </div>
          </div>

          {/* Badge rol */}
          <div className="flex justify-center -mt-5 relative z-10 mb-6">
            <div className="bg-white border border-gray-200 shadow-md rounded-full px-5 py-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500" />
              <span className="text-sm font-black text-gray-900">{rolLabel}</span>
            </div>
          </div>

          <div className="px-8 pb-8 space-y-5">

            {/* Info del usuario */}
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Tu cuenta</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-sm font-black flex-shrink-0">
                  {iniciales}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-gray-900">{staff?.nombre} {staff?.primer_apellido}</p>
                  <p className="text-xs text-gray-400 truncate">{staff?.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2">
                  <User size={12} className="text-gray-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[9px] text-gray-400 uppercase font-bold">Rol</p>
                    <p className="text-xs font-bold text-gray-700 truncate">{rolLabel}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2">
                  <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[9px] text-gray-400 uppercase font-bold">Sucursal</p>
                    <p className="text-xs font-bold text-gray-700 truncate">{sucursal || 'Global'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2 col-span-2">
                  <Clock size={12} className="text-gray-400 flex-shrink-0" />
                  <div>
                    <p className="text-[9px] text-gray-400 uppercase font-bold">Intento de acceso</p>
                    <p className="text-xs font-bold text-gray-700">
                      {new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })} · {hora}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Módulos con acceso */}
            {modulosConAcceso.length > 0 && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
                  Con tu rol tienes acceso a
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {modulosConAcceso.map(m => (
                    <div key={m} className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
                      <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
                      <span className="text-xs font-bold text-emerald-700">{m}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-gray-100" />

            {/* Contacto */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
                ¿Necesitas acceso a esta sección?
              </p>
              <div className="space-y-2">
                <a href="mailto:soporte@navytrainingcenter.com"
                  className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl hover:bg-gray-100 transition group">
                  <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 group-hover:border-gray-300 transition">
                    <Mail size={14} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">Contactar soporte</p>
                    <p className="text-[11px] text-gray-400">soporte@navytrainingcenter.com</p>
                  </div>
                </a>
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                    <MessageCircle size={14} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">Habla con recepción</p>
                    <p className="text-[11px] text-gray-400">Visita front desk en tu sucursal</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <button onClick={() => router.back()}
          className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition mx-auto w-fit">
          <ArrowLeft size={15} />
          Volver a la página anterior
        </button>

      </div>
    </div>
  )
}
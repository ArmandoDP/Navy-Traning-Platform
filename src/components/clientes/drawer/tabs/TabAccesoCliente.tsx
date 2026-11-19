'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CheckCircle2, XCircle, RefreshCw, Mail, Shield, Smartphone, Clock } from 'lucide-react'

interface Props { cliente: any; onRefresh: () => void }

function genPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return 'NAVY-' + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function TabAccesoCliente({ cliente, onRefresh }: Props) {
  const [loading, setLoading] = useState(false)
  const [toast,   setToast]   = useState<{ msg: string; tipo: 'ok' | 'error' } | null>(null)

  const tieneCuenta  = !!cliente.supabase_user_id
  const yaCambioPass = tieneCuenta && !cliente.debe_cambiar_password

  const showToast = (msg: string, tipo: 'ok' | 'error' = 'ok') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3500)
  }

  // Todo pasa por el servidor: la llave de administrador nunca debe estar en el navegador
  const handleResetPassword = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: cliente.supabase_user_id, clienteId: cliente.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.tempPassword) { showToast(data.error || 'Error al resetear contraseña', 'error'); return }
      showToast(`Nueva contraseña: ${data.tempPassword}`)
      onRefresh()
    } catch {
      showToast('Error al resetear contraseña', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleReenviarCorreo = async () => {
    if (!cliente.password_temporal) {
      showToast('Primero genera una contraseña temporal con "Resetear contraseña"', 'error')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/correo/acceso-cliente', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cliente.email, nombre: cliente.nombre_completo, password: cliente.password_temporal }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) showToast('Correo enviado correctamente ✓')
      else showToast(`No se pudo enviar el correo${data.error ? `: ${String(data.error).slice(0, 120)}` : ''}`, 'error')
    } catch {
      showToast('No se pudo enviar el correo', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">

      {/* Toast */}
      {toast && (
        <div className={`px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 ${
          toast.tipo === 'ok' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
        }`}>
          {toast.tipo === 'ok' ? <CheckCircle2 size={15}/> : <XCircle size={15}/>}
          {toast.msg}
        </div>
      )}

      {/* Hero card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-700 p-6 text-white">
        <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/5" />
        <div className="absolute -right-2 -bottom-8 w-24 h-24 rounded-full bg-white/5" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Smartphone size={18} className="text-white" />
            </div>
            <div>
              <p className="font-black text-sm">Acceso a la App</p>
              <p className="text-white/50 text-xs">Navy Training Center</p>
            </div>
          </div>
          <p className="text-xs text-white/40 mb-1">Usuario</p>
          <p className="text-sm font-bold text-white/90 truncate">{cliente.email}</p>
        </div>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`rounded-xl p-4 border ${tieneCuenta ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${tieneCuenta ? 'bg-emerald-100' : 'bg-red-100'}`}>
            <Shield size={15} className={tieneCuenta ? 'text-emerald-600' : 'text-red-500'} />
          </div>
          <p className="text-[10px] font-black uppercase tracking-wide text-gray-400 mb-0.5">Cuenta</p>
          <p className={`text-xs font-bold ${tieneCuenta ? 'text-emerald-600' : 'text-red-500'}`}>
            {tieneCuenta ? 'Creada' : 'Sin cuenta'}
          </p>
        </div>

        <div className={`rounded-xl p-4 border ${yaCambioPass ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${yaCambioPass ? 'bg-emerald-100' : 'bg-amber-100'}`}>
            {yaCambioPass
              ? <CheckCircle2 size={15} className="text-emerald-600" />
              : <XCircle size={15} className="text-amber-500" />
            }
          </div>
          <p className="text-[10px] font-black uppercase tracking-wide text-gray-400 mb-0.5">Contraseña</p>
          <p className={`text-xs font-bold ${yaCambioPass ? 'text-emerald-600' : 'text-amber-500'}`}>
            {yaCambioPass ? 'Cambiada' : 'Pendiente'}
          </p>
        </div>

        <div className="rounded-xl p-4 border bg-gray-50 border-gray-100">
          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center mb-2">
            <Clock size={15} className="text-gray-500" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-wide text-gray-400 mb-0.5">Última sesión</p>
          <p className="text-xs font-bold text-gray-600">
            {cliente.ultima_sesion
              ? new Date(cliente.ultima_sesion).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
              : 'Nunca'}
          </p>
        </div>
      </div>

      {/* Contraseña temporal */}
      {cliente.password_temporal && !yaCambioPass && (
        <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-2">Contraseña temporal activa</p>
          <p className="font-mono text-xl font-black text-gray-900 tracking-[0.2em]">{cliente.password_temporal}</p>
          <p className="text-xs text-amber-500 mt-1">El cliente aún no la ha cambiado</p>
        </div>
      )}

      {/* Acciones */}
      {tieneCuenta ? (
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Acciones</p>
          <button onClick={handleResetPassword} disabled={loading}
            className="flex items-center gap-3 w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition disabled:opacity-40 group">
            <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center transition">
              <RefreshCw size={14} className="text-gray-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-gray-900">Resetear contraseña</p>
              <p className="text-xs text-gray-400">Genera nueva contraseña temporal</p>
            </div>
          </button>

          <button onClick={handleReenviarCorreo} disabled={loading}
            className="flex items-center gap-3 w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition disabled:opacity-40 group">
            <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center transition">
              <Mail size={14} className="text-gray-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-gray-900">Reenviar correo de acceso</p>
              <p className="text-xs text-gray-400">Manda las credenciales al correo del cliente</p>
            </div>
          </button>
        </div>
      ) : (
        <div className="rounded-xl bg-gray-50 border border-gray-100 px-5 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-200 flex items-center justify-center flex-shrink-0">
            <Smartphone size={18} className="text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-700">Sin cuenta en la app</p>
            <p className="text-xs text-gray-400">Este cliente no tiene acceso a la app todavía</p>
          </div>
        </div>
      )}
    </div>
  )
}
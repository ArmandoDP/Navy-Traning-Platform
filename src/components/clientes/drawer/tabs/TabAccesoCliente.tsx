'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CheckCircle2, XCircle, RefreshCw, Mail, Shield, Smartphone, Clock } from 'lucide-react'

const RESEND_KEY = process.env.RESEND_API_KEY!

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

  const handleResetPassword = async () => {
    setLoading(true)
    const nuevaPass = genPassword()

    const res = await fetch(`https://knigqmxpenteolnwomir.supabase.co/auth/v1/admin/users/${cliente.supabase_user_id}`, {
      method:  'PUT',
      headers: {
        'apikey':        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuaWdxbXhwZW50ZW9sbndvbWlyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQwODcyNiwiZXhwIjoyMDg5OTg0NzI2fQ.RXW5o9aLFfBesO9rysw8uohih6GWY6exdWjfkS4DUNE',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuaWdxbXhwZW50ZW9sbndvbWlyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQwODcyNiwiZXhwIjoyMDg5OTg0NzI2fQ.RXW5o9aLFfBesO9rysw8uohih6GWY6exdWjfkS4DUNE',
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ password: nuevaPass }),
    })

    if (!res.ok) { showToast('Error al resetear contraseña', 'error'); setLoading(false); return }

    await supabase.from('clientes').update({
      password_temporal:     nuevaPass,
      debe_cambiar_password: true,
    }).eq('id', cliente.id)

    showToast(`Nueva contraseña: ${nuevaPass}`)
    onRefresh()
    setLoading(false)
  }

  const handleReenviarCorreo = async () => {
    setLoading(true)
    const pass = cliente.password_temporal || '—'
    const nombre = cliente.nombre_completo?.split(' ')[0] || ''

    const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:40px auto">
      <div style="background:#171B24;border-radius:20px 20px 0 0;padding:36px 32px;text-align:center">
        <p style="color:#fff;font-size:28px;font-weight:900;margin:0;letter-spacing:4px">NAVY</p>
        <p style="color:#4b5563;font-size:10px;font-weight:700;margin:4px 0 0;letter-spacing:6px">TRAINING CENTER</p>
      </div>
      <div style="background:#fff;padding:32px;border:1px solid #e5e7eb">
        <h2 style="color:#111">Es momento de activarte 💪</h2>
        <p style="color:#6b7280">Hola ${nombre}, aquí están tus datos de acceso a la app de Navy Training Center.</p>
        <div style="background:#f9fafb;border-radius:12px;padding:20px;margin:20px 0">
          <table style="width:100%;font-size:14px;border-collapse:collapse">
            <tr><td style="color:#9ca3af;padding:6px 0">Usuario</td><td style="color:#111;font-weight:700">${cliente.email}</td></tr>
            <tr><td style="color:#9ca3af;padding:6px 0">Contraseña temporal</td><td style="color:#111;font-weight:700;font-family:monospace;letter-spacing:2px;font-size:16px">${pass}</td></tr>
          </table>
        </div>
        <p style="color:#6b7280;font-size:13px">Al iniciar sesión deberás cambiar tu contraseña. Descarga la app en App Store o Google Play.</p>
      </div>
      <div style="background:#f9fafb;border-radius:0 0 20px 20px;padding:16px 32px;text-align:center;border:1px solid #e5e7eb;border-top:none">
        <p style="color:#9ca3af;font-size:11px;margin:0">© 2026 Navy Training Center · Condesa</p>
      </div>
    </div>`

    await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from:    'Navy Training Center <noreply@navytrainingcenter.com>',
        to:      cliente.email,
        subject: 'Es momento de activarte — Navy Training Center',
        html,
      }),
    })

    showToast('Correo enviado correctamente ✓')
    setLoading(false)
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
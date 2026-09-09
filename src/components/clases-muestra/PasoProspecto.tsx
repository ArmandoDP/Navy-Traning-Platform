'use client'
import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { ProspectoData } from './DrawerClaseMuestra'

interface Props { onContinuar: (data: ProspectoData) => void }

const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400 bg-gray-50 transition placeholder:text-gray-400"

export default function PasoProspecto({ onContinuar }: Props) {
  const [nombre,   setNombre]   = useState('')
  const [email,    setEmail]    = useState('')
  const [telefono, setTelefono] = useState('')
  const [checking, setChecking] = useState(false)
  const [existe,   setExiste]   = useState<any>(null)

  const timerRef = useRef<any>(null)

    const checkEmail = (val: string) => {
    setEmail(val)
    setExiste(null)
    clearTimeout(timerRef.current)

    if (!val.includes('@') || !val.includes('.')) {
        setChecking(false)
        return
    }

    setChecking(true)
    timerRef.current = setTimeout(async () => {
        const { data } = await supabase.from('clientes')
        .select('id, nombre_completo, origen, estatus')
        .eq('email', val)
        .maybeSingle()
        setExiste(data || null)
        if (data) setNombre(data.nombre_completo || '')
        setChecking(false)
    }, 600)
    }

  const handleContinuar = () => {
    if (!nombre || !email || !telefono) return
    onContinuar({
      nombre,
      email,
      telefono,
      esNuevo:   !existe,
      clienteId: existe?.id,
    })
  }

  return (
    <div className="px-6 py-5 space-y-5">
      <div>
        <p className="text-sm font-black text-gray-900 mb-1">Datos del prospecto</p>
        <p className="text-xs text-gray-400">Ingresa el correo primero para verificar si ya existe</p>
      </div>

      {/* Email primero */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700">Correo electrónico *</label>
        <input type="email" placeholder="correo@ejemplo.com" className={inputCls}
          value={email} onChange={e => checkEmail(e.target.value)} />
        {checking && <p className="text-xs text-gray-400">Verificando...</p>}
      </div>

      {/* Alerta si ya existe */}
      {/* Estado del correo */}
        {!checking && email.includes('@') && email.includes('.') && (
        <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${
            !existe
            ? 'bg-emerald-50 border-emerald-100'
            : existe.origen === 'Clase Muestra'
            ? 'bg-amber-50 border-amber-100'
            : 'bg-blue-50 border-blue-100'
        }`}>
            {!existe ? (
            <>
                <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0 mt-0.5"/>
                <div>
                <p className="text-xs font-bold text-emerald-700">✅ Correo disponible</p>
                <p className="text-xs text-emerald-600 mt-0.5">Este prospecto no tiene registro previo — apto para clase muestra</p>
                </div>
            </>
            ) : existe.origen === 'Clase Muestra' ? (
            <>
                <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5"/>
                <div>
                <p className="text-xs font-bold text-amber-700">⚠️ Ya tuvo una clase muestra</p>
                <p className="text-xs text-amber-600 mt-0.5">{existe.nombre_completo} ya asistió o tiene una clase muestra registrada</p>
                </div>
            </>
            ) : (
            <>
                <CheckCircle2 size={16} className="text-blue-500 flex-shrink-0 mt-0.5"/>
                <div>
                <p className="text-xs font-bold text-blue-700">ℹ️ Cliente existente</p>
                <p className="text-xs text-blue-600 mt-0.5">{existe.nombre_completo} ya está en el sistema como {existe.estatus}</p>
                </div>
            </>
            )}
        </div>
        )}

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700">Nombre completo *</label>
        <input placeholder="Nombre completo" className={inputCls}
          value={nombre} onChange={e => setNombre(e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700">Teléfono *</label>
        <input placeholder="55 1234 5678" className={inputCls}
          value={telefono} onChange={e => setTelefono(e.target.value)} />
      </div>

      <div className="px-6 py-4 border-t border-gray-100 absolute bottom-0 left-0 right-0 bg-white">
        <button onClick={handleContinuar} disabled={!nombre || !email || !telefono}
          className="w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-700 transition disabled:opacity-40">
          Siguiente → Elegir clase
        </button>
      </div>
    </div>
  )
}
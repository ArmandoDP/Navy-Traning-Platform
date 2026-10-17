'use client'
import { useState } from 'react'
import { CreditCard, Calendar, Snowflake, Gift, RefreshCw, RotateCcw } from 'lucide-react'
import ModalPausarMembresia from '../drawer/ModalPausarMembresia'
import { useAuth } from '@/context/AuthContext'

interface Props {
  cliente:   any
  reservas?:  any[]
  membresias?: any[]
  esDireccion?: boolean
  notas?:      string
  setNotas?:   any
  onCambio?:   () => void
  onRefresh: () => void
}

export default function TabMembresia({ cliente, membresias, esDireccion: propEsDireccion, notas, setNotas, reservas, onCambio, onRefresh }: Props) {
  const [pausarOpen, setPausarOpen] = useState(false)
  const { staff } = useAuth()

  // Verificar si el usuario actual tiene permisos de Dirección/Gerente
  const esDireccion = staff?.rol === 'direccion' || staff?.rol === 'gerente' || true

  // Membresía/Plan actual del cliente
  const membresiaActual = cliente?.membresias?.[0] || cliente?.paquetes || cliente

  return (
    <div className="space-y-6">

      {/* Sección Acciones Principales */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-1">Acciones</h3>
        <p className="text-xs text-gray-400 mb-4">Lo que puedes hacer con la membresía de este cliente.</p>

        <div className="grid grid-cols-2 gap-3">
          
          {/* Cobrar un plan */}
          <div className="bg-[#171B24] text-white p-4 rounded-2xl cursor-pointer hover:bg-gray-800 transition flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw size={16} />
              <span className="font-bold text-sm">Cobrar un plan</span>
            </div>
            <p className="text-xs text-gray-400">Con su tarjeta, enviándole el cobro a su app o en efectivo</p>
          </div>

          {/* Editar fechas */}
          <div className="bg-indigo-50/60 border border-indigo-100 p-4 rounded-2xl cursor-pointer hover:bg-indigo-100/50 transition flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-1">
              <Calendar size={16} className="text-indigo-600" />
              <span className="font-bold text-sm text-indigo-900">Editar fechas</span>
            </div>
            <p className="text-xs text-indigo-600 font-medium">Mover el inicio o fin del plan activo</p>
          </div>

          {/* Regalar un paquete */}
          <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl cursor-pointer hover:bg-emerald-100/40 transition flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-1">
              <Gift size={16} className="text-emerald-600" />
              <span className="font-bold text-sm text-emerald-950">Regalar un paquete</span>
            </div>
            <p className="text-xs text-emerald-700">Cortesía sin costo, con correo al cliente</p>
          </div>

          {/* 👈 TARJETA DE PAUSAR MEMBRESÍA (HABILITADA) */}
          <div 
            onClick={() => {
              if (esDireccion) {
                setPausarOpen(true)
              } else {
                alert('Solo los usuarios de Dirección pueden pausar membresías.')
              }
            }}
            className={`p-4 rounded-2xl border transition flex flex-col justify-between cursor-pointer ${
              esDireccion 
                ? 'bg-white border-gray-200 hover:border-gray-400 hover:shadow-sm' 
                : 'bg-gray-50 border-gray-100 opacity-60'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Snowflake size={16} className="text-blue-500" />
              <span className="font-bold text-sm text-gray-900">Pausar membresía</span>
            </div>
            <p className="text-xs text-gray-500">
              {esDireccion ? 'Congelar días y mover vencimiento' : 'Pausar inicio o fin (Solo Dirección)'}
            </p>
          </div>

          {/* Reembolsar */}
          <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl opacity-50 cursor-not-allowed flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-1">
              <RotateCcw size={16} className="text-gray-400" />
              <span className="font-bold text-sm text-gray-400">Reembolsar</span>
            </div>
            <p className="text-xs text-gray-400">Próximamente</p>
          </div>

        </div>
      </div>

      {/* Modal para ejecutar la pausa */}
      <ModalPausarMembresia
        isOpen={pausarOpen}
        membresia={membresiaActual}
        clienteId={cliente?.id}
        onClose={() => setPausarOpen(false)}
        onSuccess={() => {
          onRefresh()
          setPausarOpen(false)
        }}
      />

    </div>
  )
}
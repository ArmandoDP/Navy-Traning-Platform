'use client'
import React from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface Props {
  isOpen: boolean
  cantidad: number
  loading?: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function ModalConfirmarEliminar({ isOpen, cantidad, loading, onClose, onConfirm }: Props) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-5 relative">
        
        {/* Botón cerrar */}
        <button 
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
        >
          <X size={18} />
        </button>

        {/* Encabezado con Icono Peligro */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={22} />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900">
              ¿Eliminar cliente{cantidad > 1 ? 's' : ''}?
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Esta acción es irreversible
            </p>
          </div>
        </div>

        {/* Mensaje descriptivo */}
        <div className="bg-red-50/60 border border-red-100 rounded-xl p-3.5 text-xs text-red-700 leading-relaxed">
          Estás a punto de borrar definitivamente{' '}
          <span className="font-extrabold">{cantidad} cliente{cantidad > 1 ? 's' : ''}</span>. 
          Se eliminará todo su historial de membresías, reservas, asistencias y pagos en la base de datos.
        </div>

        {/* Botones de acción estilizados */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 text-xs font-bold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            {loading ? 'Eliminando...' : 'Sí, eliminar definitivamente'}
          </button>
        </div>

      </div>
    </div>
  )
}
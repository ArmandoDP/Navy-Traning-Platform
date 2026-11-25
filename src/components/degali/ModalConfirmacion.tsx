'use client'
// Confirmación con el diseño del CRM (reemplaza el cuadro gris del navegador "localhost dice…")
import { X } from 'lucide-react'
import { ReactNode } from 'react'

interface Props {
  isOpen:       boolean
  titulo:       string
  subtitulo?:   string
  mensaje:      ReactNode
  textoConfirmar?: string
  cargando?:    boolean
  icono?:       ReactNode
  onClose:      () => void
  onConfirm:    () => void
}

export default function ModalConfirmacion({
  isOpen, titulo, subtitulo, mensaje, textoConfirmar = 'Confirmar', cargando, icono, onClose, onConfirm,
}: Props) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={cargando ? undefined : onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm z-10 overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {icono && (
              <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center flex-shrink-0">
                {icono}
              </div>
            )}
            <div>
              <h3 className="text-base font-black text-gray-900">{titulo}</h3>
              {subtitulo && <p className="text-xs text-gray-400 mt-0.5">{subtitulo}</p>}
            </div>
          </div>
          <button onClick={onClose} disabled={cargando} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 text-sm text-gray-600 leading-relaxed">{mensaje}</div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-2">
          <button onClick={onClose} disabled={cargando}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-gray-600 border border-gray-200 hover:bg-gray-50 transition disabled:opacity-40">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={cargando}
            className="flex-1 py-3 rounded-xl text-sm font-black text-white transition disabled:opacity-40"
            style={{ backgroundColor: '#171B24' }}>
            {cargando ? 'Procesando…' : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  )
}

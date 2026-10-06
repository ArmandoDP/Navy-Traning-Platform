'use client'

import { Pencil, Send, Upload, Eye, Zap } from 'lucide-react'

interface ReservasPanelesProps {
  onExportar?: () => void
}

interface SubItem {
  color: string
  texto: string
}

interface PanelData {
  titulo: string
  items: SubItem[]
}

const POLITICAS: SubItem[] = [
  { color: 'bg-emerald-500', texto: 'Cancelación con +24h: Sin cargo' },
  { color: 'bg-rose-500', texto: 'Cancelación con -24h: Cargo del 50%' },
  { color: 'bg-rose-500', texto: 'No-Show: Cargo completo' },
]

const ALERTAS: SubItem[] = [
  { color: 'bg-sky-400', texto: 'Recordatorio 2h antes de clase' },
  { color: 'bg-amber-400', texto: 'Confirmación de asistencia' },
  { color: 'bg-rose-400', texto: 'Notificación de cancelación' },
]

const PANELES_INFO: PanelData[] = [
  { titulo: 'Políticas de cancelación', items: POLITICAS },
  { titulo: 'Alertas automáticas', items: ALERTAS },
]

export default function ReservasPaneles({ onExportar }: ReservasPanelesProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Listas de Información */}
      {PANELES_INFO.map((panel, idx) => (
        <div
          key={idx}
          className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-zinc-900 text-sm">{panel.titulo}</h3>
              <button
                type="button"
                aria-label={`Editar ${panel.titulo.toLowerCase()}`}
                className="text-zinc-400 hover:text-zinc-700 transition-colors p-1 -mr-1 rounded-md focus:outline-none focus:ring-2 focus:ring-zinc-400"
              >
                <Pencil size={14} />
              </button>
            </div>
            <div className="space-y-2.5">
              {panel.items.map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className={`w-2 h-2 rounded-full ${item.color} shrink-0 mt-1.5`} />
                  <p className="text-zinc-600 text-sm leading-tight">{item.texto}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* Quick actions */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Zap size={14} className="text-zinc-700" />
            <h3 className="font-bold text-zinc-900 text-sm">Quick actions</h3>
          </div>
          <div className="space-y-2">
            <button
              type="button"
              className="w-full flex items-center justify-between bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-900"
            >
              <span>Enviar recordatorios</span>
              <Send size={14} />
            </button>

            {/* BOTÓN UNIFICADO QUE EJECUTA LA EXPORTACIÓN FILTRADA */}
            <button
              type="button"
              onClick={onExportar}
              className="w-full flex items-center justify-between bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-300"
            >
              <span>Exportar reporte</span>
              <Upload size={14} />
            </button>

            <button
              type="button"
              className="w-full flex items-center justify-between bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-300"
            >
              <span>Ver historial</span>
              <Eye size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
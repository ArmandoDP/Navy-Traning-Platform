'use client'
import { ChevronRight } from 'lucide-react'

const COLORS: Record<string, string> = {
  Lomas:      '#22c55e',
  Juriquilla: '#6366f1',
  Interlomas: '#3b82f6',
  Refugio:    '#f97316',
}

const ACTIVIDAD = [
  { icon: '👤', texto: 'Nuevo registro de cliente', sucursal: 'Lomas',      tiempo: '10 min'     },
  { icon: '📅', texto: '12 reservas nuevas',        sucursal: 'Juriquilla', tiempo: '25 min'     },
  { icon: '❌', texto: 'Pago fallido: Carlos Ruiz', sucursal: 'Interlomas', tiempo: '1 hr'       },
  { icon: '✅', texto: 'Nueva clase creada',        sucursal: 'Refugio',    tiempo: '1 hr 30 min'},
  { icon: '👤', texto: 'Nuevo registro de cliente', sucursal: 'Lomas',      tiempo: '2 hrs'      },
]

export default function DashboardActividad() {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 text-sm">Actividad reciente</h3>
        <button className="text-indigo-500 text-xs font-bold hover:underline flex items-center gap-0.5">
          Ver todo <ChevronRight size={12}/>
        </button>
      </div>
      <div className="space-y-3">
        {ACTIVIDAD.map((a, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-sm flex-shrink-0">
              {a.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-700 leading-tight">
                {a.texto}{' '}
                <span
                  className="font-bold px-1.5 py-0.5 rounded-md text-white text-[10px]"
                  style={{ backgroundColor: COLORS[a.sucursal] || '#6366f1' }}
                >
                  {a.sucursal}
                </span>
              </p>
            </div>
            <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0">{a.tiempo}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
'use client'
import { AlertTriangle, Clock, BarChart2, ChevronRight } from 'lucide-react'

const ALERTAS = [
  {
    icon:   <AlertTriangle size={14} className="text-red-500" />,
    bg:     'bg-red-50 border-red-100',
    iconBg: 'bg-red-100',
    label:  'Pagos fallidos',
    sub:    '+30% últ. 7 días',
    val:    12,
    color:  'text-red-500',
    arrow:  'text-red-400',
  },
  {
    icon:   <Clock size={14} className="text-yellow-500" />,
    bg:     'bg-yellow-50 border-yellow-100',
    iconBg: 'bg-yellow-100',
    label:  'Membresías por expirar',
    sub:    'Próximos 7 días',
    val:    34,
    color:  'text-yellow-500',
    arrow:  'text-yellow-400',
  },
  {
    icon:   <BarChart2 size={14} className="text-blue-500" />,
    bg:     'bg-blue-50 border-blue-100',
    iconBg: 'bg-blue-100',
    label:  'Clases con baja ocupación',
    sub:    'Menos del 50%',
    val:    5,
    color:  'text-blue-500',
    arrow:  'text-blue-400',
  },
]

export default function DashboardAlertas() {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-gray-900 text-sm">Alertas críticas</h3>
          <span className="bg-red-500 text-white text-xs font-black px-1.5 py-0.5 rounded-full">12</span>
        </div>
        <button className="text-indigo-500 text-xs font-bold hover:underline flex items-center gap-0.5">
          Ver alertas <ChevronRight size={12}/>
        </button>
      </div>

      <div className="space-y-2">
        {ALERTAS.map(a => (
          <div key={a.label} className={`flex items-center justify-between p-3 border rounded-xl cursor-pointer transition hover:opacity-80 ${a.bg}`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 ${a.iconBg} rounded-lg flex items-center justify-center`}>
                {a.icon}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-800">{a.label}</p>
                <p className="text-[10px] text-gray-400">{a.sub}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className={`text-xl font-black ${a.color}`}>{a.val}</span>
              <ChevronRight size={14} className={a.arrow}/>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
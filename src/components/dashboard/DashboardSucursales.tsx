'use client'
import { MapPin, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react'

const SUCURSALES = [
  { nombre: 'Juriquilla, QRO',  key: 'Juriquilla', ingresos: 320000, ocu: 79, ret: 81, cli: 320, delta: 12  },
  { nombre: 'Refugio, QRO',     key: 'Refugio',    ingresos: 180000, ocu: 72, ret: 79, cli: 210, delta: -3  },
  { nombre: 'Lomas, CDMX',      key: 'Lomas',      ingresos: 410000, ocu: 85, ret: 85, cli: 420, delta: 8   },
  { nombre: 'Interlomas, CDMX', key: 'Interlomas', ingresos: 330000, ocu: 75, ret: 80, cli: 290, delta: 15  },
]

const COLORS: Record<string, string> = {
  Juriquilla: '#6366f1',
  Refugio:    '#f97316',
  Lomas:      '#22c55e',
  Interlomas: '#3b82f6',
}

function Delta({ value }: { value: number }) {
  const pos = value >= 0
  return (
    <span className={`flex items-center gap-0.5 text-xs font-bold ${pos ? 'text-green-500' : 'text-red-500'}`}>
      {pos ? <TrendingUp size={10}/> : <TrendingDown size={10}/>}
      {pos ? '+' : ''}{value}%
    </span>
  )
}

export default function DashboardSucursales() {
  return (
    <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="font-bold text-gray-900 text-sm">Rendimiento por sucursal</h3>
        <button className="text-indigo-500 text-xs font-bold hover:underline flex items-center gap-0.5">
          Ver detalles <ChevronRight size={12}/>
        </button>
      </div>
      <table className="w-full text-left">
        <thead className="text-gray-400 text-[10px] font-bold uppercase">
          <tr>
            <th className="px-5 py-2.5">Sucursal</th>
            <th className="px-5 py-2.5">Ingresos</th>
            <th className="px-5 py-2.5">Ocupación</th>
            <th className="px-5 py-2.5">Retención</th>
            <th className="px-5 py-2.5">Clientes</th>
            <th className="px-5 py-2.5"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {SUCURSALES.map(s => (
            <tr key={s.nombre} className="hover:bg-gray-50 transition cursor-pointer">
              <td className="px-5 py-3 text-sm font-medium text-gray-900">
                <div className="flex items-center gap-2">
                  <MapPin size={13} style={{ color: COLORS[s.key] }} />
                  {s.nombre}
                </div>
              </td>
              <td className="px-5 py-3">
                <p className="text-sm font-bold text-gray-900">${s.ingresos.toLocaleString()}</p>
                <Delta value={s.delta} />
              </td>
              <td className="px-5 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-100 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${s.ocu}%` }} />
                  </div>
                  <span className="text-xs text-gray-500">{s.ocu}%</span>
                </div>
              </td>
              <td className="px-5 py-3">
                <span className="text-sm font-bold text-blue-500">{s.ret}%</span>
              </td>
              <td className="px-5 py-3 text-sm text-gray-700">{s.cli}</td>
              <td className="px-5 py-3">
                <ChevronRight size={14} className="text-gray-400" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
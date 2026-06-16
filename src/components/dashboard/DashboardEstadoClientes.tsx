'use client'
import { AlertTriangle } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

interface Props {
  totalClientes:   number
  clientesActivos: number
}

export default function DashboardEstadoClientes({ totalClientes, clientesActivos }: Props) {
  const lost    = Math.round(totalClientes * 0.06)
  const failed  = Math.round(totalClientes * 0.04)
  const expired = Math.round(totalClientes * 0.10)

  const data = [
    { name: 'Active',  value: clientesActivos || 1, color: '#22c55e', pct: 70 },
    { name: 'Lost',    value: lost    || 0,          color: '#ef4444', pct: 12 },
    { name: 'Failed',  value: failed  || 0,          color: '#f59e0b', pct: 8  },
    { name: 'Expired', value: expired || 0,          color: '#9ca3af', pct: 10 },
  ]

  const total = totalClientes || 3020

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 text-sm">Estado de clientes</h3>
        <span className="flex items-center gap-1 text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
          <AlertTriangle size={10}/> Lost +15%
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Donut */}
        <div className="relative flex-shrink-0" style={{ width: 110, height: 110 }}>
          <ResponsiveContainer width={110} height={110}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={32} outerRadius={50} dataKey="value" strokeWidth={0}>
                {data.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[9px] font-bold text-gray-400 uppercase">TOTAL</span>
            <span className="text-base font-black text-gray-900">{total.toLocaleString()}</span>
          </div>
        </div>

        {/* Leyenda */}
        <div className="flex-1 space-y-2">
          {data.map(d => (
            <div key={d.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-gray-500">{d.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900">{d.value || Math.round(total * d.pct / 100)}</span>
                <span className="text-gray-400 w-7 text-right">{d.pct}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
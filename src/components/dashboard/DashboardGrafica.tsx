'use client'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

interface Props {
  margen: number
}

const DATA = [
  { dia: '1',  Ingresos: 300000, Nomina: 120000 },
  { dia: '5',  Ingresos: 450000, Nomina: 180000 },
  { dia: '10', Ingresos: 380000, Nomina: 150000 },
  { dia: '15', Ingresos: 520000, Nomina: 200000 },
  { dia: '20', Ingresos: 490000, Nomina: 160000 },
  { dia: '25', Ingresos: 600000, Nomina: 220000 },
  { dia: '30', Ingresos: 550000, Nomina: 190000 },
]

export default function DashboardGrafica({ margen }: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900 text-sm">Ingresos vs. Nómina</h3>
        <span className="text-xs text-gray-400">
          Margen actual: <strong className="text-gray-700">{margen}%</strong>
        </span>
      </div>
      <div style={{ width: '100%', height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={DATA} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gIng" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="gNom" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="dia" tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false}
              tickFormatter={v => `$${(v/1000).toFixed(0)}k`} width={36} />
            <Tooltip formatter={(v: any) => `$${Number(v).toLocaleString()}`} />
            <Area type="monotone" dataKey="Ingresos" stroke="#6366f1" strokeWidth={2} fill="url(#gIng)"
              dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }} />
            <Area type="monotone" dataKey="Nomina" stroke="#22c55e" strokeWidth={2} fill="url(#gNom)"
              dot={{ r: 3, fill: '#22c55e', strokeWidth: 0 }} />
            <Legend iconType="plainline" iconSize={16} wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
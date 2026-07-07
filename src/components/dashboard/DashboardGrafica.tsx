'use client'
import { useEffect, useState } from 'react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { supabase } from '@/lib/supabase'

interface Props { margen: number }

export default function DashboardGrafica({ margen }: Props) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      const [{ data: pagos }, { data: nomina }] = await Promise.all([
        supabase.from('pagos').select('monto, fecha_pago').neq('estatus', 'Fallido').gte('fecha_pago', inicioMes.toISOString()),
        supabase.from('pagos_coaches').select('monto, fecha_pago').gte('fecha_pago', inicioMes.toISOString()),
      ])

      const dias = new Date(inicioMes.getFullYear(), inicioMes.getMonth() + 1, 0).getDate()
      const porDia = Array.from({ length: dias }, (_, i) => ({ dia: String(i + 1), Ingresos: 0, Nomina: 0 }))

      pagos?.forEach(p => {
        const d = new Date(p.fecha_pago).getDate()
        if (porDia[d - 1]) porDia[d - 1].Ingresos += Number(p.monto)
      })
      nomina?.forEach(n => {
        const d = new Date(n.fecha_pago).getDate()
        if (porDia[d - 1]) porDia[d - 1].Nomina += Number(n.monto)
      })

      setData(porDia)
      setLoading(false)
    }
    fetchData()
  }, [])

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900 text-sm">Ingresos vs. Nómina</h3>
        <span className="text-xs text-gray-400">
          Margen actual: <strong className="text-gray-700">{margen}%</strong>
        </span>
      </div>
      <div style={{ width: '100%', height: 160 }}>
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-xs">Cargando...</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
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
              <Area type="monotone" dataKey="Ingresos" stroke="#6366f1" strokeWidth={2} fill="url(#gIng)" dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }} />
              <Area type="monotone" dataKey="Nomina" stroke="#22c55e" strokeWidth={2} fill="url(#gNom)" dot={{ r: 3, fill: '#22c55e', strokeWidth: 0 }} />
              <Legend iconType="plainline" iconSize={16} wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
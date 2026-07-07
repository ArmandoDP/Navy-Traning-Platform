'use client'
import { useEffect, useState } from 'react'
import { MapPin, ChevronRight, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const COLORS = ['#22c55e', '#6366f1', '#3b82f6', '#f97316', '#a855f7', '#eab308']

export default function DashboardSucursales() {
  const [sucursales, setSucursales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: sedes }, { data: clientes }, { data: pagos }, { data: reservas }, { data: clases }] = await Promise.all([
        supabase.from('sucursales').select('id, nombre'),
        supabase.from('clientes').select('id, sucursal_id, estatus'),
        supabase.from('pagos').select('monto, sucursal_id').neq('estatus', 'Fallido'),
        supabase.from('reservas').select('id, clase_id'),
        supabase.from('clases').select('id, sucursal_id, capacidad_max'),
      ])

      // mapa clase_id -> sucursal_id
      const claseSucursal: Record<string, string> = {}
      clases?.forEach(c => { claseSucursal[c.id] = c.sucursal_id })

      const rows = (sedes || []).map(s => {
        const cli = clientes?.filter(c => c.sucursal_id === s.id) || []
        const ingresos = pagos?.filter(p => p.sucursal_id === s.id).reduce((a, p) => a + Number(p.monto), 0) || 0
        const clasesSede = clases?.filter(c => c.sucursal_id === s.id) || []
        const capacidad = clasesSede.reduce((a, c) => a + c.capacidad_max, 0)
        const reservasSede = reservas?.filter(r => claseSucursal[r.clase_id] === s.id).length || 0
        const ocu = capacidad > 0 ? Math.round((reservasSede / capacidad) * 100) : 0
        const activos = cli.filter(c => c.estatus === 'Activo').length
        const ret = cli.length > 0 ? Math.round((activos / cli.length) * 100) : 0
        return { nombre: s.nombre, ingresos, ocu, ret, cli: cli.length }
      })

      setSucursales(rows)
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) return (
    <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm flex items-center justify-center h-64 text-gray-400 gap-2 text-sm">
      <RefreshCw size={14} className="animate-spin" /> Cargando sucursales...
    </div>
  )

  return (
    <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="font-bold text-gray-900 text-sm">Rendimiento por sucursal</h3>
        <button className="text-indigo-500 text-xs font-bold hover:underline flex items-center gap-0.5">
          Ver detalles <ChevronRight size={12}/>
        </button>
      </div>
      {sucursales.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-10">Aún no hay sucursales registradas</p>
      ) : (
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
            {sucursales.map((s, i) => (
              <tr key={s.nombre} className="hover:bg-gray-50 transition cursor-pointer">
                <td className="px-5 py-3 text-sm font-medium text-gray-900">
                  <div className="flex items-center gap-2">
                    <MapPin size={13} style={{ color: COLORS[i % COLORS.length] }} />
                    {s.nombre}
                  </div>
                </td>
                <td className="px-5 py-3 text-sm font-bold text-gray-900">${s.ingresos.toLocaleString()}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-gray-100 rounded-full h-1.5">
                      <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${s.ocu}%` }} />
                    </div>
                    <span className="text-xs text-gray-500">{s.ocu}%</span>
                  </div>
                </td>
                <td className="px-5 py-3"><span className="text-sm font-bold text-blue-500">{s.ret}%</span></td>
                <td className="px-5 py-3 text-sm text-gray-700">{s.cli}</td>
                <td className="px-5 py-3"><ChevronRight size={14} className="text-gray-400" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
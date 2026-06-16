'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { RefreshCw, Zap } from 'lucide-react'
import DashboardMetricas       from '@/components/dashboard/DashboardMetricas'
import DashboardEstadoClientes from '@/components/dashboard/DashboardEstadoClientes'
import DashboardAlertas        from '@/components/dashboard/DashboardAlertas'
import DashboardGrafica        from '@/components/dashboard/DashboardGrafica'
import DashboardSucursales     from '@/components/dashboard/DashboardSucursales'
import DashboardActividad      from '@/components/dashboard/DashboardActividad'

export default function DashboardEjecutivo() {
  const [metrics, setMetrics] = useState({
    ingresos: 0, clientesActivos: 0, totalClientes: 0,
    ocupacion: 0, retencion: 0, nominaTotal: 0
  })
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    const [{ data: clientes }, { data: pagos }, { data: clases }, { data: reservas }, { data: pagosCoaches }] = await Promise.all([
      supabase.from('clientes').select('id, estatus'),
      supabase.from('pagos').select('monto, fecha_pago').neq('estatus', 'Fallido'),
      supabase.from('clases').select('id, capacidad_max'),
      supabase.from('reservas').select('id'),
      supabase.from('pagos_coaches').select('monto'),
    ])

    const total      = clientes?.length || 0
    const activos    = clientes?.filter(c => c.estatus === 'Activo').length || 0
    const inicioMes  = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    const ingresos   = pagos?.filter(p => p.fecha_pago >= inicioMes).reduce((a, p) => a + Number(p.monto), 0) || 0
    const capTotal   = clases?.reduce((a, c) => a + c.capacidad_max, 0) || 1
    const ocupacion  = Math.round(((reservas?.length || 0) / capTotal) * 100)
    const retencion  = total > 0 ? Math.round((activos / total) * 100) : 0
    const nomina     = pagosCoaches?.reduce((a, p) => a + Number(p.monto), 0) || 0

    setMetrics({ ingresos, clientesActivos: activos, totalClientes: total, ocupacion, retencion, nominaTotal: nomina })
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const margen = metrics.ingresos > 0
    ? Math.round(((metrics.ingresos - metrics.nominaTotal) / metrics.ingresos) * 100)
    : 36

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400 gap-2">
      <RefreshCw size={16} className="animate-spin" /> Cargando métricas...
    </div>
  )

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Visión general del negocio ·{' '}
            <span className="text-indigo-500 font-medium cursor-pointer">Vista Global</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 border border-gray-200 bg-white rounded-xl px-3 py-2 text-sm text-gray-600 cursor-pointer hover:bg-gray-50">
            📅 Últimos 30 días ▾
          </div>
          <div className="flex items-center gap-2 border border-gray-200 bg-white rounded-xl px-3 py-2 text-sm text-gray-600 cursor-pointer hover:bg-gray-50">
            🌐 Global ▾
          </div>
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-4 py-2 rounded-xl transition">
            <Zap size={14} /> Quick actions
          </button>
        </div>
      </div>

      {/* Métricas */}
      <DashboardMetricas {...metrics} />

      {/* Fila media */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DashboardEstadoClientes totalClientes={metrics.totalClientes} clientesActivos={metrics.clientesActivos} />
        <DashboardAlertas />
        <DashboardGrafica margen={margen} />
      </div>

      {/* Fila inferior */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DashboardSucursales />
        <DashboardActividad />
      </div>

    </div>
  )
}
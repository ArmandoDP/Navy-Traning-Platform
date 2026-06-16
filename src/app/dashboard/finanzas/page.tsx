'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import FinanzasResumen  from '@/components/finanzas/FinanzasResumen'
import FinanzasIngresos from '@/components/finanzas/FinanzasIngresos'
import FinanzasPagos    from '@/components/finanzas/FinanzasPagos'
import FinanzasNomina   from '@/components/finanzas/FinanzasNomina'

export default function FinanzasPage() {
  const [pagos,        setPagos]        = useState<any[]>([])
  const [pagosCoaches, setPagosCoaches] = useState<any[]>([])
  const [costos,       setCostos]       = useState<any[]>([])
  const [loading,      setLoading]      = useState(true)

  const fetchData = async () => {
    setLoading(true)

    const [{ data: pgs }, { data: pcs }, { data: cos }] = await Promise.all([
      supabase.from('pagos').select('*, clientes(nombre_completo, plan)').order('fecha_pago', { ascending: false }),
      supabase.from('pagos_coaches').select('*, coaches(nombre_completo, especialidad)').order('fecha_pago', { ascending: false }),
      supabase.from('costos').select('*').order('fecha', { ascending: false }),
    ])

    if (pgs)  setPagos(pgs)
    if (pcs)  setPagosCoaches(pcs)
    if (cos)  setCostos(cos)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  // ── Métricas del mes actual ────────────────────────────────────────────────
  const ahora          = new Date()
  const inicioMes      = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString()
  const inicioAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1).toISOString()
  const finAnterior    = new Date(ahora.getFullYear(), ahora.getMonth(), 0).toISOString()

  const ingresosMes      = pagos.filter(p => p.fecha_pago >= inicioMes && p.estatus !== 'Fallido').reduce((a, p) => a + Number(p.monto), 0)
  const ingresosMesAnt   = pagos.filter(p => p.fecha_pago >= inicioAnterior && p.fecha_pago <= finAnterior && p.estatus !== 'Fallido').reduce((a, p) => a + Number(p.monto), 0)

  const costosMes        = [
    ...costos.filter(c => c.fecha >= inicioMes),
    ...pagosCoaches.filter(p => p.fecha_pago >= inicioMes)
  ].reduce((a, c) => a + Number(c.monto), 0)

  const costosMesAnt     = [
    ...costos.filter(c => c.fecha >= inicioAnterior && c.fecha <= finAnterior),
    ...pagosCoaches.filter(p => p.fecha_pago >= inicioAnterior && p.fecha_pago <= finAnterior)
  ].reduce((a, c) => a + Number(c.monto), 0)

  const margen = ingresosMes > 0 ? Math.round(((ingresosMes - costosMes) / ingresosMes) * 100) : 0

  if (loading) return <div className="p-10 text-zinc-500 italic">Cargando finanzas Navy...</div>

  return (
    <div className="p-6 space-y-5 bg-zinc-50 min-h-screen">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-zinc-900">Finanzas</h1>
        <p className="text-zinc-400 text-sm mt-0.5">Resumen financiero del negocio</p>
      </div>

      {/* Resumen */}
      <FinanzasResumen
        ingresos={ingresosMes}
        costos={costosMes}
        margen={margen}
        ingresosMesAnterior={ingresosMesAnt}
        costosMesAnterior={costosMesAnt}
      />

      {/* Ingresos */}
      <FinanzasIngresos pagos={pagos} />

      {/* Transacciones */}
      <FinanzasPagos pagos={pagos} />

      {/* Nómina y costos */}
      <FinanzasNomina
        pagosCoaches={pagosCoaches}
        costos={costos}
        onRefresh={fetchData}
      />

    </div>
  )
}
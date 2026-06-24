'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

import SucursalHeader  from '@/components/sucursales/detalle/SucursalHeader'
import SucursalMetricas from '@/components/sucursales/detalle/SucursalMetricas'
import SucursalClientes from '@/components/sucursales/detalle/SucursalClientes'
import SucursalRooms   from '@/components/sucursales/detalle/SucursalRooms'
import DrawerSucursal from '@/components/sucursales/DrawerSucursal'
import ModalCrearClase    from '@/components/ModalCrearClase'

export default function DetalleSucursal() {
  const { id } = useParams()

  const [sucursal,   setSucursal]   = useState<any>(null)
  const [clases,     setClases]     = useState<any[]>([])
  const [clientes,   setClientes]   = useState<any[]>([])
  const [pagos,      setPagos]      = useState<any[]>([])
  const [loading,    setLoading]    = useState(true)
  const [modalEdit,  setModalEdit]  = useState(false)
  const [modalClase, setModalClase] = useState(false)

  const fetchData = async () => {
    setLoading(true)

    const { data: suc }  = await supabase.from('sucursales').select('*').eq('id', id).single()
    const { data: cls }  = await supabase.from('clases').select('*, staff(nombre, primer_apellido)').eq('sucursal_id', id).order('horario')
    const { data: clis } = await supabase.from('clientes').select('id, estatus').eq('sucursal_id', id)

    const clienteIds = (clis || []).map((c: any) => c.id)
    const { data: pgs } = clienteIds.length > 0
      ? await supabase.from('pagos').select('monto, fecha_pago').in('cliente_id', clienteIds).neq('estatus', 'Fallido')
      : { data: [] }

    if (suc) setSucursal(suc)
    setClases(cls   || [])
    setClientes(clis || [])
    setPagos(pgs    || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [id])

  // ── Cálculos ───────────────────────────────────────────────────────────────
  const total   = clientes.length
  const activos = clientes.filter((c: any) => c.estatus === 'Activo').length
  const lost    = clientes.filter((c: any) => c.estatus === 'Inactivo').length
  const failed  = clientes.filter((c: any) => c.estatus === 'Vencido').length
  const expired = Math.max(total - activos - lost - failed, 0)
  const retencion = total > 0 ? Math.round((activos / total) * 100) : 0

  // Ingresos últimos 6 meses
  const ahora = new Date()
  const meses6 = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - (5 - i), 1)
    return { mes: d.getMonth(), anio: d.getFullYear() }
  })
  const ingresosSerie = meses6.map(m => {
    const ini = new Date(m.anio, m.mes, 1).toISOString()
    const fin = new Date(m.anio, m.mes + 1, 0).toISOString()
    return pagos.filter((p: any) => p.fecha_pago >= ini && p.fecha_pago <= fin)
      .reduce((a: number, p: any) => a + Number(p.monto), 0)
  })

  const ingresosMes = ingresosSerie[5] || 0
  const ingresosAnt = ingresosSerie[4] || 0
  const deltaIngresos = ingresosAnt > 0
    ? Math.round(((ingresosMes - ingresosAnt) / ingresosAnt) * 100)
    : 0

  // Retención serie simulada (requeriría snapshots históricos)
  const retencionSerie = meses6.map((_, i) =>
    Math.max(retencion + (i - 3) * 1.5 + (Math.random() * 2 - 1), 0)
  )
  const deltaRetencion = 15

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400 gap-2">
      <RefreshCw size={16} className="animate-spin" /> Cargando...
    </div>
  )
  if (!sucursal) return <div className="p-10 text-red-500">Sucursal no encontrada.</div>

  return (
    <div className="space-y-5">

      <SucursalHeader
        sucursal={sucursal}
        delta={deltaIngresos}
        onEditar={() => setModalEdit(true)}
      />

      <SucursalMetricas
        ingresosMes={ingresosMes}
        deltaIngresos={deltaIngresos}
        ingresosSerie={ingresosSerie}
        retencion={retencion}
        deltaRetencion={deltaRetencion}
        retencionSerie={retencionSerie}
      />

      <SucursalClientes
        total={total}
        capacidad={sucursal.capacidad || 400}
        activos={activos}
        lost={lost}
        failed={failed}
        expired={expired}
      />

      <SucursalRooms
        clases={clases}
        onCrearRoom={() => setModalClase(true)}
      />

      <DrawerSucursal
        isOpen={modalEdit}
        onClose={() => setModalEdit(false)}
        onSuccess={() => { setModalEdit(false); fetchData() }}
        sucursal={sucursal}
      />

      <ModalCrearClase
        isOpen={modalClase}
        onClose={() => setModalClase(false)}
        onSuccess={fetchData}
        sucursalId={sucursal.id}
      />

    </div>
  )
}
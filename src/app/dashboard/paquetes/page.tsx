'use client'
import { useEffect, useState } from 'react'
import { supabase }          from '@/lib/supabase'
import { useSucursal }        from '@/context/SucursalContext'
import { Plus, RefreshCw }    from 'lucide-react'
import PaquetesMetricas        from '@/components/paquetes/PaquetesMetricas'
import PaquetesTabla           from '@/components/paquetes/PaquetesTabla'
import DrawerPaquete           from '@/components/paquetes/drawer/DrawerPaquete'
import ModalLinkPago from '@/components/pagos/ModalLinkPago'

export default function PaquetesPage() {
  const { sucursalId, sucursalActiva } = useSucursal()

  const [paquetes,   setPaquetes]   = useState<any[]>([])
  const [series,     setSeries]     = useState<any[]>([])
  const [sucursales, setSucursales] = useState<any[]>([])
  const [loading,    setLoading]    = useState(true)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [paqueteActivo, setPaqueteActivo] = useState<any>(null)
  const [verticales, setVerticales] = useState<any[]>([])
  const [modalLink, setModalLink] = useState(false)

  const fetchPaquetes = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('paquetes')
      .select(`
        *,
        series_paquetes(nombre, color),
        paquete_verticales(vertical_id, verticales(nombre, color)),
        paquete_categorias(categoria_id),
        paquete_precios(activo, precio_app, activo_desde, sucursal_id, sucursales(nombre, color)),
        paquete_splits(*),
        paquete_rooms(room_id)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error al cargar paquetes:', error)
    }

    if (data) {
      const filtrado = sucursalId
        ? data.filter(p =>
            p.paquete_precios?.some((pp: any) => pp.sucursal_id === sucursalId)
          )
        : data
      setPaquetes(filtrado)
    }
    setLoading(false)
  }

  // El toggle solo decide si el paquete aparece en la app para comprar.
  // No cambia su estatus (Activo, Borrador, Pausado, Archivado): eso se maneja desde el paquete.
  const handleToggleVisibilidad = async (paqueteId: string, visible: boolean) => {
    setPaquetes(prev => prev.map(p => p.id === paqueteId ? { ...p, visible_en_app: visible } : p))
    const { error } = await supabase.from('paquetes').update({ visible_en_app: visible }).eq('id', paqueteId)
    if (error) {
      console.error('Error al cambiar la visibilidad del paquete:', error)
      alert('No se pudo guardar el cambio. Inténtalo de nuevo.')
      fetchPaquetes()
    }
  }

  const fetchCatalogos = async () => {
    const [{ data: sers }, { data: sucs }] = await Promise.all([
      supabase.from('series_paquetes').select('*').order('nombre'),
      supabase.from('sucursales').select('id, nombre').eq('estatus', 'Activa').order('nombre'),
    ])
    const { data: verts } = await supabase.from('verticales').select('id, nombre').order('nombre')
    if (sers) setSeries(sers)
    if (sucs) setSucursales(sucs)
    if (verts) setVerticales(verts)
  }

  useEffect(() => {
    fetchClientesYCatalogos()
  }, [sucursalId])

  const fetchClientesYCatalogos = async () => {
    await fetchPaquetes()
    await fetchCatalogos()
  }

  // Métricas
  const activos         = paquetes.filter(p => p.estatus === 'Activo')
  const totalPaquetes   = activos.length
  const miembrosActivos = 0   // pendiente
  const ingresosTotales = 0   // pendiente
  const tasaAsistencia  = 0   // pendiente

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400 gap-2">
      <RefreshCw size={16} className="animate-spin" /> Cargando paquetes...
    </div>
  )

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Paquetes</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Gestión de membresías y precios
            {sucursalActiva && ` · ${sucursalActiva.nombre}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setModalLink(true)}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-xl">
            🔗 Link de pago
          </button>
          <button onClick={() => { setPaqueteActivo(null); setDrawerOpen(true) }}
            className="flex items-center gap-2 btn-dark font-bold text-sm px-4 py-2.5 rounded-xl transition">
            <Plus size={15} /> Nuevo paquete
          </button>
        </div>
      </div>

      {/* Métricas */}
      <PaquetesMetricas
        totalPaquetes={totalPaquetes}
        miembrosActivos={miembrosActivos}
        ingresosTotales={ingresosTotales}
        tasaAsistencia={tasaAsistencia}
      />

      {/* Tabla */}
      <PaquetesTabla
        paquetes={paquetes}
        series={series}
        sucursales={sucursales}
        verticales={verticales}
        onVer={(p) => { setPaqueteActivo(p); setDrawerOpen(true) }}
        onNuevo={() => { setPaqueteActivo(null); setDrawerOpen(true) }}
        onToggleVisibilidad={handleToggleVisibilidad}
      />

      {/* Drawer */}
      <DrawerPaquete
        isOpen={drawerOpen}
        paquete={paqueteActivo}
        verticales={verticales}
        onClose={() => { setDrawerOpen(false); setPaqueteActivo(null) }}
        onSuccess={async () => {
          await fetchPaquetes()
          setDrawerOpen(false)
          setPaqueteActivo(null)
        }}
      />

      <ModalLinkPago isOpen={modalLink} onClose={() => setModalLink(false)} />

    </div>
  )
}
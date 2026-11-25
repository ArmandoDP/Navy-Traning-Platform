'use client'
import { useState } from 'react'
import { useSucursal } from '@/context/SucursalContext'
import PuntoDeVenta    from '@/components/degali/PuntoDeVenta'
import VentasHistorial from '@/components/degali/VentasHistorial'
import InventarioTabla from '@/components/degali/InventarioTabla'
import ProductosTabla  from '@/components/degali/ProductosTabla'
import ConteoFisico    from '@/components/degali/ConteoFisico'
import MermaHistorial  from '@/components/degali/MermaHistorial'
import GalleyGlobal    from '@/components/degali/GalleyGlobal'

type Tab = 'ventas' | 'historial' | 'inventario' | 'conteo' | 'merma' | 'productos'

const TABS = [
  { key: 'ventas',     label: '🛒 Punto de venta' },
  { key: 'historial',  label: '📋 Historial' },
  { key: 'inventario', label: '📦 Inventario' },
  { key: 'conteo',     label: '✅ Conteo' },
  { key: 'merma',      label: '🗑️ Merma' },
  { key: 'productos',  label: '🧃 Productos' },
]

export default function DegaliPage() {
  // La sucursal se elige arriba, en el selector del CRM. Quien tiene sucursal fija ve solo la suya;
  // Dirección puede elegir "Global" (resumen de todas) o una sucursal (para operar).
  const { sucursalId, sucursalActiva } = useSucursal()
  const [tab, setTab] = useState<Tab>('ventas')

  const encabezado = (
    <div>
      <h1 className="text-2xl font-black text-gray-900">The Galley</h1>
      <p className="text-gray-400 text-sm mt-0.5">Smoothie Bar · {sucursalActiva ? sucursalActiva.nombre : 'Global'}</p>
    </div>
  )

  if (!sucursalId) {
    return (
      <div className="space-y-5">
        {encabezado}
        <GalleyGlobal />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {encabezado}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-1">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as Tab)}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition ${
              tab === t.key
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'ventas'     && <PuntoDeVenta   sucursalId={sucursalId} />}
      {tab === 'historial'  && <VentasHistorial sucursalId={sucursalId} />}
      {tab === 'inventario' && <InventarioTabla sucursalId={sucursalId} />}
      {tab === 'conteo'     && <ConteoFisico    sucursalId={sucursalId} />}
      {tab === 'merma'      && <MermaHistorial  sucursalId={sucursalId} />}
      {tab === 'productos'  && <ProductosTabla  sucursalId={sucursalId} />}
    </div>
  )
}

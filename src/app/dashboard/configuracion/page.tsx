'use client'
import { useEffect, useState } from 'react'
import { supabase }            from '@/lib/supabase'
import { Plus, RefreshCw }     from 'lucide-react'
import DrawerGerente           from '@/components/configuracion/DrawerGerente'

export default function ConfiguracionPage() {
  const [gerentes,    setGerentes]    = useState<any[]>([])
  const [sucursales,  setSucursales]  = useState<any[]>([])
  const [loading,     setLoading]     = useState(true)
  const [drawerOpen,  setDrawerOpen]  = useState(false)
  const [gerenteActivo, setGerenteActivo] = useState<any>(null)

  const fetchData = async () => {
    setLoading(true)
    const [{ data: gers }, { data: sucs }] = await Promise.all([
      supabase.from('staff')
        .select('*, sucursales:sucursal_asignada_id(id, nombre, color)')
        .eq('tipo', 'Manager')
        .order('nombre'),
      supabase.from('sucursales')
        .select('id, nombre, color')
        .eq('estatus', 'Activa')
        .order('nombre'),
    ])
    if (gers) setGerentes(gers)
    if (sucs) setSucursales(sucs)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const NIVEL_CONFIG: Record<string, string> = {
    Activo:   'bg-emerald-50 text-emerald-600',
    Inactivo: 'bg-red-50 text-red-500',
  }

  function hexSoftBg(hex: string) {
    if (!hex || hex.length < 7) return '#f3f4f6'
    const r = parseInt(hex.slice(1,3),16)
    const g = parseInt(hex.slice(3,5),16)
    const b = parseInt(hex.slice(5,7),16)
    return `rgba(${r},${g},${b},0.12)`
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400 gap-2">
      <RefreshCw size={16} className="animate-spin" /> Cargando configuración...
    </div>
  )

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Configuración</h1>
          <p className="text-gray-400 text-sm mt-0.5">Gestión de gerentes y asignación de sucursales</p>
        </div>
        <button onClick={() => { setGerenteActivo(null); setDrawerOpen(true) }}
          className="flex items-center gap-2 btn-dark font-bold text-sm px-4 py-2.5 rounded-xl transition">
          <Plus size={15} /> Nuevo gerente
        </button>
      </div>

      {/* Tabla gerentes */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-500 font-medium">{gerentes.length} Gerentes</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-gray-400 text-[11px] font-bold uppercase border-b border-gray-100 bg-white">
              <tr>
                <th className="px-5 py-3">Gerente</th>
                <th className="px-5 py-3">Contacto</th>
                <th className="px-5 py-3">Sucursal asignada</th>
                <th className="px-5 py-3">Estatus</th>
                <th className="px-5 py-3">Fecha ingreso</th>
                <th className="px-5 py-3 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {gerentes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-gray-400 italic text-sm">
                    No hay gerentes registrados
                  </td>
                </tr>
              ) : gerentes.map(g => (
                <tr key={g.id} className="hover:bg-gray-50 transition">

                  {/* Gerente */}
                  <td className="px-5 py-3.5 min-w-[200px]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-black text-gray-500 flex-shrink-0 overflow-hidden">
                        {g.foto_url
                          ? <img src={g.foto_url} alt="" className="w-full h-full object-cover" />
                          : g.nombre?.charAt(0) || '?'
                        }
                      </div>
                      <div>
                        <button onClick={() => { setGerenteActivo(g); setDrawerOpen(true) }}
                          className="text-sm font-semibold text-gray-900 hover:text-indigo-600 transition text-left">
                          {g.nombre} {g.primer_apellido}
                        </button>
                        <p className="text-[11px] text-gray-400">{g.email || '—'}</p>
                      </div>
                    </div>
                  </td>

                  {/* Contacto */}
                  <td className="px-5 py-3.5">
                    <p className="text-xs text-gray-600">{g.telefono || '—'}</p>
                  </td>

                  {/* Sucursal */}
                  <td className="px-5 py-3.5">
                    {g.sucursales
                      ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold"
                          style={{ color: g.sucursales.color, backgroundColor: hexSoftBg(g.sucursales.color) }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: g.sucursales.color }} />
                          {g.sucursales.nombre}
                        </span>
                      : <span className="text-xs text-gray-300 italic">Sin sucursal asignada</span>
                    }
                  </td>

                  {/* Estatus */}
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${NIVEL_CONFIG[g.estatus] || 'bg-gray-100 text-gray-500'}`}>
                      {g.estatus}
                    </span>
                  </td>

                  {/* Fecha ingreso */}
                  <td className="px-5 py-3.5 text-xs text-gray-500">
                    {g.fecha_ingreso
                      ? new Date(g.fecha_ingreso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '—'
                    }
                  </td>

                  {/* Acción */}
                  <td className="px-5 py-3.5">
                    <button onClick={() => { setGerenteActivo(g); setDrawerOpen(true) }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-300 hover:text-indigo-600 transition">
                      →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer */}
      <DrawerGerente
        isOpen={drawerOpen}
        gerente={gerenteActivo}
        sucursales={sucursales}
        onClose={() => { setDrawerOpen(false); setGerenteActivo(null) }}
        onSuccess={() => { fetchData(); setDrawerOpen(false); setGerenteActivo(null) }}
      />
    </div>
  )
}
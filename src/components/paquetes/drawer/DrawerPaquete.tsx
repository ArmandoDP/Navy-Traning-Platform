'use client'
import { useState, useEffect } from 'react'
import { X }                   from 'lucide-react'
import { supabase }            from '@/lib/supabase'
import TabInfoBase             from './TabInfoBase'
import TabSucursalesYPrecio    from './TabSucursalesYPrecio'
import TabSplitsRevenue        from './TabSplitsRevenue'
import ToastExito              from '@/components/ToastExito'

interface Props {
  isOpen:    boolean
  paquete?:  any       // si viene → edición, si no → creación
  onClose:   () => void
  onSuccess: () => void
}

interface Sucursal { id: string; nombre: string; color: string }

type Tab = 'info' | 'precios' | 'splits'

const TABS = [
  { key: 'info',    label: 'Información base' },
  { key: 'precios', label: 'Sucursales y precio' },
  { key: 'splits',  label: 'Splits y revenue' },
]


export default function DrawerPaquete({ isOpen, paquete, onClose, onSuccess }: Props) {
  const [activeTab,  setActiveTab]  = useState<Tab>('info')
  const [loading,    setLoading]    = useState(false)
  const [toast,      setToast]      = useState(false)
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [series,     setSeries]     = useState<any[]>([])
  const [verticales, setVerticales] = useState<any[]>([])
  const [categorias, setCategorias] = useState<any[]>([])

  const [form, setForm] = useState({
    nombre:                   '',
    codigo_interno:           '',
    bio:                      '',
    serie_id:                 '',
    verticales_ids:           [] as string[],
    categorias_ids:           [] as string[],
    acceso_total:             false,
    acceso_sucursal_hermana:  false,
    vigencia_dias:            30,
    clases_incluidas:         null as number | null,
    renovacion:               'Automatica',
  })

  const [precios, setPrecios] = useState<{
    sucursal_id: string; activo: boolean; precio_app: string; activo_desde: string
  }[]>([])

  const [splits, setSplits] = useState<{
    sucursal_origen_id: string; sucursal_destino_id: string; porcentaje: number
  }[]>([])

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  const fetchCatalogos = async () => {
    const [{ data: sucs }, { data: sers }, { data: verts }, { data: cats }] = await Promise.all([
      supabase.from('sucursales').select('id, nombre, color').eq('estatus', 'Activa').order('nombre'),
      supabase.from('series_paquetes').select('*').order('nombre'),
      supabase.from('verticales').select('*').order('nombre'),
      supabase.from('categorias_clase').select('*').order('nombre'),
    ])
    if (sucs)  setSucursales(sucs)
    if (sers)  setSeries(sers)
    if (verts) setVerticales(verts)
    if (cats)  setCategorias(cats)

    // Inicializar precios con todas las sucursales
    if (sucs) {
      setPrecios(sucs.map(s => ({
        sucursal_id: s.id, activo: false, precio_app: '', activo_desde: ''
      })))
    }
  }

  // Si es edición, cargar datos del paquete
  useEffect(() => {
    if (!isOpen) return
    fetchCatalogos()
    setActiveTab('info')

    if (paquete) {
      setForm({
        nombre:                  paquete.nombre || '',
        codigo_interno:          paquete.codigo_interno || '',
        bio:                     paquete.bio || '',
        serie_id:                paquete.serie_id || '',
        verticales_ids:          paquete.paquete_verticales?.map((pv: any) => pv.vertical_id) || [],
        categorias_ids:          paquete.paquete_categorias?.map((pc: any) => pc.categoria_id) || [],
        acceso_total:            paquete.acceso_total || false,
        acceso_sucursal_hermana: paquete.acceso_sucursal_hermana || false,
        vigencia_dias:           paquete.duracion || 30,
        clases_incluidas:        paquete.clases_incluidas || null,
        renovacion:              paquete.renovacion || 'Automatica',
      })
      // Cargar precios
      if (paquete.paquete_precios?.length > 0) {
        setPrecios(prev => prev.map(p => {
          const found = paquete.paquete_precios.find((pp: any) => pp.sucursal_id === p.sucursal_id)
          return found
            ? { ...p, activo: found.activo, precio_app: found.precio_app?.toString() || '', activo_desde: found.activo_desde || '' }
            : p
        }))
      }
      // Cargar splits
      if (paquete.paquete_splits?.length > 0) {
        setSplits(paquete.paquete_splits.map((s: any) => ({
          sucursal_origen_id:  s.sucursal_origen,
          sucursal_destino_id: s.sucursal_destino,
          porcentaje:          s.porcentaje,
        })))
      }
    }
  }, [isOpen, paquete])

  const handlePrecioChange = (sucursalId: string, campo: string, valor: any) => {
    setPrecios(prev => prev.map(p =>
      p.sucursal_id === sucursalId ? { ...p, [campo]: valor } : p
    ))
  }

  const sucursalesActivas = sucursales.filter(s =>
    precios.find(p => p.sucursal_id === s.id)?.activo
  )

  const handleGuardar = async (estatus: 'Activo' | 'Borrador') => {
    if (!form.nombre) return
    setLoading(true)

    const payload = {
      nombre:           form.nombre,
      codigo_interno:   form.codigo_interno || null,
      bio:              form.bio || null,
      serie_id:         form.serie_id || null,
      vigencia_dias:    form.vigencia_dias,
      duracion:         form.vigencia_dias,
      clases_incluidas: form.clases_incluidas,
      numero_clases:    form.clases_incluidas,
      renovacion:       form.renovacion,
      estatus,
    }

    let paqueteId = paquete?.id

    if (paquete?.id) {
      await supabase.from('paquetes').update(payload).eq('id', paquete.id)
    } else {
      const { data } = await supabase.from('paquetes').insert(payload).select().single()
      paqueteId = data?.id
    }

    if (!paqueteId) { setLoading(false); return }

    // Verticales — borrar y reinsertar
    await supabase.from('paquete_verticales').delete().eq('paquete_id', paqueteId)
    if (form.verticales_ids.length > 0) {
      await supabase.from('paquete_verticales').insert(
        form.verticales_ids.map(vid => ({ paquete_id: paqueteId, vertical_id: vid }))
      )
    }

    // Categorías — borrar y reinsertar
    await supabase.from('paquete_categorias').delete().eq('paquete_id', paqueteId)
    if (form.categorias_ids.length > 0) {
      await supabase.from('paquete_categorias').insert(
        form.categorias_ids.map(cid => ({ paquete_id: paqueteId, categoria_id: cid }))
      )
    }
    console.log('precios state:', precios)
    console.log('precios activos:', precios.filter(p => p.activo && p.precio_app))

    // Precios — borrar y reinsertar
    await supabase.from('paquete_precios').delete().eq('paquete_id', paqueteId)
    const preciosActivos = precios.filter(p => p.activo && p.precio_app)
    if (preciosActivos.length > 0) {
      await supabase.from('paquete_precios').insert(
        preciosActivos.map(p => ({
          paquete_id:   paqueteId,
          sucursal_id:  p.sucursal_id,
          activo:       true,
          precio_app:   Number(p.precio_app),
          activo_desde: p.activo_desde || null,
        }))
      )
    }

    // Splits — borrar y reinsertar
    await supabase.from('paquete_splits').delete().eq('paquete_id', paqueteId)
    if (splits.length > 0) {
      await supabase.from('paquete_splits').insert(
        splits.map(s => ({
          paquete_id:       paqueteId,
          sucursal_origen:  s.sucursal_origen_id,
          sucursal_destino: s.sucursal_destino_id,
          porcentaje:       s.porcentaje,
        }))
      )
    }

    setLoading(false)
    setToast(true)
    onSuccess()
  }

  const handleClose = () => {
    setForm({
      nombre: '', codigo_interno: '', bio: '', serie_id: '',
      verticales_ids: [], categorias_ids: [],
      acceso_total: false, acceso_sucursal_hermana: false,
      vigencia_dias: 30, clases_incluidas: null, renovacion: 'Automatica',
    })
    setPrecios([])
    setSplits([])
    onClose()
  }

  const handleCambiarEstatus = async (estatus: string) => {
    if (!paquete?.id) return
    await supabase.from('paquetes').update({ estatus }).eq('id', paquete.id)
    onSuccess()
    handleClose()
    }

    const handleEliminar = async () => {
    if (!paquete?.id || !confirm('¿Eliminar este paquete? Esta acción no se puede deshacer.')) return
    await supabase.from('paquetes').delete().eq('id', paquete.id)
    onSuccess()
    handleClose()
    }
  if (!isOpen) return null

  return (
    <>
      {toast && (
        <ToastExito
          titulo={paquete ? 'Paquete actualizado' : 'Paquete creado'}
          mensaje={paquete ? 'Los cambios se guardaron correctamente.' : 'El paquete se creó exitosamente.'}
          onClose={() => setToast(false)}
        />
      )}

      {/* Overlay */}
      <div onClick={handleClose} className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" />

      {/* Drawer */}
      <div className="fixed top-0 right-0 z-50 h-full bg-white shadow-2xl flex flex-col" style={{ width: '560px' }}>

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-start justify-between mb-3">
            <div>
            <h2 className="text-base font-black text-gray-900">
                {paquete ? 'Editar paquete' : 'Nuevo paquete'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
                Crea un paquete y despliégalo en múltiples sucursales con precios y splits específicos
            </p>
            </div>
            <button onClick={handleClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition">
            <X size={16} />
            </button>
        </div>

        {/* Botones de acción — solo en edición */}
        {paquete && (
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
            <span className="text-sm font-bold text-gray-800 flex-1">{paquete.nombre}</span>
            <button onClick={() => handleGuardar('Borrador')}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition">
                ↺ Guardar borrador
            </button>
            <button onClick={() => handleCambiarEstatus('Pausado')}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition">
                ⏸ Pausar
            </button>
            <button onClick={handleEliminar}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-red-100 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 transition">
                🗑 Eliminar
            </button>
            </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-100 -mx-6 px-6 -mb-4">
            {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as Tab)}
                className={`px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${
                activeTab === tab.key
                    ? 'border-gray-900 text-gray-900 font-bold'
                    : 'border-transparent text-gray-400 hover:text-gray-700'
                }`}>
                {tab.label}
            </button>
            ))}
        </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'info' && (
            <TabInfoBase
              form={form}
              set={set}
              series={series}
              verticales={verticales}
              categorias={categorias}
              onRefreshCatalogos={fetchCatalogos}
            />
          )}
          {activeTab === 'precios' && (
            <TabSucursalesYPrecio
              sucursales={sucursales}
              precios={precios}
              onChange={handlePrecioChange}
            />
          )}
          {activeTab === 'splits' && (
            <TabSplitsRevenue
              sucursalesActivas={sucursalesActivas}
              precios={precios}  
              splits={splits}
              onChange={setSplits}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={() => handleGuardar('Borrador')} disabled={loading || !form.nombre}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition disabled:opacity-40">
            Guardar borrador
          </button>
          <div className="flex-1" />
          {activeTab !== 'info' && (
            <button onClick={() => setActiveTab(activeTab === 'precios' ? 'info' : 'precios')}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition flex items-center gap-2">
              ← Atrás
            </button>
          )}
          {activeTab !== 'splits' ? (
            <button
              onClick={() => setActiveTab(activeTab === 'info' ? 'precios' : 'splits')}
              disabled={!form.nombre}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition flex items-center gap-2"
              style={{ backgroundColor: '#171B24' }}>
              Siguiente →
            </button>
          ) : (
            <button onClick={() => handleGuardar('Activo')} disabled={loading || !form.nombre}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition"
              style={{ backgroundColor: '#171B24' }}>
              {loading ? 'Guardando...' : paquete ? 'Guardar cambios' : 'Crear paquete'}
            </button>
          )}
        </div>
      </div>
    </>
  )
}
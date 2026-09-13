'use client'
import { useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { X, RefreshCw } from 'lucide-react'

interface Props {
  sucursalId: string | null
  onClose: () => void
  onSuccess: () => void
}

const CATEGORIAS = ['Frutas', 'Lacteos', 'Proteinas', 'Grasas', 'Panes y Granos', 'Merch', 'Otros', 'Empaques']

// Opciones predefinidas de unidades estandarizadas
const UNIDADES_OPCIONES = [
  { value: 'pza', label: 'Unidades (pza)' },
  { value: 'g', label: 'Gramos (g)' },
  { value: 'kg', label: 'Kilogramos (kg)' },
  { value: 'ml', label: 'Mililitros (ml)' },
  { value: 'lt', label: 'Litros (lt)' },
]

export default function ModalNuevoInsumo({ sucursalId, onClose, onSuccess }: Props) {
  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState(CATEGORIAS[0])
  
  // Toggle / Selector de unidad estandarizada
  const [tipoUnidad, setTipoUnidad] = useState<'pza' | 'g'>('pza')
  const [unidad, setUnidad] = useState('pza')
  
  // Campos para el cálculo automático
  const [costoTotal, setCostoTotal] = useState<number | ''>('')
  const [stockInicial, setStockInicial] = useState<number | ''>(1)
  
  const [stockMinimo, setStockMinimo] = useState<number | ''>(5)
  const [stockReorden, setStockReorden] = useState<number | ''>(10)
  const [loading, setLoading] = useState(false)

  // Cambiar selector según tipo de unidad seleccionado
  const handleCambioTipoUnidad = (tipo: 'pza' | 'g') => {
    setTipoUnidad(tipo)
    setUnidad(tipo === 'pza' ? 'pza' : 'g')
  }

  // Cálculo automático en tiempo real del costo unitario
  const costoUnitarioCalculado = useMemo(() => {
    const total = Number(costoTotal) || 0
    const cantidad = Number(stockInicial) || 0
    if (cantidad <= 0 || total <= 0) return 0
    return total / cantidad
  }, [costoTotal, stockInicial])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre || !sucursalId) return

    setLoading(true)

    // 1. Insertar el insumo global en el catálogo con el costo unitario calculado
    const { data: insumo, error: errInsumo } = await supabase
      .from('insumos')
      .insert([
        {
          nombre,
          categoria,
          unidad,
          costo_unitario: costoUnitarioCalculado
        }
      ])
      .select()
      .single()

    if (errInsumo || !insumo) {
      alert('Error al crear el insumo catalogado: ' + errInsumo?.message)
      setLoading(false)
      return
    }

    // 2. Asociar el insumo a la sucursal actual en inventario_insumos
    const { error: errInv } = await supabase
      .from('inventario_insumos')
      .insert([
        {
          sucursal_id: sucursalId,
          insumo_id: insumo.id,
          stock_actual: Number(stockInicial) || 0,
          stock_minimo: Number(stockMinimo) || 0,
          stock_reorden: Number(stockReorden) || 0
        }
      ])

    if (errInv) {
      alert('Error al vincular con el inventario de la sucursal: ' + errInv.message)
      setLoading(false)
      return
    }

    // 3. SI LA CATEGORÍA ES 'MERCH', CREAR AUTOMÁTICAMENTE EL REGISTRO DE VENTA EN PRODUCTOS
    if (categoria.toLowerCase() === 'merch' && insumo) {
      const { data: nuevoProducto, error: errProd } = await supabase
        .from('productos')
        .insert([
          {
            nombre: insumo.nombre,
            categoria: 'Merch',
            tipo: 'simple',
            activo: true
          }
        ])
        .select()
        .single()

      if (!errProd && nuevoProducto) {
        await supabase
          .from('producto_precios')
          .insert([
            {
              producto_id: nuevoProducto.id,
              sucursal_id: sucursalId,
              precio_venta: costoUnitarioCalculado,
              costo_total: costoUnitarioCalculado
            }
          ])
      }
    }

    onSuccess()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-100 z-10">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Agregar Nuevo Insumo / Producto</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Nombre</label>
            <input
              type="text"
              required
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej. Sudadera Navy / Proteína Matcha"
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Categoría</label>
              <select
                value={categoria}
                onChange={e => setCategoria(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 font-medium cursor-pointer"
              >
                {CATEGORIAS.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Medición</label>
              {/* Toggle Gramos vs Unidades */}
              <div className="flex bg-gray-100 p-1 rounded-xl mt-1">
                <button
                  type="button"
                  onClick={() => handleCambioTipoUnidad('pza')}
                  className={`flex-1 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                    tipoUnidad === 'pza' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Unidades
                </button>
                <button
                  type="button"
                  onClick={() => handleCambioTipoUnidad('g')}
                  className={`flex-1 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                    tipoUnidad === 'g' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Gramos
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Unidad específica</label>
              <select
                value={unidad}
                onChange={e => setUnidad(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 font-medium cursor-pointer"
              >
                {UNIDADES_OPCIONES.map(u => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">
                Cantidad Inicial ({unidad})
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                required
                value={stockInicial}
                onChange={e => setStockInicial(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder={unidad === 'g' ? 'Ej. 1000' : 'Ej. 10'}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Costo Total ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={costoTotal}
              onChange={e => setCostoTotal(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="Ej. 1500.00"
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 font-medium"
            />
          </div>

          {/* Campo informativo de Costo Unitario Autocalculado */}
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">Costo Calculado</span>
            <span className="text-sm font-black text-gray-900">
              ${costoUnitarioCalculado.toFixed(4)} <span className="text-xs font-normal text-gray-500">/ {unidad}</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Stock Mínimo ({unidad})</label>
              <input
                type="number"
                min="0"
                step="any"
                value={stockMinimo}
                onChange={e => setStockMinimo(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Punto Reorden ({unidad})</label>
              <input
                type="number"
                min="0"
                step="any"
                value={stockReorden}
                onChange={e => setStockReorden(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 font-medium"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading && <RefreshCw size={14} className="animate-spin" />}
              Guardar Insumo
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
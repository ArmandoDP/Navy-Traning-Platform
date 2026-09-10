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

export default function ModalNuevoInsumo({ sucursalId, onClose, onSuccess }: Props) {
  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState(CATEGORIAS[0])
  const [unidad, setUnidad] = useState('pza')
  
  // Campos para el cálculo automático
  const [costoTotal, setCostoTotal] = useState<number | ''>('')
  const [stockInicial, setStockInicial] = useState<number | ''>(1)
  
  const [stockMinimo, setStockMinimo] = useState<number | ''>(5)
  const [stockReorden, setStockReorden] = useState<number | ''>(10)
  const [loading, setLoading] = useState(false)

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
    } else {
      onSuccess()
    }

    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-100 z-10">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Agregar Nuevo Insumo / Producto</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg">
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
              placeholder="Ej. Sudadera Navy / Leche Entera"
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Categoría</label>
              <select
                value={categoria}
                onChange={e => setCategoria(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 font-medium"
              >
                {CATEGORIAS.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Unidad</label>
              <input
                type="text"
                required
                value={unidad}
                onChange={e => setUnidad(e.target.value)}
                placeholder="pza, kg, lt"
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Cantidad Inicial</label>
              <input
                type="number"
                min="1"
                required
                value={stockInicial}
                onChange={e => setStockInicial(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 font-medium"
              />
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
          </div>

          {/* Campo informativo de Costo Unitario Autocalculado */}
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">Costo Unitario Calculado</span>
            <span className="text-sm font-black text-gray-900">
              ${costoUnitarioCalculado.toFixed(4)} <span className="text-xs font-normal text-gray-500">/ {unidad}</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Stock Mínimo</label>
              <input
                type="number"
                min="0"
                value={stockMinimo}
                onChange={e => setStockMinimo(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-900 font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Punto Reorden</label>
              <input
                type="number"
                min="0"
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
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition flex items-center justify-center gap-2"
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

'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { X, RefreshCw, Trash2 } from 'lucide-react'

interface Props {
  insumo: any
  sucursalId: string | null
  onClose: () => void
  onSuccess: () => void
}

const CATEGORIAS = ['Frutas', 'Lacteos', 'Proteinas', 'Grasas', 'Panes y Granos', 'Merch', 'Otros', 'Empaques']

export default function ModalEditarInsumo({ insumo, sucursalId, onClose, onSuccess }: Props) {
  const [nombre, setNombre] = useState(insumo.insumos?.nombre || '')
  const [categoria, setCategoria] = useState(insumo.insumos?.categoria || CATEGORIAS[0])
  const [unidad, setUnidad] = useState(insumo.insumos?.unidad || 'pza')
  const [costoUnitario, setCostoUnitario] = useState<number | ''>(insumo.insumos?.costo_unitario || 0)
  const [stockActual, setStockActual] = useState<number | ''>(insumo.stock_actual || 0)
  const [stockMinimo, setStockMinimo] = useState<number | ''>(insumo.stock_minimo || 0)
  const [stockReorden, setStockReorden] = useState<number | ''>(insumo.stock_reorden || 0)
  
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // 1. Actualizar catálogo general de insumos (nombre, categoría, unidad, costo)
    const { error: errInsumo } = await supabase
      .from('insumos')
      .update({
        nombre,
        categoria,
        unidad,
        costo_unitario: Number(costoUnitario) || 0
      })
      .eq('id', insumo.insumo_id)

    if (errInsumo) {
      alert('Error al actualizar el insumo: ' + errInsumo.message)
      setLoading(false)
      return
    }

    // 2. Actualizar inventario específico de la sucursal
    const { error: errInv } = await supabase
      .from('inventario_insumos')
      .update({
        stock_actual: Number(stockActual) || 0,
        stock_minimo: Number(stockMinimo) || 0,
        stock_reorden: Number(stockReorden) || 0
      })
      .eq('id', insumo.id)

    if (errInv) {
      alert('Error al actualizar el inventario: ' + errInv.message)
      setLoading(false)
      return
    }

    onSuccess()
    setLoading(false)
  }

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar "${insumo.insumos?.nombre}" de esta sucursal?`)) return

    setDeleting(true)

    // 1. Eliminar de inventario_insumos
    const { error: errInv } = await supabase
      .from('inventario_insumos')
      .delete()
      .eq('id', insumo.id)

    if (errInv) {
      alert('Error al eliminar del inventario: ' + errInv.message)
      setDeleting(false)
      return
    }

    // 2. Intentar eliminar del catálogo de insumos si ya no hay registros
    await supabase.from('insumos').delete().eq('id', insumo.insumo_id)

    onSuccess()
    setDeleting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-100 z-10">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Editar Insumo / Producto</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleUpdate} className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Nombre</label>
            <input
              type="text"
              required
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-gray-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Categoría</label>
              <select
                value={categoria}
                onChange={e => setCategoria(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium cursor-pointer"
              >
                {CATEGORIAS.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Unidad Base</label>
              <select
                value={unidad}
                onChange={e => setUnidad(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium cursor-pointer"
              >
                <option value="pza">Unidades (pza)</option>
                <option value="g">Gramos (g)</option>
                <option value="kg">Kilogramos (kg)</option>
                <option value="ml">Mililitros (ml)</option>
                <option value="lt">Litros (lt)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Stock Actual ({unidad})</label>
              <input
                type="number"
                step="any"
                required
                value={stockActual}
                onChange={e => setStockActual(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Costo Unitario ($)</label>
              <input
                type="number"
                step="any"
                required
                value={costoUnitario}
                onChange={e => setCostoUnitario(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Stock Mínimo</label>
              <input
                type="number"
                step="any"
                value={stockMinimo}
                onChange={e => setStockMinimo(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Punto Reorden</label>
              <input
                type="number"
                step="any"
                value={stockReorden}
                onChange={e => setStockReorden(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-gray-100 gap-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-2.5 rounded-xl bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Trash2 size={14} />
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {loading && <RefreshCw size={14} className="animate-spin" />}
                Guardar
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
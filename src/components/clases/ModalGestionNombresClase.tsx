'use client'
// src/components/clases/ModalGestionNombresClase.tsx — gestión de catálogo de nombres para Dirección
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Plus, Trash2, Edit2, Check, Loader2, AlertTriangle } from 'lucide-react'

interface OpciónNombre {
  id: string
  nombre: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onRefresh: () => void
}

export default function ModalGestionNombresClase({ isOpen, onClose, onRefresh }: Props) {
  const [nombres, setNombres] = useState<OpciónNombre[]>([])
  const [loading, setLoading] = useState(true)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [nombreEdit, setNombreEdit] = useState('')
  
  // Estado para la confirmación de eliminación estilo CRM (sin confirm() nativo)
  const [porEliminar, setPorEliminar] = useState<OpciónNombre | null>(null)

  useEffect(() => {
    if (isOpen) cargarNombres()
  }, [isOpen])

  const cargarNombres = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('catalogos_clases')
      .select('id, nombre')
      .eq('estatus', 'Activo')
      .order('nombre')
    setNombres(data || [])
    setLoading(false)
  }

  const agregarNombre = async () => {
    const val = nuevoNombre.trim().toUpperCase()
    if (!val) return
    setGuardando(true)

    // Verificamos si ya existe (incluso inactivo) para reactivarlo o insertarlo
    const { data: existente } = await supabase
      .from('catalogos_clases')
      .select('id, estatus')
      .eq('nombre', val)
      .maybeSingle()

    if (existente) {
      await supabase
        .from('catalogos_clases')
        .update({ estatus: 'Activo' })
        .eq('id', existente.id)
    } else {
      await supabase
        .from('catalogos_clases')
        .insert([{ nombre: val, estatus: 'Activo' }])
    }

    setNuevoNombre('')
    await cargarNombres()
    onRefresh()
    setGuardando(false)
  }

  const guardarEdicion = async (id: string) => {
    const val = nombreEdit.trim().toUpperCase()
    if (!val) return
    setGuardando(true)
    await supabase.from('catalogos_clases').update({ nombre: val }).eq('id', id)
    setEditandoId(null)
    await cargarNombres()
    onRefresh()
    setGuardando(false)
  }

  const confirmarEliminar = async () => {
    if (!porEliminar) return
    setGuardando(true)
    await supabase
      .from('catalogos_clases')
      .update({ estatus: 'Inactivo' })
      .eq('id', porEliminar.id)
    
    setPorEliminar(null)
    await cargarNombres()
    onRefresh()
    setGuardando(false)
  }

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-lg font-black text-gray-900">Catálogo de Clases</h3>
              <p className="text-xs text-gray-400">Exclusivo de Dirección: administra los nombres predeterminados</p>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-xl text-gray-400 transition">
              <X size={18} />
            </button>
          </div>

          {/* Formulario de Agregar */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="NUEVO NOMBRE, EJ. SPINNING"
              value={nuevoNombre}
              onChange={e => setNuevoNombre(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && agregarNombre()}
              className="flex-1 border border-gray-200 rounded-2xl px-4 py-2.5 text-xs font-bold uppercase outline-none focus:border-gray-900 bg-gray-50/50"
            />
            <button
              type="button"
              onClick={agregarNombre}
              disabled={!nuevoNombre.trim() || guardando}
              className="bg-gray-900 text-white px-4 py-2.5 rounded-2xl text-xs font-bold hover:bg-gray-800 disabled:opacity-40 flex items-center gap-1.5 transition shrink-0"
            >
              {guardando ? <Loader2 size={13} className="animate-spin" /> : <Plus size={15} />} Agregar
            </button>
          </div>

          {/* Lista de opciones */}
          <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
            {loading ? (
              <p className="text-xs text-center text-gray-400 py-6">Cargando catálogo...</p>
            ) : nombres.length === 0 ? (
              <p className="text-xs text-center text-gray-400 py-6 bg-gray-50 rounded-2xl">Sin nombres registrados en el catálogo.</p>
            ) : (
              nombres.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-2xl border border-gray-100 bg-gray-50/60 text-xs font-bold transition hover:bg-gray-50">
                  {editandoId === item.id ? (
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <input
                        type="text"
                        value={nombreEdit}
                        onChange={e => setNombreEdit(e.target.value.toUpperCase())}
                        onKeyDown={e => e.key === 'Enter' && guardarEdicion(item.id)}
                        className="w-full border border-gray-300 rounded-xl px-3 py-1.5 text-xs uppercase outline-none bg-white font-bold"
                        autoFocus
                      />
                      <button 
                        type="button"
                        onClick={() => guardarEdicion(item.id)} 
                        className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition"
                      >
                        <Check size={14} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-gray-900 uppercase font-black tracking-wide">{item.nombre}</span>
                  )}

                  <div className="flex items-center gap-1">
                    {editandoId !== item.id && (
                      <button 
                        type="button"
                        onClick={() => { setEditandoId(item.id); setNombreEdit(item.nombre) }} 
                        className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-white rounded-lg transition"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                    <button 
                      type="button"
                      onClick={() => setPorEliminar(item)} 
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <button 
            type="button"
            onClick={onClose} 
            className="w-full py-3 bg-gray-100 text-gray-700 font-bold text-xs rounded-2xl hover:bg-gray-200 transition"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Modal de confirmación estilizado estilo CRM */}
      {porEliminar && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle size={22} />
            </div>
            
            <div>
              <h4 className="text-base font-black text-gray-900">¿Eliminar esta opción?</h4>
              <p className="text-xs text-gray-500 mt-1 leading-5">
                La opción <b className="text-gray-900 uppercase font-black">"{porEliminar.nombre}"</b> ya no aparecerá como opción predeterminada al crear clases.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPorEliminar(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarEliminar}
                disabled={guardando}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                {guardando ? <Loader2 size={13} className="animate-spin" /> : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
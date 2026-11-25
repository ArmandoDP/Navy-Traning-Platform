'use client'
// Equivalencias de insumos: cuánto vale 1 pieza, cucharada o taza de cada insumo en la unidad del inventario.
// Se cambian aquí una sola vez y se aplican a todas las recetas (y a todas las sucursales, que comparten recetas).
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { logActividad } from '@/lib/log-actividad'
import { useAuth } from '@/context/AuthContext'
import { redondear, formatoNumero } from '@/lib/medidas'
import { cargarEquivalencias, aplicarEquivalenciaARecetas, FilaEquivalencia } from '@/lib/recetasMedidas'

interface Props { onClose: () => void; onCambio?: () => void }

export default function ModalEquivalencias({ onClose, onCambio }: Props) {
  const { staff, puedeEditar } = useAuth()
  const puede = puedeEditar('galley')
  const [filas,    setFilas]    = useState<FilaEquivalencia[]>([])
  const [valores,  setValores]  = useState<Record<string, string>>({})
  const [loading,  setLoading]  = useState(true)
  const [guardando, setGuardando] = useState<string | null>(null)
  const [aviso,    setAviso]    = useState('')
  const [error,    setError]    = useState('')

  const cargar = async () => {
    setLoading(true)
    try {
      const lista = await cargarEquivalencias()
      setFilas(lista)
      const v: Record<string, string> = {}
      lista.forEach(f => { if (f.base !== null) v[f.clave] = formatoNumero(f.inversa ? 1 / f.base : f.base) })
      setValores(prev => ({ ...v, ...prev }))
    } catch (e: any) {
      setError('No se pudieron leer las equivalencias. ¿Ya se corrió el script de recetas con medidas?')
    }
    setLoading(false)
  }
  useEffect(() => { cargar() }, [])

  const guardar = async (f: FilaEquivalencia) => {
    const escrito = Number(valores[f.clave])
    if (!(escrito > 0)) return
    setGuardando(f.clave); setError(''); setAviso('')
    const base = f.inversa ? 1 / escrito : escrito         // lo que se guarda: unidad base por 1 medida
    const { error: err } = await supabase.from('insumo_equivalencias')
      .upsert({ insumo_id: f.insumoId, unidad: f.medida, cantidad_base: base }, { onConflict: 'insumo_id,unidad' })
    if (err) { setError('No se pudo guardar: ' + err.message); setGuardando(null); return }

    const r = await aplicarEquivalenciaARecetas(f.insumoId, f.medida, base)
    if (r.error) { setError('Se guardó la equivalencia pero falló al actualizar las recetas: ' + r.error); setGuardando(null); return }

    await logActividad({
      tipo: 'equivalencia_insumo',
      descripcion: `${staff?.nombre} ${staff?.primer_apellido} definió: ${f.inversa ? `1 ${f.unidadBase} de ${f.insumo} = ${escrito} ${f.medida}` : `1 ${f.medida} de ${f.insumo} = ${escrito} ${f.unidadBase}`} (${r.actualizadas} recetas actualizadas)`,
      tabla: 'insumo_equivalencias', accion: 'UPDATE',
      metadata: { insumo_id: f.insumoId, medida: f.medida, cantidad_base: base, recetas: r.actualizadas },
      sucursal_id: null, staff_id: staff?.id,
    })
    setAviso(`${f.insumo}: listo, se actualizaron ${r.actualizadas} ingredientes de recetas.`)
    setGuardando(null)
    await cargar()
    onCambio?.()
  }

  const pendientes = filas.filter(f => f.base === null).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] z-10 flex flex-col overflow-hidden">
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h3 className="text-base font-black text-gray-900">Equivalencias de insumos</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Cuánto vale una pieza, cucharada o taza de cada insumo. Se aplica a <b>todas las recetas y todas las sucursales</b>.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={16} /></button>
        </div>

        <div className="px-6 py-4 overflow-y-auto space-y-3">
          {pendientes > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs font-bold text-amber-700">
              <AlertTriangle size={14} /> {pendientes} {pendientes === 1 ? 'insumo sin equivalencia' : 'insumos sin equivalencia'}:
              mientras falte, el inventario no descuenta bien esas recetas.
            </div>
          )}
          {aviso && <p className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">{aviso}</p>}
          {error && <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

          {loading ? (
            <div className="flex items-center justify-center h-32 text-gray-400 gap-2"><RefreshCw size={14} className="animate-spin" /> Cargando...</div>
          ) : filas.length === 0 ? (
            <div className="flex items-center justify-center gap-2 h-32 text-sm text-gray-400">
              <CheckCircle2 size={16} className="text-emerald-500" /> Todas las recetas están al día
            </div>
          ) : filas.map(f => {
            const pendiente = f.base === null
            return (
              <div key={f.clave} className={`rounded-xl border p-4 ${pendiente ? 'border-amber-200 bg-amber-50/40' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-gray-900">{f.insumo}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pendiente ? 'bg-amber-100 text-amber-700' : 'bg-emerald-50 text-emerald-600'}`}>
                    {pendiente ? 'Pendiente' : 'Configurada'}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap mt-2 text-sm text-gray-600">
                  {f.inversa ? <>1 {f.unidadBase} de {f.insumo} =</> : <>1 {f.medida} de {f.insumo} =</>}
                  <input type="number" min="0" step="any" disabled={!puede} value={valores[f.clave] ?? ''}
                    onChange={e => setValores(prev => ({ ...prev, [f.clave]: e.target.value }))}
                    placeholder={f.inversa ? 'Ej. 120' : 'Ej. 10'}
                    className="w-28 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-gray-400 bg-white" />
                  <span>{f.inversa ? f.medida : f.unidadBase}</span>
                  {puede && (
                    <button onClick={() => guardar(f)} disabled={!(Number(valores[f.clave]) > 0) || guardando === f.clave}
                      className="ml-auto px-3 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-40" style={{ backgroundColor: '#171B24' }}>
                      {guardando === f.clave ? 'Guardando…' : pendiente ? 'Guardar' : 'Actualizar'}
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 mt-2">
                  Usado en {f.recetas.length} {f.recetas.length === 1 ? 'receta' : 'recetas'}: {f.recetas.slice(0, 6).join(', ')}{f.recetas.length > 6 ? '…' : ''}
                </p>
              </div>
            )
          })}
        </div>

        <div className="px-6 py-3 border-t border-gray-100 text-[11px] text-gray-400">
          Si cambias una equivalencia, las recetas se recalculan al momento. El conteo físico del inventario sigue siendo manual.
        </div>
      </div>
    </div>
  )
}

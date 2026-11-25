'use client'
// Historial de merma de la sucursal: qué se tiró, por qué motivo y, en cortesías, quién la autorizó
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { RefreshCw } from 'lucide-react'

interface Props { sucursalId: string | null }

const MOTIVOS = ['Todos', 'Caducidad', 'Error de preparación', 'Daño', 'Derrame', 'Cortesía autorizada', 'Otro']
const DIAS = [{ v: 30, t: '30 días' }, { v: 90, t: '90 días' }]

const fechaCorta = (f: string) => {
  const [y, m, d] = String(f).slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function MermaHistorial({ sucursalId }: Props) {
  const [filas,   setFilas]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [motivo,  setMotivo]  = useState('Todos')
  const [dias,    setDias]    = useState(30)

  useEffect(() => { if (sucursalId) cargar() }, [sucursalId, dias])

  const cargar = async () => {
    setLoading(true)
    const desde = new Date(Date.now() - dias * 86400000).toISOString().slice(0, 10)
    const { data: merma } = await supabase.from('merma').select('*')
      .eq('sucursal_id', sucursalId).gte('fecha', desde).order('fecha', { ascending: false }).limit(500)
    const lista = merma || []

    // Nombres de insumos y de quien autorizó / registró (consultas aparte: no dependen de relaciones de la base)
    const insumoIds = [...new Set(lista.map(m => m.insumo_id).filter(Boolean))]
    const staffIds  = [...new Set(lista.flatMap(m => [m.autorizado_por, m.registrado_por]).filter(Boolean))]
    const [{ data: insumos }, { data: staff }] = await Promise.all([
      insumoIds.length ? supabase.from('insumos').select('id, nombre, unidad').in('id', insumoIds) : Promise.resolve({ data: [] as any[] }),
      staffIds.length  ? supabase.from('staff').select('id, nombre, primer_apellido').in('id', staffIds) : Promise.resolve({ data: [] as any[] }),
    ])
    const porInsumo = new Map((insumos || []).map((i: any) => [i.id, i]))
    const porStaff  = new Map((staff || []).map((s: any) => [s.id, `${s.nombre} ${s.primer_apellido || ''}`.trim()]))
    setFilas(lista.map(m => ({
      ...m,
      insumo:     porInsumo.get(m.insumo_id),
      autorizo:   m.autorizado_por ? porStaff.get(m.autorizado_por) : null,
      registro:   m.registrado_por ? porStaff.get(m.registrado_por) : null,
    })))
    setLoading(false)
  }

  const conteo = (m: string) => m === 'Todos' ? filas.length : filas.filter(f => f.motivo === m).length
  const visibles = filas.filter(f => motivo === 'Todos' || f.motivo === motivo)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {MOTIVOS.map(m => (
            <button key={m} onClick={() => setMotivo(m)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
                motivo === m ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {m} · {conteo(m)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {DIAS.map(d => (
            <button key={d.v} onClick={() => setDias(d.v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                dias === d.v ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {d.t}
            </button>
          ))}
          <button onClick={cargar} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><RefreshCw size={14} /></button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400 gap-2"><RefreshCw size={14} className="animate-spin" /> Cargando...</div>
        ) : visibles.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Sin merma en este periodo</div>
        ) : (
          <table className="w-full text-left">
            <thead className="text-gray-400 text-[11px] font-bold uppercase border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3">Insumo</th>
                <th className="px-5 py-3 text-right">Cantidad</th>
                <th className="px-5 py-3">Motivo</th>
                <th className="px-5 py-3">Autorizó / detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visibles.map(f => (
                <tr key={f.id} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-3 text-sm text-gray-500">{fechaCorta(f.fecha)}</td>
                  <td className="px-5 py-3 text-sm font-bold text-gray-900">{f.insumo?.nombre || '—'}</td>
                  <td className="px-5 py-3 text-right text-sm font-black text-gray-900">{f.cantidad} <span className="text-xs font-normal text-gray-400">{f.insumo?.unidad}</span></td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      f.motivo === 'Cortesía autorizada' ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-600'}`}>{f.motivo}</span>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-500">
                    {f.motivo === 'Cortesía autorizada'
                      ? <>Autorizó <b className="text-gray-700">{f.autorizo || '—'}</b>{f.detalle ? ` · ${f.detalle}` : ''}</>
                      : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

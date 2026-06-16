'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, X } from 'lucide-react'

interface PagoCoach {
  id: string
  monto: number
  concepto: string
  fecha_pago: string
  coaches: { nombre_completo: string; especialidad: string }
}

interface Costo {
  id: string
  concepto: string
  monto: number
  categoria: string
  fecha: string
}

interface Props {
  pagosCoaches: PagoCoach[]
  costos: Costo[]
  onRefresh: () => void
}

export default function FinanzasNomina({ pagosCoaches, costos, onRefresh }: Props) {
  const [tab, setTab] = useState<'coaches' | 'costos'>('coaches')
  const [modalPago,  setModalPago]  = useState(false)
  const [modalCosto, setModalCosto] = useState(false)
  const [loading, setLoading] = useState(false)

  const [formPago,  setFormPago]  = useState({ coach_id: '', monto: '', concepto: '', fecha_pago: '' })
  const [formCosto, setFormCosto] = useState({ concepto: '', monto: '', categoria: 'Operativo', fecha: '' })
  const [coaches,   setCoaches]   = useState<any[]>([])

  const totalCoaches = pagosCoaches.reduce((a, p) => a + Number(p.monto), 0)
  const totalCostos  = costos.reduce((a, c) => a + Number(c.monto), 0)

  const loadCoaches = async () => {
    const { data } = await supabase.from('coaches').select('id, nombre_completo').eq('estatus', 'Activo')
    if (data) setCoaches(data)
  }

  const handlePagoCoach = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true)
    const { error } = await supabase.from('pagos_coaches').insert([{
      coach_id:  formPago.coach_id,
      monto:     Number(formPago.monto),
      concepto:  formPago.concepto,
      fecha_pago: formPago.fecha_pago || new Date().toISOString(),
    }])
    if (error) alert('Error: ' + error.message)
    else { onRefresh(); setModalPago(false); setFormPago({ coach_id: '', monto: '', concepto: '', fecha_pago: '' }) }
    setLoading(false)
  }

  const handleCosto = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true)
    const { error } = await supabase.from('costos').insert([{
      concepto:  formCosto.concepto,
      monto:     Number(formCosto.monto),
      categoria: formCosto.categoria,
      fecha:     formCosto.fecha || new Date().toISOString(),
    }])
    if (error) alert('Error: ' + error.message)
    else { onRefresh(); setModalCosto(false); setFormCosto({ concepto: '', monto: '', categoria: 'Operativo', fecha: '' }) }
    setLoading(false)
  }

  return (
    <>
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">

        {/* Header */}
        <div className="p-5 border-b border-zinc-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-zinc-900">Nómina y Costos</h3>
            <div className="flex gap-2">
              <button onClick={() => { setModalPago(true); loadCoaches() }}
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-bold transition">
                <Plus size={12} /> Pago coach
              </button>
              <button onClick={() => setModalCosto(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-xs font-bold transition">
                <Plus size={12} /> Costo
              </button>
            </div>
          </div>
          <div className="flex gap-4 text-xs text-zinc-500 mb-3">
            <span>Coaches: <strong className="text-zinc-900">${totalCoaches.toLocaleString()}</strong></span>
            <span>Operativos: <strong className="text-zinc-900">${totalCostos.toLocaleString()}</strong></span>
            <span>Total: <strong className="text-red-500">${(totalCoaches + totalCostos).toLocaleString()}</strong></span>
          </div>
          <div className="flex gap-2">
            {(['coaches', 'costos'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1 rounded-full text-xs font-bold border transition capitalize ${
                  tab === t ? 'bg-zinc-900 text-white border-zinc-900' : 'border-zinc-200 text-zinc-500 hover:border-zinc-400'
                }`}>
                {t === 'coaches' ? 'Pagos Coaches' : 'Costos Operativos'}
              </button>
            ))}
          </div>
        </div>

        {/* Tabla coaches */}
        {tab === 'coaches' && (
          <table className="w-full text-left">
            <thead className="bg-zinc-50 text-zinc-400 text-xs font-bold uppercase">
              <tr>
                <th className="px-4 py-3">Coach</th>
                <th className="px-4 py-3">Especialidad</th>
                <th className="px-4 py-3">Concepto</th>
                <th className="px-4 py-3">Monto</th>
                <th className="px-4 py-3">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {pagosCoaches.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-zinc-400 italic text-sm">Sin pagos registrados</td></tr>
              ) : pagosCoaches.map(p => (
                <tr key={p.id} className="hover:bg-zinc-50 transition">
                  <td className="px-4 py-3 text-sm font-medium text-zinc-900">{p.coaches?.nombre_completo || '—'}</td>
                  <td className="px-4 py-3 text-sm text-zinc-500">{p.coaches?.especialidad || '—'}</td>
                  <td className="px-4 py-3 text-sm text-zinc-500">{p.concepto || '—'}</td>
                  <td className="px-4 py-3 text-sm font-black text-red-500">${Number(p.monto).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-zinc-400">
                    {new Date(p.fecha_pago).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Tabla costos */}
        {tab === 'costos' && (
          <table className="w-full text-left">
            <thead className="bg-zinc-50 text-zinc-400 text-xs font-bold uppercase">
              <tr>
                <th className="px-4 py-3">Concepto</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Monto</th>
                <th className="px-4 py-3">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {costos.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-400 italic text-sm">Sin costos registrados</td></tr>
              ) : costos.map(c => (
                <tr key={c.id} className="hover:bg-zinc-50 transition">
                  <td className="px-4 py-3 text-sm font-medium text-zinc-900">{c.concepto}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 rounded-full text-xs font-bold">{c.categoria}</span>
                  </td>
                  <td className="px-4 py-3 text-sm font-black text-red-500">${Number(c.monto).toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-zinc-400">
                    {new Date(c.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal pago coach */}
      {modalPago && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-zinc-100">
              <h3 className="font-black text-zinc-900">Registrar Pago Coach</h3>
              <button onClick={() => setModalPago(false)}><X size={18} className="text-zinc-400" /></button>
            </div>
            <form onSubmit={handlePagoCoach} className="p-5 space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Coach</label>
                <select required className="w-full border border-zinc-200 rounded-xl p-3 text-sm outline-none appearance-none"
                  value={formPago.coach_id} onChange={e => setFormPago(p => ({ ...p, coach_id: e.target.value }))}>
                  <option value="">— Selecciona —</option>
                  {coaches.map(c => <option key={c.id} value={c.id}>{c.nombre_completo}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Monto</label>
                  <input required type="number" min={0} placeholder="0"
                    className="w-full border border-zinc-200 rounded-xl p-3 text-sm outline-none focus:border-indigo-400"
                    value={formPago.monto} onChange={e => setFormPago(p => ({ ...p, monto: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Fecha</label>
                  <input type="date" className="w-full border border-zinc-200 rounded-xl p-3 text-sm outline-none focus:border-indigo-400"
                    value={formPago.fecha_pago} onChange={e => setFormPago(p => ({ ...p, fecha_pago: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Concepto</label>
                <input placeholder="Ej: Quincena Marzo"
                  className="w-full border border-zinc-200 rounded-xl p-3 text-sm outline-none focus:border-indigo-400"
                  value={formPago.concepto} onChange={e => setFormPago(p => ({ ...p, concepto: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalPago(false)}
                  className="flex-1 border border-zinc-200 text-zinc-500 py-2.5 rounded-xl text-sm font-bold hover:bg-zinc-50">Cancelar</button>
                <button type="submit" disabled={loading}
                  className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-black hover:bg-indigo-700 disabled:opacity-50">
                  {loading ? 'Guardando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal costo */}
      {modalCosto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-zinc-100">
              <h3 className="font-black text-zinc-900">Registrar Costo</h3>
              <button onClick={() => setModalCosto(false)}><X size={18} className="text-zinc-400" /></button>
            </div>
            <form onSubmit={handleCosto} className="p-5 space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Concepto</label>
                <input required placeholder="Ej: Renta local Juriquilla"
                  className="w-full border border-zinc-200 rounded-xl p-3 text-sm outline-none focus:border-indigo-400"
                  value={formCosto.concepto} onChange={e => setFormCosto(p => ({ ...p, concepto: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Monto</label>
                  <input required type="number" min={0} placeholder="0"
                    className="w-full border border-zinc-200 rounded-xl p-3 text-sm outline-none focus:border-indigo-400"
                    value={formCosto.monto} onChange={e => setFormCosto(p => ({ ...p, monto: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Categoría</label>
                  <select className="w-full border border-zinc-200 rounded-xl p-3 text-sm outline-none appearance-none"
                    value={formCosto.categoria} onChange={e => setFormCosto(p => ({ ...p, categoria: e.target.value }))}>
                    {['Operativo','Nómina','Marketing','Mantenimiento','Otros'].map(cat =>
                      <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Fecha</label>
                <input type="date" className="w-full border border-zinc-200 rounded-xl p-3 text-sm outline-none focus:border-indigo-400"
                  value={formCosto.fecha} onChange={e => setFormCosto(p => ({ ...p, fecha: e.target.value }))} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModalCosto(false)}
                  className="flex-1 border border-zinc-200 text-zinc-500 py-2.5 rounded-xl text-sm font-bold hover:bg-zinc-50">Cancelar</button>
                <button type="submit" disabled={loading}
                  className="flex-1 bg-zinc-900 text-white py-2.5 rounded-xl text-sm font-black hover:bg-zinc-800 disabled:opacity-50">
                  {loading ? 'Guardando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
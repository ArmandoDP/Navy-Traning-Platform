'use client'
import { useState } from 'react'
import { CheckCircle2, XCircle, Clock } from 'lucide-react'

interface Pago {
  id: string
  monto: number
  metodo_pago: string
  fecha_pago: string
  estatus: string
  clientes: { nombre_completo: string; plan: string }
}

interface Props {
  pagos: Pago[]
}

const POR_PAGINA = 8

export default function FinanzasPagos({ pagos }: Props) {
  const [tab,    setTab]    = useState<'todos' | 'fallidos'>('todos')
  const [pagina, setPagina] = useState(1)

  const filtrados = tab === 'fallidos'
    ? pagos.filter(p => p.estatus === 'Fallido')
    : pagos

  const totalPags = Math.ceil(filtrados.length / POR_PAGINA)
  const paginados = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  const completados = pagos.filter(p => p.estatus === 'Completado').length
  const fallidos    = pagos.filter(p => p.estatus === 'Fallido').length
  const pendientes  = pagos.filter(p => p.estatus === 'Pendiente').length

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">

      {/* Header */}
      <div className="p-5 border-b border-zinc-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-zinc-900">Transacciones</h3>
          <div className="flex gap-4 text-xs">
            <span className="flex items-center gap-1 text-green-600 font-bold">
              <CheckCircle2 size={12}/> {completados} completados
            </span>
            <span className="flex items-center gap-1 text-red-500 font-bold">
              <XCircle size={12}/> {fallidos} fallidos
            </span>
            <span className="flex items-center gap-1 text-yellow-500 font-bold">
              <Clock size={12}/> {pendientes} pendientes
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {(['todos', 'fallidos'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setPagina(1) }}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition capitalize ${
                tab === t ? 'bg-zinc-900 text-white border-zinc-900' : 'border-zinc-200 text-zinc-500 hover:border-zinc-400'
              }`}>
              {t === 'todos' ? 'Todos' : 'Fallidos'}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <table className="w-full text-left">
        <thead className="bg-zinc-50 text-zinc-400 text-xs font-bold uppercase">
          <tr>
            <th className="px-4 py-3">Cliente</th>
            <th className="px-4 py-3">Plan</th>
            <th className="px-4 py-3">Monto</th>
            <th className="px-4 py-3">Método</th>
            <th className="px-4 py-3">Fecha</th>
            <th className="px-4 py-3">Estatus</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-50">
          {paginados.length === 0 ? (
            <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-400 italic text-sm">Sin transacciones</td></tr>
          ) : paginados.map(p => (
            <tr key={p.id} className="hover:bg-zinc-50 transition">
              <td className="px-4 py-3 text-sm font-medium text-zinc-900">{p.clientes?.nombre_completo || '—'}</td>
              <td className="px-4 py-3 text-sm text-zinc-500">{p.clientes?.plan || '—'}</td>
              <td className="px-4 py-3 text-sm font-black text-green-600">${Number(p.monto).toLocaleString()}</td>
              <td className="px-4 py-3 text-sm text-zinc-500">{p.metodo_pago || '—'}</td>
              <td className="px-4 py-3 text-sm text-zinc-500">
                {new Date(p.fecha_pago).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
              </td>
              <td className="px-4 py-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  p.estatus === 'Completado' ? 'bg-green-100 text-green-600' :
                  p.estatus === 'Fallido'    ? 'bg-red-100 text-red-500'    :
                  'bg-yellow-100 text-yellow-600'
                }`}>
                  {p.estatus}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Paginación */}
      {totalPags > 1 && (
        <div className="flex items-center justify-center gap-1 p-3 border-t border-zinc-100">
          {Array.from({ length: totalPags }, (_, i) => i + 1).map(n => (
            <button key={n} onClick={() => setPagina(n)}
              className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
                pagina === n ? 'bg-indigo-600 text-white' : 'hover:bg-zinc-100 text-zinc-500'
              }`}>
              {n}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
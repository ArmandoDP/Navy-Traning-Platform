'use client'
import { TrendingUp, TrendingDown, DollarSign, ArrowDownCircle, Percent } from 'lucide-react'

interface Props {
  ingresos: number
  costos: number
  margen: number
  ingresosMesAnterior: number
  costosMesAnterior: number
}

function Delta({ actual, anterior }: { actual: number; anterior: number }) {
  if (anterior === 0) return null
  const pct = Math.round(((actual - anterior) / anterior) * 100)
  const pos = pct >= 0
  return (
    <span className={`flex items-center gap-1 text-xs font-bold ${pos ? 'text-green-500' : 'text-red-500'}`}>
      {pos ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {pos ? '+' : ''}{pct}% vs mes anterior
    </span>
  )
}

export default function FinanzasResumen({ ingresos, costos, margen, ingresosMesAnterior, costosMesAnterior }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center">
            <DollarSign size={16} className="text-green-600" />
          </div>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Ingresos del mes</p>
        </div>
        <p className="text-3xl font-black text-zinc-900">${ingresos.toLocaleString()}</p>
        <div className="mt-2">
          <Delta actual={ingresos} anterior={ingresosMesAnterior} />
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center">
            <ArrowDownCircle size={16} className="text-red-500" />
          </div>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Costos del mes</p>
        </div>
        <p className="text-3xl font-black text-zinc-900">${costos.toLocaleString()}</p>
        <div className="mt-2">
          <Delta actual={costos} anterior={costosMesAnterior} />
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center">
            <Percent size={16} className="text-indigo-600" />
          </div>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Margen</p>
        </div>
        <p className={`text-3xl font-black ${margen >= 0 ? 'text-indigo-600' : 'text-red-500'}`}>
          {margen}%
        </p>
        <div className="w-full bg-zinc-100 h-2 mt-3 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${margen >= 0 ? 'bg-indigo-500' : 'bg-red-500'}`}
            style={{ width: `${Math.min(Math.abs(margen), 100)}%` }}
          />
        </div>
      </div>

    </div>
  )
}
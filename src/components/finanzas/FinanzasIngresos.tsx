'use client'
import { Users, Package } from 'lucide-react'

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

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export default function FinanzasIngresos({ pagos }: Props) {
  // Ingresos por mes (últimos 6 meses)
  const ahora   = new Date()
  const meses6  = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - (5 - i), 1)
    return { mes: d.getMonth(), anio: d.getFullYear(), label: MESES[d.getMonth()] }
  })

  const ingresosPorMes = meses6.map(m => ({
    ...m,
    total: pagos.filter(p => {
      const f = new Date(p.fecha_pago)
      return f.getMonth() === m.mes && f.getFullYear() === m.anio && p.estatus === 'Completado'
    }).reduce((a, p) => a + Number(p.monto), 0)
  }))

  const maxIngreso = Math.max(...ingresosPorMes.map(m => m.total), 1)

  // Membresías vs paquetes (por plan del cliente)
  const membresias = pagos.filter(p => ['Mensual','Trimestral','Anual'].includes(p.clientes?.plan))
  const paquetesP  = pagos.filter(p => !['Mensual','Trimestral','Anual'].includes(p.clientes?.plan))
  const totalMem   = membresias.reduce((a, p) => a + Number(p.monto), 0)
  const totalPaq   = paquetesP.reduce((a, p) => a + Number(p.monto), 0)
  const totalGen   = totalMem + totalPaq || 1

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

      {/* Gráfica de barras mensual */}
      <div className="md:col-span-2 bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
        <h3 className="font-bold text-zinc-900 text-sm mb-4">Ingresos mensuales</h3>
        <div className="flex items-end gap-3 h-32">
          {ingresosPorMes.map((m, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] text-zinc-400 font-bold">${(m.total / 1000).toFixed(0)}k</span>
              <div className="w-full bg-zinc-100 rounded-lg overflow-hidden" style={{ height: '80px' }}>
                <div
                  className="w-full bg-indigo-500 rounded-lg transition-all duration-500"
                  style={{ height: `${Math.round((m.total / maxIngreso) * 80)}px`, marginTop: `${80 - Math.round((m.total / maxIngreso) * 80)}px` }}
                />
              </div>
              <span className="text-[10px] text-zinc-400">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Membresías vs Paquetes */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
        <h3 className="font-bold text-zinc-900 text-sm">Ventas por tipo</h3>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 text-xs text-zinc-600 font-medium">
                <Users size={12} className="text-indigo-500" /> Membresías
              </div>
              <span className="text-xs font-black text-zinc-900">${totalMem.toLocaleString()}</span>
            </div>
            <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
              <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${Math.round((totalMem / totalGen) * 100)}%` }} />
            </div>
            <p className="text-[10px] text-zinc-400 mt-0.5">{Math.round((totalMem / totalGen) * 100)}% del total</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2 text-xs text-zinc-600 font-medium">
                <Package size={12} className="text-purple-500" /> Paquetes
              </div>
              <span className="text-xs font-black text-zinc-900">${totalPaq.toLocaleString()}</span>
            </div>
            <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
              <div className="bg-purple-500 h-full rounded-full" style={{ width: `${Math.round((totalPaq / totalGen) * 100)}%` }} />
            </div>
            <p className="text-[10px] text-zinc-400 mt-0.5">{Math.round((totalPaq / totalGen) * 100)}% del total</p>
          </div>
        </div>
      </div>

    </div>
  )
}
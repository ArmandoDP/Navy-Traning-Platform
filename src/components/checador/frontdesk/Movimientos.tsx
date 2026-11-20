'use client'
// src/components/checador/frontdesk/Movimientos.tsx
import { Tarjeta, Vacio } from './ui'
import { MOTIVOS_SISTEMA, horaCorta } from './util'

function texto(m: any): [string, string] {
  if (m.tipo === 'intento') return [`No se registró · ${MOTIVOS_SISTEMA[m.estado] || m.motivo || ''}`, 'text-rose-600']
  if (m.estado === 'rechazada') return [`Rechazada${m.motivo ? ` · ${m.motivo}` : ''}`, 'text-rose-600']
  if (m.tipo === 'salida') return [m.estado === 'automatica' ? 'Salida automática' : 'Salida', 'text-gray-600']
  if (m.estado === 'automatica') return ['Entrada · primera del día', 'text-emerald-600']
  if (m.estado === 'manual') return ['Entrada manual', 'text-amber-600']
  return ['Entrada', 'text-emerald-600']
}

export default function Movimientos({ movimientos }: { movimientos: any[] }) {
  return (
    <Tarjeta titulo="Movimientos de hoy" extra={String(movimientos.length)} className="flex-1">
      {movimientos.length === 0 && <Vacio texto="Todavía no hay movimientos hoy." />}
      {movimientos.map((m: any) => {
        const [txt, cls] = texto(m)
        return (
          <div key={m.id} className="flex items-center gap-3 border-t border-gray-100 py-2 first:border-t-0">
            <span className="w-11 text-[13px] tabular-nums text-gray-400">{horaCorta(m.hora)}</span>
            <b className="min-w-0 flex-1 truncate text-[13px] text-gray-900">{m.nombre || 'Alguien'}</b>
            <span className={`text-xs font-bold ${cls}`}>{txt}</span>
          </div>
        )
      })}
    </Tarjeta>
  )
}
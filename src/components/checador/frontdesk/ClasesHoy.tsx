'use client'
// src/components/checador/frontdesk/ClasesHoy.tsx
import { Tarjeta, Vacio } from './ui'
import { ESTADO_CLASE, horaCorta } from './util'

export default function ClasesHoy({ clases }: { clases: any[] }) {
  return (
    <Tarjeta titulo="Clases de hoy" extra="coach y llegada" className="h-full">
      {clases.length === 0 && <Vacio texto="No hay clases programadas hoy." />}
      {clases.map((c: any) => {
        const e = ESTADO_CLASE[c.estado] || ESTADO_CLASE.mas_tarde
        return (
          <div key={c.id} className="grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 border-t border-gray-100 py-2.5 first:border-t-0">
            <b className="text-[17px] font-black tabular-nums text-gray-900">{horaCorta(c.horario)}</b>
            <div className="min-w-0">
              <b className="block truncate text-sm text-gray-900">{c.nombre}</b>
              <p className="truncate text-xs text-gray-500">{c.coach || 'Sin coach'} · {c.reservas}/{c.cupo}</p>
            </div>
            <span className={`rounded-lg px-2.5 py-1 text-[11px] font-extrabold ${e.cls}`}>{e.txt}</span>
          </div>
        )
      })}
    </Tarjeta>
  )
}
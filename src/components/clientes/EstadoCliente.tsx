// src/components/clientes/estadoCliente.tsx
// Qué significa cada estado de cliente, con nombre claro, color y explicación. Un solo lugar para todo el CRM.

export type EstadoKey = 'activo' | 'por_activar' | 'por_vencer' | 'vencido' | 'inactivo' | 'prospecto' | 'plataforma' | 'baja'

export const ESTADOS: { key: EstadoKey; label: string; emoji: string; clases: string; que_es: string; que_hacer: string }[] = [
  { key: 'activo',      label: 'Con plan',                 emoji: '🟢', clases: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    que_es: 'Tiene un plan vigente hoy.', que_hacer: 'Atenderlo normal.' },
  { key: 'por_activar', label: 'Pagó, falta su 1ª clase',  emoji: '🔵', clases: 'bg-blue-50 text-blue-700 border-blue-200',
    que_es: 'Ya pagó su plan; empieza a contar el día que reserve su primera clase.', que_hacer: 'Invitarlo a reservar.' },
  { key: 'por_vencer',  label: 'Su plan vence pronto',     emoji: '🟡', clases: 'bg-amber-50 text-amber-700 border-amber-200',
    que_es: 'Tiene plan, pero le quedan 7 días o menos.', que_hacer: 'Ofrecerle renovar.' },
  { key: 'vencido',     label: 'Se le venció',             emoji: '🟠', clases: 'bg-orange-50 text-orange-700 border-orange-200',
    que_es: 'Tuvo un plan y se le acabó hace menos de 2 meses.', que_hacer: 'Recuperarlo: es el más fácil de renovar.' },
  { key: 'inactivo',    label: 'Ya no viene',              emoji: '⚪', clases: 'bg-gray-50 text-gray-500 border-gray-200',
    que_es: 'Su último plan terminó hace más de 2 meses.', que_hacer: 'Campañas de regreso, sin prisa.' },
  { key: 'prospecto',   label: 'Nunca ha comprado',        emoji: '🟣', clases: 'bg-violet-50 text-violet-700 border-violet-200',
    que_es: 'Se registró, tomó clase muestra o una clase suelta, pero nunca ha comprado un plan.', que_hacer: 'Convertirlo a su primer plan.' },
  { key: 'plataforma',  label: 'Wellhub / TotalPass',      emoji: '⚫', clases: 'bg-slate-100 text-slate-700 border-slate-200',
    que_es: 'Solo viene por Wellhub o TotalPass; no tiene plan de Navy.', que_hacer: 'Nada especial: lo paga la plataforma.' },
  { key: 'baja',        label: 'Dado de baja',             emoji: '⛔', clases: 'bg-red-50 text-red-600 border-red-200',
    que_es: 'Recepción lo marcó como perdido (se mudó, se cambió de gym…).', que_hacer: 'No contactarlo.' },
]
export const ESTADO_POR_KEY = Object.fromEntries(ESTADOS.map(e => [e.key, e])) as Record<EstadoKey, typeof ESTADOS[number]>

const hoyCDMX = () => new Date(Date.now() - 6 * 3600 * 1000).toISOString().slice(0, 10)

/** El estado que se muestra, a partir de lo que guarda el backend en la ficha (estatus, fecha_venc_plan, perdido). */
export function estadoDe(c: any): EstadoKey {
  if (c?.perdido) return 'baja'
  const e = String(c?.estatus || '').toLowerCase()
  if (e === 'activo') {
    const membs: any[] = c?.membresias || []
    const pendiente = !c?.fecha_venc_plan ||
      (membs.some(m => m.estatus === 'Activa' && m.activacion_pendiente) &&
       !membs.some(m => m.estatus === 'Activa' && !m.activacion_pendiente && (m.fecha_fin || '') >= hoyCDMX()))
    if (pendiente) return 'por_activar'
    const dias = Math.round((new Date(`${c.fecha_venc_plan}T12:00:00`).getTime() - new Date(`${hoyCDMX()}T12:00:00`).getTime()) / 86400000)
    return dias <= 7 ? 'por_vencer' : 'activo'
  }
  if (e === 'vencido' || e === 'expirado' || e === 'pago fallido') return 'vencido'
  if (e === 'inactivo') return 'inactivo'
  if (e === 'plataforma') return 'plataforma'
  return 'prospecto'
}

export function BadgeEstado({ cliente }: { cliente: any }) {
  const e = ESTADO_POR_KEY[estadoDe(cliente)]
  return (
    <span title={`${e.que_es} ${e.que_hacer}`}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap cursor-help ${e.clases}`}>
      <span className="text-[9px]">{e.emoji}</span>{e.label}
    </span>
  )
}

/** La leyenda: qué significa cada estado y qué hacer con él. */
export function LeyendaEstados() {
  return (
    <div className="grid sm:grid-cols-2 gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
      {ESTADOS.map(e => (
        <div key={e.key} className="flex items-start gap-2">
          <span className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${e.clases}`}>
            <span className="text-[9px]">{e.emoji}</span>{e.label}
          </span>
          <p className="text-[11px] text-gray-600 leading-snug">{e.que_es} <span className="text-gray-400">{e.que_hacer}</span></p>
        </div>
      ))}
    </div>
  )
}
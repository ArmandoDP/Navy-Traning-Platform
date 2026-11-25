'use client'
// src/components/clases/TabActividad.tsx — todo lo que le ha pasado a la clase, con quién lo hizo
// Incluye los cambios de coach con su motivo (vienen del backend; solo los ve Dirección y Managers).
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { backend } from '@/lib/backend'

const CAMPOS: Record<string, string> = {
  nombre_clase: 'Nombre', horario: 'Horario', capacidad_max: 'Cupo', coach_id: 'Coach', instructor: 'Instructor',
  room_id: 'Sala', salon: 'Salón', estado: 'Estado', duracion_minutos: 'Duración (min)', descripcion: 'Descripción',
  sucursal_id: 'Sucursal', categoria_id: 'Categoría', tipo_clase: 'Tipo', nivel: 'Nivel',
  wellhub_slot_id: 'Publicación en Wellhub', wellhub_class_id: 'Clase en Wellhub', publicar_wellhub: 'Publicar en Wellhub',
  totalpass_occurrence_uuid: 'Publicación en TotalPass', totalpass_event_uuid: 'Evento en TotalPass',
}
const ICONO: Record<string, string> = {
  creada: '✦', modificada: '✎', cancelada: '⦸', eliminada: '✕', reserva: '＋', reserva_cancelada: '↩', coach: '⇄',
}

function valor(campo: string, v: any) {
  if (v === null || v === undefined || v === '') return '—'
  if (campo === 'horario' || (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)))
    return new Date(v).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City' })
  if (typeof v === 'boolean') return v ? 'Sí' : 'No'
  if (campo.endsWith('_id') || campo.endsWith('_uuid')) return v ? 'asignado' : '—'
  return String(v).trim()
}

export default function TabActividad({ claseId }: { claseId: string }) {
  const [filas,    setFilas]    = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [nombres,  setNombres]  = useState<Record<string, string>>({})
  const [cambios,  setCambios]  = useState<any[]>([])

  useEffect(() => {
    (async () => {
      setCargando(true)
      const { data } = await supabase.from('clase_historial').select('*').eq('clase_id', claseId).order('created_at', { ascending: false }).limit(300)
      setFilas(data || [])
      // Nombres de coaches para mostrar "Coach: Ana → Luis" en lugar de IDs
      const ids = new Set<string>()
      for (const f of data || []) for (const k of ['coach_id', 'staff_id']) {
        const c = f.cambios?.[k]; if (c?.antes) ids.add(c.antes); if (c?.despues) ids.add(c.despues)
      }
      if (ids.size) {
        const { data: st } = await supabase.from('staff').select('id, nombre, primer_apellido').in('id', [...ids])
        setNombres(Object.fromEntries((st || []).map((s: any) => [s.id, `${s.nombre} ${s.primer_apellido || ''}`.trim()])))
      }
      // Cambios de coach con su motivo (si el usuario tiene permiso; si no, simplemente no salen)
      backend(`/cambio-coach/${claseId}/opciones`).then((r: any) => setCambios((r.historial || []).map((h: any, i: number) => ({
        id: `cc-${i}`, accion: 'coach', created_at: h.fecha, quien: h.quien || '—',
        detalle: `Cambio de coach: ${h.antes} → ${h.despues}`, motivo: `${h.motivo}${h.detalle ? ` · ${h.detalle}` : ''}`,
      })))).catch(() => {})
      setCargando(false)
    })()
  }, [claseId])

  const todas = [...filas, ...cambios].sort((x, y) => (y.created_at || '').localeCompare(x.created_at || ''))

  const mostrar = (campo: string, v: any) => (campo === 'coach_id' || campo === 'staff_id') && v ? (nombres[v] || 'otro coach') : valor(campo, v)

  if (cargando) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-gray-400" /></div>
  if (!todas.length) return <p className="p-8 text-center text-sm text-gray-400">Todavía no hay actividad registrada para esta clase.</p>

  return (
    <div className="px-6 py-5">
      <div className="relative border-l-2 border-gray-100 ml-3 space-y-5">
        {todas.map(f => (
          <div key={f.id} className="relative pl-6">
            <span className={`absolute -left-[13px] top-0 w-6 h-6 rounded-[9px] flex items-center justify-center text-[11px] font-black ${
              f.accion === 'cancelada' || f.accion === 'eliminada' ? 'bg-rose-600 text-white' : 'bg-[#171B24] text-white'}`}>{ICONO[f.accion] || '•'}</span>
            <div className="flex items-baseline justify-between gap-2">
              <p className={`text-sm font-bold ${f.accion === 'cancelada' || f.accion === 'eliminada' ? 'text-red-600' : 'text-gray-900'}`}>{f.detalle}</p>
              <span className="text-[11px] text-gray-400 whitespace-nowrap">
                {new Date(f.created_at).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City' })}
              </span>
            </div>
            <p className="text-xs text-gray-500">por <span className="font-bold text-gray-700">{f.quien}</span>
              {f.origen?.programa && <span className="text-gray-300"> · {/Mozilla/.test(f.origen.programa) ? 'desde el CRM/navegador' : /python/i.test(f.origen.programa) ? 'desde el backend' : /node/i.test(f.origen.programa) ? 'desde el servidor del CRM' : f.origen.programa}</span>}
            </p>
            {f.motivo && <p className="mt-1.5 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600"><b>Motivo:</b> {f.motivo}</p>}
            {f.cambios && Object.keys(f.cambios).length > 0 && (
              <div className="mt-1.5 bg-gray-50 rounded-lg px-3 py-2 space-y-0.5">
                {Object.entries(f.cambios).map(([k, c]: any) => (
                  <p key={k} className="text-xs text-gray-600">
                    <span className="font-bold">{CAMPOS[k] || k}:</span>{' '}
                    <span className="line-through text-gray-400">{mostrar(k, c.antes)}</span> → <span className="font-bold text-gray-800">{mostrar(k, c.despues)}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
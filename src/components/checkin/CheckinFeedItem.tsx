'use client'
import { useState, useEffect } from 'react'
import { Star }                from 'lucide-react'
import { supabase }            from '@/lib/supabase'

interface Props { checkin: any }

function hexSoftBg(hex: string) {
  if (!hex || hex.length < 7) return '#f3f4f6'
  const r = parseInt(hex.slice(1,3),16)
  const g = parseInt(hex.slice(3,5),16)
  const b = parseInt(hex.slice(5,7),16)
  return `rgba(${r},${g},${b},0.12)`
}

export default function CheckinFeedItem({ checkin }: Props) {
  const nombre   = checkin.clientes?.nombre_completo || 'Cliente'
  const clase    = checkin.clases?.nombre_clase      || 'Clase'
  const sucursal = checkin.sucursales?.nombre        || ''
  const color    = checkin.sucursales?.color         || '#6366f1'
  const hora     = new Date(checkin.fecha_checkin).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  const esNuevo  = checkin.es_nuevo_cliente

  const [totalClases,  setTotalClases]  = useState<number | null>(null)
  const [racha,        setRacha]        = useState<number>(0)
  const [promSemanal,  setPromSemanal]  = useState<number>(0)

  useEffect(() => {
    if (!checkin.cliente_id) return
    supabase.from('asistencias')
      .select('fecha_checkin')
      .eq('cliente_id', checkin.cliente_id)
      .order('fecha_checkin', { ascending: false })
      .then(({ data }) => {
        if (!data) return
        setTotalClases(data.length)

        // Racha
        const fechas = [...new Set(data.map(a => new Date(a.fecha_checkin).toDateString()))]
        let rachaCount = 0
        let hoy = new Date()
        for (const f of fechas) {
          const diff = Math.round((hoy.getTime() - new Date(f).getTime()) / (1000 * 3600 * 24))
          if (diff <= 1) { rachaCount++; hoy = new Date(f) }
          else break
        }
        setRacha(rachaCount)

        // Promedio semanal últimas 4 semanas
        const hace4sem = new Date()
        hace4sem.setDate(hace4sem.getDate() - 28)
        const clases4sem = data.filter(a => new Date(a.fecha_checkin) >= hace4sem).length
        setPromSemanal(+(clases4sem / 4).toFixed(1))
      })
  }, [checkin.cliente_id])

  return (
    <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition">
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
        style={{ backgroundColor: hexSoftBg(color), color }}>
        {nombre.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-bold text-gray-900 truncate">{nombre}</p>
          {esNuevo && (
            <span className="flex items-center gap-0.5 text-[10px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full flex-shrink-0">
              <Star size={8} className="fill-amber-500 text-amber-500" /> Nuevo
            </span>
          )}
          {checkin.es_clase_muestra && (
            <span className="text-[10px] font-black text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full flex-shrink-0">
              🎯 Muestra
            </span>
          )}
          {totalClases !== null && !esNuevo && (
            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full flex-shrink-0">
              {totalClases} clases
            </span>
          )}
          {racha >= 3 && (
            <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full flex-shrink-0">
              🔥 {racha} días
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 truncate mt-0.5">
          {clase} · {sucursal}
          {promSemanal > 0 && (
            <span className="text-gray-300"> · {promSemanal}x/sem</span>
          )}
        </p>
      </div>

      {/* Hora */}
      <p className="text-xs font-bold text-gray-400 flex-shrink-0">{hora}</p>
    </div>
  )
}
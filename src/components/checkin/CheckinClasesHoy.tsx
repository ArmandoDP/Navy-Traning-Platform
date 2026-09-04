'use client'
import { useState, useEffect } from 'react'
import { supabase }            from '@/lib/supabase'
import { Clock, Users, ChevronRight } from 'lucide-react'
import ModalDetalleClase from './ModalDetalleClase'

interface Props {
  sucursalId: string | null
  onCheckin:  () => void
}

export default function CheckinClasesHoy({ sucursalId, onCheckin }: Props) {
  const [clases,        setClases]        = useState<any[]>([])
  const [loading,       setLoading]       = useState(true)
  const [claseSelec,    setClaseSelec]    = useState<any>(null)

  const fetchClases = async () => {
    const hoyInicio = new Date()
    hoyInicio.setHours(0, 0, 0, 0)
    const hoyFin = new Date()
    hoyFin.setHours(23, 59, 59, 999)

    let q = supabase.from('clases')
      .select(`
        id, nombre_clase, horario, duracion_minutos, capacidad_max, espacios_ocupados,
        rooms(id, nombre),
        staff(nombre, primer_apellido, foto_url),
        sucursales(nombre, color)
      `)
      .gte('horario', hoyInicio.toISOString())
      .lte('horario', hoyFin.toISOString())
      .order('horario', { ascending: true })

    if (sucursalId) q = q.eq('sucursal_id', sucursalId)

    const { data } = await q
    setClases(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchClases()
    // Refrescar cada minuto
    const interval = setInterval(fetchClases, 60000)
    return () => clearInterval(interval)
  }, [sucursalId])

  const ahora      = new Date()
  const getEstado  = (clase: any) => {
    const inicio = new Date(clase.horario)
    const fin    = new Date(inicio.getTime() + clase.duracion_minutos * 60000)
    if (ahora < inicio) return 'proxima'
    if (ahora >= inicio && ahora <= fin) return 'en_curso'
    return 'terminada'
  }

  const estadoConfig = {
    proxima:   { label: 'Próxima',   color: 'bg-gray-100 text-gray-500'    },
    en_curso:  { label: 'En curso',  color: 'bg-emerald-100 text-emerald-700' },
    terminada: { label: 'Terminada', color: 'bg-red-50 text-red-400'       },
  }

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-sm font-black text-gray-900">Clases de hoy</p>
          <p className="text-xs text-gray-400 mt-0.5">{clases.length} clase{clases.length !== 1 ? 's' : ''} programada{clases.length !== 1 ? 's' : ''}</p>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-400 text-sm">Cargando...</div>
        ) : clases.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm italic">Sin clases hoy</div>
        ) : (
          <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
            {clases.map(c => {
              const estado    = getEstado(c)
              const cfg       = estadoConfig[estado]
              const cuposLibres = c.capacidad_max - (c.espacios_ocupados || 0)
              const hora      = new Date(c.horario).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

              return (
                <button key={c.id} onClick={() => setClaseSelec(c)}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition text-left">
                  {/* Hora */}
                  <div className="text-center flex-shrink-0 w-12">
                    <p className="text-sm font-black text-gray-900">{hora}</p>
                    <p className="text-[10px] text-gray-400">{c.duracion_minutos}min</p>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-bold text-gray-900 truncate">{c.nombre_clase}</p>
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0 ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {c.staff?.nombre} {c.staff?.primer_apellido} · {c.rooms?.nombre}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Users size={11} className="text-gray-400"/>
                      <span className="text-xs text-gray-500">
                        {c.espacios_ocupados || 0}/{c.capacidad_max} · {cuposLibres} libres
                      </span>
                    </div>
                  </div>

                  <ChevronRight size={14} className="text-gray-300 flex-shrink-0"/>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {claseSelec && (
        <ModalDetalleClase
          clase={claseSelec}
          onClose={() => { setClaseSelec(null); fetchClases() }}
          onCheckin={onCheckin}
        />
      )}
    </>
  )
}
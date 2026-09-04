'use client'
import { useState, useEffect } from 'react'
import { supabase }            from '@/lib/supabase'
import { Calendar, MapPin, Users } from 'lucide-react'
import type { ClaseData } from './DrawerClaseMuestra'

interface Props {
  onContinuar: (data: ClaseData) => void
  onBack:      () => void
}

export default function PasoClase({ onContinuar, onBack }: Props) {
  const [sucursales,   setSucursales]   = useState<any[]>([])
  const [sucursalSel,  setSucursalSel]  = useState('')
  const [clases,       setClases]       = useState<any[]>([])
  const [loadingClases,setLoadingClases]= useState(false)
  const [claseSel,     setClaseSel]     = useState<any>(null)

  useEffect(() => {
    supabase.from('sucursales').select('id, nombre, color')
      .eq('estatus', 'Activa').order('nombre')
      .then(({ data }) => setSucursales(data || []))
  }, [])

  useEffect(() => {
    if (!sucursalSel) return
    setLoadingClases(true)
    setClaseSel(null)
    const hoy = new Date().toISOString()
    supabase.from('clases')
      .select('*, room_id, rooms(nombre, id), sucursales(nombre)')
      .eq('sucursal_id', sucursalSel)
      .eq('estado', 'Activa')
      .gte('horario', hoy)
      .order('horario')
      .then(({ data }) => {
        // Solo clases con cupo disponible
        setClases((data || []).filter(c => c.espacios_ocupados < c.capacidad_max))
        setLoadingClases(false)
      })
  }, [sucursalSel])

  const handleContinuar = () => {
    if (!claseSel) return
    onContinuar({
        claseId:    claseSel.id,
        nombre:     claseSel.nombre_clase,
        horario:    claseSel.horario,
        sucursalId: sucursalSel,
        sucursal:   claseSel.sucursales?.nombre || '',
        roomId:     claseSel.room_id || claseSel.rooms?.id,  // ← agrega esto
        duracion:   claseSel.duracion_minutos || 60,
    })
    }

  return (
    <div className="px-6 py-5 space-y-5 pb-24">
      <div>
        <p className="text-sm font-black text-gray-900 mb-1">Elegir clase</p>
        <p className="text-xs text-gray-400">Selecciona la sucursal y la clase disponible</p>
      </div>

      {/* Sucursal */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700">Sucursal *</label>
        <div className="flex flex-wrap gap-2">
          {sucursales.map(s => (
            <button key={s.id} onClick={() => setSucursalSel(s.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition ${
                sucursalSel === s.id ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
              }`}>
              <MapPin size={12}/> {s.nombre}
            </button>
          ))}
        </div>
      </div>

      {/* Clases */}
      {sucursalSel && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Clase disponible *</label>
          {loadingClases ? (
            <p className="text-xs text-gray-400 py-4">Cargando clases...</p>
          ) : clases.length === 0 ? (
            <p className="text-xs text-gray-400 py-4">Sin clases disponibles con cupo en esta sucursal</p>
          ) : (
            <div className="space-y-2">
              {clases.map(c => {
                const cuposLibres = c.capacidad_max - c.espacios_ocupados
                const seleccionada = claseSel?.id === c.id
                return (
                  <button key={c.id} onClick={() => setClaseSel(c)}
                    className={`w-full text-left px-4 py-3.5 rounded-xl border transition ${
                      seleccionada ? 'bg-gray-900 border-gray-900' : 'bg-white border-gray-200 hover:border-gray-400'
                    }`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className={`text-sm font-bold ${seleccionada ? 'text-white' : 'text-gray-900'}`}>
                          {c.nombre_clase}
                        </p>
                        <p className={`text-xs mt-0.5 flex items-center gap-1 ${seleccionada ? 'text-gray-300' : 'text-gray-400'}`}>
                          <Calendar size={11}/>
                          {new Date(c.horario).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })}
                          {' · '}
                          {new Date(c.horario).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {c.rooms?.nombre && (
                          <p className={`text-xs mt-0.5 ${seleccionada ? 'text-gray-300' : 'text-gray-400'}`}>
                            Room: {c.rooms.nombre}
                          </p>
                        )}
                      </div>
                      <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${
                        cuposLibres <= 3
                          ? 'bg-red-100 text-red-500'
                          : seleccionada ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>
                        <Users size={11}/> {cuposLibres} cupos
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-100 fixed bottom-0 left-0 right-0 bg-white flex gap-3" style={{ maxWidth: '576px', right: 0, left: 'auto', width: '100%' }}>
        <button onClick={onBack}
          className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition">
          ← Atrás
        </button>
        <button onClick={handleContinuar} disabled={!claseSel}
          className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-700 transition disabled:opacity-40">
          Siguiente → Elegir spot
        </button>
      </div>
    </div>
  )
}
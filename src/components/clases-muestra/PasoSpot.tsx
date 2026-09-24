'use client'
import { useState, useEffect } from 'react'
import { supabase }           from '@/lib/supabase'
import type { ClaseData }      from './DrawerClaseMuestra'

interface Props {
  clase:       ClaseData
  guardando:   boolean
  onConfirmar: (spotId: string, spotNumero?: string) => void
  onBack:      () => void
}

const CELL = 52
const GAP  = 6

export default function PasoSpot({ clase, guardando, onConfirmar, onBack }: Props) {
  const [layoutCeldas, setLayoutCeldas] = useState<any[]>([])
  const [roomSpots,    setRoomSpots]    = useState<any[]>([])
  const [ocupados,     setOcupados]     = useState<string[]>([])
  const [spotSel,      setSpotSel]      = useState<string>('')
  const [spotSelNum,   setSpotSelNum]   = useState<string>('')
  const [loading,      setLoading]      = useState(true)

  useEffect(() => {
    const fetchRoom = async () => {
      setLoading(true)

      const { data: room } = await supabase.from('rooms')
        .select('layout, ancho, alto, room_spots(id, numero, tipo, fila, columna, bloqueado)')
        .eq('id', clase.roomId).single()

      const { data: reservas } = await supabase.from('reservas')
        .select('spot_id').eq('clase_id', clase.claseId)
        .in('estatus', ['Confirmada', 'Asistida'])
        .not('spot_id', 'is', null)

      setLayoutCeldas(Array.isArray(room?.layout) ? room.layout : [])
      setRoomSpots(room?.room_spots || [])
      setOcupados(reservas?.map((r: any) => r.spot_id).filter(Boolean) || [])
      setLoading(false)
    }
    fetchRoom()
  }, [clase.claseId, clase.roomId])

  if (loading) return (
    <div className="px-6 py-20 text-center text-gray-400 text-sm">Cargando mapa del room...</div>
  )

  const maxCol = layoutCeldas.length ? Math.max(...layoutCeldas.map((s: any) => s.columna)) : 0
  const maxFil = layoutCeldas.length ? Math.max(...layoutCeldas.map((s: any) => s.fila))    : 0
  const gridW  = (maxCol + 1) * (CELL + GAP)
  const gridH  = (maxFil + 1) * (CELL + GAP)

  // Cálculo de disponibilidad real del salón
  const totalSpots = roomSpots.filter((rs: any) => !rs.bloqueado).length
  const disponiblesCount = Math.max(0, totalSpots - ocupados.length)
  const sinLugares = disponiblesCount === 0

  return (
    <div className="px-6 py-5 space-y-5 pb-28">
      <div>
        <p className="text-sm font-black text-gray-900 mb-1">Elige el spot</p>
        <p className="text-xs text-gray-400">Selecciona el lugar disponible para el prospecto</p>
      </div>

      {/* Alerta de clase llena */}
      {sinLugares && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <p className="text-xs font-bold text-amber-800">
            ⚠️ Esta clase alcanzó su límite de capacidad ({ocupados.length}/{totalSpots} ocupados).
          </p>
        </div>
      )}

      {/* Leyenda */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-white border border-gray-300 inline-block"/> Disponible</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-900 inline-block"/> Seleccionado</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100 inline-block"/> Ocupado</span>
      </div>

      {/* Mapa */}
      {layoutCeldas.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl p-6 text-center text-gray-400 text-sm">
          Este room no tiene spots configurados
        </div>
      ) : (
        <div className="bg-gray-50 rounded-2xl p-4 overflow-auto">
          <div style={{ position: 'relative', width: gridW, height: gridH }}>
            {layoutCeldas.map((celda: any, i: number) => {
              const left = celda.columna * (CELL + GAP)
              const top  = celda.fila    * (CELL + GAP)

              if (celda.tipo === 'Coach') return (
                <div key={i} style={{ position: 'absolute', left, top, width: CELL, height: CELL }}
                  className="flex items-center justify-center rounded-xl bg-gray-800 text-lg">
                  🎤
                </div>
              )

              if (celda.tipo === 'Entrada') return (
                <div key={i} style={{ position: 'absolute', left, top, width: CELL, height: CELL }}
                  className="flex items-center justify-center rounded-xl bg-gray-100 text-lg">
                  🚪
                </div>
              )

              const spot = roomSpots.find((rs: any) => rs.fila === celda.fila && rs.columna === celda.columna)
              if (!spot) return null

              const ocupado = ocupados.includes(spot.id) || spot.bloqueado
              const sel     = spotSel === spot.id

              return (
                <button key={i}
                  style={{ position: 'absolute', left, top, width: CELL, height: CELL }}
                  disabled={ocupado}
                  onClick={() => {
                    setSpotSel(sel ? '' : spot.id)
                    setSpotSelNum(sel ? '' : spot.numero)
                  }}
                  className={`rounded-xl border-2 text-xs font-bold transition flex items-center justify-center ${
                    ocupado
                      ? 'bg-red-100 border-red-200 text-red-400 cursor-not-allowed'
                      : sel
                      ? 'bg-gray-900 border-gray-900 text-white'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
                  }`}>
                  {spot.numero}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {spotSel && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
          <p className="text-xs font-bold text-emerald-700">✓ Spot seleccionado: {spotSelNum}</p>
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-100 fixed bottom-0 bg-white flex gap-3"
        style={{ maxWidth: '576px', right: 0, left: 'auto', width: '100%' }}>
        <button onClick={onBack}
          className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition">
          ← Atrás
        </button>
        <button 
          onClick={() => onConfirmar(spotSel, spotSelNum)} 
          disabled={guardando || !spotSel}
          className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-700 transition disabled:opacity-40 disabled:cursor-not-allowed">
          {guardando ? 'Confirmando...' : 'Confirmar y enviar correo →'}
        </button>
      </div>
    </div>
  )
}
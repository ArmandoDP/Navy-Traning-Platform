'use client'
// src/components/clases/DrawerClasesEliminadas.tsx — clases eliminadas: quién, cuándo, y su historial completo
import { useEffect, useMemo, useState } from 'react'
import { X, Search, Loader2, ArrowLeft, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import TabActividad from './TabActividad'

interface Props { onClose: () => void }

const fechaHora = (iso?: string) => iso ? new Date(iso).toLocaleString('es-MX', {
  weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City' }) : '—'

export default function DrawerClasesEliminadas({ onClose }: Props) {
  const [filas,    setFilas]    = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [buscar,   setBuscar]   = useState('')
  const [sucursal, setSucursal] = useState('')
  const [abierta,  setAbierta]  = useState<any>(null)

  useEffect(() => {
    (async () => {
      const { data: elim } = await supabase.from('clase_historial').select('*')
        .eq('accion', 'eliminada').order('created_at', { ascending: false }).limit(300)
      const ids = (elim || []).map((e: any) => e.clase_id)
      // El resumen de la cancelación (a cuántos se avisó) de cada una
      const { data: res } = ids.length
        ? await supabase.from('clase_historial').select('clase_id, detalle, datos').eq('accion', 'cancelada').in('clase_id', ids)
        : { data: [] as any[] }
      const resumen = Object.fromEntries((res || []).map((r: any) => [r.clase_id, r]))
      setFilas((elim || []).map((e: any) => ({ ...e, resumen: resumen[e.clase_id] })))
      setCargando(false)
    })()
  }, [])

  const sucursales = useMemo(() => [...new Set(filas.map(f => f.datos?.sucursal).filter(Boolean))].sort(), [filas])
  const lista = filas.filter(f => {
    const q = buscar.trim().toLowerCase()
    const texto = `${f.datos?.nombre || f.detalle} ${f.quien} ${f.datos?.coach || ''}`.toLowerCase()
    return (!q || texto.includes(q)) && (!sucursal || f.datos?.sucursal === sucursal)
  })

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" />
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white z-50 shadow-2xl flex flex-col">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          {abierta && <button onClick={() => setAbierta(null)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><ArrowLeft size={16} /></button>}
          <div className="flex-1 min-w-0">
            <p className="font-black text-gray-900 truncate">{abierta ? (abierta.datos?.nombre || 'Clase eliminada') : 'Clases eliminadas'}</p>
            <p className="text-xs text-gray-400 truncate">{abierta ? `Era el ${fechaHora(abierta.datos?.horario)} · ${abierta.datos?.sucursal || ''}` : 'Quién las eliminó, cuándo y todo su historial'}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={16} /></button>
        </div>

        {abierta ? (
          <div className="flex-1 overflow-y-auto">
            <div className="mx-6 mt-5 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-xs text-red-700 space-y-1">
              <p><b>Eliminada por {abierta.quien}</b> el {fechaHora(abierta.created_at)}</p>
              {abierta.resumen?.detalle && <p className="text-red-600/80">{abierta.resumen.detalle}</p>}
              <p className="text-red-600/70">Coach: {abierta.datos?.coach || '—'} · Cupo: {abierta.datos?.cupo ?? '—'}</p>
            </div>
            <TabActividad claseId={abierta.clase_id} />
          </div>
        ) : (
          <>
            <div className="px-6 py-3 flex gap-2 border-b border-gray-50">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Clase, coach o quién la eliminó…"
                  className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-400" />
              </div>
              <select value={sucursal} onChange={e => setSucursal(e.target.value)} className="border border-gray-200 rounded-xl px-2 text-xs text-gray-600">
                <option value="">Todas</option>
                {sucursales.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {cargando && <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-gray-400" /></div>}
              {!cargando && lista.length === 0 && (
                <div className="p-10 text-center text-sm text-gray-400"><Trash2 size={28} className="mx-auto mb-2 text-gray-200" />No hay clases eliminadas</div>
              )}
              {lista.map(f => {
                const reservas = f.resumen?.datos?.reservas ?? f.datos?.reservas ?? 0
                return (
                  <button key={f.id} onClick={() => setAbierta(f)} className="w-full text-left px-6 py-3 hover:bg-gray-50">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-bold text-gray-900 truncate">{f.datos?.nombre || f.detalle}</p>
                      <span className="text-[11px] text-gray-400 whitespace-nowrap capitalize">{fechaHora(f.datos?.horario)}</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{f.datos?.sucursal || '—'}{f.datos?.coach ? ` · ${f.datos.coach}` : ''}</p>
                    <p className="text-xs mt-1">
                      <span className="text-red-600 font-bold">Eliminada por {f.quien}</span>
                      <span className="text-gray-400"> · {fechaHora(f.created_at)}</span>
                      {reservas > 0 && <span className="text-gray-500"> · {reservas} {reservas === 1 ? 'reserva' : 'reservas'}</span>}
                    </p>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    </>
  )
}
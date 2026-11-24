'use client'
// src/components/staff/equipo/ListaEquipo.tsx
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { NEGRO, grupo, puesto, pagoDe, nombreCompleto, iniciales, hora, quitarAcentos, Grupo } from './util'

type Filtro = 'todos' | Grupo | 'sin_cuenta' | 'inactivos'

const FILTROS: { v: Filtro; l: string }[] = [
  { v: 'todos', l: 'Todos' },
  { v: 'coach', l: 'Coaches' },
  { v: 'front', l: 'Front Desk' },
  { v: 'galley', l: 'The Galley' },
  { v: 'gerencia', l: 'Gerencia' },
  { v: 'sin_cuenta', l: 'Sin cuenta' },
  { v: 'inactivos', l: 'Inactivos' },
]

export default function ListaEquipo({ staff, resumen, onVer }:
  { staff: any[]; resumen: Record<string, any>; onVer: (s: any) => void }) {
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [busqueda, setBusqueda] = useState('')

  const activos = staff.filter(s => (s.estatus || 'Activo') === 'Activo')
  const cuenta = (f: Filtro) =>
    f === 'todos' ? activos.length
    : f === 'inactivos' ? staff.length - activos.length
    : f === 'sin_cuenta' ? activos.filter(s => !s.supabase_user_id).length
    : activos.filter(s => grupo(s) === f).length

  // Sin memoización manual: el React Compiler de Next la hace solo
  const q = quitarAcentos(busqueda)
  const tel = busqueda.replace(/\D/g, '')
  const lista = staff
      .filter(s => {
        const activo = (s.estatus || 'Activo') === 'Activo'
        if (filtro === 'inactivos') return !activo
        if (!activo) return false
        if (filtro === 'sin_cuenta') return !s.supabase_user_id
        if (filtro !== 'todos') return grupo(s) === filtro
        return true
      })
      .filter(s => !q || quitarAcentos(nombreCompleto(s)).includes(q) || quitarAcentos(s.email || '').includes(q)
        || (tel.length >= 3 && (s.telefono || '').replace(/\D/g, '').includes(tel)))
      .sort((a, b) => {
        // Primero quien está adentro, luego por nombre
        const ad = resumen[a.id]?.adentro_desde ? 0 : 1, bd = resumen[b.id]?.adentro_desde ? 0 : 1
        return ad - bd || nombreCompleto(a).localeCompare(nombreCompleto(b), 'es')
      })

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTROS.map(f => (
            <button key={f.v} onClick={() => setFiltro(f.v)}
              className={`rounded-xl border px-3 py-1.5 text-[13px] font-bold transition ${
                filtro === f.v ? 'border-[#171B24] bg-[#171B24] text-white' : 'border-gray-200 bg-white text-gray-500 hover:text-gray-800'}`}>
              {f.l} <span className={filtro === f.v ? 'text-white/60' : 'text-gray-400'}>{cuenta(f.v)}</span>
            </button>
          ))}
        </div>
        <div className="relative w-full max-w-xs">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar por nombre, correo o teléfono…"
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-gray-400" />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-[18px] border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b border-gray-100 text-left text-[11px] font-bold text-gray-400">
              <th className="px-4 py-3">Persona</th><th className="px-4 py-3">Puesto</th><th className="px-4 py-3">Sucursales</th>
              <th className="px-4 py-3">Pago</th><th className="px-4 py-3">App</th><th className="px-4 py-3">Ahora</th>
              <th className="px-4 py-3">Esta quincena</th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No hay nadie con ese filtro.</td></tr>
            )}
            {lista.map((s, i) => {
              const r = resumen[s.id] || {}
              const sucs = (s.staff_sucursales || []).map((x: any) => x.sucursales).filter(Boolean)
              const esCoach = grupo(s) === 'coach'
              return (
                <motion.tr key={s.id} onClick={() => onVer(s)}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 20) * 0.015 }}
                  className="cursor-pointer border-b border-gray-50 transition hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      {s.foto_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={s.foto_url} alt="" className="h-9 w-9 rounded-xl object-cover" />
                        : <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-black text-white" style={{ background: NEGRO }}>{iniciales(s)}</span>}
                      <div className="min-w-0">
                        <b className="block truncate text-gray-900">{nombreCompleto(s)}</b>
                        <p className="truncate text-xs text-gray-400">{s.email || 'Sin correo'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-lg px-2 py-0.5 text-[11px] font-bold ${esCoach ? 'bg-[#171B24] text-white' : 'bg-gray-100 text-gray-600'}`}>{puesto(s)}</span>
                    {esCoach && (
                      <span className={`ml-1 rounded-lg px-2 py-0.5 text-[11px] font-bold ${s.nivel ? 'bg-gray-100 text-gray-600' : 'bg-amber-100 text-amber-800'}`}>
                        {s.nivel || 'Sin nivel'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5" title={sucs.map((x: any) => x.nombre).join(', ')}>
                    {sucs.length === 0 ? <span className="text-xs font-bold text-amber-700">Sin sucursal</span> : (
                      <span className="flex items-center gap-1">
                        {sucs.slice(0, 5).map((x: any) => <span key={x.id} className="h-2 w-2 rounded-full" style={{ background: x.color || '#9CA3AF' }} />)}
                        <span className="ml-1 text-xs text-gray-400">{sucs.length}</span>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs font-semibold text-gray-700">{pagoDe(s)}</td>
                  <td className="px-4 py-2.5">
                    {s.supabase_user_id
                      ? <span className="text-xs font-bold text-emerald-700">● Con cuenta</span>
                      : <span className="text-xs font-bold text-amber-700">Sin cuenta</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    {r.adentro_desde
                      ? <span className="rounded-lg bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">Adentro · {hora(r.adentro_desde)}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    {esCoach ? (
                      <span className="text-[13px] font-bold text-gray-900">
                        {r.impartidas ?? 0} de {r.programadas ?? 0} clases
                        {r.sin_checar > 0 && <span className="ml-1.5 rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] text-amber-800">{r.sin_checar} sin checar</span>}
                      </span>
                    ) : (
                      <span className="text-[13px] font-bold text-gray-900">{r.dias ?? 0} días · {r.horas ?? 0} h</span>
                    )}
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
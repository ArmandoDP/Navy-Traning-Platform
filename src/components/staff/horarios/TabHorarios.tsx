'use client'
// src/components/staff/horarios/TabHorarios.tsx
// Horario semanal de cada persona en la sucursal elegida. Lo usa el checador para la salida
// automática y para saber si le tocaba, y la bitácora para faltas y retardos.
import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2, Copy, RefreshCw, Search } from 'lucide-react'
import { backend } from '@/lib/backend'
import Modal, { inputCls, BotonNegro, BotonBlanco } from '@/components/staff/equipo/Modal'
import HorarioQuincena from './HorarioQuincena'
import { NEGRO, grupo, puesto, nombreCompleto, iniciales, quitarAcentos } from '@/components/staff/equipo/util'

type Bloque = { dia: number; entrada: string; salida: string }
const DIAS = [{ d: 1, l: 'Lun' }, { d: 2, l: 'Mar' }, { d: 3, l: 'Mié' }, { d: 4, l: 'Jue' }, { d: 5, l: 'Vie' }, { d: 6, l: 'Sáb' }, { d: 0, l: 'Dom' }]
const horas = (bs: Bloque[]) => bs.reduce((a, b) => {
  const [h1, m1] = b.entrada.split(':').map(Number), [h2, m2] = b.salida.split(':').map(Number)
  return a + (h2 * 60 + m2 - h1 * 60 - m1) / 60
}, 0)
const corta = (h: string) => { const [H, M] = h.split(':').map(Number); return `${H % 12 || 12}${M ? `:${String(M).padStart(2, '0')}` : ''}${H < 12 ? 'am' : 'pm'}` }   // "07:00" → "7am", "15:30" → "3:30pm"

export default function TabHorarios({ staff, sucursalId, sucursalNombre }:
  { staff: any[]; sucursalId: string | null; sucursalNombre?: string }) {
  const [modo, setModo] = useState<'quincena' | 'fijo'>('quincena')
  if (!sucursalId) return <Vacio texto="Elige una sucursal en el selector de arriba para ver y capturar horarios." />
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="flex rounded-xl border border-gray-200 bg-white p-0.5">
          {([['quincena', 'Por quincena'], ['fijo', 'Horario fijo']] as const).map(([v, l]) => (
            <button key={v} onClick={() => setModo(v)}
              className={`rounded-lg px-3 py-1.5 text-[13px] font-bold transition ${modo === v ? 'bg-[#171B24] text-white' : 'text-gray-500 hover:text-gray-800'}`}>{l}</button>
          ))}
        </div>
        <p className="text-xs text-gray-500">{modo === 'quincena'
          ? 'El horario de cada quincena, día por día. Si se captura, manda sobre el horario fijo.'
          : 'La semana que se repite siempre. Se usa en las quincenas que no se capturaron por fechas.'}</p>
      </div>
      {modo === 'quincena'
        ? <HorarioQuincena staff={staff} sucursalId={sucursalId} sucursalNombre={sucursalNombre} />
        : <HorarioFijo staff={staff} sucursalId={sucursalId} sucursalNombre={sucursalNombre} />}
    </div>
  )
}

function HorarioFijo({ staff, sucursalId, sucursalNombre }:
  { staff: any[]; sucursalId: string | null; sucursalNombre?: string }) {
  const [horarios, setHorarios] = useState<Record<string, Bloque[]>>({})
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [conCoaches, setConCoaches] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState<any | null>(null)

  const cargar = useCallback(async () => {
    if (!sucursalId) { setCargando(false); return }
    setCargando(true); setError(null)
    try { setHorarios((await backend(`/staff-admin/horarios?sucursal_id=${sucursalId}`)).horarios || {}) }
    catch (e: any) { setError(e.message) }
    setCargando(false)
  }, [sucursalId])
  useEffect(() => { cargar() }, [cargar])

  if (!sucursalId) return <Vacio texto="Elige una sucursal en el selector de arriba para ver y capturar horarios." />

  const q = quitarAcentos(busqueda)
  const lista = staff
    .filter(s => (s.estatus || 'Activo') === 'Activo')
    .filter(s => conCoaches || grupo(s) !== 'coach' || (horarios[s.id] || []).length > 0)
    .filter(s => !q || quitarAcentos(nombreCompleto(s)).includes(q))
    .sort((a, b) => nombreCompleto(a).localeCompare(nombreCompleto(b), 'es'))
  const sinHorario = lista.filter(s => grupo(s) !== 'coach' && !(horarios[s.id] || []).length).length

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-500">
            Horarios de <b className="text-gray-900">{sucursalNombre}</b>
            {sinHorario > 0 && <span className="ml-2 rounded-lg bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">{sinHorario} sin horario</span>}
          </p>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={conCoaches} onChange={e => setConCoaches(e.target.checked)} className="h-4 w-4 accent-[#171B24]" />
            Mostrar coaches
          </label>
        </div>
        <div className="relative w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar persona…"
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-gray-400" />
        </div>
      </div>
      {error && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</p>}

      <div className="min-h-0 flex-1 overflow-auto rounded-[18px] border border-gray-200 bg-white shadow-sm">
        {cargando ? <div className="flex h-40 items-center justify-center gap-2 text-gray-400"><RefreshCw size={15} className="animate-spin" /> Cargando…</div> : (
          <table className="w-full min-w-[960px] text-sm">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b border-gray-100 text-left text-[11px] font-bold text-gray-400">
                <th className="px-4 py-3">Persona</th>
                {DIAS.map(d => <th key={d.d} className="px-2 py-3 text-center">{d.l}</th>)}
                <th className="px-4 py-3 text-right">Horas / semana</th><th />
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 && <tr><td colSpan={10} className="px-4 py-10 text-center text-gray-400">No hay staff en esta sucursal.</td></tr>}
              {lista.map(s => {
                const bs = horarios[s.id] || []
                return (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[11px] font-black text-white" style={{ background: NEGRO }}>{iniciales(s)}</span>
                        <div className="min-w-0"><b className="block truncate text-gray-900">{nombreCompleto(s)}</b><p className="text-xs text-gray-400">{puesto(s)}</p></div>
                      </div>
                    </td>
                    {DIAS.map(d => {
                      const del = bs.filter(b => b.dia === d.d)
                      return (
                        <td key={d.d} className="px-1.5 py-2 text-center">
                          {del.length === 0 ? <span className="text-gray-200">—</span> : (
                            <div className="space-y-0.5">
                              {del.map((b, i) => (
                                <span key={i} className="block rounded-md px-1.5 py-0.5 text-[11px] font-bold text-white" style={{ background: NEGRO }}>
                                  {corta(b.entrada)}–{corta(b.salida)}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                      )
                    })}
                    <td className="px-4 py-2.5 text-right font-bold text-gray-900">{bs.length ? `${horas(bs).toFixed(1).replace('.0', '')} h` : <span className="text-xs font-bold text-amber-700">Sin horario</span>}</td>
                    <td className="px-3 py-2.5 text-right">
                      <button onClick={() => setEditando(s)} className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 hover:text-gray-900">Editar</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <EditorHorario persona={editando} sucursalId={sucursalId} sucursalNombre={sucursalNombre}
        inicial={editando ? horarios[editando.id] || [] : []}
        onClose={() => setEditando(null)} onGuardado={() => { setEditando(null); cargar() }} />
    </div>
  )
}

function EditorHorario({ persona, sucursalId, sucursalNombre, inicial, onClose, onGuardado }: {
  persona: any | null; sucursalId: string; sucursalNombre?: string; inicial: Bloque[]; onClose: () => void; onGuardado: () => void
}) {
  const [bloques, setBloques] = useState<Bloque[]>([])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { if (persona) { setBloques(inicial.map(b => ({ ...b }))); setError(null) } }, [persona]) // eslint-disable-line react-hooks/exhaustive-deps

  const agregar = (dia: number) => {
    const del = bloques.filter(b => b.dia === dia)
    const ultimo = del[del.length - 1]
    setBloques([...bloques, ultimo ? { dia, entrada: ultimo.salida, salida: ultimo.salida < '22:00' ? '22:00' : '23:00' } : { dia, entrada: '07:00', salida: '15:00' }])
  }
  const cambiar = (i: number, k: 'entrada' | 'salida', v: string) => setBloques(bloques.map((b, j) => j === i ? { ...b, [k]: v } : b))
  const quitar = (i: number) => setBloques(bloques.filter((_, j) => j !== i))
  const copiarLunes = () => {
    const lunes = bloques.filter(b => b.dia === 1)
    if (!lunes.length) return
    setBloques([...bloques.filter(b => b.dia < 1 || b.dia > 5 || b.dia === 1), ...[2, 3, 4, 5].flatMap(d => lunes.map(b => ({ ...b, dia: d })))])
  }

  const invalido = bloques.some(b => !b.entrada || !b.salida || b.salida <= b.entrada)
  const guardar = async () => {
    setGuardando(true); setError(null)
    try {
      await backend(`/staff-admin/horarios/${persona.id}`, { method: 'PUT', body: { sucursal_id: sucursalId, bloques } })
      onGuardado()
    } catch (e: any) { setError(e.message) }
    setGuardando(false)
  }

  return (
    <Modal abierto={!!persona} onClose={onClose} ancho="max-w-xl"
      titulo={persona ? `Horario de ${nombreCompleto(persona)}` : ''}
      subtitulo={`${sucursalNombre || ''} · se aplica todas las semanas`}
      pie={<>
        {error && <p className="mr-auto text-sm font-semibold text-rose-600">{error}</p>}
        <BotonBlanco onClick={onClose}>Cancelar</BotonBlanco>
        <BotonNegro onClick={guardar} disabled={guardando || invalido}>{guardando ? 'Guardando…' : 'Guardar horario'}</BotonNegro>
      </>}>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-gray-500">Puede tener dos turnos el mismo día (por ejemplo, 6–10 y 17–21).</p>
        <button onClick={copiarLunes} className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-900"><Copy size={12} /> Copiar lunes a mar–vie</button>
      </div>
      <div className="space-y-2">
        {DIAS.map(d => {
          const idx = bloques.map((b, i) => ({ b, i })).filter(x => x.b.dia === d.d)
          return (
            <div key={d.d} className="flex items-start gap-3 rounded-2xl bg-gray-50 p-2.5">
              <b className="w-10 pt-2 text-sm text-gray-900">{d.l}</b>
              <div className="flex-1 space-y-1.5">
                {idx.length === 0 && <p className="pt-2 text-sm text-gray-400">Descansa</p>}
                {idx.map(({ b, i }) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="time" value={b.entrada} onChange={e => cambiar(i, 'entrada', e.target.value)} className={`${inputCls} w-32 bg-white py-1.5`} />
                    <span className="text-gray-400">a</span>
                    <input type="time" value={b.salida} onChange={e => cambiar(i, 'salida', e.target.value)}
                      className={`${inputCls} w-32 bg-white py-1.5 ${b.salida && b.salida <= b.entrada ? 'border-rose-400' : ''}`} />
                    <button onClick={() => quitar(i)} className="rounded-lg p-1.5 text-gray-300 hover:bg-rose-50 hover:text-rose-500"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
              <button onClick={() => agregar(d.d)} className="flex items-center gap-1 rounded-lg px-2 py-2 text-xs font-bold text-gray-500 hover:bg-white hover:text-gray-900">
                <Plus size={13} /> Turno
              </button>
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-right text-sm text-gray-500">Total: <b className="text-gray-900">{horas(bloques.filter(b => b.salida > b.entrada)).toFixed(1).replace('.0', '')} h por semana</b></p>
    </Modal>
  )
}

export function Vacio({ texto }: { texto: string }) {
  return (
    <div className="grid flex-1 place-items-center rounded-[18px] border border-dashed border-gray-300 bg-white p-10 text-center">
      <p className="max-w-sm text-sm text-gray-500">{texto}</p>
    </div>
  )
}
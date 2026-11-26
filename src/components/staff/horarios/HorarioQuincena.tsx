'use client'
// src/components/staff/horarios/HorarioQuincena.tsx
// Horario por quincena: el turno de cada persona día por día. Si se captura la quincena de alguien,
// manda sobre su horario fijo (un día sin turno es descanso) y el checador no lo deja entrar ese día.
import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2, Copy, RefreshCw, Search } from 'lucide-react'
import { backend } from '@/lib/backend'
import Modal, { inputCls, BotonNegro, BotonBlanco } from '@/components/staff/equipo/Modal'
import { NEGRO, grupo, puesto, nombreCompleto, iniciales, quitarAcentos } from '@/components/staff/equipo/util'

type Bloque = { entrada: string; salida: string }
const LETRA = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
const NOMBRE_DIA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const corta = (h: string) => { const [H, M] = h.split(':').map(Number); return `${H % 12 || 12}${M ? `:${String(M).padStart(2, '0')}` : ''}${H < 12 ? 'am' : 'pm'}` }   // "07:00" → "7am", "15:30" → "3:30pm"
const horas = (bs: Bloque[]) => bs.reduce((a, b) => {
  const [h1, m1] = b.entrada.split(':').map(Number), [h2, m2] = b.salida.split(':').map(Number)
  return a + Math.max(0, (h2 * 60 + m2 - h1 * 60 - m1) / 60)
}, 0)
const fmtH = (n: number) => `${Number(n.toFixed(1))} h`

function mover(inicio: string, paso: 1 | -1): string {
  const d = new Date(inicio + 'T12:00:00')
  if (paso === 1) return d.getDate() === 1 ? `${inicio.slice(0, 8)}16` : new Date(d.getFullYear(), d.getMonth() + 1, 1, 12).toISOString().slice(0, 10)
  return d.getDate() === 16 ? `${inicio.slice(0, 8)}01` : new Date(d.getFullYear(), d.getMonth() - 1, 16, 12).toISOString().slice(0, 10)
}
function etiqueta(inicio?: string, fin?: string) {
  if (!inicio || !fin) return ''
  const a = new Date(inicio + 'T12:00:00'), b = new Date(new Date(fin + 'T12:00:00').getTime() - 86400000)
  return `${a.getDate()} – ${b.getDate()} de ${b.toLocaleDateString('es-MX', { month: 'long' })}`
}

export default function HorarioQuincena({ staff, sucursalId, sucursalNombre }: { staff: any[]; sucursalId: string; sucursalNombre?: string }) {
  const [inicio, setInicio] = useState<string | null>(null)
  const [d, setD] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [editando, setEditando] = useState<any | null>(null)
  const [trabajando, setTrabajando] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setError(null)
    try {
      const r = await backend(`/staff-admin/turnos?sucursal_id=${sucursalId}${inicio ? `&inicio=${inicio}` : ''}`)
      setD(r); if (!inicio) setInicio(r.inicio)
    } catch (e: any) { setError(e.message) }
  }, [sucursalId, inicio])
  useEffect(() => { cargar() }, [cargar])
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(null), 4500); return () => clearTimeout(t) }, [aviso])

  const copiarTodos = async (origen: 'anterior' | 'fijo') => {
    const txt = origen === 'anterior' ? 'la quincena anterior (las mismas fechas de hace 2 semanas)' : 'su horario fijo'
    if (!confirm(`¿Copiar ${txt} a todos los que todavía no tienen capturada esta quincena? A quien ya la tenga no se le toca.`)) return
    setTrabajando(true); setError(null)
    try {
      const r = await backend('/staff-admin/turnos/copiar', { body: { sucursal_id: sucursalId, inicio: d.inicio, origen } })
      setAviso(`Listo: se copió a ${r.copiados} ${r.copiados === 1 ? 'persona' : 'personas'}.${r.omitidos_ya_capturados ? ` ${r.omitidos_ya_capturados} ya tenían su quincena y no se tocaron.` : ''}`)
      await cargar()
    } catch (e: any) { setError(e.message) }
    setTrabajando(false)
  }

  if (!d) return <div className="flex h-40 items-center justify-center gap-2 text-gray-400">{error ? <span className="text-rose-600">{error}</span> : <><RefreshCw size={15} className="animate-spin" /> Cargando…</>}</div>

  const q = quitarAcentos(busca)
  const lista = staff
    .filter(s => (s.estatus || 'Activo') === 'Activo' && grupo(s) !== 'coach')
    .filter(s => !q || quitarAcentos(nombreCompleto(s)).includes(q))
    .sort((a, b) => nombreCompleto(a).localeCompare(nombreCompleto(b), 'es'))
  const info = (sid: string) => d.personas[sid] || { modo: 'ninguno', dias: {}, horas: 0 }
  const sinHorario = lista.filter(s => info(s.id).modo === 'ninguno').length

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => { setD(null); setInicio(mover(d.inicio, -1)) }} className="rounded-xl border border-gray-200 bg-white p-2 text-gray-500 hover:text-gray-900"><ChevronLeft size={16} /></button>
          <b className="min-w-[180px] text-center text-[15px] font-black text-gray-900">{etiqueta(d.inicio, d.fin)}</b>
          <button onClick={() => { setD(null); setInicio(mover(d.inicio, 1)) }} className="rounded-xl border border-gray-200 bg-white p-2 text-gray-500 hover:text-gray-900"><ChevronRight size={16} /></button>
          {sinHorario > 0 && <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">{sinHorario} sin horario</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-52">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar persona…" className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-gray-400" />
          </div>
          <BotonBlanco onClick={() => copiarTodos('anterior')} disabled={trabajando}><Copy size={14} /> Quincena anterior a todos</BotonBlanco>
          <BotonBlanco onClick={() => copiarTodos('fijo')} disabled={trabajando}><Copy size={14} /> Horario fijo a todos</BotonBlanco>
        </div>
      </div>
      {error && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</p>}
      {aviso && <p className="rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">{aviso}</p>}

      <div className="min-h-0 flex-1 overflow-auto rounded-[18px] border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[1100px] table-fixed text-sm">
          <colgroup><col style={{ width: 210 }} />{d.dias.map((x: any) => <col key={x.fecha} />)}<col style={{ width: 80 }} /></colgroup>
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b border-gray-100 text-[10px] font-bold text-gray-400">
              <th className="px-3 py-2 text-left">Persona</th>
              {d.dias.map((x: any) => (
                <th key={x.fecha} className="px-0.5 py-2 text-center" title={x.festivo || undefined}>
                  <span className={x.festivo ? 'text-rose-600' : ''}>{LETRA[x.dia_semana]}</span>
                  <span className={`block text-[13px] ${x.festivo ? 'text-rose-600' : 'text-gray-900'}`}>{Number(x.fecha.slice(8))}</span>
                </th>
              ))}
              <th className="px-3 py-2 text-right">Horas</th>
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 && <tr><td colSpan={d.dias.length + 2} className="px-4 py-10 text-center text-gray-400">No hay staff en esta sucursal.</td></tr>}
            {lista.map(s => {
              const p = info(s.id)
              return (
                <tr key={s.id} onClick={() => setEditando(s)} className="cursor-pointer border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[11px] font-black text-white" style={{ background: NEGRO }}>{iniciales(s)}</span>
                      <div className="min-w-0">
                        <b className="block truncate text-[13px] text-gray-900">{nombreCompleto(s)}</b>
                        <p className="truncate text-[11px] text-gray-400">{puesto(s)} · {p.modo === 'quincena' ? 'quincena capturada' : p.modo === 'fijo' ? 'horario fijo' : 'sin horario'}</p>
                      </div>
                    </div>
                  </td>
                  {d.dias.map((x: any) => {
                    const bs: Bloque[] = p.dias[x.fecha] || []
                    return (
                      <td key={x.fecha} className="px-0.5 py-2 text-center">
                        {bs.length > 0
                          ? bs.map((b, i) => <span key={i} className="mb-0.5 block rounded-md px-0.5 py-0.5 text-[10px] font-extrabold text-white" style={{ background: NEGRO }}>{corta(b.entrada)}–{corta(b.salida)}</span>)
                          : p.modo === 'ninguno' ? <span className="text-gray-200">—</span>
                          : <span className="block rounded-md bg-[#F4F5F7] py-0.5 text-[10px] font-bold text-gray-400">Desc</span>}
                      </td>
                    )
                  })}
                  <td className="px-3 py-2 text-right font-black text-gray-900">
                    {p.modo === 'ninguno' ? <span className="text-xs font-bold text-amber-700">Sin horario</span> : fmtH(p.horas)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="border-t border-gray-100 px-4 py-2.5 text-xs text-gray-500">
          Clic en una persona para editar su quincena. Lo capturado aquí manda sobre su horario fijo. Los días sin turno son descanso: <b>el checador no deja entrar</b>.
        </p>
      </div>

      <EditorQuincena persona={editando} sucursalId={sucursalId} sucursalNombre={sucursalNombre} datos={d}
        onClose={() => setEditando(null)} onGuardado={msg => { setEditando(null); if (msg) setAviso(msg); cargar() }} />
    </div>
  )
}

function EditorQuincena({ persona, sucursalId, sucursalNombre, datos, onClose, onGuardado }: {
  persona: any | null; sucursalId: string; sucursalNombre?: string; datos: any; onClose: () => void; onGuardado: (msg?: string) => void
}) {
  const [dias, setDias] = useState<Record<string, Bloque[]>>({})
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const modo = persona ? (datos.personas[persona.id]?.modo || 'ninguno') : 'ninguno'

  useEffect(() => {
    if (!persona) return
    const base = datos.personas[persona.id]?.dias || {}
    setDias(Object.fromEntries(datos.dias.map((x: any) => [x.fecha, (base[x.fecha] || []).map((b: Bloque) => ({ ...b }))])))
    setError(null)
  }, [persona]) // eslint-disable-line react-hooks/exhaustive-deps

  // Semanas de lunes a domingo
  const semanas: (any | null)[][] = []
  let fila: (any | null)[] = Array((datos.dias[0]?.dia_semana + 6) % 7).fill(null)
  for (const x of datos.dias) {
    fila.push(x)
    if (fila.length === 7) { semanas.push(fila); fila = [] }
  }
  if (fila.length) semanas.push([...fila, ...Array(7 - fila.length).fill(null)])

  const cambiar = (f: string, i: number, k: keyof Bloque, v: string) => setDias(p => ({ ...p, [f]: p[f].map((b, j) => j === i ? { ...b, [k]: v } : b) }))
  const agregar = (f: string) => setDias(p => {
    const prev = p[f] || [], ult = prev[prev.length - 1]
    return { ...p, [f]: [...prev, ult ? { entrada: ult.salida, salida: ult.salida < '21:00' ? '21:00' : '23:00' } : { entrada: '07:00', salida: '15:00' }] }
  })
  const quitar = (f: string, i: number) => setDias(p => ({ ...p, [f]: p[f].filter((_, j) => j !== i) }))
  const semana1a2 = () => setDias(p => {
    const n = { ...p }
    for (const x of datos.dias) {
      const atras = new Date(new Date(x.fecha + 'T12:00:00').getTime() - 7 * 86400000).toISOString().slice(0, 10)
      if (atras >= datos.inicio && p[atras]) n[x.fecha] = p[atras].map(b => ({ ...b }))
    }
    return n
  })

  const accion = async (fn: () => Promise<any>, msg?: string) => {
    setGuardando(true); setError(null)
    try { await fn(); onGuardado(msg) } catch (e: any) { setError(e.message) }
    setGuardando(false)
  }
  const invalido = Object.values(dias).some(bs => bs.some(b => !b.entrada || !b.salida || b.salida <= b.entrada))
  const total = Object.values(dias).reduce((a, bs) => a + horas(bs), 0)
  const conTurno = Object.values(dias).filter(bs => bs.length).length

  return (
    <Modal abierto={!!persona} onClose={onClose} ancho="max-w-5xl"
      titulo={persona ? `Quincena de ${nombreCompleto(persona)}` : ''}
      subtitulo={`${sucursalNombre || ''} · ${etiqueta(datos.inicio, datos.fin)} · solo aplica a estas fechas${modo === 'quincena' ? ' · ya capturada' : modo === 'fijo' ? ' · hoy usa su horario fijo' : ''}`}
      pie={<>
        {error && <p className="mr-auto text-sm font-semibold text-rose-600">{error}</p>}
        {!error && <p className="mr-auto text-sm text-gray-500">Total: <b className="text-gray-900">{fmtH(total)}</b> · {conTurno} {conTurno === 1 ? 'día' : 'días'}</p>}
        <BotonBlanco onClick={onClose}>Cancelar</BotonBlanco>
        <BotonNegro disabled={guardando || invalido} onClick={() => accion(() => backend(`/staff-admin/turnos/${persona.id}`, { method: 'PUT', body: { sucursal_id: sucursalId, inicio: datos.inicio, dias } }), 'Quincena guardada.')}>
          {guardando ? 'Guardando…' : 'Guardar quincena'}
        </BotonNegro>
      </>}>
      <div className="mb-3 flex flex-wrap gap-2">
        <BotonBlanco className="!py-2 text-xs" disabled={guardando}
          onClick={() => accion(() => backend('/staff-admin/turnos/copiar', { body: { sucursal_id: sucursalId, inicio: datos.inicio, origen: 'fijo', staff_id: persona.id } }), 'Se copió su horario fijo a la quincena.')}>
          <Copy size={13} /> Copiar horario fijo
        </BotonBlanco>
        <BotonBlanco className="!py-2 text-xs" onClick={semana1a2}><Copy size={13} /> Copiar semana 1 → semana 2</BotonBlanco>
        <BotonBlanco className="!py-2 text-xs" disabled={guardando}
          onClick={() => accion(() => backend('/staff-admin/turnos/copiar', { body: { sucursal_id: sucursalId, inicio: datos.inicio, origen: 'anterior', staff_id: persona.id } }), 'Se copió la quincena anterior.')}>
          <Copy size={13} /> Copiar quincena anterior
        </BotonBlanco>
        <BotonBlanco className="!py-2 text-xs" onClick={() => setDias(p => Object.fromEntries(Object.keys(p).map(k => [k, []])))}>Todo descanso</BotonBlanco>
        {modo === 'quincena' && (
          <BotonBlanco className="!py-2 text-xs !text-rose-600" disabled={guardando}
            onClick={() => { if (confirm('¿Quitar la captura de esta quincena? Volverá a usar su horario fijo.')) accion(() => backend(`/staff-admin/turnos/${persona.id}?sucursal_id=${sucursalId}&inicio=${datos.inicio}`, { method: 'DELETE' }), 'Volvió a su horario fijo.') }}>
            Usar horario fijo
          </BotonBlanco>
        )}
      </div>
      <div className="space-y-2">
        {semanas.map((sem, si) => (
          <div key={si}>
            <p className="mb-1 text-[11px] font-black text-gray-500">SEMANA {si + 1}</p>
            <div className="grid grid-cols-7 gap-1.5">
              {sem.map((x, i) => !x ? <div key={i} /> : (
                <div key={x.fecha} className={`min-h-[96px] rounded-xl p-1.5 ${x.festivo ? 'bg-rose-50' : 'bg-[#F4F5F7]'}`}>
                  <p className="text-[11px] font-black text-gray-800">{NOMBRE_DIA[x.dia_semana]} <span className={x.festivo ? 'text-rose-600' : 'text-gray-400'}>{Number(x.fecha.slice(8))}</span></p>
                  {x.festivo && <p className="truncate text-[9px] font-bold text-rose-600" title={x.festivo}>{x.festivo}</p>}
                  {(dias[x.fecha] || []).length === 0 && <p className="mt-2 text-center text-[11px] text-gray-400">Descansa</p>}
                  {(dias[x.fecha] || []).map((b, j) => (
                    <div key={j} className="mt-1 rounded-lg bg-white p-1">
                      <input type="time" value={b.entrada} onChange={e => cambiar(x.fecha, j, 'entrada', e.target.value)} className={`${inputCls} !px-1 !py-0.5 text-[11px]`} />
                      <input type="time" value={b.salida} onChange={e => cambiar(x.fecha, j, 'salida', e.target.value)}
                        className={`${inputCls} mt-0.5 !px-1 !py-0.5 text-[11px] ${b.salida && b.salida <= b.entrada ? '!border-rose-400' : ''}`} />
                      <button onClick={() => quitar(x.fecha, j)} className="mt-0.5 flex w-full items-center justify-center gap-1 text-[10px] font-bold text-gray-400 hover:text-rose-600"><Trash2 size={10} /> Quitar</button>
                    </div>
                  ))}
                  <button onClick={() => agregar(x.fecha)} className="mt-1 flex w-full items-center justify-center gap-0.5 text-[11px] font-bold text-gray-500 hover:text-gray-900"><Plus size={11} /> turno</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}
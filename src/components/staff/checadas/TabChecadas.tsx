'use client'
// src/components/staff/checadas/TabChecadas.tsx
// Historial de entradas y salidas, checada manual (Managers y Dirección), anular (solo Dirección)
// y bitácora de faltas y retardos (no descuenta nada: es para que Dirección decida).
import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, RefreshCw, Ban, AlertTriangle, Pencil } from 'lucide-react'
import { backend } from '@/lib/backend'
import Modal, { inputCls, BotonNegro, BotonBlanco } from '@/components/staff/equipo/Modal'
import { NEGRO, TZ, nombreCompleto, diaHora, quitarAcentos } from '@/components/staff/equipo/util'

type Vista = 'checadas' | 'bitacora'
const ESTADOS: Record<string, { txt: string; cls: string }> = {
  confirmada: { txt: 'Confirmada', cls: 'bg-emerald-100 text-emerald-700' },
  automatica: { txt: 'Automática', cls: 'bg-sky-100 text-sky-700' },
  manual:     { txt: 'Manual',     cls: 'bg-amber-100 text-amber-800' },
  pendiente:  { txt: 'Pendiente',  cls: 'bg-gray-100 text-gray-500' },
  rechazada:  { txt: 'Anulada',    cls: 'bg-rose-100 text-rose-700' },
}
const fechaLocal = (d = new Date()) => d.toLocaleDateString('en-CA', { timeZone: TZ })   // YYYY-MM-DD

export default function TabChecadas({ staff, sucursalId, direccion }: { staff: any[]; sucursalId: string | null; direccion: boolean }) {
  const [vista, setVista] = useState<Vista>('checadas')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [persona, setPersona] = useState('')
  const [datos, setDatos] = useState<any>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [manual, setManual] = useState(false)
  const [anulando, setAnulando] = useState<any | null>(null)
  const [tolerancia, setTolerancia] = useState(false)

  const cargar = useCallback(async () => {
    setCargando(true); setError(null)
    const p = new URLSearchParams()
    if (sucursalId) p.set('sucursal_id', sucursalId)
    if (desde && hasta) { p.set('desde', desde); p.set('hasta', hasta) }
    if (persona && vista === 'checadas') p.set('staff_id', persona)
    try {
      const d = await backend(`/staff-admin/${vista === 'checadas' ? 'checadas' : 'bitacora'}?${p}`)
      setDatos(d)
      if (!desde) { setDesde(d.desde); setHasta(d.hasta) }
    } catch (e: any) { setError(e.message) }
    setCargando(false)
  }, [sucursalId, desde, hasta, persona, vista])
  useEffect(() => { cargar() }, [cargar])

  const activos = staff.filter(s => (s.estatus || 'Activo') === 'Activo').sort((a, b) => nombreCompleto(a).localeCompare(nombreCompleto(b), 'es'))

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-gray-200 bg-white p-0.5">
            {([['checadas', 'Entradas y salidas'], ['bitacora', 'Faltas y retardos']] as [Vista, string][]).map(([v, l]) => (
              <button key={v} onClick={() => { setVista(v); setDatos(null) }}
                className={`rounded-lg px-3 py-1.5 text-[13px] font-bold transition ${vista === v ? 'bg-[#171B24] text-white' : 'text-gray-500 hover:text-gray-800'}`}>{l}</button>
            ))}
          </div>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm" />
          <span className="text-gray-400">a</span>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm" />
          {vista === 'checadas' && (
            <select value={persona} onChange={e => setPersona(e.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm">
              <option value="">Todas las personas</option>
              {activos.map(s => <option key={s.id} value={s.id}>{nombreCompleto(s)}</option>)}
            </select>
          )}
        </div>
        <div className="flex items-center gap-2">
          {vista === 'bitacora' && datos && (
            <button onClick={() => direccion && setTolerancia(true)}
              className={`flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 ${direccion ? 'hover:bg-gray-50' : 'cursor-default'}`}>
              Tolerancia: {datos.tolerancia} min {direccion && <Pencil size={11} />}
            </button>
          )}
          <BotonNegro onClick={() => setManual(true)} disabled={!sucursalId} title={!sucursalId ? 'Elige una sucursal arriba' : undefined}>
            <Plus size={15} /> Checada manual
          </BotonNegro>
        </div>
      </div>
      {error && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</p>}

      {cargando || !datos ? (
        <div className="flex h-40 items-center justify-center gap-2 rounded-[18px] border border-gray-200 bg-white text-gray-400"><RefreshCw size={15} className="animate-spin" /> Cargando…</div>
      ) : vista === 'checadas' ? (
        <ListaChecadas filas={datos.checadas || []} direccion={direccion} onAnular={setAnulando} />
      ) : (
        <Bitacora datos={datos} />
      )}

      <ModalManual abierto={manual} staff={activos} sucursalId={sucursalId} onClose={() => setManual(false)}
        onListo={() => { setManual(false); cargar() }} />
      <ModalAnular checada={anulando} onClose={() => setAnulando(null)} onListo={() => { setAnulando(null); cargar() }} />
      <ModalTolerancia abierto={tolerancia} actual={datos?.tolerancia} onClose={() => setTolerancia(false)}
        onListo={() => { setTolerancia(false); cargar() }} />
    </div>
  )
}

function ListaChecadas({ filas, direccion, onAnular }: { filas: any[]; direccion: boolean; onAnular: (c: any) => void }) {
  return (
    <div className="min-h-0 flex-1 overflow-auto rounded-[18px] border border-gray-200 bg-white shadow-sm">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="sticky top-0 z-10 bg-white">
          <tr className="border-b border-gray-100 text-left text-[11px] font-bold text-gray-400">
            <th className="px-4 py-3">Fecha y hora</th><th className="px-4 py-3">Persona</th><th className="px-4 py-3">Sucursal</th>
            <th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Quién</th><th className="px-4 py-3">Motivo</th><th />
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">Sin checadas en este rango.</td></tr>}
          {filas.map(c => {
            const e = ESTADOS[c.estado] || ESTADOS.pendiente
            return (
              <tr key={c.id} className={`border-b border-gray-50 ${c.estado === 'rechazada' ? 'opacity-60' : ''}`}>
                <td className="whitespace-nowrap px-4 py-2.5 text-gray-700">{diaHora(c.hora)}</td>
                <td className="px-4 py-2.5 font-bold text-gray-900">{c.nombre}</td>
                <td className="px-4 py-2.5 text-gray-500">{c.sucursal}</td>
                <td className="px-4 py-2.5 capitalize text-gray-700">{c.tipo}</td>
                <td className="px-4 py-2.5"><span className={`rounded-lg px-2 py-0.5 text-[11px] font-bold ${e.cls}`}>{e.txt}</span></td>
                <td className="px-4 py-2.5 text-xs text-gray-500">{c.capturo ? `Capturó ${c.capturo}` : c.confirmo ? `Confirmó ${c.confirmo}` : '—'}</td>
                <td className="max-w-[240px] truncate px-4 py-2.5 text-xs text-gray-500" title={c.motivo || ''}>{c.motivo || '—'}</td>
                <td className="px-3 py-2.5 text-right">
                  {direccion && c.estado !== 'rechazada' && (
                    <button onClick={() => onAnular(c)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-gray-400 hover:bg-rose-50 hover:text-rose-600">
                      <Ban size={12} /> Anular
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Bitacora({ datos }: { datos: any }) {
  const personas: any[] = datos.personas || []
  const inc: any[] = datos.incidencias || []
  const TIPOS: Record<string, { txt: string; cls: string }> = {
    falta: { txt: 'Falta', cls: 'bg-rose-100 text-rose-700' },
    retardo: { txt: 'Retardo', cls: 'bg-amber-100 text-amber-800' },
    festivo_trabajado: { txt: 'Festivo trabajado', cls: 'bg-indigo-100 text-indigo-700' },
  }
  if (!inc.length) return (
    <div className="grid flex-1 place-items-center rounded-[18px] border border-gray-200 bg-white p-10 text-center">
      <div><p className="text-lg font-black text-gray-900">Sin faltas ni retardos</p>
        <p className="mt-1 text-sm text-gray-500">Solo se revisa a quien tiene horario capturado.</p></div>
    </div>
  )
  return (
    <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[1fr_1.4fr]">
      <div className="min-h-0 overflow-auto rounded-[18px] border border-gray-200 bg-white p-4 shadow-sm">
        <p className="mb-2 text-sm font-black text-gray-900">Por persona</p>
        {personas.map((p, i) => (
          <motion.div key={p.staff_id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 15) * 0.02 }}
            className="flex items-center justify-between border-b border-gray-100 py-2.5 text-sm last:border-0">
            <b className="text-gray-900">{p.nombre}</b>
            <span className="flex gap-1.5 text-[11px] font-bold">
              {p.faltas > 0 && <span className="rounded-lg bg-rose-100 px-2 py-0.5 text-rose-700">{p.faltas} falta{p.faltas === 1 ? '' : 's'}</span>}
              {p.retardos > 0 && <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-amber-800">{p.retardos} retardo{p.retardos === 1 ? '' : 's'} · {p.minutos_tarde} min</span>}
              {p.festivos_trabajados > 0 && <span className="rounded-lg bg-indigo-100 px-2 py-0.5 text-indigo-700">{p.festivos_trabajados} festivo{p.festivos_trabajados === 1 ? '' : 's'}</span>}
            </span>
          </motion.div>
        ))}
        <p className="mt-3 flex gap-1.5 text-[11px] text-gray-400"><AlertTriangle size={12} className="shrink-0" /> No se descuenta nada en automático: Dirección decide la sanción.</p>
      </div>
      <div className="min-h-0 overflow-auto rounded-[18px] border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b border-gray-100 text-left text-[11px] font-bold text-gray-400">
              <th className="px-4 py-3">Día</th><th className="px-4 py-3">Persona</th><th className="px-4 py-3">Incidencia</th>
              <th className="px-4 py-3">Entrada</th><th className="px-4 py-3">Llegó</th>
            </tr>
          </thead>
          <tbody>
            {inc.map((i, k) => {
              const t = TIPOS[i.tipo]
              return (
                <tr key={k} className="border-b border-gray-50">
                  <td className="whitespace-nowrap px-4 py-2.5 text-gray-700">{new Date(i.fecha + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                  <td className="px-4 py-2.5"><b className="text-gray-900">{i.nombre}</b><p className="text-xs text-gray-400">{i.sucursal}</p></td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-lg px-2 py-0.5 text-[11px] font-bold ${t.cls}`}>{t.txt}{i.tipo === 'retardo' ? ` · ${i.minutos} min` : ''}</span>
                    {i.detalle && <p className="mt-0.5 text-xs text-gray-400">{i.detalle}</p>}
                  </td>
                  <td className="px-4 py-2.5 text-gray-700">{i.programada}</td>
                  <td className="px-4 py-2.5 text-gray-700">{i.llegada ? new Date(i.llegada).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: TZ }) : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ModalManual({ abierto, staff, sucursalId, onClose, onListo }: { abierto: boolean; staff: any[]; sucursalId: string | null; onClose: () => void; onListo: () => void }) {
  const [f, setF] = useState({ staff_id: '', tipo: 'entrada', fecha: '', hora: '', motivo: 'No trajo celular' })
  const [busca, setBusca] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!abierto) return
    const ahora = new Date()
    setF({ staff_id: '', tipo: 'entrada', fecha: fechaLocal(ahora),
           hora: ahora.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TZ }), motivo: 'No trajo celular' })
    setBusca(''); setError(null)
  }, [abierto])

  const q = quitarAcentos(busca)
  const opciones = staff.filter(s => !q || quitarAcentos(nombreCompleto(s)).includes(q)).slice(0, 8)
  const elegido = staff.find(s => s.id === f.staff_id)
  const listo = f.staff_id && f.fecha && f.hora && f.motivo.trim().length >= 5

  const guardar = async () => {
    setGuardando(true); setError(null)
    try {
      // La hora capturada es hora de CDMX (UTC-6)
      await backend('/staff-admin/checada-manual', { body: {
        staff_id: f.staff_id, sucursal_id: sucursalId, tipo: f.tipo, motivo: f.motivo,
        hora: `${f.fecha}T${f.hora}:00-06:00`,
      } })
      onListo()
    } catch (e: any) { setError(e.message) }
    setGuardando(false)
  }

  return (
    <Modal abierto={abierto} onClose={onClose} titulo="Checada manual" subtitulo="Para cuando alguien no trae celular. Queda registrada con tu nombre y el motivo."
      pie={<>
        {error && <p className="mr-auto text-sm font-semibold text-rose-600">{error}</p>}
        <BotonBlanco onClick={onClose}>Cancelar</BotonBlanco>
        <BotonNegro onClick={guardar} disabled={!listo || guardando}>{guardando ? 'Guardando…' : 'Registrar'}</BotonNegro>
      </>}>
      <div className="space-y-4">
        <div>
          <p className="mb-1 text-xs font-bold text-gray-500">Persona</p>
          {elegido ? (
            <div className="flex items-center justify-between rounded-xl border border-gray-200 px-3.5 py-2.5">
              <b className="text-sm text-gray-900">{nombreCompleto(elegido)}</b>
              <button onClick={() => setF({ ...f, staff_id: '' })} className="text-xs font-bold text-gray-500 hover:text-gray-900">Cambiar</button>
            </div>
          ) : (
            <>
              <input autoFocus value={busca} onChange={e => setBusca(e.target.value)} placeholder="Escribe su nombre…" className={inputCls} />
              <div className="mt-1.5 space-y-1">
                {opciones.map(s => (
                  <button key={s.id} onClick={() => setF({ ...f, staff_id: s.id })}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100">{nombreCompleto(s)}</button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="mb-1 text-xs font-bold text-gray-500">Tipo</p>
            <div className="flex rounded-xl border border-gray-200 p-0.5">
              {['entrada', 'salida'].map(t => (
                <button key={t} onClick={() => setF({ ...f, tipo: t })}
                  className={`flex-1 rounded-lg py-1.5 text-[13px] font-bold capitalize ${f.tipo === t ? 'text-white' : 'text-gray-500'}`}
                  style={f.tipo === t ? { background: NEGRO } : undefined}>{t}</button>
              ))}
            </div>
          </div>
          <div><p className="mb-1 text-xs font-bold text-gray-500">Fecha</p><input type="date" value={f.fecha} onChange={e => setF({ ...f, fecha: e.target.value })} className={inputCls} /></div>
          <div><p className="mb-1 text-xs font-bold text-gray-500">Hora</p><input type="time" value={f.hora} onChange={e => setF({ ...f, hora: e.target.value })} className={inputCls} /></div>
        </div>
        <div>
          <p className="mb-1 text-xs font-bold text-gray-500">Motivo</p>
          <input value={f.motivo} onChange={e => setF({ ...f, motivo: e.target.value })} className={inputCls} />
          <p className="mt-1 text-[11px] text-gray-400">Un Manager puede capturar hasta 48 horas atrás. Para fechas anteriores, Dirección.</p>
        </div>
      </div>
    </Modal>
  )
}

function ModalAnular({ checada, onClose, onListo }: { checada: any | null; onClose: () => void; onListo: () => void }) {
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { setMotivo(''); setError(null) }, [checada])
  const anular = async () => {
    setGuardando(true); setError(null)
    try { await backend(`/staff-admin/checadas/${checada.id}/anular`, { body: { motivo } }); onListo() }
    catch (e: any) { setError(e.message) }
    setGuardando(false)
  }
  return (
    <Modal abierto={!!checada} onClose={onClose} titulo="Anular checada"
      subtitulo={checada ? `${checada.nombre} · ${checada.tipo} · ${diaHora(checada.hora)}` : ''}
      pie={<>
        {error && <p className="mr-auto text-sm font-semibold text-rose-600">{error}</p>}
        <BotonBlanco onClick={onClose}>Cancelar</BotonBlanco>
        <button onClick={anular} disabled={motivo.trim().length < 5 || guardando}
          className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-40">{guardando ? 'Anulando…' : 'Anular'}</button>
      </>}>
      <p className="mb-3 text-sm text-gray-600">La checada no se borra: queda como anulada y el motivo se guarda en la bitácora de correcciones, con tu nombre.</p>
      <p className="mb-1 text-xs font-bold text-gray-500">Motivo</p>
      <input autoFocus value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej. Checó por error en otra sucursal" className={inputCls} />
    </Modal>
  )
}

function ModalTolerancia({ abierto, actual, onClose, onListo }: { abierto: boolean; actual?: number; onClose: () => void; onListo: () => void }) {
  const [min, setMin] = useState(String(actual ?? 10))
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { setMin(String(actual ?? 10)); setError(null) }, [abierto, actual])
  const guardar = async () => {
    try { await backend('/staff-admin/config', { method: 'PUT', body: { tolerancia_retardo_min: Number(min) } }); onListo() }
    catch (e: any) { setError(e.message) }
  }
  return (
    <Modal abierto={abierto} onClose={onClose} titulo="Tolerancia de retardo" ancho="max-w-sm"
      pie={<>{error && <p className="mr-auto text-sm font-semibold text-rose-600">{error}</p>}
        <BotonBlanco onClick={onClose}>Cancelar</BotonBlanco><BotonNegro onClick={guardar}>Guardar</BotonNegro></>}>
      <p className="mb-3 text-sm text-gray-600">Minutos después de su hora de entrada antes de contar como retardo.</p>
      <div className="flex items-center gap-2">
        <input type="number" min={0} max={120} value={min} onChange={e => setMin(e.target.value)} className={`${inputCls} w-28`} />
        <span className="text-sm text-gray-500">minutos</span>
      </div>
    </Modal>
  )
}
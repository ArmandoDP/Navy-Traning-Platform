'use client'
// src/components/staff/quincena/TabQuincena.tsx
// La quincena: cuánto se le paga a cada quien, qué falta revisar, aprobación por sucursal,
// bonos y descuentos manuales, recálculo, cierre (congela los montos) y Excel de prenómina.
import { Fragment, useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, ChevronDown, Download, RefreshCw, Lock, CheckCircle2, AlertTriangle, Plus, Ban } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { backend, BACKEND_URL } from '@/lib/backend'
import Modal, { inputCls, BotonNegro, BotonBlanco } from '@/components/staff/equipo/Modal'
import { NEGRO, diaHora } from '@/components/staff/equipo/util'

const $ = (n?: number | null) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const ESTADO: Record<string, { txt: string; cls: string }> = {
  impartida: { txt: 'Pagada', cls: 'bg-emerald-100 text-emerald-700' },
  sin_checar: { txt: 'Sin checar', cls: 'bg-amber-100 text-amber-800' },
  revisar: { txt: 'Por revisar', cls: 'bg-amber-100 text-amber-800' },
}
const AVISOS: Record<string, string> = { sin_sueldo: 'Sin sueldo', sin_nivel: 'Sin nivel', sin_tarifa_hora: 'Sin tarifa', ingreso_en_quincena: 'Ingresó en la quincena', inactivo_con_checadas: 'Inactivo' }

function moverQuincena(inicio: string, paso: 1 | -1): string {
  const d = new Date(inicio + 'T12:00:00')
  if (paso === 1) return d.getDate() === 1 ? `${inicio.slice(0, 8)}16` : new Date(d.getFullYear(), d.getMonth() + 1, 1, 12).toISOString().slice(0, 10)
  return d.getDate() === 16 ? `${inicio.slice(0, 8)}01` : new Date(d.getFullYear(), d.getMonth() - 1, 16, 12).toISOString().slice(0, 10)
}
function etiqueta(inicio?: string, fin?: string) {
  if (!inicio || !fin) return ''
  const a = new Date(inicio + 'T12:00:00'), b = new Date(new Date(fin + 'T12:00:00').getTime() - 86400000)
  return `${a.getDate()} – ${b.getDate()} de ${b.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}`
}

export default function TabQuincena({ sucursalId, direccion }: { sucursalId: string | null; direccion: boolean }) {
  const [inicio, setInicio] = useState<string | null>(null)
  const [d, setD] = useState<any>(null)
  const [vista, setVista] = useState<'coaches' | 'staff'>('coaches')
  const [abierto, setAbierto] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [trabajando, setTrabajando] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [resolver, setResolver] = useState<any | null>(null)
  const [ajuste, setAjuste] = useState<any | null>(null)
  const [cerrar, setCerrar] = useState(false)

  const cargar = useCallback(async () => {
    setError(null)
    const p = new URLSearchParams()
    if (inicio) p.set('inicio', inicio)
    if (sucursalId) p.set('sucursal_id', sucursalId)
    try {
      const r = await backend(`/staff-admin/quincena?${p}`)
      setD(r)
      if (!inicio) setInicio(r.inicio)
    } catch (e: any) { setError(e.message) }
  }, [inicio, sucursalId])
  useEffect(() => { cargar() }, [cargar])
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(null), 4500); return () => clearTimeout(t) }, [aviso])

  const accion = async (nombre: string, fn: () => Promise<any>, ok?: (r: any) => string) => {
    setTrabajando(nombre); setError(null)
    try { const r = await fn(); if (ok) setAviso(ok(r)); await cargar() } catch (e: any) { setError(e.message) }
    setTrabajando(null)
  }

  const descargar = async () => {
    setTrabajando('excel')
    try {
      const { data } = await supabase.auth.getSession()
      const p = new URLSearchParams({ inicio: d.inicio }); if (sucursalId) p.set('sucursal_id', sucursalId)
      const r = await fetch(`${BACKEND_URL}/staff-admin/quincena/excel?${p}`, { headers: { Authorization: `Bearer ${data.session?.access_token}` } })
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || `Error ${r.status}`)
      const a = document.createElement('a')
      a.href = URL.createObjectURL(await r.blob())
      a.download = `prenomina-navy-${d.inicio}.xlsx`
      a.click()
    } catch (e: any) { setError(e.message) }
    setTrabajando(null)
  }

  if (!d) return (
    <div className="flex h-40 items-center justify-center gap-2 text-gray-400">
      {error ? <span className="text-rose-600">{error}</span> : <><RefreshCw size={15} className="animate-spin" /> Calculando la quincena…</>}
    </div>
  )

  const cerrada = d.estado === 'cerrada'
  const lista = vista === 'coaches' ? d.coaches : d.staff
  const aprobada = (sid: string) => d.aprobaciones.find((a: any) => a.sucursal_id === sid)
  const faltanAprob = d.sucursales.filter((s: any) => !aprobada(s.id))

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-2">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => { setD(null); setInicio(moverQuincena(d.inicio, -1)) }} className="rounded-xl border border-gray-200 bg-white p-2 text-gray-500 hover:text-gray-900"><ChevronLeft size={16} /></button>
          <b className="min-w-[230px] text-center text-lg font-black text-gray-900">{etiqueta(d.inicio, d.fin)}</b>
          <button onClick={() => { setD(null); setInicio(moverQuincena(d.inicio, 1)) }} className="rounded-xl border border-gray-200 bg-white p-2 text-gray-500 hover:text-gray-900"><ChevronRight size={16} /></button>
          {cerrada
            ? <span className="flex items-center gap-1.5 rounded-xl bg-[#171B24] px-3 py-1.5 text-xs font-bold text-white"><Lock size={12} /> Cerrada{d.cerrada_por ? ` por ${d.cerrada_por}` : ''}</span>
            : <span className="rounded-xl bg-sky-100 px-3 py-1.5 text-xs font-bold text-sky-700">{d.en_curso ? 'En curso' : 'Abierta'}</span>}
        </div>
        <div className="flex gap-2">
          {direccion && !cerrada && (
            <BotonBlanco onClick={() => accion('recalcular', () => backend('/staff-admin/quincena/recalcular', { body: { inicio: d.inicio } }),
              r => `Listo: ${r.recalculadas} clases recalculadas${r.resueltas_a_mano ? ` (${r.resueltas_a_mano} resueltas a mano no se tocaron)` : ''}.`)}
              disabled={!!trabajando}>
              <RefreshCw size={14} className={trabajando === 'recalcular' ? 'animate-spin' : ''} /> Recalcular
            </BotonBlanco>
          )}
          <BotonBlanco onClick={descargar} disabled={!!trabajando}><Download size={14} /> {trabajando === 'excel' ? 'Generando…' : 'Excel'}</BotonBlanco>
          {direccion && !cerrada && (
            <BotonNegro onClick={() => setCerrar(true)} disabled={!!trabajando}><Lock size={14} /> Cerrar quincena</BotonNegro>
          )}
        </div>
      </div>
      {error && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</p>}
      <AnimatePresence>{aviso && (
        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">{aviso}</motion.p>
      )}</AnimatePresence>

      {/* Totales */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi t="Total a pagar" v={$(d.totales.total)} s={`${d.totales.personas} personas`} negro />
        <Kpi t="Coaches" v={$(d.totales.coaches)} s={`${d.totales.clases} clases pagadas`} />
        <Kpi t="Staff" v={$(d.totales.staff)} s={d.totales.festivos ? `incluye ${$(d.totales.festivos)} de festivos` : 'sueldos y horas'} />
        <Kpi t="Por revisar" v={String(d.pendientes.length)} s={d.pendientes.length ? 'bloquean el cierre' : 'Todo en orden'} alerta={d.pendientes.length > 0} />
      </div>

      {/* Aprobaciones por sucursal */}
      {d.sucursales.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-[18px] border border-gray-200 bg-white px-4 py-3">
          <span className="mr-1 text-sm font-bold text-gray-900">Aprobación del gerente:</span>
          {d.sucursales.map((s: any) => {
            const a = aprobada(s.id)
            return a ? (
              <span key={s.id} title={`${a.por} · ${diaHora(a.at)}`} className="flex items-center gap-1.5 rounded-xl bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700">
                <CheckCircle2 size={13} /> {s.nombre}
                {direccion && !cerrada && <button onClick={() => accion('desaprobar', () => backend('/staff-admin/quincena/desaprobar', { body: { inicio: d.inicio, sucursal_id: s.id } }))}
                  className="ml-1 text-emerald-600/60 hover:text-rose-600">✕</button>}
              </span>
            ) : (
              <button key={s.id} disabled={cerrada || !!trabajando}
                onClick={() => accion('aprobar', () => backend('/staff-admin/quincena/aprobar', { body: { inicio: d.inicio, sucursal_id: s.id } }), () => `${s.nombre} aprobada.`)}
                className="rounded-xl border border-dashed border-gray-300 px-3 py-1.5 text-xs font-bold text-gray-600 hover:border-gray-500 hover:text-gray-900 disabled:opacity-50">
                Aprobar {s.nombre}
              </button>
            )
          })}
        </div>
      )}

      {/* Pendientes */}
      {d.pendientes.length > 0 && !cerrada && (
        <div className="rounded-[18px] border border-amber-200 bg-amber-50 p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-black text-amber-900"><AlertTriangle size={15} /> Antes de cerrar hay que resolver esto ({d.pendientes.length})</p>
          <div className="max-h-56 space-y-1.5 overflow-y-auto">
            {d.pendientes.map((p: any, i: number) => (
              <div key={i} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-sm">
                <div className="min-w-0">
                  <b className="text-gray-900">{p.persona}</b> <span className="text-gray-600">· {p.texto}</span>
                  {p.horario && <span className="text-gray-400"> · {diaHora(p.horario)}</span>}
                  {p.motivo && <p className="truncate text-xs text-gray-500">{p.motivo}</p>}
                </div>
                {p.tipo === 'clase' && direccion
                  ? <button onClick={() => setResolver(p)} className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold text-gray-700 hover:bg-gray-100">Resolver</button>
                  : <span className="shrink-0 text-[11px] text-gray-400">{
                      p.tipo === 'sin_sueldo' ? 'Captúralo en Tarifas o en su perfil' : p.tipo === 'sin_nivel' ? 'Ponle nivel en su perfil'
                      : p.tipo === 'sin_tarifa_hora' ? 'Ponle tarifa en su perfil' : p.tipo === 'checada_pendiente' ? 'Confírmala en el checador' : 'Dirección la resuelve'}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="flex rounded-xl border border-gray-200 bg-white p-0.5 self-start">
        {([['coaches', `Coaches (${d.coaches.length})`], ['staff', `Staff (${d.staff.length})`]] as const).map(([v, l]) => (
          <button key={v} onClick={() => setVista(v)} className={`rounded-lg px-3 py-1.5 text-[13px] font-bold ${vista === v ? 'bg-[#171B24] text-white' : 'text-gray-500'}`}>{l}</button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-[18px] border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-[11px] font-bold text-gray-400">
              <th className="w-8" /><th className="px-3 py-3">Persona</th>
              {vista === 'coaches' ? <>
                <th className="px-3 py-3">Clases</th><th className="px-3 py-3">Suplencias</th><th className="px-3 py-3">Asist. prom.</th>
                <th className="px-3 py-3 text-right">Clases $</th><th className="px-3 py-3 text-right">Bonos</th>
              </> : <>
                <th className="px-3 py-3">Días · horas</th><th className="px-3 py-3">Faltas / retardos</th>
                <th className="px-3 py-3 text-right">Sueldo</th><th className="px-3 py-3 text-right">Festivos</th>
              </>}
              <th className="px-3 py-3 text-right">Ajustes</th><th className="px-3 py-3 text-right">Total</th><th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {lista.length === 0 && <tr><td colSpan={10} className="px-4 py-10 text-center text-gray-400">Nadie en esta quincena.</td></tr>}
            {lista.map((p: any) => {
              const abierta = abierto === p.staff_id
              return (
                <Fragment key={p.staff_id}>
                  <tr onClick={() => setAbierto(abierta ? null : p.staff_id)} className="cursor-pointer border-b border-gray-50 hover:bg-gray-50">
                    <td className="pl-3"><ChevronDown size={14} className={`text-gray-400 transition ${abierta ? 'rotate-180' : ''}`} /></td>
                    <td className="px-3 py-2.5">
                      <b className="text-gray-900">{p.nombre}</b>
                      <p className="text-xs text-gray-400">{p.puesto === 'Front' ? 'Front Desk' : p.puesto}{p.nivel ? ` · ${p.nivel}` : ''} · {p.sucursal || '—'}</p>
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {(p.avisos || []).map((a: string) => <span key={a} className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">{AVISOS[a] || a}</span>)}
                        {p.por_revisar > 0 && <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">{p.por_revisar} por revisar</span>}
                      </div>
                    </td>
                    {vista === 'coaches' ? <>
                      <td className="px-3 py-2.5 font-bold text-gray-900">{p.clases}</td>
                      <td className="px-3 py-2.5 text-gray-600">{p.suplencias || '—'}</td>
                      <td className="px-3 py-2.5 text-gray-600">{p.asistentes_promedio ?? '—'}</td>
                      <td className="px-3 py-2.5 text-right text-gray-700">{$(p.monto_clases)}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-emerald-700">{p.bonos ? `+${$(p.bonos)}` : '—'}</td>
                    </> : <>
                      <td className="px-3 py-2.5 text-gray-700">{p.dias} días · {p.horas} h</td>
                      <td className="px-3 py-2.5">
                        {p.faltas > 0 && <span className="mr-1 rounded-md bg-rose-100 px-1.5 py-0.5 text-[11px] font-bold text-rose-700">{p.faltas} F</span>}
                        {p.retardos > 0 && <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-800">{p.retardos} R · {p.minutos_tarde} min</span>}
                        {!p.faltas && !p.retardos && <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right text-gray-700">{$(p.sueldo)}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-indigo-700">{p.pago_festivos ? `+${$(p.pago_festivos)}` : '—'}</td>
                    </>}
                    <td className={`px-3 py-2.5 text-right font-bold ${p.ajustes > 0 ? 'text-emerald-700' : p.ajustes < 0 ? 'text-rose-600' : 'text-gray-300'}`}>
                      {p.ajustes ? `${p.ajustes > 0 ? '+' : ''}${$(p.ajustes)}` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right text-[15px] font-black text-gray-900">{$(p.total)}</td>
                    <td className="pr-3 text-right">
                      {!cerrada && <button onClick={e => { e.stopPropagation(); setAjuste(p) }} title="Bono o descuento"
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-900"><Plus size={15} /></button>}
                    </td>
                  </tr>
                  {abierta && (
                    <tr className="bg-[#FAFAFB]"><td colSpan={10} className="px-6 py-3">
                      <Detalle p={p} direccion={direccion} cerrada={cerrada} onResolver={setResolver}
                        onAnular={(a: any) => { const m = prompt('Motivo para anular este ajuste:'); if (m) accion('anular', () => backend(`/staff-admin/quincena/ajustes/${a.id}/anular`, { body: { motivo: m } })) }} />
                    </td></tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      <ModalResolver p={resolver} onClose={() => setResolver(null)} onListo={() => { setResolver(null); cargar() }} />
      <ModalAjuste p={ajuste} inicio={d.inicio} sucursalId={sucursalId} direccion={direccion} onClose={() => setAjuste(null)}
        onListo={(q: string) => { setAjuste(null); if (q !== d.inicio) setAviso('La quincena ya estaba cerrada: el ajuste entró en la siguiente.'); cargar() }} />
      <Modal abierto={cerrar} onClose={() => setCerrar(false)} titulo={`Cerrar quincena · ${etiqueta(d.inicio, d.fin)}`} ancho="max-w-md"
        pie={<><BotonBlanco onClick={() => setCerrar(false)}>Cancelar</BotonBlanco>
          <BotonNegro disabled={d.pendientes.length > 0 || faltanAprob.length > 0 || !d.puede_cerrar || !!trabajando}
            onClick={() => accion('cerrar', () => backend('/staff-admin/quincena/cerrar', { body: { inicio: d.inicio } }), r => `Quincena cerrada: ${$(r.total)}.`).then(() => setCerrar(false))}>
            <Lock size={14} /> Cerrar y congelar
          </BotonNegro></>}>
        <ul className="space-y-2.5 text-sm">
          <Check ok={d.puede_cerrar} txt={d.puede_cerrar ? 'La quincena ya terminó (o es su último día)' : 'Todavía no termina la quincena'} />
          <Check ok={d.pendientes.length === 0} txt={d.pendientes.length ? `${d.pendientes.length} pendientes por resolver` : 'Sin pendientes'} />
          <Check ok={faltanAprob.length === 0} txt={faltanAprob.length ? `Falta aprobar: ${faltanAprob.map((s: any) => s.nombre).join(', ')}` : 'Todas las sucursales aprobadas'} />
        </ul>
        <p className="mt-4 rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-500">
          Al cerrar se guardan los montos tal cual ({$(d.totales.total)}). Ya no se pueden cambiar: cualquier corrección entra como ajuste en la siguiente quincena.
        </p>
      </Modal>
    </div>
  )
}

function Detalle({ p, direccion, cerrada, onResolver, onAnular }: any) {
  return (
    <div className="space-y-3">
      {p.detalle_clases.length > 0 && (
        <table className="w-full text-xs">
          <thead><tr className="text-left text-[10px] font-bold text-gray-400">
            <th className="py-1.5">Clase</th><th>Asist.</th><th>Tarifa</th><th>Bonos</th><th className="text-right">Total</th><th className="text-right">Estado</th>
          </tr></thead>
          <tbody>
            {p.detalle_clases.map((l: any) => {
              const e = ESTADO[l.estado] || ESTADO.revisar
              return (
                <tr key={l.id} className="border-t border-gray-100">
                  <td className="py-1.5"><b className="text-gray-800">{l.clase}</b> <span className="text-gray-400">· {diaHora(l.horario)} · {l.sucursal} · {l.duracion} min</span>
                    {l.motivo && <p className="text-[11px] text-gray-500">{l.motivo}</p>}</td>
                  <td>{l.asistentes}</td>
                  <td>{l.tarifa != null ? `${$(l.tarifa)}${l.porcentaje < 100 ? ` · ${l.porcentaje}%` : ''}` : '—'}{l.suplencia && <span className="ml-1 rounded bg-indigo-100 px-1 text-[10px] font-bold text-indigo-700">Suplencia</span>}</td>
                  <td className="text-emerald-700">{(l.bonos || []).map((b: any) => `${b.nombre} +${$(b.monto)}`).join(', ') || '—'}</td>
                  <td className="text-right font-bold text-gray-900">{$(l.total)}</td>
                  <td className="text-right">
                    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${e.cls}`}>{e.txt}</span>
                    {direccion && !cerrada && l.estado !== 'impartida' && (
                      <button onClick={() => onResolver({ id: l.id, persona: p.nombre, texto: `${l.clase} · ${l.sucursal}`, horario: l.horario, motivo: l.motivo })}
                        className="ml-2 text-[11px] font-bold text-gray-500 hover:text-gray-900">Resolver</button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      {p.detalle_ajustes.length > 0 && (
        <div>
          <p className="mb-1 text-[11px] font-bold text-gray-500">Ajustes</p>
          {p.detalle_ajustes.map((a: any) => (
            <div key={a.id} className="flex items-center justify-between border-t border-gray-100 py-1.5 text-xs">
              <span><b className={a.tipo === 'bono' ? 'text-emerald-700' : 'text-rose-600'}>{a.tipo === 'bono' ? '+' : '−'}{$(a.monto)}</b> · {a.concepto} <span className="text-gray-400">· {a.capturo}</span></span>
              {direccion && !cerrada && <button onClick={() => onAnular(a)} className="flex items-center gap-1 font-bold text-gray-400 hover:text-rose-600"><Ban size={11} /> Anular</button>}
            </div>
          ))}
        </div>
      )}
      {p.detalle_clases.length === 0 && p.detalle_ajustes.length === 0 && (
        <p className="text-xs text-gray-500">{p.esquema} · {p.dias} días trabajados · {p.horas} h{p.festivos ? ` · ${p.festivos} festivo(s) trabajado(s) ×3` : ''}</p>
      )}
    </div>
  )
}

function ModalResolver({ p, onClose, onListo }: { p: any | null; onClose: () => void; onListo: () => void }) {
  const [accion, setAccion] = useState<'pagar' | 'no_pagar'>('pagar')
  const [motivo, setMotivo] = useState('')
  const [monto, setMonto] = useState('')
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { setAccion('pagar'); setMotivo(''); setMonto(''); setError(null) }, [p])
  const guardar = async () => {
    try { await backend(`/staff-admin/quincena/clases/${p.id}/resolver`, { body: { accion, motivo, monto: monto ? Number(monto) : null } }); onListo() }
    catch (e: any) { setError(e.message) }
  }
  return (
    <Modal abierto={!!p} onClose={onClose} titulo="Resolver clase" subtitulo={p ? `${p.persona} · ${p.texto} · ${diaHora(p.horario)}` : ''} ancho="max-w-md"
      pie={<>{error && <p className="mr-auto text-sm font-semibold text-rose-600">{error}</p>}
        <BotonBlanco onClick={onClose}>Cancelar</BotonBlanco><BotonNegro onClick={guardar} disabled={motivo.trim().length < 5}>Guardar</BotonNegro></>}>
      {p?.motivo && <p className="mb-3 rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900">{p.motivo}</p>}
      <div className="mb-3 grid grid-cols-2 gap-2">
        {([['pagar', 'Sí se dio: pagar'], ['no_pagar', 'No se paga']] as const).map(([v, l]) => (
          <button key={v} onClick={() => setAccion(v)} className={`rounded-xl border p-3 text-sm font-bold ${accion === v ? 'border-[#171B24] bg-[#171B24] text-white' : 'border-gray-200 text-gray-600'}`}>{l}</button>
        ))}
      </div>
      {accion === 'pagar' && (
        <div className="mb-3">
          <p className="mb-1 text-xs font-bold text-gray-500">Monto <span className="font-normal text-gray-400">(solo si no tiene tarifa; si la tiene, déjalo vacío)</span></p>
          <input value={monto} onChange={e => setMonto(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" placeholder="$" className={inputCls} />
        </div>
      )}
      <p className="mb-1 text-xs font-bold text-gray-500">Motivo</p>
      <input value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej. Sí dio la clase, olvidó checar" className={inputCls} />
      <p className="mt-2 text-[11px] text-gray-400">Queda en la bitácora de correcciones con tu nombre.</p>
    </Modal>
  )
}

function ModalAjuste({ p, inicio, sucursalId, direccion, onClose, onListo }: any) {
  const [tipo, setTipo] = useState<'bono' | 'descuento'>('bono')
  const [concepto, setConcepto] = useState('')
  const [monto, setMonto] = useState('')
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { setTipo('bono'); setConcepto(''); setMonto(''); setError(null) }, [p])
  const guardar = async () => {
    try {
      const r = await backend('/staff-admin/quincena/ajustes', { body: { staff_id: p.staff_id, inicio, tipo, concepto, monto: Number(monto), sucursal_id: sucursalId } })
      onListo(r.quincena)
    } catch (e: any) { setError(e.message) }
  }
  return (
    <Modal abierto={!!p} onClose={onClose} titulo="Bono o descuento manual" subtitulo={p?.nombre} ancho="max-w-md"
      pie={<>{error && <p className="mr-auto text-sm font-semibold text-rose-600">{error}</p>}
        <BotonBlanco onClick={onClose}>Cancelar</BotonBlanco><BotonNegro onClick={guardar} disabled={!concepto.trim() || !Number(monto)}>Agregar</BotonNegro></>}>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <button onClick={() => setTipo('bono')} className={`rounded-xl border p-3 text-sm font-bold ${tipo === 'bono' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-200 text-gray-600'}`}>+ Bono</button>
        <button onClick={() => direccion && setTipo('descuento')} disabled={!direccion} title={!direccion ? 'Solo Dirección' : undefined}
          className={`rounded-xl border p-3 text-sm font-bold disabled:opacity-40 ${tipo === 'descuento' ? 'border-rose-600 bg-rose-600 text-white' : 'border-gray-200 text-gray-600'}`}>− Descuento</button>
      </div>
      <div className="grid grid-cols-[1fr_130px] gap-3">
        <div><p className="mb-1 text-xs font-bold text-gray-500">Concepto</p><input value={concepto} onChange={e => setConcepto(e.target.value)} placeholder="Ej. Cubrió turnos extra" className={inputCls} /></div>
        <div><p className="mb-1 text-xs font-bold text-gray-500">Monto</p><input value={monto} onChange={e => setMonto(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" placeholder="$" className={inputCls} /></div>
      </div>
    </Modal>
  )
}

function Kpi({ t, v, s, alerta, negro }: { t: string; v: string; s: string; alerta?: boolean; negro?: boolean }) {
  return (
    <div className={`rounded-[18px] border p-4 shadow-sm ${negro ? 'border-transparent text-white' : 'border-gray-200 bg-white'}`} style={negro ? { background: NEGRO } : undefined}>
      <p className={`text-xs ${negro ? 'text-white/60' : 'text-gray-500'}`}>{t}</p>
      <p className={`mt-0.5 text-2xl font-black tracking-tight tabular-nums ${alerta ? 'text-amber-600' : ''}`}>{v}</p>
      <p className={`mt-0.5 truncate text-xs ${negro ? 'text-white/60' : alerta ? 'font-semibold text-amber-700' : 'text-gray-500'}`}>{s}</p>
    </div>
  )
}

function Check({ ok, txt }: { ok: boolean; txt: string }) {
  return <li className={`flex items-center gap-2 ${ok ? 'text-gray-700' : 'font-semibold text-amber-800'}`}>
    {ok ? <CheckCircle2 size={16} className="text-emerald-600" /> : <AlertTriangle size={16} className="text-amber-600" />}{txt}</li>
}
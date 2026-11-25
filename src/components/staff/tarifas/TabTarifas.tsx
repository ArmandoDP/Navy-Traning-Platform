'use client'
// src/components/staff/tarifas/TabTarifas.tsx
// Solo Dirección. Tres cosas:
//  1. Pago por clase de los coaches: nivel × duración, con una tabla general y montos propios por sucursal.
//  2. Sueldo quincenal del staff por puesto, general y por sucursal.
//  3. Reglas de bono por asistentes (los que llegaron con check-in), por nivel, sucursal, clase, etc.
// Cambiar un monto crea una versión nueva desde hoy: lo ya pagado no se mueve.
import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Pencil, Trash2, RefreshCw, AlertTriangle, Lock, X } from 'lucide-react'
import { backend } from '@/lib/backend'
import Modal, { inputCls, BotonNegro, BotonBlanco } from '@/components/staff/equipo/Modal'
import { NEGRO } from '@/components/staff/equipo/util'

type Suc = { id: string; nombre: string }
const DIAS = [{ d: 1, l: 'L' }, { d: 2, l: 'M' }, { d: 3, l: 'M' }, { d: 4, l: 'J' }, { d: 5, l: 'V' }, { d: 6, l: 'S' }, { d: 0, l: 'D' }]
const PUESTO_LABEL: Record<string, string> = { Front: 'Front Desk' }
const pesos = (n?: number | null) => n == null ? '' : `$${Number(n).toLocaleString('es-MX', { maximumFractionDigits: 2 })}`

export default function TabTarifas({ direccion, sucursales }: { direccion: boolean; sucursales: Suc[] }) {
  const [ver, setVer] = useState<string | null>(null)          // null = General
  const [tar, setTar] = useState<any>(null)
  const [sue, setSue] = useState<any>(null)
  const [bon, setBon] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [regla, setRegla] = useState<any | null | undefined>(undefined)   // undefined = cerrado, null = nueva

  const cargar = useCallback(async () => {
    if (!direccion) return
    setError(null)
    try {
      const [t, s, b] = await Promise.all([backend('/staff-admin/tarifas'), backend('/staff-admin/sueldos'), backend('/staff-admin/bonos')])
      setTar(t); setSue(s); setBon(b)
    } catch (e: any) { setError(e.message) }
  }, [direccion])
  useEffect(() => { cargar() }, [cargar])

  if (!direccion) return (
    <div className="grid flex-1 place-items-center rounded-[18px] border border-gray-200 bg-white p-10 text-center">
      <div><Lock className="mx-auto mb-2 text-gray-300" /><p className="font-black text-gray-900">Solo Dirección</p>
        <p className="mt-1 text-sm text-gray-500">Las tarifas, sueldos y bonos los configura Dirección.</p></div>
    </div>
  )
  if (!tar || !sue || !bon) return (
    <div className="flex h-40 items-center justify-center gap-2 text-gray-400">
      {error ? <span className="text-rose-600">{error}</span> : <><RefreshCw size={15} className="animate-spin" /> Cargando…</>}
    </div>
  )

  const tarifa = (nivel: string, dur: number, suc: string | null) =>
    tar.tarifas.find((t: any) => t.nivel === nivel && t.duracion === dur && (t.sucursal_id || null) === suc)
  const sueldo = (puesto: string, suc: string | null) =>
    sue.sueldos.find((x: any) => x.puesto === puesto && (x.sucursal_id || null) === suc)

  // Combinaciones que hoy se dan y no tienen tarifa (ni general ni de alguna sucursal)
  const faltantes = tar.niveles.flatMap((n: string) => tar.duraciones_en_uso
    .filter((d: number) => !tar.tarifas.some((t: any) => t.nivel === n && t.duracion === d))
    .map((d: number) => `${n} ${d} min`))

  const guardarTarifa = async (nivel: string, duracion: number, monto: number | null) => {
    await backend('/staff-admin/tarifas', { method: 'PUT', body: { nivel, duracion, sucursal_id: ver, monto } })
    setTar(await backend('/staff-admin/tarifas'))
  }
  const guardarSueldo = async (puesto: string, monto: number | null) => {
    await backend('/staff-admin/sueldos', { method: 'PUT', body: { puesto, sucursal_id: ver, monto } })
    setSue(await backend('/staff-admin/sueldos'))
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-sm text-gray-500">Ver:</span>
        {[{ id: null as string | null, nombre: 'General (todas)' }, ...sucursales].map(s => (
          <button key={s.id || 'gral'} onClick={() => setVer(s.id)}
            className={`rounded-xl border px-3 py-1.5 text-[13px] font-bold transition ${ver === s.id ? 'border-[#171B24] bg-[#171B24] text-white' : 'border-gray-200 bg-white text-gray-500 hover:text-gray-800'}`}>
            {s.nombre}
          </button>
        ))}
      </div>
      {ver && <p className="-mt-1 text-xs text-gray-500">En gris, lo que viene de la tabla general. Escribe un monto solo donde esta sucursal pague distinto.</p>}
      {error && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</p>}

      <div className="grid gap-3 xl:grid-cols-[1.35fr_1fr]">
        <div className="space-y-3">
          <section className="rounded-[18px] border border-gray-200 bg-white p-5 shadow-sm">
            <b className="text-base text-gray-900">Pago por clase · coaches</b>
            <p className="text-sm text-gray-500">Según el nivel del coach y la duración de la clase.</p>
            {faltantes.length > 0 && !ver && (
              <div className="mt-3 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>Se están dando clases sin tarifa: <b>{faltantes.slice(0, 6).join(', ')}{faltantes.length > 6 ? '…' : ''}</b>. Esas clases quedan "por revisar" hasta que tengan monto.</span>
              </div>
            )}
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-[11px] font-bold text-gray-400">
                  <th className="py-2 pr-3">Nivel</th>
                  {tar.duraciones.map((d: number) => <th key={d} className="px-1.5 py-2">{d} min{tar.duraciones_en_uso.includes(d) ? '' : <span className="ml-1 font-normal text-gray-300">(sin uso)</span>}</th>)}
                </tr></thead>
                <tbody>
                  {tar.niveles.map((n: string) => (
                    <tr key={n} className="border-t border-gray-100">
                      <td className="py-2 pr-3"><span className="whitespace-nowrap rounded-lg px-2 py-1 text-[11px] font-black text-white" style={{ background: NEGRO }}>{n}</span></td>
                      {tar.duraciones.map((d: number) => {
                        const propia = tarifa(n, d, ver)
                        const general = ver ? tarifa(n, d, null) : null
                        return (
                          <td key={d} className="px-1.5 py-2">
                            <Celda valor={propia?.monto} sugerido={general?.monto} onGuardar={m => guardarTarifa(n, d, m)} />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-[18px] border border-gray-200 bg-white p-5 shadow-sm">
            <b className="text-base text-gray-900">Sueldo quincenal · staff</b>
            <p className="text-sm text-gray-500">Por puesto. Si a alguien se le paga distinto, se pone en su perfil y ese manda.</p>
            <table className="mt-3 w-full text-sm">
              <thead><tr className="text-left text-[11px] font-bold text-gray-400"><th className="py-2">Puesto</th><th className="py-2">Por quincena</th><th className="py-2 text-right">Personas</th></tr></thead>
              <tbody>
                {sue.puestos.map((p: string) => (
                  <tr key={p} className="border-t border-gray-100">
                    <td className="py-2 font-bold text-gray-900">{PUESTO_LABEL[p] || p}</td>
                    <td className="py-2"><Celda valor={sueldo(p, ver)?.monto} sugerido={ver ? sueldo(p, null)?.monto : undefined} onGuardar={m => guardarSueldo(p, m)} ancho="w-36" /></td>
                    <td className="py-2 text-right text-gray-500">{sue.personas_por_puesto[p] || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        <section className="self-start rounded-[18px] border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <b className="text-base text-gray-900">Bonos</b>
              <p className="text-sm text-gray-500">Por los clientes que llegaron a la clase (con check-in), incluidos Fitpass.</p>
            </div>
            <BotonNegro onClick={() => setRegla(null)}><Plus size={15} /> Regla</BotonNegro>
          </div>
          <div className="mt-3 space-y-2">
            {bon.reglas.length === 0 && <p className="rounded-xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">Sin reglas de bono todavía.</p>}
            {bon.reglas.map((r: any, i: number) => (
              <motion.div key={r.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="group flex items-start justify-between gap-3 rounded-2xl bg-[#F4F5F7] p-3.5">
                <div className="min-w-0">
                  <b className="block text-gray-900">{r.nombre}</b>
                  <p className="mt-0.5 text-xs text-gray-500">{describir(r, sucursales)}</p>
                  <span className={`mt-1.5 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold ${r.acumulable ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-600'}`}>
                    {r.acumulable ? 'Se suma con otros bonos' : 'Se paga solo el bono más alto'}
                  </span>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <b className="text-lg font-black text-emerald-700">+{pesos(r.monto)}</b>
                  <div className="flex opacity-0 transition group-hover:opacity-100">
                    <button onClick={() => setRegla(r)} className="rounded-lg p-1.5 text-gray-400 hover:bg-white hover:text-gray-800"><Pencil size={13} /></button>
                    <button onClick={async () => { if (confirm('¿Quitar esta regla? Las clases ya pagadas no cambian.')) { await backend(`/staff-admin/bonos/${r.id}`, { method: 'DELETE' }); cargar() } }}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-white hover:text-rose-600"><Trash2 size={13} /></button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-gray-400">
            Una clase sin alumnos se paga al 50% y sin bono. Una suplencia se paga con tarifa normal, sin bono.
          </p>
        </section>
      </div>

      <EditorRegla regla={regla} catalogo={bon} sucursales={sucursales} onClose={() => setRegla(undefined)} onListo={() => { setRegla(undefined); cargar() }} />
    </div>
  )
}

function describir(r: any, sucursales: Suc[]): string {
  const partes: string[] = []
  partes.push(r.niveles?.length ? r.niveles.join(', ') : 'Todos los niveles')
  if (r.sucursal_ids?.length) partes.push(r.sucursal_ids.map((id: string) => sucursales.find(s => s.id === id)?.nombre || '¿?').join(', '))
  if (r.tipos_clase?.length) partes.push(r.tipos_clase.join(', '))
  if (r.duraciones?.length) partes.push(r.duraciones.map((d: number) => `${d} min`).join(', '))
  if (r.dias_semana?.length) partes.push(DIAS.filter(d => r.dias_semana.includes(d.d)).map(d => d.l).join(''))
  if (r.hora_desde || r.hora_hasta) partes.push(`${(r.hora_desde || '00:00').slice(0, 5)}–${(r.hora_hasta || '24:00').slice(0, 5)}`)
  if (r.min_asistentes != null) partes.push(`${r.min_asistentes}+ asistentes`)
  if (r.min_ocupacion_pct != null) partes.push(r.min_ocupacion_pct >= 100 ? 'clase llena' : `${r.min_ocupacion_pct}%+ de ocupación`)
  if (r.vigente_hasta) partes.push(`hasta ${new Date(r.vigente_hasta + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}`)
  return partes.join(' · ')
}

/** Celda de monto: se guarda al salir del campo o con Enter. Vacía = sin monto propio. */
function Celda({ valor, sugerido, onGuardar, ancho = 'w-28' }: { valor?: number; sugerido?: number; onGuardar: (m: number | null) => Promise<void>; ancho?: string }) {
  const [txt, setTxt] = useState(valor != null ? String(valor) : '')
  const [estado, setEstado] = useState<'' | 'guardando' | 'ok' | 'error'>('')
  useEffect(() => { setTxt(valor != null ? String(valor) : '') }, [valor])
  const guardar = async () => {
    const limpio = txt.replace(/[^\d.]/g, '')
    const nuevo = limpio === '' ? null : Number(limpio)
    if ((nuevo ?? null) === (valor ?? null)) return
    setEstado('guardando')
    try { await onGuardar(nuevo); setEstado('ok'); setTimeout(() => setEstado(''), 1200) }
    catch { setEstado('error'); setTxt(valor != null ? String(valor) : '') }
  }
  return (
    <div className={`relative ${ancho}`}>
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
      <input value={txt} onChange={e => setTxt(e.target.value)} onBlur={guardar} onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        inputMode="decimal" placeholder={sugerido != null ? String(sugerido) : '—'}
        className={`w-full rounded-xl border py-2 pl-6 pr-7 text-sm font-black outline-none transition placeholder:font-normal placeholder:text-gray-300 focus:border-gray-400 ${
          estado === 'ok' ? 'border-emerald-400 bg-emerald-50' : estado === 'error' ? 'border-rose-400 bg-rose-50' : 'border-gray-200 bg-white'}`} />
      {txt && sugerido !== undefined && (
        <button onClick={() => { setTxt(''); onGuardar(null) }} title="Usar el de la tabla general"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-rose-500"><X size={13} /></button>
      )}
      {estado === 'guardando' && <RefreshCw size={12} className="absolute right-2 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />}
    </div>
  )
}

function EditorRegla({ regla, catalogo, sucursales, onClose, onListo }: {
  regla: any | null | undefined; catalogo: any; sucursales: Suc[]; onClose: () => void; onListo: () => void
}) {
  const vacia = { nombre: '', monto: '', niveles: [] as string[], sucursal_ids: [] as string[], tipos_clase: [] as string[],
    duraciones: [] as number[], dias_semana: [] as number[], hora_desde: '', hora_hasta: '', min_asistentes: '', min_ocupacion_pct: '',
    acumulable: false, vigente_desde: '', vigente_hasta: '' }
  const [f, setF] = useState(vacia)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (regla === undefined) return
    setError(null)
    setF(regla ? {
      nombre: regla.nombre, monto: String(regla.monto), niveles: regla.niveles || [], sucursal_ids: regla.sucursal_ids || [],
      tipos_clase: regla.tipos_clase || [], duraciones: regla.duraciones || [], dias_semana: regla.dias_semana || [],
      hora_desde: (regla.hora_desde || '').slice(0, 5), hora_hasta: (regla.hora_hasta || '').slice(0, 5),
      min_asistentes: regla.min_asistentes != null ? String(regla.min_asistentes) : '',
      min_ocupacion_pct: regla.min_ocupacion_pct != null ? String(regla.min_ocupacion_pct) : '',
      acumulable: !!regla.acumulable, vigente_desde: regla.vigente_desde || '', vigente_hasta: regla.vigente_hasta || '',
    } : vacia)
  }, [regla]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = <T,>(k: keyof typeof f, v: T) => {
    const lista = f[k] as unknown as T[]
    setF({ ...f, [k]: lista.includes(v) ? lista.filter(x => x !== v) : [...lista, v] })
  }
  const num = (v: string) => v === '' ? null : Number(v)

  const guardar = async () => {
    setGuardando(true); setError(null)
    const body = { ...f, monto: Number(f.monto), min_asistentes: num(f.min_asistentes), min_ocupacion_pct: num(f.min_ocupacion_pct),
                   hora_desde: f.hora_desde || null, hora_hasta: f.hora_hasta || null, vigente_desde: f.vigente_desde || null, vigente_hasta: f.vigente_hasta || null }
    try {
      if (regla) await backend(`/staff-admin/bonos/${regla.id}`, { method: 'PUT', body })
      else await backend('/staff-admin/bonos', { body })
      onListo()
    } catch (e: any) { setError(e.message) }
    setGuardando(false)
  }

  return (
    <Modal abierto={regla !== undefined} onClose={onClose} ancho="max-w-2xl"
      titulo={regla ? 'Editar regla de bono' : 'Nueva regla de bono'}
      subtitulo="Deja vacío lo que no importe: sin elegir niveles = todos los niveles, etc."
      pie={<>
        {error && <p className="mr-auto text-sm font-semibold text-rose-600">{error}</p>}
        <BotonBlanco onClick={onClose}>Cancelar</BotonBlanco>
        <BotonNegro onClick={guardar} disabled={guardando || !f.nombre.trim() || !f.monto}>{guardando ? 'Guardando…' : 'Guardar regla'}</BotonNegro>
      </>}>
      <div className="space-y-4">
        <div className="grid grid-cols-[1fr_140px] gap-3">
          <Campo t="Nombre"><input value={f.nombre} onChange={e => setF({ ...f, nombre: e.target.value })} placeholder="Ej. Clase con 15 o más" className={inputCls} /></Campo>
          <Campo t="Bono"><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
            <input value={f.monto} onChange={e => setF({ ...f, monto: e.target.value.replace(/[^\d.]/g, '') })} inputMode="decimal" className={`${inputCls} pl-6 font-black`} /></div></Campo>
        </div>
        <div className="grid grid-cols-2 gap-3 rounded-2xl bg-gray-50 p-3">
          <Campo t="Mínimo de asistentes" ayuda="(que llegaron)"><input value={f.min_asistentes} onChange={e => setF({ ...f, min_asistentes: e.target.value.replace(/\D/g, '') })} placeholder="Ej. 15" className={`${inputCls} bg-white`} /></Campo>
          <Campo t="O mínimo de ocupación" ayuda="(%)"><input value={f.min_ocupacion_pct} onChange={e => setF({ ...f, min_ocupacion_pct: e.target.value.replace(/\D/g, '') })} placeholder="Ej. 80" className={`${inputCls} bg-white`} /></Campo>
        </div>
        <Campo t="Niveles"><Chips valores={f.niveles as any[]} onToggle={v => toggle("niveles" as keyof typeof f, v)} opciones={catalogo.niveles.map((n: string) => ({ v: n, l: n }))} /></Campo>
        <Campo t="Sucursales"><Chips valores={f.sucursal_ids as any[]} onToggle={v => toggle("sucursal_ids" as keyof typeof f, v)} opciones={sucursales.map(s => ({ v: s.id, l: s.nombre }))} /></Campo>
        {catalogo.tipos_clase.length > 0 && <Campo t="Tipos de clase"><Chips valores={f.tipos_clase as any[]} onToggle={v => toggle("tipos_clase" as keyof typeof f, v)} opciones={catalogo.tipos_clase.map((t: string) => ({ v: t, l: t }))} /></Campo>}
        <div className="grid grid-cols-2 gap-3">
          <Campo t="Duraciones"><Chips valores={f.duraciones as any[]} onToggle={v => toggle("duraciones" as keyof typeof f, v)} opciones={catalogo.duraciones.map((d: number) => ({ v: d, l: `${d} min` }))} /></Campo>
          <Campo t="Días"><Chips valores={f.dias_semana as any[]} onToggle={v => toggle("dias_semana" as keyof typeof f, v)} opciones={DIAS.map(d => ({ v: d.d, l: d.l }))} /></Campo>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <Campo t="Empieza desde"><input type="time" value={f.hora_desde} onChange={e => setF({ ...f, hora_desde: e.target.value })} className={inputCls} /></Campo>
          <Campo t="Antes de"><input type="time" value={f.hora_hasta} onChange={e => setF({ ...f, hora_hasta: e.target.value })} className={inputCls} /></Campo>
          <Campo t="Vigente desde"><input type="date" value={f.vigente_desde} onChange={e => setF({ ...f, vigente_desde: e.target.value })} className={inputCls} /></Campo>
          <Campo t="Hasta" ayuda="(opcional)"><input type="date" value={f.vigente_hasta} onChange={e => setF({ ...f, vigente_hasta: e.target.value })} className={inputCls} /></Campo>
        </div>
        <label className="flex cursor-pointer items-start gap-2.5 rounded-2xl border border-gray-200 p-3">
          <input type="checkbox" checked={f.acumulable} onChange={e => setF({ ...f, acumulable: e.target.checked })} className="mt-0.5 h-4 w-4 accent-[#171B24]" />
          <span className="text-sm"><b className="text-gray-900">Se suma con otros bonos</b>
            <span className="block text-xs text-gray-500">Si no, cuando una clase cumple varias reglas se paga solo la del bono más alto.</span></span>
        </label>
      </div>
    </Modal>
  )
}

function Chips({ valores, onToggle, opciones }: { valores: any[]; onToggle: (v: any) => void; opciones: { v: any; l: string }[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {opciones.map(o => {
        const on = valores.includes(o.v)
        return (
          <button key={String(o.v)} type="button" onClick={() => onToggle(o.v)}
            className={`rounded-xl border px-2.5 py-1 text-xs font-bold transition ${on ? 'border-[#171B24] bg-[#171B24] text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}>{o.l}</button>
        )
      })}
    </div>
  )
}

function Campo({ t, ayuda, children }: { t: string; ayuda?: string; children: React.ReactNode }) {
  return <div><p className="mb-1 text-xs font-bold text-gray-500">{t}{ayuda && <span className="ml-1 font-normal text-gray-400">{ayuda}</span>}</p>{children}</div>
}
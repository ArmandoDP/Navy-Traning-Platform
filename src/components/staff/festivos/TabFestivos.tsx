'use client'
// src/components/staff/festivos/TabFestivos.tsx
// Días festivos: si alguien del staff trabaja ese día, se le paga con el multiplicador (×3 por ley).
// Los domingos se pagan normal. Solo Dirección agrega o quita festivos.
import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Plus, Trash2, RefreshCw, Sparkles } from 'lucide-react'
import { backend } from '@/lib/backend'
import Modal, { inputCls, BotonNegro, BotonBlanco } from '@/components/staff/equipo/Modal'
import { NEGRO } from '@/components/staff/equipo/util'

export default function TabFestivos({ direccion, sucursales }: { direccion: boolean; sucursales: { id: string; nombre: string }[] }) {
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [datos, setDatos] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [nuevo, setNuevo] = useState(false)
  const [trabajando, setTrabajando] = useState(false)

  const cargar = useCallback(async () => {
    setError(null)
    try { setDatos(await backend(`/staff-admin/festivos?anio=${anio}`)) } catch (e: any) { setError(e.message) }
  }, [anio])
  useEffect(() => { setDatos(null); cargar() }, [cargar])

  const faltan = (datos?.oficiales || []).filter((o: any) => !(datos?.festivos || []).some((f: any) => f.fecha === o.fecha && !f.sucursal_id))
  const hoy = new Date().toISOString().slice(0, 10)

  const cargarOficiales = async () => {
    setTrabajando(true)
    try { await backend(`/staff-admin/festivos/oficiales/${anio}`, { body: {} }); await cargar() } catch (e: any) { setError(e.message) }
    setTrabajando(false)
  }
  const borrar = async (id: string) => {
    if (!confirm('¿Quitar este festivo?')) return
    try { await backend(`/staff-admin/festivos/${id}`, { method: 'DELETE' }); await cargar() } catch (e: any) { setError(e.message) }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setAnio(anio - 1)} className="rounded-xl border border-gray-200 bg-white p-2 text-gray-500 hover:text-gray-900"><ChevronLeft size={16} /></button>
          <b className="w-16 text-center text-lg font-black text-gray-900">{anio}</b>
          <button onClick={() => setAnio(anio + 1)} className="rounded-xl border border-gray-200 bg-white p-2 text-gray-500 hover:text-gray-900"><ChevronRight size={16} /></button>
        </div>
        {direccion && (
          <div className="flex gap-2">
            {faltan.length > 0 && (
              <BotonBlanco onClick={cargarOficiales} disabled={trabajando}><Sparkles size={14} /> Cargar los {faltan.length} oficiales de {anio}</BotonBlanco>
            )}
            <BotonNegro onClick={() => setNuevo(true)}><Plus size={15} /> Agregar festivo</BotonNegro>
          </div>
        )}
      </div>
      {error && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</p>}

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[1.6fr_1fr]">
        <div className="min-h-0 overflow-auto rounded-[18px] border border-gray-200 bg-white p-4 shadow-sm">
          {!datos ? <div className="flex h-32 items-center justify-center gap-2 text-gray-400"><RefreshCw size={15} className="animate-spin" /> Cargando…</div>
          : datos.festivos.length === 0 ? (
            <div className="py-12 text-center">
              <p className="font-black text-gray-900">Sin festivos en {anio}</p>
              <p className="mt-1 text-sm text-gray-500">{direccion ? 'Carga los oficiales de la ley con un clic.' : 'Dirección todavía no los ha capturado.'}</p>
            </div>
          ) : datos.festivos.map((f: any, i: number) => {
            const fecha = new Date(f.fecha + 'T12:00:00')
            const pasado = f.fecha < hoy
            return (
              <motion.div key={f.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                className={`flex items-center gap-4 border-b border-gray-100 py-3 last:border-0 ${pasado ? 'opacity-50' : ''}`}>
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-white" style={{ background: NEGRO }}>
                  <div className="text-center leading-none">
                    <b className="block text-xl font-black">{fecha.getDate()}</b>
                    <span className="text-[10px] uppercase text-white/60">{fecha.toLocaleDateString('es-MX', { month: 'short' })}</span>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <b className="block text-gray-900">{f.nombre}</b>
                  <p className="text-xs capitalize text-gray-500">{fecha.toLocaleDateString('es-MX', { weekday: 'long' })} · {f.sucursal || 'Todas las sucursales'}</p>
                </div>
                <span className="rounded-lg bg-indigo-100 px-2.5 py-1 text-xs font-black text-indigo-700">×{Number(f.multiplicador).toString()}</span>
                {direccion && (
                  <button onClick={() => borrar(f.id)} className="rounded-lg p-2 text-gray-300 hover:bg-rose-50 hover:text-rose-500"><Trash2 size={14} /></button>
                )}
              </motion.div>
            )
          })}
        </div>
        <div className="self-start rounded-[18px] p-5 text-white" style={{ background: NEGRO }}>
          <p className="text-sm font-black">Cómo se usan</p>
          <ul className="mt-3 space-y-2.5 text-sm text-white/75">
            <li>Si alguien del staff trabaja un festivo, ese día se le paga con el multiplicador (×3 por ley).</li>
            <li>Si descansa ese día, no cuenta como falta.</li>
            <li>Los domingos se pagan normal.</li>
            <li>Un festivo puede ser para todas las sucursales o solo para una.</li>
          </ul>
        </div>
      </div>

      <ModalNuevo abierto={nuevo} sucursales={sucursales} onClose={() => setNuevo(false)} onListo={() => { setNuevo(false); cargar() }} />
    </div>
  )
}

function ModalNuevo({ abierto, sucursales, onClose, onListo }: { abierto: boolean; sucursales: { id: string; nombre: string }[]; onClose: () => void; onListo: () => void }) {
  const [f, setF] = useState({ fecha: '', nombre: '', multiplicador: '3', sucursal_id: '' })
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { if (abierto) { setF({ fecha: '', nombre: '', multiplicador: '3', sucursal_id: '' }); setError(null) } }, [abierto])
  const guardar = async () => {
    try {
      await backend('/staff-admin/festivos', { body: { fecha: f.fecha, nombre: f.nombre, multiplicador: Number(f.multiplicador), sucursal_id: f.sucursal_id || null } })
      onListo()
    } catch (e: any) { setError(e.message) }
  }
  return (
    <Modal abierto={abierto} onClose={onClose} titulo="Agregar festivo" ancho="max-w-md"
      pie={<>{error && <p className="mr-auto text-sm font-semibold text-rose-600">{error}</p>}
        <BotonBlanco onClick={onClose}>Cancelar</BotonBlanco>
        <BotonNegro onClick={guardar} disabled={!f.fecha || !f.nombre.trim()}>Agregar</BotonNegro></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><p className="mb-1 text-xs font-bold text-gray-500">Fecha</p><input type="date" value={f.fecha} onChange={e => setF({ ...f, fecha: e.target.value })} className={inputCls} /></div>
          <div><p className="mb-1 text-xs font-bold text-gray-500">Multiplicador</p>
            <input type="number" min={1} step={0.5} value={f.multiplicador} onChange={e => setF({ ...f, multiplicador: e.target.value })} className={inputCls} /></div>
        </div>
        <div><p className="mb-1 text-xs font-bold text-gray-500">Nombre</p><input value={f.nombre} onChange={e => setF({ ...f, nombre: e.target.value })} placeholder="Ej. Puente del 12 de diciembre" className={inputCls} /></div>
        <div><p className="mb-1 text-xs font-bold text-gray-500">Sucursal</p>
          <select value={f.sucursal_id} onChange={e => setF({ ...f, sucursal_id: e.target.value })} className={inputCls}>
            <option value="">Todas las sucursales</option>
            {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </div>
      </div>
    </Modal>
  )
}
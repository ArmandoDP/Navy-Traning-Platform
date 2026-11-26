'use client'
// Editor de rooms, estilo Navy. Lo usan "Nuevo room" y "Editar room".
//  · Numeración corrida (R1, P2, R3…) y botón "Numerar en U" como el mapa físico.
//  · Clic en un lugar sin herramienta = cambiarle el nombre.
//  · Editar: el mapa solo se bloquea si hay clases que todavía no empiezan con reservas (y dice cuáles).
//  · Al guardar, cada lugar conserva su id (no se rompe el historial de reservas).
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Minus, Plus, Upload, Trash2, Wand2, Lock, AlertTriangle, ImageIcon, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { logActividad } from '@/lib/log-actividad'
import RoomGrid, { CeldaGrid, siguienteNumero, numerarEnU, repetidos, ES_LUGAR, PREFIJOS_DEFAULT, Prefijos } from './RoomGrid'
import RoomItemSelector, { ItemType } from './RoomItemSelector'

const NEGRO = '#171B24'
const inputCls = 'w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:bg-white'
type Bloqueo = { nombre: string; horario: string; reservas: number }
const fechaCorta = (iso: string) => new Date(iso).toLocaleString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'America/Mexico_City' })

interface Props {
  isOpen:          boolean
  modo:            'nuevo' | 'editar'
  room?:           any
  sucursalId?:     string
  sucursalNombre?: string
  onClose:         () => void
  onSuccess:       () => void
}

export default function EditorRoom({ isOpen, modo, room, sucursalId, sucursalNombre, onClose, onSuccess }: Props) {
  const { staff: usuario } = useAuth()
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [capacidad, setCapacidad] = useState(0)
  const [ancho, setAncho] = useState(0)
  const [alto, setAlto] = useState(0)
  const [zoom, setZoom] = useState(100)
  const [celdas, setCeldas] = useState<CeldaGrid[]>([])
  const [herramienta, setHerramienta] = useState<ItemType>(null)
  const [prefijos, setPrefijos] = useState<Prefijos>({ ...PREFIJOS_DEFAULT })
  const [plano, setPlano] = useState<File | null>(null)
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([])
  const [guardando, setGuardando] = useState(false)
  const [aviso, setAviso] = useState<{ tipo: 'error' | 'info'; texto: string } | null>(null)
  const [renombrando, setRenombrando] = useState<CeldaGrid | null>(null)
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const bloqueado = bloqueos.length > 0

  useEffect(() => {
    if (!isOpen) return
    setZoom(100); setHerramienta(null); setAviso(null); setPlano(null); setBloqueos([]); setPrefijos({ ...PREFIJOS_DEFAULT })
    if (modo === 'editar' && room) {
      setNombre(room.nombre || ''); setDescripcion(room.descripcion || ''); setCapacidad(room.capacidad || 0)
      setAncho(room.ancho || 0); setAlto(room.alto || 0); setCeldas(room.layout || [])
      // ¿Clases que todavía no empiezan, en este room, con reservas activas? (las pasadas no cuentan)
      ;(async () => {
        const { data: clases } = await supabase.from('clases').select('id, nombre_clase, horario')
          .eq('room_id', room.id).eq('estado', 'Activa').gt('horario', new Date().toISOString()).order('horario')
        const ids = (clases || []).map((c: any) => c.id)
        if (!ids.length) return
        const { data: res } = await supabase.from('reservas').select('clase_id').in('clase_id', ids).neq('estatus', 'Cancelada')
        const n: Record<string, number> = {}
        for (const r of res || []) n[(r as any).clase_id] = (n[(r as any).clase_id] || 0) + 1
        setBloqueos((clases || []).filter((c: any) => n[c.id]).map((c: any) => ({ nombre: (c.nombre_clase || '').trim(), horario: c.horario, reservas: n[c.id] })))
      })()
    } else {
      setNombre(''); setDescripcion(''); setCapacidad(0); setAncho(0); setAlto(0); setCeldas([])
    }
  }, [isOpen, modo, room])

  const lugares = celdas.filter(c => ES_LUGAR(c.tipo))
  const activos = lugares.filter(c => !c.bloqueado).length
  const racks = lugares.filter(c => c.tipo === 'Rack').length
  const pisos = lugares.filter(c => c.tipo === 'Mat').length
  const dup = repetidos(celdas)

  const avisarBloqueo = () => setAviso({ tipo: 'error', texto: 'El mapa no se puede cambiar mientras haya clases a futuro con lugares reservados (abajo ves cuáles).' })

  const clicCelda = (fila: number, columna: number) => {
    if (bloqueado) return avisarBloqueo()
    const existente = celdas.find(c => c.fila === fila && c.columna === columna)
    if (!herramienta) {
      if (existente && ES_LUGAR(existente.tipo)) setRenombrando(existente)
      else setAviso({ tipo: 'info', texto: 'Elige una herramienta (Rack, Piso, Coach o Entrada) para colocarla en el mapa.' })
      return
    }
    if (existente) { setCeldas(p => p.filter(c => c !== existente)); return }
    if (ES_LUGAR(herramienta) && activos >= capacidad) {
      setAviso({ tipo: 'info', texto: `Ya colocaste los ${capacidad} lugares de la capacidad. Sube la capacidad para agregar más.` }); return
    }
    setCeldas(p => [...p, { fila, columna, tipo: herramienta, numero: siguienteNumero(p, herramienta, prefijos) || null, bloqueado: false }])
  }

  const cambiarDim = (dim: 'ancho' | 'alto', valor: number) => {
    if (bloqueado) return avisarBloqueo()
    const v = Math.max(0, Math.min(20, valor))
    if (dim === 'ancho') setAncho(v); else setAlto(v)
    setCeldas(p => p.filter(c => dim === 'ancho' ? c.columna < v : c.fila < v))
  }

  const subirPlano = async (): Promise<string | null> => {
    if (!plano) return null
    const suc = sucursalId || room?.sucursal_id
    const path = `${suc}/${Date.now()}.${plano.name.split('.').pop()}`
    await supabase.storage.from('staff-documentos').upload(path, plano, { upsert: true })
    return supabase.storage.from('staff-documentos').getPublicUrl(path).data.publicUrl
  }

  const guardar = async () => {
    if (!nombre.trim()) return setAviso({ tipo: 'error', texto: 'Ponle nombre al room.' })
    if (dup.length) return setAviso({ tipo: 'error', texto: `Hay lugares con el mismo nombre: ${dup.join(', ')}. Usa "Numerar en U" o cámbiales el nombre.` })
    setGuardando(true); setAviso(null)
    try {
      const imagen = await subirPlano()
      const spots = celdas.filter(c => ES_LUGAR(c.tipo))
      if (modo === 'nuevo') {
        const { data: nuevo, error } = await supabase.from('rooms').insert({
          sucursal_id: sucursalId, nombre: nombre.trim(), descripcion, capacidad, ancho, alto, layout: celdas,
          imagen_plano: imagen, estatus: 'Activo',
        }).select().single()
        if (error || !nuevo) throw new Error(error?.message || 'No se pudo crear el room')
        if (spots.length) {
          const { error: e2 } = await supabase.from('room_spots').insert(spots.map(s => ({
            room_id: nuevo.id, numero: s.numero, tipo: s.tipo, fila: s.fila, columna: s.columna, bloqueado: !!s.bloqueado,
          })))
          if (e2) throw new Error(`El room se creó, pero falló al crear los lugares: ${e2.message}. Ábrelo en editar y vuelve a guardar.`)
        }
        await logActividad({
          tipo: 'room_creado', tabla: 'rooms', accion: 'INSERT',
          descripcion: `${usuario?.nombre} ${usuario?.primer_apellido || ''} creó el room "${nombre.trim()}" con ${spots.length} lugares (capacidad ${capacidad})`,
          metadata: { room_id: nuevo.id, nombre: nombre.trim(), capacidad, dimensiones: `${ancho}x${alto}`, racks, pisos, con_plano: !!imagen },
          sucursal_id: sucursalId || null, staff_id: usuario?.id,
        })
      } else {
        const cambios: Record<string, { antes: any; despues: any }> = {}
        if (room.nombre !== nombre.trim()) cambios['Nombre'] = { antes: room.nombre, despues: nombre.trim() }
        if ((room.descripcion || '') !== (descripcion || '')) cambios['Descripción'] = { antes: room.descripcion, despues: descripcion }
        if (Number(room.capacidad) !== Number(capacidad)) cambios['Capacidad'] = { antes: room.capacidad, despues: capacidad }
        if (room.ancho !== ancho || room.alto !== alto) cambios['Dimensiones'] = { antes: `${room.ancho}x${room.alto}`, despues: `${ancho}x${alto}` }
        if (JSON.stringify(room.layout || []) !== JSON.stringify(celdas)) cambios['Mapa'] = { antes: 'anterior', despues: 'actualizado' }
        if (imagen) cambios['Plano'] = { antes: room.imagen_plano ? 'sí' : 'no', despues: 'nuevo' }

        const { error } = await supabase.from('rooms').update({
          nombre: nombre.trim(), descripcion, capacidad, ancho, alto, layout: celdas,
          ...(imagen ? { imagen_plano: imagen } : {}),
        }).eq('id', room.id)
        if (error) throw new Error(error.message)

        // Lugares: se actualizan en su posición (conservan su id); los nuevos se agregan;
        // los que se quitaron se borran, y si tienen historial se desactivan.
        if (!bloqueado) {
          const { data: actuales } = await supabase.from('room_spots').select('id, fila, columna').eq('room_id', room.id)
          const porPos = new Map<string, string>((actuales || []).map((x: any) => [`${x.fila}-${x.columna}`, x.id] as [string, string]))
          const usados = new Set<string>()
          const nuevos: any[] = []
          for (const c of spots) {
            const id = porPos.get(`${c.fila}-${c.columna}`)
            if (id) { usados.add(id); await supabase.from('room_spots').update({ numero: c.numero, tipo: c.tipo, bloqueado: !!c.bloqueado }).eq('id', id) }
            else nuevos.push({ room_id: room.id, numero: c.numero, tipo: c.tipo, fila: c.fila, columna: c.columna, bloqueado: !!c.bloqueado })
          }
          if (nuevos.length) await supabase.from('room_spots').insert(nuevos)
          for (const x of actuales || []) {
            if (usados.has((x as any).id)) continue
            const { error: e } = await supabase.from('room_spots').delete().eq('id', (x as any).id)
            if (e) await supabase.from('room_spots').update({ bloqueado: true }).eq('id', (x as any).id)
          }
        }
        if (Object.keys(cambios).length) {
          await logActividad({
            tipo: 'room_editado', tabla: 'rooms', accion: 'UPDATE',
            descripcion: `${usuario?.nombre} ${usuario?.primer_apellido || ''} editó el room "${nombre.trim()}": ${Object.keys(cambios).join(', ')}`,
            metadata: { room_id: room.id, cambios }, sucursal_id: room.sucursal_id || null, staff_id: usuario?.id,
          })
        }
      }
      onSuccess(); onClose()
    } catch (e: any) {
      setAviso({ tipo: 'error', texto: e.message })
    }
    setGuardando(false)
  }

  const eliminar = async () => {
    setConfirmarEliminar(false)
    if (bloqueado) return avisarBloqueo()
    setGuardando(true)
    const { count } = await supabase.from('clases').select('id', { count: 'exact', head: true }).eq('room_id', room.id)
    if (count) { setAviso({ tipo: 'error', texto: `Este room tiene ${count} clases asignadas (incluidas las pasadas). Cámbialas de room antes de eliminarlo.` }); setGuardando(false); return }
    await supabase.from('room_spots').delete().eq('room_id', room.id)
    const { error } = await supabase.from('rooms').delete().eq('id', room.id)
    if (error) { setAviso({ tipo: 'error', texto: `No se pudo eliminar: ${error.message}` }); setGuardando(false); return }
    await logActividad({
      tipo: 'room_eliminado', tabla: 'rooms', accion: 'DELETE',
      descripcion: `${usuario?.nombre} ${usuario?.primer_apellido || ''} eliminó el room "${room.nombre}"`,
      metadata: { room_id: room.id, nombre: room.nombre, capacidad: room.capacidad, spots: lugares.length },
      sucursal_id: room.sucursal_id || null, staff_id: usuario?.id,
    })
    setGuardando(false); onSuccess(); onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="fixed inset-0 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div onClick={onClose} className="absolute inset-0 bg-gray-900/35 backdrop-blur-[2px]" />
          <motion.aside initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="absolute bottom-3 right-3 top-3 flex w-[min(680px,calc(100vw-24px))] flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl">

            {/* Encabezado */}
            <header className="shrink-0 px-6 pb-5 pt-5 text-white" style={{ background: NEGRO }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-white/55">{modo === 'nuevo' ? `Nuevo room${sucursalNombre ? ` · ${sucursalNombre}` : ''}` : 'Editar room'}</p>
                  <h2 className="mt-0.5 truncate text-[26px] font-black tracking-tight">{nombre.trim() || 'Sin nombre'}</h2>
                </div>
                <button onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white/60 hover:bg-white/10 hover:text-white"><X size={18} /></button>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2">
                {[['Lugares', `${activos}/${capacidad}`], ['Racks', String(racks)], ['Pisos', String(pisos)], ['Cuadrícula', ancho && alto ? `${ancho}×${alto}` : '—']].map(([t, v]) => (
                  <div key={t} className="rounded-2xl bg-white/[.07] px-3 py-2.5">
                    <p className="text-[11px] text-white/55">{t}</p>
                    <motion.b key={v} initial={{ y: 4, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="block text-xl font-black tabular-nums">{v}</motion.b>
                  </div>
                ))}
              </div>
            </header>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#F4F5F7] p-4">
              {bloqueado && (
                <div className="rounded-[18px] border border-amber-200 bg-amber-50 p-4 text-amber-900">
                  <p className="flex items-center gap-2 text-sm font-black"><Lock size={15} /> El mapa y la numeración no se pueden cambiar todavía</p>
                  <p className="mt-1 text-xs">Estas clases no han pasado y ya tienen gente con su lugar reservado:</p>
                  <ul className="mt-1.5 space-y-0.5 text-xs">
                    {bloqueos.slice(0, 5).map((b, i) => <li key={i}>• <span className="capitalize">{fechaCorta(b.horario)}</span> · <b>{b.nombre}</b> · {b.reservas} {b.reservas === 1 ? 'reserva' : 'reservas'}</li>)}
                    {bloqueos.length > 5 && <li>… y {bloqueos.length - 5} más</li>}
                  </ul>
                  <p className="mt-1.5 text-xs">El nombre, la capacidad, la descripción y el plano sí se pueden cambiar.</p>
                </div>
              )}

              {/* Datos */}
              <section className="space-y-3 rounded-[18px] bg-white p-4 shadow-sm">
                <p className="text-sm font-black text-gray-900">Datos del room</p>
                <div className="grid grid-cols-[1fr_auto] gap-3">
                  <div><p className="mb-1 text-xs font-bold text-gray-500">Nombre</p>
                    <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. Hybrid, Hyrox, Room 1" className={inputCls} /></div>
                  <div><p className="mb-1 text-xs font-bold text-gray-500">Capacidad (lugares)</p>
                    <Contador valor={capacidad} onCambio={setCapacidad} /></div>
                </div>
                <div><p className="mb-1 text-xs font-bold text-gray-500">Descripción <span className="font-normal text-gray-400">(opcional)</span></p>
                  <textarea rows={2} value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Qué hay en este room…" className={`${inputCls} resize-none`} /></div>
              </section>

              {/* Mapa */}
              <section className="space-y-3 rounded-[18px] bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black text-gray-900">Mapa del room</p>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    Zoom
                    <button onClick={() => setZoom(z => Math.max(50, z - 10))} className="grid h-6 w-6 place-items-center rounded-lg border border-gray-200 hover:bg-gray-50"><Minus size={11} /></button>
                    <b className="w-9 text-center text-gray-900">{zoom}%</b>
                    <button onClick={() => setZoom(z => Math.min(200, z + 10))} className="grid h-6 w-6 place-items-center rounded-lg border border-gray-200 hover:bg-gray-50"><Plus size={11} /></button>
                  </div>
                </div>

                <RoomItemSelector selected={herramienta} onSelect={setHerramienta} deshabilitado={bloqueado} />

                <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-gray-50 px-4 py-2.5">
                  <Dimension label="Columnas" valor={ancho} onCambio={v => cambiarDim('ancho', v)} />
                  <Dimension label="Filas" valor={alto} onCambio={v => cambiarDim('alto', v)} />
                  <p className="ml-auto text-[11px] text-gray-400">
                    {herramienta ? `Clic en un cuadro para poner ${herramienta === 'Mat' ? 'un Piso' : herramienta === 'Entrada' ? 'la Entrada' : `un ${herramienta}`}; clic otra vez para quitarlo.` : 'Sin herramienta: clic en un lugar para cambiarle el nombre.'}
                  </p>
                </div>

                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-[#FAFAFB]">
                  <RoomGrid ancho={ancho} alto={alto} celdas={celdas} itemSelected={bloqueado ? null : herramienta} zoom={zoom} onCeldaClick={clicCelda} soloLectura={bloqueado} />
                </div>

                {dup.length > 0 && (
                  <p className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"><AlertTriangle size={13} /> Nombres repetidos: {dup.join(', ')}</p>
                )}
              </section>

              {/* Numeración */}
              {!bloqueado && lugares.length > 0 && (
                <section className="rounded-[18px] bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-gray-900">Numeración</p>
                      <p className="text-xs text-gray-500">Un solo número corrido, como el mapa físico: la primera columna de abajo hacia arriba y la siguiente de arriba hacia abajo.</p>
                    </div>
                    <Letra label="Rack" valor={prefijos.Rack} onCambio={v => setPrefijos(p => ({ ...p, Rack: v }))} />
                    <Letra label="Piso" valor={prefijos.Mat} onCambio={v => setPrefijos(p => ({ ...p, Mat: v }))} />
                    <button onClick={() => { setCeldas(p => numerarEnU(p, prefijos)); setAviso({ tipo: 'info', texto: 'Listo: se numeró en U. Revisa el mapa y guarda.' }) }}
                      className="flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-black text-white transition hover:brightness-125" style={{ background: NEGRO }}>
                      <Wand2 size={14} /> Numerar en U
                    </button>
                  </div>
                </section>
              )}

              {/* Plano */}
              <section className="flex items-center gap-3 rounded-[18px] bg-white p-4 shadow-sm">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gray-100 text-gray-500"><ImageIcon size={18} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-gray-900">Plano del room <span className="text-[11px] font-bold text-gray-400">opcional</span></p>
                  <p className="truncate text-xs text-gray-500">
                    {plano ? plano.name : room?.imagen_plano ? <a href={room.imagen_plano} target="_blank" rel="noreferrer" className="underline">Ver el plano actual</a> : 'Una foto o imagen del room como referencia'}
                  </p>
                </div>
                <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">
                  <Upload size={13} /> {plano || room?.imagen_plano ? 'Cambiar' : 'Subir'}
                </button>
                <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={e => setPlano(e.target.files?.[0] || null)} />
              </section>
            </div>

            {/* Aviso */}
            <AnimatePresence>
              {aviso && (
                <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }}
                  className={`mx-4 mb-2 flex items-start gap-2 rounded-xl px-4 py-2.5 text-sm ${aviso.tipo === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-800'}`}>
                  {aviso.tipo === 'error' ? <AlertTriangle size={15} className="mt-0.5 shrink-0" /> : <Check size={15} className="mt-0.5 shrink-0" />}
                  <span className="flex-1">{aviso.texto}</span>
                  <button onClick={() => setAviso(null)} className="opacity-50 hover:opacity-100"><X size={14} /></button>
                </motion.div>
              )}
            </AnimatePresence>

            <footer className="flex items-center gap-2 border-t border-gray-100 bg-white px-6 py-4">
              {modo === 'editar' && (
                <button onClick={() => setConfirmarEliminar(true)} disabled={guardando}
                  className="mr-auto flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-40">
                  <Trash2 size={14} /> Eliminar
                </button>
              )}
              <button onClick={onClose} className={`${modo === 'nuevo' ? 'ml-auto' : ''} rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50`}>Cancelar</button>
              <button onClick={guardar} disabled={guardando || !nombre.trim()}
                className="rounded-xl px-5 py-2.5 text-sm font-black text-white transition hover:brightness-125 disabled:opacity-40" style={{ background: NEGRO }}>
                {guardando ? 'Guardando…' : modo === 'nuevo' ? 'Crear room' : 'Guardar cambios'}
              </button>
            </footer>
          </motion.aside>

          <MiniModal abierto={!!renombrando} titulo={`Cambiar nombre de ${renombrando?.numero || 'este lugar'}`} onClose={() => setRenombrando(null)}>
            {renombrando && <Renombrar celda={renombrando} celdas={celdas} onListo={nuevo => {
              setCeldas(p => p.map(c => c === renombrando ? { ...c, numero: nuevo } : c)); setRenombrando(null)
            }} />}
          </MiniModal>
          <MiniModal abierto={confirmarEliminar} titulo={`¿Eliminar el room ${room?.nombre || ''}?`} onClose={() => setConfirmarEliminar(false)}>
            <p className="text-sm text-gray-600">Se borra el room con su mapa. Si tiene clases asignadas (aunque ya hayan pasado) no se podrá eliminar.</p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setConfirmarEliminar(false)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-bold text-gray-700">Volver</button>
              <button onClick={eliminar} className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-black text-white">Eliminar room</button>
            </div>
          </MiniModal>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Contador({ valor, onCambio }: { valor: number; onCambio: (v: number) => void }) {
  return (
    <div className="flex h-[42px] items-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
      <button type="button" onClick={() => onCambio(Math.max(0, valor - 1))} className="px-3 text-gray-500 hover:bg-gray-100"><Minus size={14} /></button>
      <input type="number" value={valor} onChange={e => onCambio(Math.max(0, Number(e.target.value) || 0))} className="w-12 bg-transparent text-center text-sm font-black text-gray-900 outline-none" />
      <button type="button" onClick={() => onCambio(valor + 1)} className="px-3 text-gray-500 hover:bg-gray-100"><Plus size={14} /></button>
    </div>
  )
}

function Dimension({ label, valor, onCambio }: { label: string; valor: number; onCambio: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-500">
      {label}
      <button type="button" onClick={() => onCambio(valor - 1)} className="grid h-7 w-7 place-items-center rounded-lg border border-gray-200 bg-white hover:bg-gray-100"><Minus size={12} /></button>
      <b className="w-6 text-center text-sm text-gray-900">{valor}</b>
      <button type="button" onClick={() => onCambio(valor + 1)} className="grid h-7 w-7 place-items-center rounded-lg border border-gray-200 bg-white hover:bg-gray-100"><Plus size={12} /></button>
    </div>
  )
}

function Letra({ label, valor, onCambio }: { label: string; valor: string; onCambio: (v: string) => void }) {
  return (
    <label className="flex flex-col items-center gap-0.5 text-[10px] font-bold text-gray-500">
      {label}
      <input value={valor} maxLength={2} onChange={e => onCambio(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
        className="h-9 w-11 rounded-lg border border-gray-200 bg-gray-50 text-center text-sm font-black text-gray-900 outline-none focus:border-gray-400" />
    </label>
  )
}

function Renombrar({ celda, celdas, onListo }: { celda: CeldaGrid; celdas: CeldaGrid[]; onListo: (n: string) => void }) {
  const [txt, setTxt] = useState(celda.numero || '')
  const limpio = txt.trim().toUpperCase()
  const repetido = !!limpio && celdas.some(c => c !== celda && (c.numero || '').toUpperCase() === limpio)
  return (
    <div>
      <input autoFocus value={txt} onChange={e => setTxt(e.target.value)} onKeyDown={e => e.key === 'Enter' && limpio && !repetido && onListo(limpio)}
        placeholder="Ej. R5 o P6" className={`${inputCls} text-center text-lg font-black uppercase`} />
      {repetido && <p className="mt-1.5 text-xs font-semibold text-rose-600">Ya hay otro lugar que se llama {limpio}.</p>}
      <button disabled={!limpio || repetido} onClick={() => onListo(limpio)}
        className="mt-3 w-full rounded-xl py-2.5 text-sm font-black text-white disabled:opacity-40" style={{ background: NEGRO }}>Listo</button>
    </div>
  )
}

function MiniModal({ abierto, titulo, onClose, children }: { abierto: boolean; titulo: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {abierto && (
        <motion.div className="fixed inset-0 z-[70] grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-gray-900/40" onClick={onClose} />
          <motion.div initial={{ y: 12, scale: 0.97 }} animate={{ y: 0, scale: 1 }} className="relative w-full max-w-sm overflow-hidden rounded-[22px] bg-white shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 text-white" style={{ background: NEGRO }}>
              <p className="font-black">{titulo}</p>
              <button onClick={onClose} className="text-white/60 hover:text-white"><X size={16} /></button>
            </div>
            <div className="p-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
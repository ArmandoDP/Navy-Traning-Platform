'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Minus, Plus } from 'lucide-react'
import RecurrenciaConfig from '@/components/clases/RecurrenciaConfig'

interface Coach { id: string; nombre: string; primer_apellido: string }
interface Sucursal  { id: string; nombre: string }
interface Categoria { id: string; nombre: string; color: string }

interface Props {
  isOpen:       boolean
  onClose:      () => void
  onSuccess:    () => void
  sucursalId?:  string
}

export default function ModalCrearClase({ isOpen, onClose, onSuccess, sucursalId }: Props) {
  const [loading,    setLoading]    = useState(false)
  const [coaches,    setCoaches]    = useState<Coach[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [nuevaCategoria, setNuevaCategoria] = useState('')
  const [addingCat, setAddingCat] = useState(false)
  const [recurrenciaTipo, setRecurrenciaTipo] = useState('semanal')
  const [recurrenciaFin,  setRecurrenciaFin]  = useState('')
  
  const [form, setForm] = useState({
    nombre_clase:     '',
    sucursal_id:      sucursalId || '',
    coach_id:         '',
    categoria_id:     '',
    fecha:            '',
    hora:             '',
    duracion_minutos: 60,
    capacidad_max:    0,
    descripcion:      '',
    es_recurrente:    false,
    publicar_wellhub: false,
  })

  useEffect(() => {
    if (!isOpen) return
    setForm(p => ({ ...p, sucursal_id: sucursalId || '' }))

    Promise.all([
      supabase.from('staff')
        .select('id, nombre, primer_apellido')
        .eq('tipo', 'Coach')
        .eq('estatus', 'Activo')
        .order('nombre'),
      supabase.from('sucursales').select('id, nombre').eq('estatus', 'Activa').order('nombre'),
      supabase.from('categorias_clase').select('id, nombre, color').order('nombre'),
    ]).then(([{ data: c }, { data: s }, { data: cats }]) => {
      if (c) setCoaches(c)
      if (s) setSucursales(s)
      if (cats) setCategorias(cats)
    })
  }, [isOpen, sucursalId])

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const horario = form.fecha && form.hora
      ? new Date(`${form.fecha}T${form.hora}`).toISOString()
      : new Date().toISOString()

    const coach = coaches.find(c => c.id === form.coach_id)

    const payloadBase = {
      nombre_clase:     form.nombre_clase,
      coach_id:         form.coach_id    || null,
      sucursal_id:      form.sucursal_id || null,
      instructor:       coach ? `${coach.nombre} ${coach.primer_apellido}` : '',
      duracion_minutos: form.duracion_minutos,
      capacidad_max:    form.capacidad_max,
      descripcion:      form.descripcion,
      es_recurrente:    form.es_recurrente,
      estado:           'Activa',
      tipo_clase:       'General',
      salon:            'Sala Principal',
      publicar_wellhub: form.publicar_wellhub,
      categoria_id:     form.categoria_id || null,
      recurrencia_tipo: form.es_recurrente ? recurrenciaTipo : null,
      recurrencia_fin:  form.es_recurrente && recurrenciaFin ? recurrenciaFin : null,
    }

    // 1. Crear la clase principal
    const { data: claseCreada, error } = await supabase.from('clases').insert([{
      ...payloadBase,
      horario,
    }]).select().single()

    if (error) {
      alert('Error: ' + error.message)
      setLoading(false)
      return
    }

    // 2. Si es recurrente, crear las clases hijas
    if (form.es_recurrente && recurrenciaFin && recurrenciaTipo && claseCreada) {
      const clasesHijas = []
      let fechaActual   = new Date(horario)
      const fechaLimite = new Date(recurrenciaFin)

      const incrementar = (d: Date) => {
        const nueva = new Date(d)
        if (recurrenciaTipo === 'diario')    nueva.setDate(nueva.getDate() + 1)
        if (recurrenciaTipo === 'semanal')   nueva.setDate(nueva.getDate() + 7)
        if (recurrenciaTipo === 'quincenal') nueva.setDate(nueva.getDate() + 14)
        if (recurrenciaTipo === 'mensual')   nueva.setMonth(nueva.getMonth() + 1)
        return nueva
      }

      fechaActual = incrementar(fechaActual)

      while (fechaActual <= fechaLimite) {
        clasesHijas.push({
          ...payloadBase,
          horario:        fechaActual.toISOString(),
          clase_padre_id: claseCreada.id,
        })
        fechaActual = incrementar(fechaActual)
      }

      if (clasesHijas.length > 0) {
        await supabase.from('clases').insert(clasesHijas)
      }
    }

    // 3. Publicar en Wellhub si aplica
    if (form.publicar_wellhub && claseCreada) {
      try {
        const res = await fetch('/api/wellhub/publicar-clase', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            claseId:         claseCreada.id,
            nombre:          form.nombre_clase,
            descripcion:     form.descripcion,
            horario,
            duracionMinutos: form.duracion_minutos,
            capacidadMax:    form.capacidad_max,
          }),
        })
        const data = await res.json()
        if (!res.ok) alert('Clase creada, pero error en Wellhub: ' + data.error)
      } catch (err: any) {
        alert('Clase creada, pero no se pudo conectar con Wellhub: ' + err.message)
      }
    }

    onSuccess()
    onClose()
    setForm({
      nombre_clase: '', sucursal_id: sucursalId || '', coach_id: '',
      fecha: '', hora: '', duracion_minutos: 60, capacidad_max: 0,
      descripcion: '', es_recurrente: false, publicar_wellhub: false,
      categoria_id: '',
    })
    setRecurrenciaTipo('semanal')
    setRecurrenciaFin('')
    setLoading(false)
  }

  const handleAgregarCategoria = async () => {
    if (!nuevaCategoria.trim()) return
    const COLORS = ['#6366f1','#f59e0b','#22c55e','#3b82f6','#ec4899','#8b5cf6','#14b8a6','#f97316']
    const color  = COLORS[categorias.length % COLORS.length]
    const { data } = await supabase.from('categorias_clase')
      .insert({ nombre: nuevaCategoria.trim(), color })
      .select().single()
    if (data) setCategorias(prev => [...prev, data])
    setNuevaCategoria('')
    setAddingCat(false)
  }

  const sucursalFija = sucursalId
    ? sucursales.find(s => s.id === sucursalId)?.nombre || '...'
    : null

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl">

        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-black text-gray-900">Crear nueva clase</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition">
            <X size={20}/>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">
              Nombre de la clase <span className="text-red-500">*</span>
            </label>
            <input
              required
              placeholder="Nombre"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-gray-50 transition"
              value={form.nombre_clase}
              onChange={e => set('nombre_clase', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">
                Sucursal <span className="text-red-500">*</span>
              </label>
              {sucursalFija ? (
                <div className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 bg-gray-100 flex items-center justify-between">
                  <span>{sucursalFija}</span>
                </div>
              ) : (
                <select
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none appearance-none bg-gray-50 focus:border-indigo-400"
                  value={form.sucursal_id}
                  onChange={e => set('sucursal_id', e.target.value)}
                >
                  <option value="">Seleccionar</option>
                  {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">
                Coach <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none appearance-none bg-gray-50 focus:border-indigo-400"
                value={form.coach_id}
                onChange={e => set('coach_id', e.target.value)}
              >
                <option value="">Seleccionar</option>
                {coaches.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} {c.primer_apellido}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">
                Fecha <span className="text-red-500">*</span>
              </label>
              <input
                required type="date"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-indigo-400 bg-gray-50 focus:ring-2 focus:ring-indigo-100"
                value={form.fecha}
                onChange={e => set('fecha', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">
                Hora <span className="text-red-500">*</span>
              </label>
              <input
                required type="time"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-indigo-400 bg-gray-50 focus:ring-2 focus:ring-indigo-100"
                value={form.hora}
                onChange={e => set('hora', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">
                Duración (minutos) <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50 overflow-hidden">
                <button type="button"
                  onClick={() => set('duracion_minutos', Math.max(0, form.duracion_minutos - 5))}
                  className="px-3 py-2.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition">
                  <Minus size={14}/>
                </button>
                <span className="flex-1 text-center text-sm font-medium text-gray-900">{form.duracion_minutos}</span>
                <button type="button"
                  onClick={() => set('duracion_minutos', form.duracion_minutos + 5)}
                  className="px-3 py-2.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition">
                  <Plus size={14}/>
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">
                Capacidad máxima <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50 overflow-hidden">
                <button type="button"
                  onClick={() => set('capacidad_max', Math.max(0, form.capacidad_max - 1))}
                  className="px-3 py-2.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition">
                  <Minus size={14}/>
                </button>
                <span className="flex-1 text-center text-sm font-medium text-gray-900">{form.capacidad_max}</span>
                <button type="button"
                  onClick={() => set('capacidad_max', form.capacidad_max + 1)}
                  className="px-3 py-2.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition">
                  <Plus size={14}/>
                </button>
              </div>
            </div>
          </div>

          {/* Categoría */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">Categoría</label>
            <div className="flex flex-wrap gap-2">
              {categorias.map(cat => {
                const r = parseInt(cat.color.slice(1,3),16)
                const g = parseInt(cat.color.slice(3,5),16)
                const b = parseInt(cat.color.slice(5,7),16)
                const isSelected = form.categoria_id === cat.id
                return (
                  <button key={cat.id} type="button"
                    onClick={() => set('categoria_id', isSelected ? '' : cat.id)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold border transition"
                    style={isSelected
                      ? { backgroundColor: cat.color, color: '#fff', borderColor: cat.color }
                      : { backgroundColor: `rgba(${r},${g},${b},0.1)`, color: cat.color, borderColor: 'transparent' }
                    }>
                    {isSelected && '✓ '}{cat.nombre}
                  </button>
                )
              })}
              {addingCat ? (
                <div className="flex items-center gap-1">
                  <input autoFocus value={nuevaCategoria}
                    onChange={e => setNuevaCategoria(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAgregarCategoria(); if (e.key === 'Escape') setAddingCat(false) }}
                    placeholder="Nueva categoría"
                    className="border border-gray-200 rounded-xl px-3 py-1 text-xs outline-none focus:border-gray-400 w-32" />
                  <button type="button" onClick={handleAgregarCategoria}
                    className="text-xs font-bold text-emerald-500 hover:text-emerald-700">✓</button>
                  <button type="button" onClick={() => setAddingCat(false)}
                    className="text-xs text-gray-400 hover:text-gray-600">✕</button>
                </div>
              ) : (
                <button type="button" onClick={() => setAddingCat(true)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold border border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600 transition flex items-center gap-1">
                  + Nueva categoría
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">Descripción:</label>
            <textarea
              rows={3}
              placeholder="Descripción de la clase..."
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-indigo-400 bg-gray-50 resize-none focus:ring-2 focus:ring-indigo-100"
              value={form.descripcion}
              onChange={e => set('descripcion', e.target.value)}
            />
          </div>

          {/* Clase recurrente */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.es_recurrente}
                onChange={e => set('es_recurrente', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">Clase recurrente</span>
            </label>

            <RecurrenciaConfig
              activo={form.es_recurrente}
              tipo={recurrenciaTipo}
              fechaFin={recurrenciaFin}
              onTipo={setRecurrenciaTipo}
              onFin={setRecurrenciaFin}
            />
          </div>

          {/* Publicar en Wellhub */}
          <label className="flex items-center gap-2 cursor-pointer bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
            <input
              type="checkbox"
              checked={form.publicar_wellhub}
              onChange={e => set('publicar_wellhub', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
            />
            <span className="text-sm text-gray-700">
              🏃 Publicar también en Wellhub <span className="text-gray-400 text-xs">(visible para usuarios de Wellhub)</span>
            </span>
          </label>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold disabled:opacity-50 transition">
              {loading ? 'Creando...' : 'Crear clase'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
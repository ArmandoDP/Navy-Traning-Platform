'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Minus, Plus } from 'lucide-react'

interface Coach     { id: string; nombre_completo: string }
interface Sucursal  { id: string; nombre: string }

interface Props {
  isOpen:       boolean
  onClose:      () => void
  onSuccess:    () => void
  sucursalId?:  string   // opcional — si viene, fija la sucursal
}

export default function ModalCrearClase({ isOpen, onClose, onSuccess, sucursalId }: Props) {
  const [loading,    setLoading]    = useState(false)
  const [coaches,    setCoaches]    = useState<Coach[]>([])
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [form, setForm] = useState({
    nombre_clase:     '',
    sucursal_id:      sucursalId || '',
    coach_id:         '',
    fecha:            '',
    hora:             '',
    duracion_minutos: 60,
    capacidad_max:    0,
    descripcion:      '',
    es_recurrente:    false,
  })

  useEffect(() => {
    if (!isOpen) return
    // Resetear sucursal_id si viene fija
    setForm(p => ({ ...p, sucursal_id: sucursalId || '' }))

    Promise.all([
      supabase.from('coaches').select('id, nombre_completo').eq('estatus', 'Activo').order('nombre_completo'),
      supabase.from('sucursales').select('id, nombre').eq('estatus', 'Activa').order('nombre'),
    ]).then(([{ data: c }, { data: s }]) => {
      if (c) setCoaches(c)
      if (s) setSucursales(s)
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

    const { error } = await supabase.from('clases').insert([{
      nombre_clase:     form.nombre_clase,
      coach_id:         form.coach_id    || null,
      sucursal_id:      form.sucursal_id || null,
      instructor:       coach?.nombre_completo || '',
      horario,
      duracion_minutos: form.duracion_minutos,
      capacidad_max:    form.capacidad_max,
      descripcion:      form.descripcion,
      es_recurrente:    form.es_recurrente,
      estado:           'Activa',
      tipo_clase:       'General',
      salon:            'Sala Principal',
    }])

    if (error) {
      alert('Error: ' + error.message)
    } else {
      onSuccess()
      onClose()
      setForm({
        nombre_clase: '', sucursal_id: sucursalId || '', coach_id: '',
        fecha: '', hora: '', duracion_minutos: 60, capacidad_max: 0,
        descripcion: '', es_recurrente: false,
      })
    }
    setLoading(false)
  }

  // Label de la sucursal fija
  const sucursalFija = sucursalId
    ? sucursales.find(s => s.id === sucursalId)?.nombre || '...'
    : null

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-black text-gray-900">Crear nueva clase</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition">
            <X size={20}/>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Nombre */}
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

          {/* Sucursal + Coach */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">
                Sucursal <span className="text-red-500">*</span>
              </label>
              {sucursalFija ? (
                // Si viene sucursalId fija, mostrar como label no editable
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
                {coaches.map(c => <option key={c.id} value={c.id}>{c.nombre_completo}</option>)}
              </select>
            </div>
          </div>

          {/* Fecha + Hora */}
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

          {/* Duración + Capacidad */}
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

          {/* Descripción */}
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
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.es_recurrente}
              onChange={e => set('es_recurrente', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">Clase recurrente</span>
          </label>

          {/* Botones */}
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
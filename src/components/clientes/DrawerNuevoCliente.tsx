'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X } from 'lucide-react'
import ToastExito from '@/components/ToastExito'

interface Props {
  isOpen:    boolean
  onClose:   () => void
  onSuccess: () => void
}

interface Sucursal { id: string; nombre: string }
interface Paquete  { id: string; nombre: string; precio: number }

const SEXOS       = ['Masculino', 'Femenino', 'Prefiero no decir']
const RENOVACIONES = ['Mensual', 'Trimestral', 'Semestral', 'Anual']
const FORMAS_PAGO  = ['Efectivo', 'Tarjeta', 'Transferencia', 'OXXO']

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-gray-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 bg-gray-50 transition placeholder:text-gray-400"
const selectCls = `${inputCls} appearance-none cursor-pointer`

export default function DrawerNuevoCliente({ isOpen, onClose, onSuccess }: Props) {
  const [loading,    setLoading]    = useState(false)
  const [toast,      setToast]      = useState(false)
  const [nuevoId,    setNuevoId]    = useState<string | null>(null)
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [paquetes,   setPaquetes]   = useState<Paquete[]>([])

  const [form, setForm] = useState({
    nombre:          '',
    primer_apellido: '',
    segundo_apellido:'',
    email:           '',
    telefono:        '',
    fecha_nacimiento:'',
    sexo:            '',
    sucursal_id:     '',
    paquete_id:      '',
    renovacion:      '',
    forma_pago:      '',
  })

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (!isOpen) return
    Promise.all([
      supabase.from('sucursales').select('id, nombre').eq('estatus', 'Activa').order('nombre'),
      supabase.from('paquetes').select('id, nombre, precio').eq('estatus', 'Activo').order('nombre'),
    ]).then(([{ data: sucs }, { data: pqs }]) => {
      if (sucs) setSucursales(sucs)
      if (pqs)  setPaquetes(pqs)
    })
  }, [isOpen])

  const resetForm = () => setForm({
    nombre: '', primer_apellido: '', segundo_apellido: '',
    email: '', telefono: '', fecha_nacimiento: '', sexo: '',
    sucursal_id: '', paquete_id: '', renovacion: '', forma_pago: '',
  })

  const handleCrear = async () => {
    if (!form.nombre || !form.email) return
    setLoading(true)

    const paquete = paquetes.find(p => p.id === form.paquete_id)

    const { data: nuevoCliente, error } = await supabase.from('clientes').insert([{
      nombre_completo:  `${form.nombre} ${form.primer_apellido} ${form.segundo_apellido}`.trim(),
      primer_apellido:  form.primer_apellido,
      segundo_apellido: form.segundo_apellido,
      email:            form.email,
      telefono:         form.telefono,
      fecha_nacimiento: form.fecha_nacimiento || null,
      sexo:             form.sexo,
      sucursal_id:      form.sucursal_id || null,
      paquete_id:       form.paquete_id  || null,
      plan:             paquete?.nombre  || '',
      renovacion:       form.renovacion,
      forma_pago:       form.forma_pago,
      estatus:          'Activo',
    }]).select().single()

    if (error) { alert('Error: ' + error.message); setLoading(false); return }

    // Registrar pago inicial si hay paquete
    if (nuevoCliente && form.paquete_id && paquete) {
      await supabase.from('pagos').insert([{
        cliente_id:  nuevoCliente.id,
        monto:       paquete.precio,
        metodo_pago: form.forma_pago || 'Efectivo',
        fecha_pago:  new Date().toISOString(),
        estatus:     'Completado',
        sucursal_id: form.sucursal_id || null,
      }])
    }

    onSuccess(); onClose(); resetForm()
    setNuevoId(nuevoCliente?.id || null)
    setToast(true)
    setLoading(false)
  }

  return (
    <>
      {toast && (
        <ToastExito
          titulo="Cliente creado"
          mensaje="El cliente se ha dado de alta exitosamente."
          onClose={() => setToast(false)}
          onVer={nuevoId ? () => window.location.href = `/dashboard/clientes/${nuevoId}` : undefined}
        />
      )}
      {/* Overlay con blur */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Drawer */}
      <div className={`fixed top-0 right-0 z-50 h-full w-full max-w-lg bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-black text-gray-900">Nuevo cliente</h2>
            <p className="text-xs text-gray-400 mt-0.5">Alta de cliente</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-400 hover:text-gray-700">
            <X size={18}/>
          </button>
        </div>

        {/* Formulario */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Nombre */}
          <Field label="Nombre del cliente" required>
            <input placeholder="Nombre" className={inputCls}
              value={form.nombre} onChange={e => set('nombre', e.target.value)} />
          </Field>

          {/* Apellidos */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Primer Apellido" required>
              <input placeholder="Apellido" className={inputCls}
                value={form.primer_apellido} onChange={e => set('primer_apellido', e.target.value)} />
            </Field>
            <Field label="Segundo Apellido">
              <input placeholder="Apellido" className={inputCls}
                value={form.segundo_apellido} onChange={e => set('segundo_apellido', e.target.value)} />
            </Field>
          </div>

          {/* Correo + Teléfono */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Correo" required>
              <input type="email" placeholder="nombre@email.com" className={inputCls}
                value={form.email} onChange={e => set('email', e.target.value)} />
            </Field>
            <Field label="Teléfono">
              <input placeholder="Teléfono" className={inputCls}
                value={form.telefono} onChange={e => set('telefono', e.target.value)} />
            </Field>
          </div>

          {/* Fecha nacimiento + Sexo */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha de nacimiento">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">📅</span>
                <input type="date" className={`${inputCls} pl-9`}
                  value={form.fecha_nacimiento} onChange={e => set('fecha_nacimiento', e.target.value)} />
              </div>
            </Field>
            <Field label="Sexo">
              <select className={selectCls} value={form.sexo} onChange={e => set('sexo', e.target.value)}>
                <option value="">Seleccionar</option>
                {SEXOS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          {/* Sucursal + Plan */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sucursal" required>
              <select className={selectCls} value={form.sucursal_id} onChange={e => set('sucursal_id', e.target.value)}>
                <option value="">Seleccionar</option>
                {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </Field>
            <Field label="Plan">
              <select className={selectCls} value={form.paquete_id} onChange={e => set('paquete_id', e.target.value)}>
                <option value="">Seleccionar</option>
                {paquetes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </Field>
          </div>

          {/* Renovación + Forma de pago */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Renovación">
              <select className={selectCls} value={form.renovacion} onChange={e => set('renovacion', e.target.value)}>
                <option value="">Seleccionar</option>
                {RENOVACIONES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Forma de pago">
              <select className={selectCls} value={form.forma_pago} onChange={e => set('forma_pago', e.target.value)}>
                <option value="">Seleccionar</option>
                {FORMAS_PAGO.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
          </div>

        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-white">
          <button onClick={() => { onClose(); resetForm() }}
            className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition">
            Cancelar
          </button>
          <button
            onClick={handleCrear}
            disabled={loading || !form.nombre || !form.email}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition"
            style={{ backgroundColor: '#171B24' }}
          >
            {loading ? 'Creando...' : 'Crear cliente'}
          </button>
        </div>
      </div>
    </>
  )
}
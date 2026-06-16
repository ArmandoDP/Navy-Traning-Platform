'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X } from 'lucide-react'
import ToastExito from '@/components/ToastExito'

interface Props {
  isOpen:    boolean
  cliente:   any
  onClose:   () => void
  onSuccess: () => void
}

interface Sucursal { id: string; nombre: string }
interface Paquete  { id: string; nombre: string; precio: number }

const SEXOS        = ['Masculino', 'Femenino', 'Prefiero no decir']
const RENOVACIONES = ['Mensual', 'Trimestral', 'Semestral', 'Anual']
const FORMAS_PAGO  = ['Efectivo', 'Tarjeta', 'Transferencia', 'OXXO']
const ESTATUSES    = ['Activo', 'Inactivo', 'Vencido']

const inputCls  = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 bg-gray-50 transition placeholder:text-gray-400"
const selectCls = `${inputCls} appearance-none cursor-pointer`

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

export default function DrawerEditarCliente({ isOpen, cliente, onClose, onSuccess }: Props) {
  const [loading,    setLoading]    = useState(false)
  const [toast,      setToast]      = useState(false)
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
    estatus:         'Activo',
    nps:             '',
  })

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  // Precargar datos del cliente
  useEffect(() => {
    if (!cliente || !isOpen) return

    // Separar nombre completo en partes si no hay primer_apellido
    const partes = cliente.nombre_completo?.split(' ') || []
    setForm({
      nombre:           partes[0] || '',
      primer_apellido:  cliente.primer_apellido || partes[1] || '',
      segundo_apellido: cliente.segundo_apellido || partes[2] || '',
      email:            cliente.email || '',
      telefono:         cliente.telefono || '',
      fecha_nacimiento: cliente.fecha_nacimiento ? cliente.fecha_nacimiento.slice(0,10) : '',
      sexo:             cliente.sexo || '',
      sucursal_id:      cliente.sucursal_id || '',
      paquete_id:       cliente.paquete_id  || '',
      renovacion:       cliente.renovacion  || '',
      forma_pago:       cliente.forma_pago  || '',
      estatus:          cliente.estatus     || 'Activo',
      nps:              cliente.nps?.toString() || '',
    })
  }, [cliente, isOpen])

  // Cargar sucursales y paquetes
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

  const handleGuardar = async () => {
    if (!cliente || !form.nombre || !form.email) return
    setLoading(true)

    const paquete = paquetes.find(p => p.id === form.paquete_id)

    const { error } = await supabase.from('clientes').update({
      nombre_completo:  `${form.nombre} ${form.primer_apellido} ${form.segundo_apellido}`.trim(),
      primer_apellido:  form.primer_apellido,
      segundo_apellido: form.segundo_apellido,
      email:            form.email,
      telefono:         form.telefono,
      fecha_nacimiento: form.fecha_nacimiento || null,
      sexo:             form.sexo,
      sucursal_id:      form.sucursal_id || null,
      paquete_id:       form.paquete_id  || null,
      plan:             paquete?.nombre  || cliente.plan || '',
      renovacion:       form.renovacion,
      forma_pago:       form.forma_pago,
      estatus:          form.estatus,
      nps:              form.nps ? Number(form.nps) : null,
    }).eq('id', cliente.id)

    if (error) { alert('Error: ' + error.message); setLoading(false); return }

    setToast(true)
    onSuccess()
    setLoading(false)
  }

  if (!isOpen || !cliente) return null

  return (
    <>
      {toast && (
        <ToastExito
          titulo="Cliente actualizado"
          mensaje="Los datos del cliente se actualizaron correctamente."
          onClose={() => setToast(false)}
        />
      )}

      {/* Overlay */}
      <div onClick={onClose}
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" />

      {/* Drawer */}
      <div className="fixed top-0 right-0 z-50 h-full w-full max-w-lg bg-white shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-black text-gray-900">Editar cliente</h2>
            <p className="text-xs text-gray-400 mt-0.5">{cliente.nombre_completo}</p>
          </div>
          <button onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-400">
            <X size={18}/>
          </button>
        </div>

        {/* Formulario */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          <Field label="Nombre del cliente" required>
            <input placeholder="Nombre" className={inputCls}
              value={form.nombre} onChange={e => set('nombre', e.target.value)} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Primer Apellido">
              <input placeholder="Apellido" className={inputCls}
                value={form.primer_apellido} onChange={e => set('primer_apellido', e.target.value)} />
            </Field>
            <Field label="Segundo Apellido">
              <input placeholder="Apellido" className={inputCls}
                value={form.segundo_apellido} onChange={e => set('segundo_apellido', e.target.value)} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Correo" required>
              <input type="email" className={inputCls}
                value={form.email} onChange={e => set('email', e.target.value)} />
            </Field>
            <Field label="Teléfono">
              <input className={inputCls}
                value={form.telefono} onChange={e => set('telefono', e.target.value)} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha de nacimiento">
              <input type="date" className={inputCls}
                value={form.fecha_nacimiento} onChange={e => set('fecha_nacimiento', e.target.value)} />
            </Field>
            <Field label="Sexo">
              <select className={selectCls} value={form.sexo} onChange={e => set('sexo', e.target.value)}>
                <option value="">Seleccionar</option>
                {SEXOS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Sucursal">
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

          <div className="grid grid-cols-2 gap-3">
            <Field label="Estatus">
              <select className={selectCls} value={form.estatus} onChange={e => set('estatus', e.target.value)}>
                {ESTATUSES.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </Field>
            <Field label="NPS (0-10)">
              <input type="number" min="0" max="10" step="0.1" placeholder="4.3" className={inputCls}
                value={form.nps} onChange={e => set('nps', e.target.value)} />
            </Field>
          </div>

        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose}
            className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition">
            Cancelar
          </button>
          <button onClick={handleGuardar} disabled={loading || !form.nombre || !form.email}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition"
            style={{ backgroundColor: '#171B24' }}>
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </>
  )
}
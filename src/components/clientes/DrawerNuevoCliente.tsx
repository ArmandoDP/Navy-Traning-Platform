'use client'
import { useState, useEffect } from 'react'
import { supabase }            from '@/lib/supabase'
import { X, User, CreditCard, Calendar, Lock } from 'lucide-react'
import ToastExito              from '@/components/ToastExito'
import ModalInvitado           from './ModalInvitado'
import ModalPagoSucursal       from './ModalPagoSucursal'

interface Props {
  isOpen:    boolean
  onClose:   () => void
  onSuccess: () => void
}

interface Sucursal { id: string; nombre: string }
interface Paquete  { id: string; nombre: string; vigencia_dias?: number }

const SEXOS       = ['Masculino', 'Femenino', 'Prefiero no decir']
const FORMAS_PAGO = ['Efectivo', 'Tarjeta', 'Transferencia', 'OXXO', 'Terminal']

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

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <span className="text-gray-400">{icon}</span>
      <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">{children}</h3>
    </div>
  )
}

function generarPasswordTemporal(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return 'NAVY-' + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function calcularFechaFin(fechaInicio: string, diasVigencia: number): string {
  const d = new Date(fechaInicio)
  d.setDate(d.getDate() + diasVigencia)
  return d.toISOString().split('T')[0]
}

export default function DrawerNuevoCliente({ isOpen, onClose, onSuccess }: Props) {
  const [loading,       setLoading]       = useState(false)
  const [toast,         setToast]         = useState(false)
  const [nuevoId,       setNuevoId]       = useState<string | null>(null)
  const [nuevoCliente,  setNuevoCliente]  = useState<any | null>(null)
  const [modalPago,     setModalPago]     = useState(false)
  const [sucursales,    setSucursales]    = useState<Sucursal[]>([])
  const [paquetes,      setPaquetes]      = useState<Paquete[]>([])
  const [modalInvitado, setModalInvitado] = useState(false)
  const [titularId,     setTitularId]     = useState<string | null>(null)
  const [adquirirPaquete, setAdquirirPaquete] = useState(false)
  const [tipoRegistro,  setTipoRegistro]  = useState<'nuevo' | 'migracion'>('nuevo')

  const [form, setForm] = useState({
    nombre:                 '',
    primer_apellido:        '',
    segundo_apellido:       '',
    email:                  '',
    telefono:               '',
    fecha_nacimiento:       '',
    sexo:                   '',
    sucursal_id:            '',
    paquete_id:             '',
    forma_pago:             '',
    fecha_inicio_membresia: new Date().toISOString().split('T')[0],
    fecha_fin_membresia:    '',
    dias_renovacion:        '',
    fecha_alta_original:    '',
    notas_migracion:        '',
  })

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const paqueteSeleccionado = paquetes.find(p => p.id === form.paquete_id)
  const diasRestantes = form.fecha_fin_membresia
    ? Math.max(0, Math.ceil((new Date(form.fecha_fin_membresia).getTime() - Date.now()) / 86400000))
    : null

  useEffect(() => {
    if (!isOpen) return
    setTipoRegistro('nuevo')
    setAdquirirPaquete(false)
    setNuevoCliente(null)
    supabase.from('sucursales').select('id, nombre').eq('estatus', 'Activa').order('nombre')
      .then(({ data: sucs }) => { if (sucs) setSucursales(sucs) })
  }, [isOpen])

  useEffect(() => {
    if (!form.sucursal_id) { setPaquetes([]); return }
    supabase.from('paquetes')
      .select('id, nombre, vigencia_dias, max_usuarios, paquete_precios!inner(sucursal_id)')
      .eq('estatus', 'Activo')
      .eq('paquete_precios.sucursal_id', form.sucursal_id)
      .order('nombre')
      .then(({ data: pqs }) => { if (pqs) setPaquetes(pqs) })
    setForm(p => ({ ...p, paquete_id: '', fecha_fin_membresia: '' }))
  }, [form.sucursal_id])

  useEffect(() => {
    const paquete = paquetes.find(p => p.id === form.paquete_id)
    if (paquete?.vigencia_dias && form.fecha_inicio_membresia) {
      setForm(p => ({ ...p, fecha_fin_membresia: calcularFechaFin(form.fecha_inicio_membresia, paquete.vigencia_dias ?? 30) }))
    }
  }, [form.paquete_id, form.fecha_inicio_membresia, paquetes])

  const resetForm = () => {
    setForm({
      nombre: '', primer_apellido: '', segundo_apellido: '',
      email: '', telefono: '', fecha_nacimiento: '', sexo: '',
      sucursal_id: '', paquete_id: '', forma_pago: '',
      fecha_inicio_membresia: new Date().toISOString().split('T')[0],
      fecha_fin_membresia: '', dias_renovacion: '',
      fecha_alta_original: '', notas_migracion: '',
    })
    setTipoRegistro('nuevo')
    setAdquirirPaquete(false)
    setNuevoCliente(null)
  }

  const crearClienteEnBD = async () => {
    const passwordTemporal = generarPasswordTemporal()
    const paquete          = paquetes.find(p => p.id === form.paquete_id)

    // 1. Crear en Auth
    let supabaseUserId: string | null = null
    try {
      const res  = await fetch('/api/clientes/crear-usuario', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: form.email, password: passwordTemporal }),
      })
      const data = await res.json()
      supabaseUserId = data.userId || null
    } catch {
      console.warn('No se pudo crear usuario Auth')
    }

    // 2. Insertar en clientes
    const { data: cli, error } = await supabase.from('clientes').insert([{
      id:                    supabaseUserId || undefined,
      nombre_completo:       `${form.nombre} ${form.primer_apellido} ${form.segundo_apellido}`.trim(),
      primer_apellido:       form.primer_apellido,
      segundo_apellido:      form.segundo_apellido,
      email:                 form.email,
      telefono:              form.telefono,
      fecha_nacimiento:      form.fecha_nacimiento || null,
      sexo:                  form.sexo,
      sucursal_id:           form.sucursal_id || null,
      paquete_id:            tipoRegistro === 'migracion' ? (form.paquete_id || null) : null,
      plan:                  tipoRegistro === 'migracion' ? (paquete?.nombre || '') : '',
      forma_pago:            form.forma_pago,
      estatus:               'Activo',
      origen:                tipoRegistro === 'migracion' ? 'Migración' : 'Nuevo',
      supabase_user_id:      supabaseUserId,
      password_temporal:     passwordTemporal,
      debe_cambiar_password: true,
      fecha_alta_original:   tipoRegistro === 'migracion'
        ? (form.fecha_alta_original || new Date().toISOString().split('T')[0])
        : new Date().toISOString().split('T')[0],
    }]).select().single()

    if (error) throw new Error(error.message)

    // 3. Correo de bienvenida
    await fetch('/api/correo/bienvenida-cliente', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email: form.email, nombre: form.nombre }),
    })

    // 4. Migración: membresía sin pago
    if (tipoRegistro === 'migracion' && form.paquete_id && form.fecha_fin_membresia) {
      await supabase.from('membresias').insert([{
        cliente_id:    cli.id,
        paquete_id:    form.paquete_id,
        fecha_inicio:  form.fecha_inicio_membresia,
        fecha_fin:     form.fecha_fin_membresia,
        estatus:       new Date(form.fecha_fin_membresia) > new Date() ? 'Activa' : 'Vencida',
        precio_pagado: 0,
        origen:        'Migración',
        notas:         form.notas_migracion || null,
      }])
      await supabase.from('clientes').update({ fecha_venc_plan: form.fecha_fin_membresia }).eq('id', cli.id)
    }

    return cli
  }

  const handleCrear = async () => {
    if (!form.nombre || !form.email) return
    setLoading(true)

    try {
      const cli = await crearClienteEnBD()

      // Paquete con max_usuarios 2 → invitado
      const paqueteCompleto = paquetes.find(p => p.id === form.paquete_id) as any
      if (paqueteCompleto?.max_usuarios === 2 && cli) {
        setTitularId(cli.id)
        setModalInvitado(true)
        setLoading(false)
        return
      }

      setNuevoId(cli?.id || null)
      setLoading(false)

      if (tipoRegistro === 'nuevo' && adquirirPaquete) {
        // Abrir ModalPagoSucursal con el cliente recién creado
        setNuevoCliente(cli)
        setModalPago(true)
      } else {
        setToast(true)
        onSuccess()
        onClose()
        resetForm()
      }
    } catch (e: any) {
      alert('Error: ' + e.message)
      setLoading(false)
    }
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

      {modalInvitado && titularId && (
        <ModalInvitado
          titularId={titularId}
          onClose={() => {
            setModalInvitado(false)
            onSuccess()
            onClose()
            resetForm()
          }}
        />
      )}

      {nuevoCliente && (
        <ModalPagoSucursal
          isOpen={modalPago}
          cliente={nuevoCliente}
          onClose={() => { setModalPago(false); setNuevoCliente(null); onClose(); resetForm() }}
          onSuccess={() => {
            setModalPago(false); setNuevoCliente(null)
            setToast(true); onSuccess(); onClose(); resetForm()
          }}
        />
      )}

      <div onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`} />

      <div className={`fixed top-0 right-0 z-50 h-full w-full max-w-lg bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-black text-gray-900">Nuevo cliente</h2>
            <p className="text-xs text-gray-400 mt-0.5">Alta de cliente</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-400">
            <X size={18}/>
          </button>
        </div>

        {/* Tipo de registro */}
        <div className="flex gap-2 bg-gray-100 rounded-xl p-1 mx-6 mt-3">
          <button type="button" onClick={() => setTipoRegistro('nuevo')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
              tipoRegistro === 'nuevo' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
            }`}>
            ✨ Nuevo cliente
          </button>
          <button type="button" onClick={() => setTipoRegistro('migracion')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
              tipoRegistro === 'migracion' ? 'bg-white shadow text-gray-900' : 'text-gray-500'
            }`}>
            📦 Migración
          </button>
        </div>

        {/* Formulario */}
        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-4">

          <SectionTitle icon={<User size={13}/>}>Datos personales</SectionTitle>

          <Field label="Nombre" required>
            <input placeholder="Nombre" className={inputCls}
              value={form.nombre} onChange={e => set('nombre', e.target.value)} />
          </Field>

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

          <Field label="Sucursal" required>
            <select className={selectCls} value={form.sucursal_id} onChange={e => set('sucursal_id', e.target.value)}>
              <option value="">Seleccionar</option>
              {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </Field>

          {/* Toggle adquirir paquete — solo nuevo */}
          {tipoRegistro === 'nuevo' && (
            <div
              className={`flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer transition ${
                adquirirPaquete ? 'bg-gray-900 border-gray-900' : 'bg-gray-50 border-gray-200'
              }`}
              onClick={() => setAdquirirPaquete(v => !v)}>
              <div>
                <p className={`text-sm font-bold ${adquirirPaquete ? 'text-white' : 'text-gray-700'}`}>
                  Adquirir paquete
                </p>
                <p className={`text-xs mt-0.5 ${adquirirPaquete ? 'text-gray-400' : 'text-gray-400'}`}>
                  {adquirirPaquete ? 'Se abrirá el cobro al crear el cliente' : 'El cliente pagará después'}
                </p>
              </div>
              <div className={`relative w-11 h-6 rounded-full transition-colors ${adquirirPaquete ? 'bg-white/20' : 'bg-gray-200'}`}>
                <span className={`absolute top-1 w-4 h-4 rounded-full shadow transition-all ${
                  adquirirPaquete ? 'left-6 bg-white' : 'left-1 bg-white'
                }`} />
              </div>
            </div>
          )}

          {/* Membresía — solo migración */}
          {tipoRegistro === 'migracion' && (
            <>
              <SectionTitle icon={<CreditCard size={13}/>}>Membresía</SectionTitle>

              <Field label="Paquete">
                <select className={selectCls} value={form.paquete_id}
                  onChange={e => set('paquete_id', e.target.value)}
                  disabled={!form.sucursal_id}>
                  <option value="">{!form.sucursal_id ? 'Primero selecciona una sucursal' : 'Seleccionar paquete'}</option>
                  {paquetes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Inicio real">
                  <input type="date" className={inputCls}
                    value={form.fecha_inicio_membresia}
                    onChange={e => set('fecha_inicio_membresia', e.target.value)} />
                </Field>
                <Field label="Fecha vencimiento">
                  <input type="date" className={inputCls}
                    value={form.fecha_fin_membresia}
                    onChange={e => set('fecha_fin_membresia', e.target.value)} />
                </Field>
              </div>

              {diasRestantes !== null && form.paquete_id && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold ${
                  diasRestantes > 30 ? 'bg-emerald-50 text-emerald-600' :
                  diasRestantes > 7  ? 'bg-amber-50 text-amber-600' :
                  'bg-red-50 text-red-500'
                }`}>
                  <Calendar size={12} />
                  {diasRestantes} días restantes de membresía
                  {paqueteSeleccionado && ` · ${paqueteSeleccionado.nombre}`}
                </div>
              )}

              <Field label="Forma de pago">
                <select className={selectCls} value={form.forma_pago} onChange={e => set('forma_pago', e.target.value)}>
                  <option value="">Seleccionar</option>
                  {FORMAS_PAGO.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </Field>

              <SectionTitle icon={<Calendar size={13}/>}>Datos de migración</SectionTitle>
              <Field label="Fecha de alta original">
                <input type="date" className={inputCls}
                  value={form.fecha_alta_original}
                  onChange={e => set('fecha_alta_original', e.target.value)} />
              </Field>
              <Field label="Notas de migración">
                <textarea rows={2}
                  placeholder="Ej: Cliente migrado del sistema anterior, tenía 15 días restantes..."
                  className={`${inputCls} resize-none`}
                  value={form.notas_migracion}
                  onChange={e => set('notas_migracion', e.target.value)} />
              </Field>
            </>
          )}

          <SectionTitle icon={<Lock size={13}/>}>Acceso app</SectionTitle>
          <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 space-y-1">
            <p className="text-xs text-gray-500">Al crear el cliente se le enviará un correo de bienvenida con instrucciones para acceder a la app.</p>
            <p className="text-xs text-gray-700">
              <span className="font-bold">Usuario:</span> {form.email || 'correo del cliente'}
            </p>
            <p className="text-[11px] text-emerald-600 mt-1">
              ✓ El cliente entrará con su correo — recibirá un código OTP
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-white">
          <button onClick={() => { onClose(); resetForm() }}
            className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition">
            Cancelar
          </button>
          <button onClick={handleCrear}
            disabled={loading || !form.nombre || !form.email}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition"
            style={{ backgroundColor: '#171B24' }}>
            {loading
              ? 'Creando...'
              : tipoRegistro === 'migracion'
                ? 'Migrar cliente'
                : adquirirPaquete
                  ? 'Crear cliente y pagar →'
                  : 'Crear cliente'
            }
          </button>
        </div>
      </div>
    </>
  )
}
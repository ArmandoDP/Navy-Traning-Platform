'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase }       from '@/lib/supabase'
import { X, User, CreditCard, Calendar, Lock, CheckCircle2, AlertCircle, Loader2, Search } from 'lucide-react'
import ToastExito         from '@/components/ToastExito'
import ModalInvitado      from './ModalInvitado'
import ModalPagoSucursal  from './ModalPagoSucursal'

interface Props {
  isOpen:    boolean
  onClose:   () => void
  onSuccess: () => void
}

interface Sucursal { id: string; nombre: string }
interface Paquete  { id: string; nombre: string; vigencia_dias?: number; max_usuarios?: number }

const SEXOS       = ['Masculino', 'Femenino', 'Prefiero no decir']
const FORMAS_PAGO = ['Efectivo', 'Tarjeta', 'Transferencia', 'OXXO', 'Terminal']

function generarPasswordTemporal(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return 'NAVY-' + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function calcularFechaFin(fechaInicio: string, diasVigencia: number): string {
  const d = new Date(fechaInicio)
  d.setDate(d.getDate() + diasVigencia)
  return d.toISOString().split('T')[0]
}

function validarEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// ── Sub-componentes ──────────────────────────────────────────────────────────

function Field({ label, required, error, hint, children }: {
  label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={11}/>{error}</p>}
      {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

function Section({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2.5 pt-2 pb-1">
      <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">{icon}</div>
      <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">{title}</h3>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  )
}

const inputBase = "w-full border rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none transition bg-white placeholder:text-gray-400"
const inputCls  = `${inputBase} border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50`
const inputErr  = `${inputBase} border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-50 bg-red-50/30`
const inputOk   = `${inputBase} border-emerald-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-50`
const selectCls = `${inputCls} appearance-none cursor-pointer`

// ── Estado del correo ────────────────────────────────────────────────────────
type EmailEstado = 'idle' | 'checking' | 'nuevo' | 'duplicado' | 'invalido'

export default function DrawerNuevoCliente({ isOpen, onClose, onSuccess }: Props) {
  const [loading,         setLoading]         = useState(false)
  const [toast,           setToast]           = useState(false)
  const [nuevoId,         setNuevoId]         = useState<string | null>(null)
  const [nuevoCliente,    setNuevoCliente]    = useState<any | null>(null)
  const [modalPago,       setModalPago]       = useState(false)
  const [sucursales,      setSucursales]      = useState<Sucursal[]>([])
  const [paquetes,        setPaquetes]        = useState<Paquete[]>([])
  const [modalInvitado,   setModalInvitado]   = useState(false)
  const [titularId,       setTitularId]       = useState<string | null>(null)
  const [adquirirPaquete, setAdquirirPaquete] = useState(false)
  const [tipoRegistro,    setTipoRegistro]    = useState<'nuevo' | 'migracion'>('nuevo')
  const [emailEstado,     setEmailEstado]     = useState<EmailEstado>('idle')
  const [clienteDuplicado, setClienteDuplicado] = useState<any | null>(null)
  const emailTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [form, setForm] = useState({
    nombre: '', primer_apellido: '', segundo_apellido: '',
    email: '', telefono: '', fecha_nacimiento: '', sexo: '',
    sucursal_id: '', paquete_id: '', forma_pago: '',
    fecha_inicio_membresia: new Date().toISOString().split('T')[0],
    fecha_fin_membresia: '', fecha_alta_original: '', notas_migracion: '',
  })
  const [errores, setErrores] = useState<Record<string, string>>({})

  const set = (k: string, v: string) => {
    setForm(p => ({ ...p, [k]: v }))
    setErrores(p => ({ ...p, [k]: '' }))
  }

  const paqueteSeleccionado = paquetes.find(p => p.id === form.paquete_id)
  const diasRestantes = form.fecha_fin_membresia
    ? Math.max(0, Math.ceil((new Date(form.fecha_fin_membresia).getTime() - Date.now()) / 86400000))
    : null

  // Cargar sucursales al abrir
  useEffect(() => {
    if (!isOpen) return
    resetForm()
    supabase.from('sucursales').select('id, nombre').eq('estatus', 'Activa').order('nombre')
      .then(({ data }) => { if (data) setSucursales(data) })
  }, [isOpen])

  // Cargar paquetes al cambiar sucursal
  useEffect(() => {
    if (!form.sucursal_id) { setPaquetes([]); return }
    supabase.from('paquetes')
      .select('id, nombre, vigencia_dias, max_usuarios, paquete_precios!inner(sucursal_id)')
      .eq('estatus', 'Activo')
      .eq('paquete_precios.sucursal_id', form.sucursal_id)
      .order('nombre')
      .then(({ data }) => { if (data) setPaquetes(data) })
    setForm(p => ({ ...p, paquete_id: '', fecha_fin_membresia: '' }))
  }, [form.sucursal_id])

  // Calcular fecha fin automáticamente
  useEffect(() => {
    const paquete = paquetes.find(p => p.id === form.paquete_id)
    if (paquete?.vigencia_dias && form.fecha_inicio_membresia) {
      setForm(p => ({ ...p, fecha_fin_membresia: calcularFechaFin(form.fecha_inicio_membresia, paquete.vigencia_dias ?? 30) }))
    }
  }, [form.paquete_id, form.fecha_inicio_membresia, paquetes])

  // Validar correo en tiempo real con debounce
  useEffect(() => {
    if (emailTimer.current) clearTimeout(emailTimer.current)
    const email = form.email.trim()
    if (!email) { setEmailEstado('idle'); setClienteDuplicado(null); return }
    if (!validarEmail(email)) { setEmailEstado('invalido'); return }

    setEmailEstado('checking')
    emailTimer.current = setTimeout(async () => {
      const { data } = await supabase
        .from('clientes')
        .select('id, nombre_completo, email, plan, sucursales(nombre)')
        .eq('email', email)
        .maybeSingle()
      if (data) {
        setEmailEstado('duplicado')
        setClienteDuplicado(data)
      } else {
        setEmailEstado('nuevo')
        setClienteDuplicado(null)
      }
    }, 600)
  }, [form.email])

  const resetForm = () => {
    setForm({
      nombre: '', primer_apellido: '', segundo_apellido: '',
      email: '', telefono: '', fecha_nacimiento: '', sexo: '',
      sucursal_id: '', paquete_id: '', forma_pago: '',
      fecha_inicio_membresia: new Date().toISOString().split('T')[0],
      fecha_fin_membresia: '', fecha_alta_original: '', notas_migracion: '',
    })
    setErrores({})
    setEmailEstado('idle')
    setClienteDuplicado(null)
    setTipoRegistro('nuevo')
    setAdquirirPaquete(false)
    setNuevoCliente(null)
  }

  const validarForm = (): boolean => {
    const err: Record<string, string> = {}
    if (!form.nombre.trim())        err.nombre = 'El nombre es requerido'
    if (!form.primer_apellido.trim()) err.primer_apellido = 'El apellido es requerido'
    if (!form.email.trim())         err.email = 'El correo es requerido'
    else if (!validarEmail(form.email)) err.email = 'Correo no válido'
    else if (emailEstado === 'duplicado') err.email = 'Este correo ya está registrado'
    if (!form.sucursal_id)          err.sucursal_id = 'Selecciona una sucursal'
    setErrores(err)
    return Object.keys(err).length === 0
  }

  const crearClienteEnBD = async () => {
    const passwordTemporal = generarPasswordTemporal()
    const paquete = paquetes.find(p => p.id === form.paquete_id)

    // 1. Crear en Auth — con fallback si ya existe
    let supabaseUserId: string | null = null
    const resAuth = await fetch('/api/clientes/crear-usuario', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email: form.email, password: passwordTemporal }),
    })
    const dataAuth = await resAuth.json()

    if (dataAuth.userId) {
      supabaseUserId = dataAuth.userId
    } else if (dataAuth.error?.toLowerCase().includes('already registered')) {
      // Ya existe en Auth — buscar UUID
      const resBuscar = await fetch('/api/clientes/buscar-usuario', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: form.email }),
      })
      const dataBuscar = await resBuscar.json()
      supabaseUserId = dataBuscar.userId || null
    }

    if (!supabaseUserId) {
      throw new Error('No se pudo crear el acceso a la app. Verifica el correo e intenta de nuevo.')
    }

    // 2. Insertar en clientes
    const { data: cli, error } = await supabase.from('clientes').insert([{
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
    if (!validarForm()) return
    if (emailEstado === 'checking') return
    setLoading(true)
    try {
      const cli = await crearClienteEnBD()
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
        setNuevoCliente(cli)
        setModalPago(true)
      } else {
        setToast(true)
        onSuccess()
        onClose()
        resetForm()
      }
    } catch (e: any) {
      setErrores({ general: e.message })
      setLoading(false)
    }
  }

  // ── Email status icon ──────────────────────────────────────────────────────
  const EmailIcon = () => {
    if (emailEstado === 'checking') return <Loader2 size={14} className="animate-spin text-gray-400" />
    if (emailEstado === 'nuevo')    return <CheckCircle2 size={14} className="text-emerald-500" />
    if (emailEstado === 'duplicado') return <AlertCircle size={14} className="text-red-500" />
    if (emailEstado === 'invalido') return <AlertCircle size={14} className="text-amber-500" />
    return null
  }

  const emailInputCls = emailEstado === 'duplicado' || emailEstado === 'invalido' ? inputErr
    : emailEstado === 'nuevo' ? inputOk : inputCls

  const canCreate = emailEstado === 'nuevo' || emailEstado === 'idle'

  return (
    <>
      {toast && (
        <ToastExito titulo="Cliente creado" mensaje="El cliente ya puede acceder a la app."
          onClose={() => setToast(false)}
          onVer={nuevoId ? () => window.location.href = `/dashboard/clientes/${nuevoId}` : undefined} />
      )}
      {modalInvitado && titularId && (
        <ModalInvitado titularId={titularId}
          onClose={() => { setModalInvitado(false); onSuccess(); onClose(); resetForm() }} />
      )}
      {nuevoCliente && (
        <ModalPagoSucursal isOpen={modalPago} cliente={nuevoCliente}
          onClose={() => { setModalPago(false); setNuevoCliente(null); onClose(); resetForm() }}
          onSuccess={() => { setModalPago(false); setNuevoCliente(null); setToast(true); onSuccess(); onClose(); resetForm() }} />
      )}

      {/* Backdrop */}
      <div onClick={onClose} className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} />

      {/* Drawer */}
      <div className={`fixed top-0 right-0 z-50 h-full w-full max-w-lg bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gray-900 flex items-center justify-center">
              <User size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900">Nuevo cliente</h2>
              <p className="text-xs text-gray-400">Alta de cliente en Navy</p>
            </div>
          </div>
          <button onClick={() => { onClose(); resetForm() }}
            className="p-2 hover:bg-gray-100 rounded-xl transition text-gray-400">
            <X size={18}/>
          </button>
        </div>

        {/* Tabs tipo registro */}
        <div className="flex gap-1.5 bg-gray-100 rounded-xl p-1 mx-6 mt-4">
          {[
            { key: 'nuevo',     label: '✨ Nuevo cliente',  desc: 'Primera vez en Navy' },
            { key: 'migracion', label: '📦 Migración',      desc: 'Ya era cliente antes' },
          ].map(t => (
            <button key={t.key} type="button"
              onClick={() => setTipoRegistro(t.key as any)}
              className={`flex-1 py-2 px-3 rounded-lg text-left transition ${
                tipoRegistro === t.key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}>
              <p className="text-xs font-bold">{t.label}</p>
              <p className="text-[10px] text-gray-400">{t.desc}</p>
            </button>
          ))}
        </div>

        {/* Formulario */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          <Section icon={<User size={13}/>} title="Datos personales" />

          {/* Correo PRIMERO — validación en tiempo real */}
          <Field label="Correo electrónico" required
            error={errores.email}
            hint={emailEstado === 'nuevo' ? '✓ Correo disponible' : emailEstado === 'checking' ? 'Verificando...' : undefined}>
            <div className="relative">
              <input type="email" placeholder="nombre@email.com"
                className={emailInputCls}
                value={form.email}
                onChange={e => set('email', e.target.value.toLowerCase().trim())} />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <EmailIcon />
              </div>
            </div>
          </Field>

          {/* Alerta correo duplicado */}
          {emailEstado === 'duplicado' && clienteDuplicado && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle size={14} className="text-amber-600 flex-shrink-0" />
                <p className="text-xs font-bold text-amber-700">Este correo ya está registrado</p>
              </div>
              <div className="bg-white rounded-lg px-3 py-2.5 border border-amber-100">
                <p className="text-sm font-bold text-gray-900">{clienteDuplicado.nombre_completo}</p>
                <p className="text-xs text-gray-500">{clienteDuplicado.email}</p>
                {clienteDuplicado.plan && <p className="text-xs text-indigo-600 font-bold mt-0.5">{clienteDuplicado.plan}</p>}
                {clienteDuplicado.sucursales?.nombre && <p className="text-xs text-gray-400">{clienteDuplicado.sucursales.nombre}</p>}
              </div>
              <p className="text-[11px] text-amber-600">Si quieres editar este cliente, búscalo en el módulo de Clientes.</p>
            </div>
          )}

          <Field label="Nombre" required error={errores.nombre}>
            <input placeholder="Nombre(s)" className={errores.nombre ? inputErr : inputCls}
              value={form.nombre} onChange={e => set('nombre', e.target.value)} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Primer apellido" required error={errores.primer_apellido}>
              <input placeholder="Apellido" className={errores.primer_apellido ? inputErr : inputCls}
                value={form.primer_apellido} onChange={e => set('primer_apellido', e.target.value)} />
            </Field>
            <Field label="Segundo apellido">
              <input placeholder="Apellido" className={inputCls}
                value={form.segundo_apellido} onChange={e => set('segundo_apellido', e.target.value)} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Teléfono">
              <input placeholder="55 1234 5678" className={inputCls}
                value={form.telefono} onChange={e => set('telefono', e.target.value)} />
            </Field>
            <Field label="Sexo">
              <select className={selectCls} value={form.sexo} onChange={e => set('sexo', e.target.value)}>
                <option value="">Seleccionar</option>
                {SEXOS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Fecha de nacimiento">
            <input type="date" className={inputCls}
              value={form.fecha_nacimiento} onChange={e => set('fecha_nacimiento', e.target.value)} />
          </Field>

          <Field label="Sucursal" required error={errores.sucursal_id}>
            <select className={errores.sucursal_id ? inputErr.replace(inputBase, inputBase) : selectCls}
              value={form.sucursal_id} onChange={e => set('sucursal_id', e.target.value)}>
              <option value="">Seleccionar sucursal</option>
              {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </Field>

          {/* Toggle adquirir paquete — solo nuevo */}
          {tipoRegistro === 'nuevo' && (
            <button type="button"
              onClick={() => setAdquirirPaquete(v => !v)}
              className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border-2 transition ${
                adquirirPaquete
                  ? 'bg-gray-900 border-gray-900 text-white'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
              }`}>
              <div className="text-left">
                <p className="text-sm font-bold">💳 Adquirir paquete ahora</p>
                <p className={`text-xs mt-0.5 ${adquirirPaquete ? 'text-gray-400' : 'text-gray-400'}`}>
                  {adquirirPaquete ? 'Se abrirá el cobro al crear el cliente' : 'El cliente pagará después'}
                </p>
              </div>
              <div className={`relative w-10 h-5.5 rounded-full transition-colors flex-shrink-0 ${adquirirPaquete ? 'bg-white/20' : 'bg-gray-200'}`}
                style={{ height: 22 }}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full shadow transition-all ${
                  adquirirPaquete ? 'left-5 bg-white' : 'left-0.5 bg-white'}`} />
              </div>
            </button>
          )}

          {/* Membresía — solo migración */}
          {tipoRegistro === 'migracion' && (
            <>
              <Section icon={<CreditCard size={13}/>} title="Membresía a migrar" />

              <Field label="Paquete">
                <select className={selectCls} value={form.paquete_id}
                  onChange={e => set('paquete_id', e.target.value)} disabled={!form.sucursal_id}>
                  <option value="">{!form.sucursal_id ? 'Primero selecciona sucursal' : 'Seleccionar paquete'}</option>
                  {paquetes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Fecha inicio real">
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
                <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold ${
                  diasRestantes > 30 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                  diasRestantes > 7  ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                  'bg-red-50 text-red-600 border border-red-100'
                }`}>
                  <Calendar size={12} />
                  {diasRestantes} días restantes · {paqueteSeleccionado?.nombre}
                </div>
              )}

              <Field label="Forma de pago">
                <select className={selectCls} value={form.forma_pago} onChange={e => set('forma_pago', e.target.value)}>
                  <option value="">Seleccionar</option>
                  {FORMAS_PAGO.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </Field>

              <Section icon={<Calendar size={13}/>} title="Datos de migración" />

              <Field label="Fecha de alta original">
                <input type="date" className={inputCls}
                  value={form.fecha_alta_original}
                  onChange={e => set('fecha_alta_original', e.target.value)} />
              </Field>
              <Field label="Notas">
                <textarea rows={2} placeholder="Ej: Cliente migrado del sistema anterior, tenía 15 días restantes..."
                  className={`${inputCls} resize-none`}
                  value={form.notas_migracion}
                  onChange={e => set('notas_migracion', e.target.value)} />
              </Field>
            </>
          )}

          {/* Acceso app */}
          <Section icon={<Lock size={13}/>} title="Acceso a la app" />
          <div className={`rounded-xl px-4 py-3 space-y-1.5 border ${
            emailEstado === 'nuevo' ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-100'
          }`}>
            {emailEstado === 'nuevo' ? (
              <>
                <p className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 size={12}/> Acceso listo para crear
                </p>
                <p className="text-xs text-emerald-600">
                  Se creará la cuenta con: <span className="font-bold">{form.email}</span>
                </p>
                <p className="text-[11px] text-emerald-500">✓ El cliente entrará con OTP — sin contraseña</p>
              </>
            ) : (
              <>
                <p className="text-xs text-gray-500">Al crear el cliente recibirá un correo de bienvenida.</p>
                <p className="text-xs text-gray-600">
                  <span className="font-bold">Acceso:</span> {form.email || 'correo del cliente'}
                </p>
              </>
            )}
          </div>

          {/* Error general */}
          {errores.general && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2">
              <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5"/>
              <p className="text-xs text-red-600">{errores.general}</p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-white">
          <button onClick={() => { onClose(); resetForm() }}
            className="px-5 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition">
            Cancelar
          </button>
          <button onClick={handleCrear}
            disabled={loading || !form.nombre || !form.email || !canCreate || emailEstado === 'checking'}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition flex items-center justify-center gap-2"
            style={{ backgroundColor: '#171B24' }}>
            {loading ? (
              <><Loader2 size={15} className="animate-spin"/> Creando...</>
            ) : emailEstado === 'checking' ? (
              <><Loader2 size={15} className="animate-spin"/> Verificando correo...</>
            ) : tipoRegistro === 'migracion' ? '📦 Migrar cliente'
              : adquirirPaquete ? '💳 Crear y cobrar →'
              : '✨ Crear cliente'
            }
          </button>
        </div>
      </div>
    </>
  )
}
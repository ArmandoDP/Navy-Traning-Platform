'use client'
import { useState, useEffect } from 'react'
import { supabase }            from '@/lib/supabase'
import { X, User, CreditCard, Lock, Calendar, CheckCircle2, XCircle, RefreshCw, Mail } from 'lucide-react'
import ToastExito              from '@/components/ToastExito'

interface Props {
  isOpen:    boolean
  cliente:   any
  onClose:   () => void
  onSuccess: () => void
}

interface Sucursal { id: string; nombre: string }
interface Paquete  { id: string; nombre: string; vigencia_dias?: number }

const SEXOS       = ['Masculino', 'Femenino', 'Prefiero no decir']
const FORMAS_PAGO = ['Efectivo', 'Tarjeta', 'Transferencia', 'OXXO', 'Terminal']
const ESTATUSES   = ['Activo', 'Inactivo', 'Vencido']

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

type Tab = 'datos' | 'membresia' | 'acceso'

export default function DrawerEditarCliente({ isOpen, cliente, onClose, onSuccess }: Props) {
  const [loading,    setLoading]    = useState(false)
  const [toast,      setToast]      = useState(false)
  const [tab,        setTab]        = useState<Tab>('datos')
  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [paquetes,   setPaquetes]   = useState<Paquete[]>([])
  const [membresia,  setMembresia]  = useState<any>(null)

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
    forma_pago:      '',
    estatus:         'Activo',
    nps:             '',
    fecha_alta_original: '',
  })

  const [formMemb, setFormMemb] = useState({
    fecha_inicio: '',
    fecha_fin:    '',
    estatus:      'Activa',
    notas:        '',
  })

  const set     = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))
  const setMemb = (k: string, v: string) => setFormMemb(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (!cliente || !isOpen) return
    setTab('datos')

    const partes = cliente.nombre_completo?.split(' ') || []
    setForm({
      nombre:              partes[0] || '',
      primer_apellido:     cliente.primer_apellido  || partes[1] || '',
      segundo_apellido:    cliente.segundo_apellido || partes[2] || '',
      email:               cliente.email            || '',
      telefono:            cliente.telefono         || '',
      fecha_nacimiento:    cliente.fecha_nacimiento?.slice(0,10) || '',
      sexo:                cliente.sexo             || '',
      sucursal_id:         cliente.sucursal_id      || '',
      paquete_id:          cliente.paquete_id       || '',
      forma_pago:          cliente.forma_pago       || '',
      estatus:             cliente.estatus          || 'Activo',
      nps:                 cliente.nps?.toString()  || '',
      fecha_alta_original: cliente.fecha_alta_original?.slice(0,10) || '',
    })

    // Cargar membresía activa
    supabase.from('membresias')
      .select('*, paquetes(nombre)')
      .eq('cliente_id', cliente.id)
      .eq('estatus', 'Activa')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) {
          setMembresia(data)
          setFormMemb({
            fecha_inicio: data.fecha_inicio || '',
            fecha_fin:    data.fecha_fin    || '',
            estatus:      data.estatus      || 'Activa',
            notas:        data.notas        || '',
          })
        } else {
          setMembresia(null)
          setFormMemb({ fecha_inicio: '', fecha_fin: '', estatus: 'Activa', notas: '' })
        }
      })
  }, [cliente, isOpen])

  useEffect(() => {
    if (!isOpen) return
    Promise.all([
      supabase.from('sucursales').select('id, nombre').eq('estatus', 'Activa').order('nombre'),
      supabase.from('paquetes').select('id, nombre, vigencia_dias').eq('estatus', 'Activo').order('nombre'),
    ]).then(([{ data: sucs }, { data: pqs }]) => {
      if (sucs) setSucursales(sucs)
      if (pqs)  setPaquetes(pqs)
    })
  }, [isOpen])

  const diasRestantes = formMemb.fecha_fin
    ? Math.max(0, Math.ceil((new Date(formMemb.fecha_fin).getTime() - Date.now()) / 86400000))
    : null

  const handleGuardar = async () => {
    if (!cliente || !form.nombre || !form.email) return
    setLoading(true)

    const paquete = paquetes.find(p => p.id === form.paquete_id)

    await supabase.from('clientes').update({
      nombre_completo:     `${form.nombre} ${form.primer_apellido} ${form.segundo_apellido}`.trim(),
      primer_apellido:     form.primer_apellido,
      segundo_apellido:    form.segundo_apellido,
      email:               form.email,
      telefono:            form.telefono,
      fecha_nacimiento:    form.fecha_nacimiento || null,
      sexo:                form.sexo,
      sucursal_id:         form.sucursal_id || null,
      paquete_id:          form.paquete_id  || null,
      plan:                paquete?.nombre  || cliente.plan || '',
      forma_pago:          form.forma_pago,
      estatus:             form.estatus,
      nps:                 form.nps ? Number(form.nps) : null,
      fecha_alta_original: form.fecha_alta_original || null,
    }).eq('id', cliente.id)

    // Actualizar membresía si existe
    if (membresia) {
      await supabase.from('membresias').update({
        paquete_id:   form.paquete_id || membresia.paquete_id,
        fecha_inicio: formMemb.fecha_inicio,
        fecha_fin:    formMemb.fecha_fin,
        estatus:      formMemb.estatus,
        notas:        formMemb.notas || null,
      }).eq('id', membresia.id)
    }

    setToast(true)
    onSuccess()
    setLoading(false)
  }

  if (!isOpen || !cliente) return null

  const esMigracion = cliente.origen === 'Migración'

  return (
    <>
      {toast && (
        <ToastExito
          titulo="Cliente actualizado"
          mensaje="Los datos del cliente se actualizaron correctamente."
          onClose={() => setToast(false)}
        />
      )}

      <div onClick={onClose} className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" />

      <div className="fixed top-0 right-0 z-50 h-full w-full max-w-lg bg-white shadow-2xl flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-gray-900">Editar cliente</h2>
              {esMigracion && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-600 uppercase tracking-wide">
                  Migración
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{cliente.nombre_completo}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-400">
            <X size={18}/>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {([
            { key: 'datos',    label: '👤 Datos' },
            { key: 'membresia',label: '💳 Membresía' },
            { key: 'acceso',   label: '🔐 Acceso' },
          ] as { key: Tab; label: string }[]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-3 text-xs font-bold transition border-b-2 ${
                tab === t.key ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* Tab Datos */}
          {tab === 'datos' && (
            <>
              <SectionTitle icon={<User size={13}/>}>Datos personales</SectionTitle>

              <Field label="Nombre" required>
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
                <Field label="Estatus">
                  <select className={selectCls} value={form.estatus} onChange={e => set('estatus', e.target.value)}>
                    {ESTATUSES.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Forma de pago">
                  <select className={selectCls} value={form.forma_pago} onChange={e => set('forma_pago', e.target.value)}>
                    <option value="">Seleccionar</option>
                    {FORMAS_PAGO.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </Field>
                <Field label="NPS (0-10)">
                  <input type="number" min="0" max="10" step="0.1" placeholder="4.3" className={inputCls}
                    value={form.nps} onChange={e => set('nps', e.target.value)} />
                </Field>
              </div>

              {esMigracion && (
                <Field label="Fecha de alta original">
                  <input type="date" className={inputCls}
                    value={form.fecha_alta_original} onChange={e => set('fecha_alta_original', e.target.value)} />
                </Field>
              )}
            </>
          )}

          {/* Tab Membresía */}
          {tab === 'membresia' && (
            <>
              <SectionTitle icon={<CreditCard size={13}/>}>Membresía activa</SectionTitle>

              {!membresia ? (
                <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl px-4 py-6 text-center">
                  <p className="text-sm text-gray-400">Sin membresía activa</p>
                  <p className="text-xs text-gray-300 mt-1">Asigna un paquete para crear una membresía</p>
                </div>
              ) : (
                <>
                  {/* Indicador días */}
                  {diasRestantes !== null && (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold ${
                      diasRestantes > 30 ? 'bg-emerald-50 text-emerald-600' :
                      diasRestantes > 7  ? 'bg-amber-50 text-amber-600' :
                      'bg-red-50 text-red-500'
                    }`}>
                      <Calendar size={12} />
                      {diasRestantes} días restantes
                      {membresia.paquetes?.nombre && ` · ${membresia.paquetes.nombre}`}
                      {esMigracion && (
                        <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-200 text-amber-700">
                          Migración
                        </span>
                      )}
                    </div>
                  )}

                  <Field label="Paquete">
                    <select className={selectCls} value={form.paquete_id} onChange={e => set('paquete_id', e.target.value)}>
                      <option value="">Seleccionar</option>
                      {paquetes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Fecha inicio">
                      <input type="date" className={inputCls}
                        value={formMemb.fecha_inicio} onChange={e => setMemb('fecha_inicio', e.target.value)} />
                    </Field>
                    <Field label="Fecha vencimiento">
                      <input type="date" className={inputCls}
                        value={formMemb.fecha_fin} onChange={e => setMemb('fecha_fin', e.target.value)} />
                    </Field>
                  </div>

                  <Field label="Estatus membresía">
                    <select className={selectCls} value={formMemb.estatus} onChange={e => setMemb('estatus', e.target.value)}>
                      {['Activa','Vencida','Pausada','Cancelada'].map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </Field>

                  <Field label="Notas">
                    <textarea rows={2} placeholder="Notas sobre la membresía..."
                      className={`${inputCls} resize-none`}
                      value={formMemb.notas} onChange={e => setMemb('notas', e.target.value)} />
                  </Field>
                </>
              )}
            </>
          )}

          {/* Tab Acceso */}
          {tab === 'acceso' && (
            <div className="space-y-5">

              {/* Hero card */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-700 p-6 text-white">
                <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/5" />
                <div className="absolute -right-2 -bottom-8 w-24 h-24 rounded-full bg-white/5" />
                <div className="relative">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                      <Lock size={18} className="text-white" />
                    </div>
                    <div>
                      <p className="font-black text-sm">Acceso a la App</p>
                      <p className="text-white/50 text-xs">Navy Training Center</p>
                    </div>
                  </div>
                  <p className="text-xs text-white/40 mb-1">Usuario</p>
                  <p className="text-sm font-bold text-white/90 truncate">{cliente.email}</p>
                </div>
              </div>

              {/* Status cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className={`rounded-xl p-4 border ${cliente.supabase_user_id ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${cliente.supabase_user_id ? 'bg-emerald-100' : 'bg-red-100'}`}>
                    <Lock size={15} className={cliente.supabase_user_id ? 'text-emerald-600' : 'text-red-500'} />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-wide text-gray-400 mb-0.5">Cuenta</p>
                  <p className={`text-xs font-bold ${cliente.supabase_user_id ? 'text-emerald-600' : 'text-red-500'}`}>
                    {cliente.supabase_user_id ? 'Creada' : 'Sin cuenta'}
                  </p>
                </div>

                <div className={`rounded-xl p-4 border ${!cliente.debe_cambiar_password && cliente.supabase_user_id ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${!cliente.debe_cambiar_password && cliente.supabase_user_id ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                    {!cliente.debe_cambiar_password && cliente.supabase_user_id
                      ? <CheckCircle2 size={15} className="text-emerald-600" />
                      : <XCircle size={15} className="text-amber-500" />
                    }
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-wide text-gray-400 mb-0.5">Contraseña</p>
                  <p className={`text-xs font-bold ${!cliente.debe_cambiar_password && cliente.supabase_user_id ? 'text-emerald-600' : 'text-amber-500'}`}>
                    {!cliente.debe_cambiar_password && cliente.supabase_user_id ? 'Cambiada' : 'Pendiente'}
                  </p>
                </div>

                <div className="rounded-xl p-4 border bg-gray-50 border-gray-100">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center mb-2">
                    <Calendar size={15} className="text-gray-500" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-wide text-gray-400 mb-0.5">Última sesión</p>
                  <p className="text-xs font-bold text-gray-600">
                    {cliente.ultima_sesion
                      ? new Date(cliente.ultima_sesion).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
                      : 'Nunca'}
                  </p>
                </div>
              </div>

              {/* Contraseña temporal */}
              {cliente.password_temporal && cliente.debe_cambiar_password && (
                <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50 px-5 py-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-2">Contraseña temporal activa</p>
                  <p className="font-mono text-xl font-black text-gray-900 tracking-[0.2em]">{cliente.password_temporal}</p>
                  <p className="text-xs text-amber-500 mt-1">El cliente aún no la ha cambiado</p>
                </div>
              )}

              {/* Acciones */}
              {cliente.supabase_user_id ? (
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Acciones</p>

                  <button
                    onClick={async () => {
                      const newPass = 'NAVY-' + Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('')
                      
                      await fetch(`https://knigqmxpenteolnwomir.supabase.co/auth/v1/admin/users/${cliente.supabase_user_id}`, {
                        method:  'PUT',
                        headers: {
                          'apikey':        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuaWdxbXhwZW50ZW9sbndvbWlyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQwODcyNiwiZXhwIjoyMDg5OTg0NzI2fQ.RXW5o9aLFfBesO9rysw8uohih6GWY6exdWjfkS4DUNE',
                          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuaWdxbXhwZW50ZW9sbndvbWlyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQwODcyNiwiZXhwIjoyMDg5OTg0NzI2fQ.RXW5o9aLFfBesO9rysw8uohih6GWY6exdWjfkS4DUNE',
                          'Content-Type':  'application/json',
                        },
                        body: JSON.stringify({ password: newPass }),
                      })

                      await supabase.from('clientes').update({
                        password_temporal:     newPass,
                        debe_cambiar_password: true,
                      }).eq('id', cliente.id)

                      alert(`Nueva contraseña temporal: ${newPass}`)
                      onSuccess()
                    }}
                    className="flex items-center gap-3 w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition group">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center transition">
                      <RefreshCw size={14} className="text-gray-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-gray-900">Resetear contraseña</p>
                      <p className="text-xs text-gray-400">Genera nueva contraseña temporal</p>
                    </div>
                  </button>

                  <button
                    onClick={async () => {
                      const pass   = cliente.password_temporal || '—'
                      const nombre = cliente.nombre_completo?.split(' ')[0] || ''
                      const html = `<div style="font-family:sans-serif;max-width:560px;margin:40px auto"><div style="background:#171B24;border-radius:20px 20px 0 0;padding:36px 32px;text-align:center"><p style="color:#fff;font-size:28px;font-weight:900;margin:0;letter-spacing:4px">NAVY</p><p style="color:#4b5563;font-size:10px;font-weight:700;margin:4px 0 0;letter-spacing:6px">TRAINING CENTER</p></div><div style="background:#fff;padding:32px;border:1px solid #e5e7eb"><h2 style="color:#111">Es momento de activarte 💪</h2><p style="color:#6b7280">Hola ${nombre}, aquí están tus datos de acceso.</p><div style="background:#f9fafb;border-radius:12px;padding:20px;margin:20px 0"><table style="width:100%;font-size:14px"><tr><td style="color:#9ca3af;padding:6px 0">Usuario</td><td style="color:#111;font-weight:700">${cliente.email}</td></tr><tr><td style="color:#9ca3af;padding:6px 0">Contraseña</td><td style="color:#111;font-weight:700;font-family:monospace;letter-spacing:2px;font-size:16px">${pass}</td></tr></table></div><p style="color:#6b7280;font-size:13px">Descarga la app en App Store o Google Play.</p></div></div>`
                      
                     await fetch('/api/correo/acceso-cliente', {
                        method:  'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          email:    cliente.email,
                          nombre:   cliente.nombre_completo,
                          password: cliente.password_temporal,
                        }),
                      })
                      alert('Correo enviado ✓')
                    }}
                    className="flex items-center gap-3 w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition group">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center transition">
                      <Mail size={14} className="text-gray-600" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-gray-900">Reenviar correo de acceso</p>
                      <p className="text-xs text-gray-400">Manda las credenciales al correo del cliente</p>
                    </div>
                  </button>
                </div>
              ) : (
                <div className="rounded-xl bg-gray-50 border border-gray-100 px-5 py-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <Lock size={18} className="text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-700">Sin cuenta en la app</p>
                    <p className="text-xs text-gray-400">Este cliente no tiene acceso a la app todavía</p>
                  </div>
                </div>
              )}
            </div>
          )}
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
'use client'
// src/components/clientes/DrawerNuevoCliente.tsx — alta de cliente (nuevo o migración desde el sistema anterior)
import { useState, useEffect, useRef, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { X, User, Phone, MapPin, CreditCard, Sparkles, Package, Calendar, CheckCircle2, AlertCircle,
         AlertTriangle, Loader2, UserPlus } from 'lucide-react'
import ToastExito        from '@/components/ToastExito'
import ModalInvitado     from './ModalInvitado'
import ModalPagoSucursal from './ModalPagoSucursal'
import { logActividad }  from '@/lib/log-actividad'
import { useAuth }       from '@/context/AuthContext'

interface Props { isOpen: boolean; onClose: () => void; onSuccess: () => void }
interface Sucursal { id: string; nombre: string }
interface Paquete  { id: string; nombre: string; vigencia_dias?: number; max_usuarios?: number }

const SEXOS = ['Masculino', 'Femenino', 'Prefiero no decir']
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/
const hoy = () => new Date(Date.now() - 6 * 3600 * 1000).toISOString().split('T')[0]

const formVacio = () => ({
  nombre: '', primer_apellido: '', segundo_apellido: '',
  email: '', telefono: '', fecha_nacimiento: '', sexo: '',
  sucursal_id: '', paquete_id: '',
  fecha_inicio_membresia: hoy(), fecha_fin_membresia: '', fecha_alta_original: '', notas_migracion: '',
})
type Form = ReturnType<typeof formVacio>

// El acceso a la app ya no usa contraseña; el servicio de alta la pide, así que se genera una que nadie usa
const passwordInterna = () =>
  'NAVY-' + Array.from({ length: 12 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('')

const sumarDias = (fecha: string, dias: number) => {
  const d = new Date(`${fecha}T12:00:00`); d.setDate(d.getDate() + dias)
  return d.toISOString().split('T')[0]
}

function validar(f: Form, tipo: 'nuevo' | 'migracion') {
  const e: Record<string, string> = {}
  if (!f.nombre.trim())          e.nombre = 'Escribe su nombre.'
  if (!f.primer_apellido.trim()) e.primer_apellido = 'Escribe su primer apellido.'
  if (!EMAIL_RE.test(f.email.trim())) e.email = 'Escribe un correo válido, por ejemplo ana@gmail.com.'
  if (f.telefono.replace(/\D/g, '').length !== 10) e.telefono = 'El teléfono debe tener 10 dígitos.'
  if (!f.fecha_nacimiento) e.fecha_nacimiento = 'Elige su fecha de nacimiento.'
  else {
    const edad = (Date.now() - new Date(`${f.fecha_nacimiento}T12:00:00`).getTime()) / (365.25 * 86400000)
    if (edad < 0) e.fecha_nacimiento = 'La fecha no puede ser en el futuro.'
    else if (edad < 5 || edad > 100) e.fecha_nacimiento = 'Revisa el año de nacimiento.'
  }
  if (!f.sexo)        e.sexo = 'Elige una opción.'
  if (!f.sucursal_id) e.sucursal_id = 'Elige su sucursal.'
  if (tipo === 'migracion' && f.paquete_id && !f.fecha_fin_membresia) e.fecha_fin_membresia = 'Pon la fecha de vencimiento.'
  return e
}

const NOMBRES_CAMPO: Record<string, string> = {
  nombre: 'nombre', primer_apellido: 'primer apellido', email: 'correo', telefono: 'teléfono',
  fecha_nacimiento: 'fecha de nacimiento', sexo: 'sexo', sucursal_id: 'sucursal', fecha_fin_membresia: 'vencimiento',
}

// ── Piezas visuales ──────────────────────────────────────────────────────────
const base = 'w-full border rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none transition bg-white placeholder:text-gray-400'
const cls = (error?: string, ok?: boolean) =>
  `${base} ${error ? 'border-red-300 bg-red-50/40 focus:ring-2 focus:ring-red-50'
    : ok ? 'border-emerald-300 focus:ring-2 focus:ring-emerald-50'
    : 'border-gray-200 focus:border-gray-400 focus:ring-2 focus:ring-gray-100'}`

function Field({ label, required, error, hint, children }:
  { label: string; required?: boolean; error?: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[13px] font-bold text-gray-800">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error
        ? <p className="text-[11px] text-red-600 flex items-center gap-1"><AlertCircle size={11} />{error}</p>
        : hint && <p className="text-[11px] leading-4 text-gray-400">{hint}</p>}
    </div>
  )
}

function Section({ icon, titulo, descripcion, children }: { icon: ReactNode; titulo: string; descripcion?: string; children: ReactNode }) {
  return (
    <section className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-gray-50 text-gray-500 flex items-center justify-center shrink-0">{icon}</div>
        <div>
          <h3 className="text-sm font-black text-gray-900">{titulo}</h3>
          {descripcion && <p className="text-xs text-gray-400 mt-0.5 leading-5">{descripcion}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

type EstadoCorreo = 'idle' | 'revisando' | 'disponible' | 'duplicado' | 'invalido'

export default function DrawerNuevoCliente({ isOpen, onClose, onSuccess }: Props) {
  const { staff } = useAuth()
  const [form,        setForm]        = useState<Form>(formVacio())
  const [tipo,        setTipo]        = useState<'nuevo' | 'migracion'>('nuevo')
  const [cobrarAhora, setCobrarAhora] = useState(false)
  const [tocados,     setTocados]     = useState<Record<string, boolean>>({})
  const [intento,     setIntento]     = useState(false)
  const [errorGeneral, setErrorGeneral] = useState('')
  const [guardando,   setGuardando]   = useState(false)

  const [sucursales, setSucursales] = useState<Sucursal[]>([])
  const [paquetes,   setPaquetes]   = useState<Paquete[]>([])

  const [estadoCorreo, setEstadoCorreo] = useState<EstadoCorreo>('idle')
  const [duplicado,    setDuplicado]    = useState<any | null>(null)
  const [telDuplicado, setTelDuplicado] = useState<any | null>(null)
  const timerCorreo = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timerTel    = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [toast,         setToast]         = useState(false)
  const [nuevoId,       setNuevoId]       = useState<string | null>(null)
  const [nuevoCliente,  setNuevoCliente]  = useState<any | null>(null)
  const [modalPago,     setModalPago]     = useState(false)
  const [titularId,     setTitularId]     = useState<string | null>(null)

  const set = (k: keyof Form, v: string) => setForm(p => ({ ...p, [k]: v }))
  const tocar = (k: string) => setTocados(p => ({ ...p, [k]: true }))

  const errores = validar(form, tipo)
  if (estadoCorreo === 'duplicado') errores.email = 'Este correo ya pertenece a otro cliente.'
  const err = (k: string) => (tocados[k] || intento) ? errores[k] : undefined
  const faltan = Object.keys(errores)

  const reset = () => {
    setForm(formVacio()); setTipo('nuevo'); setCobrarAhora(false); setTocados({}); setIntento(false)
    setErrorGeneral(''); setEstadoCorreo('idle'); setDuplicado(null); setTelDuplicado(null)
  }
  const cerrar = () => { onClose(); reset() }

  useEffect(() => {
    if (!isOpen) return
    reset()
    supabase.from('sucursales').select('id, nombre').eq('estatus', 'Activa').order('nombre')
      .then(({ data }) => setSucursales(data || []))
  }, [isOpen])

  // Paquetes de la sucursal elegida (para migración)
  useEffect(() => {
    setForm(p => ({ ...p, paquete_id: '', fecha_fin_membresia: '' }))
    if (!form.sucursal_id) { setPaquetes([]); return }
    supabase.from('paquetes')
      .select('id, nombre, vigencia_dias, max_usuarios, paquete_precios!inner(sucursal_id)')
      .eq('estatus', 'Activo').eq('paquete_precios.sucursal_id', form.sucursal_id).order('nombre')
      .then(({ data }) => setPaquetes((data as any[]) || []))
  }, [form.sucursal_id])

  useEffect(() => {
    const paq = paquetes.find(p => p.id === form.paquete_id)
    if (paq?.vigencia_dias && form.fecha_inicio_membresia)
      setForm(p => ({ ...p, fecha_fin_membresia: sumarDias(form.fecha_inicio_membresia, paq.vigencia_dias ?? 30) }))
  }, [form.paquete_id, form.fecha_inicio_membresia, paquetes])

  // Correo: válido y sin dueño (sin importar mayúsculas)
  useEffect(() => {
    if (timerCorreo.current) clearTimeout(timerCorreo.current)
    const email = form.email.trim().toLowerCase()
    setDuplicado(null)
    if (!email) { setEstadoCorreo('idle'); return }
    if (!EMAIL_RE.test(email)) { setEstadoCorreo('invalido'); return }
    setEstadoCorreo('revisando')
    timerCorreo.current = setTimeout(async () => {
      const { data } = await supabase.from('clientes')
        .select('id, nombre_completo, email, plan, origen, sucursales(nombre)')
        .ilike('email', email).limit(1).maybeSingle()
      setDuplicado(data)
      setEstadoCorreo(data ? 'duplicado' : 'disponible')
    }, 500)
  }, [form.email])

  // Teléfono repetido: solo aviso (en una familia pueden compartir teléfono)
  useEffect(() => {
    if (timerTel.current) clearTimeout(timerTel.current)
    const tel = form.telefono.replace(/\D/g, '')
    setTelDuplicado(null)
    if (tel.length !== 10) return
    timerTel.current = setTimeout(async () => {
      const { data } = await supabase.from('clientes').select('id, nombre_completo, email')
        .ilike('telefono', `%${tel}`).limit(1).maybeSingle()
      setTelDuplicado(data)
    }, 500)
  }, [form.telefono])

  const crearEnBase = async () => {
    const email = form.email.trim().toLowerCase()
    const paquete = paquetes.find(p => p.id === form.paquete_id)

    // 1. Acceso a la app (o el que ya exista con ese correo)
    let supabaseUserId: string | null = null
    const resAuth = await fetch('/api/clientes/crear-usuario', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: passwordInterna() }),
    })
    const dataAuth = await resAuth.json()
    if (dataAuth.userId) supabaseUserId = dataAuth.userId
    else if (dataAuth.error?.toLowerCase().includes('already registered')) {
      const r = await fetch('/api/clientes/buscar-usuario', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
      })
      supabaseUserId = (await r.json()).userId || null
    }
    if (!supabaseUserId) throw new Error('No se pudo crear su acceso a la app. Revisa el correo e inténtalo de nuevo.')

    // 2. Cliente
    const nombreCompleto = [form.nombre, form.primer_apellido, form.segundo_apellido].map(x => x.trim()).filter(Boolean).join(' ')
    const { data: cli, error } = await supabase.from('clientes').insert([{
      nombre_completo:     nombreCompleto,
      primer_apellido:     form.primer_apellido.trim(),
      segundo_apellido:    form.segundo_apellido.trim(),
      email,
      telefono:            form.telefono.replace(/\D/g, ''),
      fecha_nacimiento:    form.fecha_nacimiento,
      sexo:                form.sexo,
      sucursal_id:         form.sucursal_id,
      paquete_id:          tipo === 'migracion' ? (form.paquete_id || null) : null,
      plan:                tipo === 'migracion' ? (paquete?.nombre || '') : '',
      estatus:             'Activo',
      origen:              tipo === 'migracion' ? 'Migración' : 'Nuevo',
      supabase_user_id:    supabaseUserId,
      fecha_alta_original: tipo === 'migracion' ? (form.fecha_alta_original || hoy()) : hoy(),
    }]).select().single()
    if (error) throw new Error(error.message)

    // 3. Bienvenida
    fetch('/api/correo/bienvenida-cliente', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, nombre: form.nombre.trim() }),
    }).catch(() => {})

    // 4. Migración: su membresía del sistema anterior, sin pago
    if (tipo === 'migracion' && form.paquete_id && form.fecha_fin_membresia) {
      await supabase.from('membresias').insert([{
        cliente_id:    cli.id,
        paquete_id:    form.paquete_id,
        fecha_inicio:  form.fecha_inicio_membresia,
        fecha_fin:     form.fecha_fin_membresia,
        estatus:       form.fecha_fin_membresia >= hoy() ? 'Activa' : 'Vencida',
        precio_pagado: 0,
        origen:        'Migración',
        notas:         form.notas_migracion || null,
      }])
      await supabase.from('clientes').update({ fecha_venc_plan: form.fecha_fin_membresia }).eq('id', cli.id)
    }

    await logActividad({
      tipo:        'cliente_creado_crm',
      descripcion: `${staff?.nombre} ${staff?.primer_apellido} creó al cliente "${nombreCompleto}" (${tipo === 'migracion' ? 'migración' : 'nuevo'})`,
      tabla:       'clientes',
      accion:      'INSERT',
      metadata:    { cliente_id: cli.id, email, origen: tipo === 'migracion' ? 'Migración' : 'Nuevo', paquete: paquete?.nombre || null },
      sucursal_id: form.sucursal_id,
      staff_id:    staff?.id,
    })
    return { cli, paquete }
  }

  const crear = async () => {
    setIntento(true)
    if (faltan.length || estadoCorreo === 'revisando') return
    setGuardando(true); setErrorGeneral('')
    try {
      const { cli, paquete } = await crearEnBase()
      setNuevoId(cli.id)
      if (paquete?.max_usuarios === 2) { setTitularId(cli.id); setGuardando(false); return }
      if (tipo === 'nuevo' && cobrarAhora) { setNuevoCliente(cli); setModalPago(true); setGuardando(false); return }
      setToast(true); onSuccess(); cerrar()
    } catch (e: any) {
      setErrorGeneral(e.message || 'No se pudo crear el cliente.')
    }
    setGuardando(false)
  }

  const iconoCorreo = {
    revisando:  <Loader2 size={14} className="animate-spin text-gray-400" />,
    disponible: <CheckCircle2 size={14} className="text-emerald-500" />,
    duplicado:  <AlertCircle size={14} className="text-red-500" />,
    invalido:   <AlertCircle size={14} className="text-amber-500" />,
    idle:       null,
  }[estadoCorreo]

  const paq = paquetes.find(p => p.id === form.paquete_id)
  const diasRestantes = form.fecha_fin_membresia
    ? Math.ceil((new Date(`${form.fecha_fin_membresia}T23:59:59`).getTime() - Date.now()) / 86400000) : null

  return (
    <>
      {toast && (
        <ToastExito titulo="Cliente creado" mensaje="Ya puede entrar a la app con su correo."
          onClose={() => setToast(false)}
          onVer={nuevoId ? () => { window.location.href = `/dashboard/clientes/${nuevoId}` } : undefined} />
      )}
      {titularId && (
        <ModalInvitado titularId={titularId}
          onClose={() => { setTitularId(null); onSuccess(); cerrar() }} />
      )}
      {nuevoCliente && (
        <ModalPagoSucursal isOpen={modalPago} cliente={nuevoCliente}
          onClose={() => { setModalPago(false); setNuevoCliente(null); onSuccess(); cerrar() }}
          onSuccess={() => { setModalPago(false); setNuevoCliente(null); setToast(true); onSuccess(); cerrar() }} />
      )}

      <div onClick={cerrar} className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} />

      <div className={`fixed top-0 right-0 z-50 h-full w-full max-w-xl bg-gray-50 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* Encabezado */}
        <div className="bg-white px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gray-900 text-white flex items-center justify-center shrink-0"><UserPlus size={20} /></div>
            <div className="flex-1">
              <h2 className="text-lg font-black text-gray-900">Nuevo cliente</h2>
              <p className="text-xs text-gray-400 mt-0.5">Al crearlo, podrá entrar a la app con su correo. Los campos con <span className="text-red-500">*</span> son obligatorios.</p>
            </div>
            <button onClick={cerrar} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={18} /></button>
          </div>

          {/* Tipo de alta */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            {([
              { key: 'nuevo',     icon: <Sparkles size={15} />, titulo: 'Cliente nuevo',  desc: 'Es su primera vez en Navy' },
              { key: 'migracion', icon: <Package size={15} />,  titulo: 'Migración',      desc: 'Ya era cliente en el sistema anterior' },
            ] as const).map(t => (
              <button key={t.key} type="button" onClick={() => setTipo(t.key)}
                className={`text-left rounded-xl border-2 px-3.5 py-3 transition ${
                  tipo === t.key ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`}>
                <p className="text-sm font-black flex items-center gap-1.5">{t.icon} {t.titulo}</p>
                <p className={`text-[11px] mt-0.5 ${tipo === t.key ? 'text-gray-300' : 'text-gray-400'}`}>{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Formulario */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          <Section icon={<Phone size={15} />} titulo="Contacto" descripcion="El correo es con el que va a entrar a la app; revisamos que no esté registrado.">
            <Field label="Correo" required error={err('email')}
              hint={estadoCorreo === 'disponible' ? '✓ Correo disponible' : estadoCorreo === 'revisando' ? 'Revisando…' : undefined}>
              <div className="relative">
                <input type="email" placeholder="nombre@correo.com" className={cls(err('email'), estadoCorreo === 'disponible')}
                  value={form.email} onBlur={() => tocar('email')}
                  onChange={e => set('email', e.target.value.replace(/\s/g, '').toLowerCase())} />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">{iconoCorreo}</div>
              </div>
            </Field>

            {estadoCorreo === 'duplicado' && duplicado && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2">
                <p className="text-xs font-black text-amber-800 flex items-center gap-1.5"><AlertTriangle size={13} /> Este correo ya es de otro cliente</p>
                <a href={`/dashboard/clientes/${duplicado.id}`} className="block bg-white rounded-lg px-3 py-2.5 border border-amber-100 hover:border-amber-300 transition">
                  <p className="text-sm font-bold text-gray-900">{duplicado.nombre_completo || 'Sin nombre'}</p>
                  <p className="text-xs text-gray-500">{duplicado.email} · {duplicado.origen || 'sin origen'}{duplicado.sucursales?.nombre ? ` · ${duplicado.sucursales.nombre}` : ''}</p>
                  <p className="text-[11px] text-indigo-600 font-bold mt-1">Ver su ficha →</p>
                </a>
              </div>
            )}

            <Field label="Teléfono celular" required error={err('telefono')} hint="10 dígitos, sin lada. Lo usamos para WhatsApp.">
              <input inputMode="numeric" placeholder="55 1234 5678" className={cls(err('telefono'))}
                value={form.telefono} onBlur={() => tocar('telefono')}
                onChange={e => set('telefono', e.target.value.replace(/\D/g, '').slice(0, 10))} />
            </Field>
            {telDuplicado && (
              <p className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                Ojo: <b>{telDuplicado.nombre_completo || telDuplicado.email}</b> ya tiene este teléfono. Si es la misma persona, no la registres dos veces.
              </p>
            )}
          </Section>

          <Section icon={<User size={15} />} titulo="Identidad" descripcion="Así va a aparecer en reservas, listas y correos.">
            <Field label="Nombre(s)" required error={err('nombre')}>
              <input placeholder="Ej. Ana" className={cls(err('nombre'))} value={form.nombre}
                onBlur={() => tocar('nombre')} onChange={e => set('nombre', e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Primer apellido" required error={err('primer_apellido')}>
                <input className={cls(err('primer_apellido'))} value={form.primer_apellido}
                  onBlur={() => tocar('primer_apellido')} onChange={e => set('primer_apellido', e.target.value)} />
              </Field>
              <Field label="Segundo apellido">
                <input className={cls()} value={form.segundo_apellido} onChange={e => set('segundo_apellido', e.target.value)} />
              </Field>
            </div>
            <Field label="Fecha de nacimiento" required error={err('fecha_nacimiento')}>
              <input type="date" max={hoy()} className={cls(err('fecha_nacimiento'))} value={form.fecha_nacimiento}
                onBlur={() => tocar('fecha_nacimiento')} onChange={e => set('fecha_nacimiento', e.target.value)} />
            </Field>
            <Field label="Sexo" required error={err('sexo')}>
              <div className="grid grid-cols-3 gap-2">
                {SEXOS.map(op => (
                  <button key={op} type="button" onClick={() => { set('sexo', op); tocar('sexo') }}
                    className={`py-2.5 rounded-xl text-xs font-bold border transition ${
                      form.sexo === op ? 'bg-gray-900 text-white border-gray-900'
                      : err('sexo') ? 'bg-white text-gray-600 border-red-300' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
                    {op}
                  </button>
                ))}
              </div>
            </Field>
          </Section>

          <Section icon={<MapPin size={15} />} titulo="Sucursal" descripcion="Su sucursal principal: se usa para sugerirle clases y en los reportes.">
            <Field label="Sucursal" required error={err('sucursal_id')}>
              <select className={`${cls(err('sucursal_id'))} appearance-none cursor-pointer`} value={form.sucursal_id}
                onBlur={() => tocar('sucursal_id')} onChange={e => set('sucursal_id', e.target.value)}>
                <option value="">Elige una sucursal</option>
                {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </Field>
          </Section>

          {tipo === 'nuevo' ? (
            <Section icon={<CreditCard size={15} />} titulo="Plan" descripcion="Puedes cobrarle un paquete ahora mismo, o dejar que lo compre después desde la app.">
              <button type="button" onClick={() => setCobrarAhora(v => !v)}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border-2 transition ${
                  cobrarAhora ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'}`}>
                <div className="text-left">
                  <p className="text-sm font-bold">Cobrar un paquete al crearlo</p>
                  <p className={`text-xs mt-0.5 ${cobrarAhora ? 'text-gray-300' : 'text-gray-400'}`}>
                    {cobrarAhora ? 'Al crear el cliente se abre el cobro en sucursal' : 'Lo comprará después'}
                  </p>
                </div>
                <span className={`relative w-10 h-[22px] rounded-full shrink-0 ${cobrarAhora ? 'bg-white/25' : 'bg-gray-200'}`}>
                  <span className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow transition-all ${cobrarAhora ? 'left-[21px]' : 'left-[3px]'}`} />
                </span>
              </button>
            </Section>
          ) : (
            <Section icon={<Package size={15} />} titulo="Membresía que ya tenía" descripcion="Opcional. Si tenía un plan vigente en el sistema anterior, regístralo aquí (no genera cobro).">
              <Field label="Paquete">
                <select className={`${cls()} appearance-none cursor-pointer`} value={form.paquete_id} disabled={!form.sucursal_id}
                  onChange={e => set('paquete_id', e.target.value)}>
                  <option value="">{form.sucursal_id ? 'Sin membresía' : 'Primero elige la sucursal'}</option>
                  {paquetes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </Field>
              {form.paquete_id && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Inicio real">
                      <input type="date" className={cls()} value={form.fecha_inicio_membresia}
                        onChange={e => set('fecha_inicio_membresia', e.target.value)} />
                    </Field>
                    <Field label="Vence" required error={err('fecha_fin_membresia')}>
                      <input type="date" className={cls(err('fecha_fin_membresia'))} value={form.fecha_fin_membresia}
                        onChange={e => set('fecha_fin_membresia', e.target.value)} />
                    </Field>
                  </div>
                  {diasRestantes !== null && (
                    <p className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold ${
                      diasRestantes > 30 ? 'bg-emerald-50 text-emerald-700' : diasRestantes > 7 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'}`}>
                      <Calendar size={12} /> {diasRestantes > 0 ? `${diasRestantes} días restantes` : 'Ya venció'} · {paq?.nombre}
                    </p>
                  )}
                </>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cliente desde" hint="Cuándo se inscribió por primera vez.">
                  <input type="date" max={hoy()} className={cls()} value={form.fecha_alta_original}
                    onChange={e => set('fecha_alta_original', e.target.value)} />
                </Field>
              </div>
              <Field label="Notas">
                <textarea rows={2} className={`${cls()} resize-none`} placeholder="Ej. Pagó anualidad en efectivo en agosto."
                  value={form.notas_migracion} onChange={e => set('notas_migracion', e.target.value)} />
              </Field>
            </Section>
          )}

          {errorGeneral && (
            <div className="text-xs font-bold text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">{errorGeneral}</div>
          )}
        </div>

        {/* Pie */}
        <div className="bg-white border-t border-gray-100 px-6 py-4 space-y-3">
          {intento && faltan.length > 0 && (
            <p className="text-[11px] text-red-600 flex items-start gap-1.5">
              <AlertCircle size={12} className="mt-0.5 shrink-0" />
              Falta completar: {faltan.map(k => NOMBRES_CAMPO[k] || k).join(', ')}.
            </p>
          )}
          <div className="flex gap-3">
            <button onClick={cerrar} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button onClick={crear} disabled={guardando || estadoCorreo === 'revisando'}
              className="flex-[2] py-3 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2">
              {guardando ? <><Loader2 size={15} className="animate-spin" /> Creando…</>
                : tipo === 'migracion' ? 'Migrar cliente'
                : cobrarAhora ? 'Crear y cobrar paquete' : 'Crear cliente'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
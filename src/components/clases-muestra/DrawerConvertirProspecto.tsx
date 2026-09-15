'use client'
import { useState, useEffect } from 'react'
import { supabase }            from '@/lib/supabase'
import { X, User, CreditCard, Calendar, Lock, Star } from 'lucide-react'
import ToastExito    from '@/components/ToastExito'
import ModalPagoSucursal from '@/components/clientes/ModalPagoSucursal'

interface Prospecto {
  id:              string
  nombre_completo: string
  email:           string
  telefono?:       string
  sucursal_id?:    string
}

interface Props {
  isOpen:     boolean
  prospecto:  Prospecto | null
  onClose:    () => void
  onSuccess:  () => void
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

export default function DrawerConvertirProspecto({ isOpen, prospecto, onClose, onSuccess }: Props) {
  const [loading,        setLoading]        = useState(false)
  const [toast,          setToast]          = useState(false)
  const [clienteCreado,  setClienteCreado]  = useState<any | null>(null)
  const [modalPago,      setModalPago]      = useState(false)
  const [sucursales,     setSucursales]     = useState<Sucursal[]>([])
  const [paquetes,       setPaquetes]       = useState<Paquete[]>([])
  const [adquirirPaquete, setAdquirirPaquete] = useState(false)
  const [paqueteGratis,  setPaqueteGratis]  = useState(false)

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
  })

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const paqueteSeleccionado = paquetes.find(p => p.id === form.paquete_id)
  const diasRestantes = form.fecha_fin_membresia
    ? Math.max(0, Math.ceil((new Date(form.fecha_fin_membresia).getTime() - Date.now()) / 86400000))
    : null

  useEffect(() => {
    if (!isOpen || !prospecto) return
    setAdquirirPaquete(false)
    setPaqueteGratis(false)
    setClienteCreado(null)

    // Pre-llenar con datos del prospecto
    const partes = (prospecto.nombre_completo || '').split(' ')
    setForm(p => ({
      ...p,
      nombre:          partes[0] || '',
      primer_apellido: partes[1] || '',
      segundo_apellido:partes[2] || '',
      email:           prospecto.email || '',
      telefono:        prospecto.telefono || '',
      sucursal_id:     prospecto.sucursal_id || '',
    }))

    supabase.from('sucursales').select('id, nombre').eq('estatus', 'Activa').order('nombre')
      .then(({ data: sucs }) => { if (sucs) setSucursales(sucs) })
  }, [isOpen, prospecto])

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
      fecha_fin_membresia: '',
    })
    setAdquirirPaquete(false)
    setPaqueteGratis(false)
    setClienteCreado(null)
  }

  const handleConvertir = async () => {
    if (!prospecto || !form.nombre || !form.email) return
    setLoading(true)

    try {
      const passwordTemporal = generarPasswordTemporal()
      const paquete = paquetes.find(p => p.id === form.paquete_id)

      // 1. Crear en Auth
      let supabaseUserId: string | null = null
      try {
        const res = await fetch('/api/clientes/crear-usuario', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ email: form.email, password: passwordTemporal }),
        })
        const data = await res.json()
        supabaseUserId = data.userId || null
      } catch { console.warn('No se pudo crear usuario Auth') }

      // 2. Actualizar cliente existente (no crear uno nuevo)
      const { data: cli, error } = await supabase.from('clientes').update({
        nombre_completo:       `${form.nombre} ${form.primer_apellido} ${form.segundo_apellido}`.trim(),
        primer_apellido:       form.primer_apellido,
        segundo_apellido:      form.segundo_apellido,
        email:                 form.email,
        telefono:              form.telefono,
        fecha_nacimiento:      form.fecha_nacimiento || null,
        sexo:                  form.sexo,
        sucursal_id:           form.sucursal_id || null,
        estatus:               'Activo',
        origen:                'Nuevo',
        supabase_user_id:      supabaseUserId,
        password_temporal:     passwordTemporal,
        debe_cambiar_password: true,
        fecha_alta_original:   new Date().toISOString().split('T')[0],
      }).eq('id', prospecto.id).select().single()

      if (error) throw new Error(error.message)

      // 3. Correo de bienvenida
      await fetch('/api/correo/bienvenida-cliente', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: form.email, nombre: form.nombre }),
      })

      // 4. Si paquete gratis — crear membresía sin pago
      if (paqueteGratis && form.paquete_id && form.fecha_fin_membresia) {
        await supabase.from('membresias').insert([{
          cliente_id:    prospecto.id,
          paquete_id:    form.paquete_id,
          fecha_inicio:  form.fecha_inicio_membresia,
          fecha_fin:     form.fecha_fin_membresia,
          estatus:       'Activa',
          precio_pagado: 0,
          origen:        'Cortesía',
        }])
        await supabase.from('clientes').update({
          plan:            paquete?.nombre || '',
          paquete_id:      form.paquete_id,
          fecha_venc_plan: form.fecha_fin_membresia,
        }).eq('id', prospecto.id)

        // Correo comprobante gratis
        await fetch('/api/correo/comprobante-pago', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email:                  form.email,
            nombre:                 `${form.nombre} ${form.primer_apellido}`.trim(),
            paquete_nombre:         paquete?.nombre || '',
            vigencia_dias:          paquete?.vigencia_dias || 30,
            clases_incluidas:       null,
            acceso_total:           true,
            acceso_sucursal_hermana:true,
            es_recurrente:          false,
            descripcion:            null,
            fecha_inicio:           new Date(form.fecha_inicio_membresia).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }),
            fecha_fin:              new Date(form.fecha_fin_membresia).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }),
            monto:                  0,
            metodo_pago:            'Cortesía',
            referencia:             null,
            sucursal_nombre:        sucursales.find(s => s.id === form.sucursal_id)?.nombre || 'Navy Training Center',
            tiene_membresia_previa: false,
            folio:                  `NVY-${Date.now()}`,
          }),
        })
      }

      setLoading(false)
      setToast(true)
      onSuccess()

      // Si adquirir paquete con pago → abrir ModalPagoSucursal
      if (adquirirPaquete && !paqueteGratis && cli) {
        setClienteCreado(cli)
        setModalPago(true)
      } else {
        setTimeout(() => { onClose(); resetForm() }, 1500)
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
          titulo="¡Prospecto convertido!"
          mensaje="El cliente ya puede acceder a la app de Navy."
          onClose={() => setToast(false)}
        />
      )}

      {clienteCreado && (
        <ModalPagoSucursal
          isOpen={modalPago}
          cliente={clienteCreado}
          onClose={() => { setModalPago(false); setClienteCreado(null); onClose(); resetForm() }}
          onSuccess={() => { setModalPago(false); setClienteCreado(null); onClose(); resetForm(); onSuccess() }}
        />
      )}

      {isOpen && <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />}

      <div className={`fixed top-0 right-0 z-50 h-full w-full max-w-lg bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <Star size={16} className="text-amber-500 fill-amber-500" />
              <h2 className="text-lg font-black text-gray-900">Convertir a Navy</h2>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {prospecto?.nombre_completo} → Cliente Navy
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-400">
            <X size={18}/>
          </button>
        </div>

        {/* Formulario */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

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
              <input type="email" placeholder="correo@email.com" className={inputCls}
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

          {/* Toggle paquete */}
          <div
            className={`flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer transition ${
              adquirirPaquete ? 'bg-gray-900 border-gray-900' : 'bg-gray-50 border-gray-200'
            }`}
            onClick={() => { setAdquirirPaquete(v => !v); if (adquirirPaquete) setPaqueteGratis(false) }}>
            <div>
              <p className={`text-sm font-bold ${adquirirPaquete ? 'text-white' : 'text-gray-700'}`}>
                Asignar paquete
              </p>
              <p className={`text-xs mt-0.5 ${adquirirPaquete ? 'text-gray-400' : 'text-gray-400'}`}>
                {adquirirPaquete ? 'Selecciona el paquete abajo' : 'Sin paquete por ahora'}
              </p>
            </div>
            <div className={`relative w-11 h-6 rounded-full transition-colors ${adquirirPaquete ? 'bg-white/20' : 'bg-gray-200'}`}>
              <span className={`absolute top-1 w-4 h-4 rounded-full shadow transition-all ${
                adquirirPaquete ? 'left-6 bg-white' : 'left-1 bg-white'
              }`} />
            </div>
          </div>

          {/* Opciones de paquete */}
          {adquirirPaquete && (
            <>
              {/* Gratis o con pago */}
              <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
                <button type="button" onClick={() => setPaqueteGratis(false)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                    !paqueteGratis ? 'bg-white shadow text-gray-900' : 'text-gray-500'
                  }`}>
                  💳 Con pago
                </button>
                <button type="button" onClick={() => setPaqueteGratis(true)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                    paqueteGratis ? 'bg-white shadow text-gray-900' : 'text-gray-500'
                  }`}>
                  🎁 Gratis / Cortesía
                </button>
              </div>

              <SectionTitle icon={<CreditCard size={13}/>}>Paquete</SectionTitle>

              <Field label="Paquete">
                <select className={selectCls} value={form.paquete_id}
                  onChange={e => set('paquete_id', e.target.value)}
                  disabled={!form.sucursal_id}>
                  <option value="">{!form.sucursal_id ? 'Primero selecciona una sucursal' : 'Seleccionar paquete'}</option>
                  {paquetes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </Field>

              {paqueteGratis && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Fecha inicio">
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
                      {diasRestantes} días de membresía
                      {paqueteSeleccionado && ` · ${paqueteSeleccionado.nombre}`}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          <SectionTitle icon={<Lock size={13}/>}>Acceso app</SectionTitle>
          <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 space-y-1">
            <p className="text-xs text-gray-500">Se creará el acceso a la app y se enviará correo de bienvenida.</p>
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
          <button onClick={handleConvertir}
            disabled={loading || !form.nombre || !form.email}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition"
            style={{ backgroundColor: '#171B24' }}>
            {loading ? 'Convirtiendo...' : adquirirPaquete && !paqueteGratis ? 'Convertir y pagar →' : 'Convertir a Navy'}
          </button>
        </div>
      </div>
    </>
  )
}
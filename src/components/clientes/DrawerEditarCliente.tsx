'use client'
// src/components/clientes/DrawerEditarCliente.tsx
// Drawer para editar un cliente. Se adapta según el tipo: cliente Navy, Wellhub, TotalPass o clase muestra.
import { useState, useEffect, useCallback } from 'react'
import { X, User, CreditCard, LifeBuoy, Activity, Sparkles, MapPin, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import ToastExito from '@/components/ToastExito'
import { logActividad } from '@/lib/log-actividad'
import { useAuth } from '@/context/AuthContext'
import TabDatos from '@/components/clientes/editar/TabDatos'
import TabMembresia from '@/components/clientes/editar/TabMembresia'
import TabAcceso from '@/components/clientes/editar/TabAcceso'
import TabPlataforma from '@/components/clientes/editar/TabPlataforma'
import TabProspecto from '@/components/clientes/editar/TabProspecto'
import { tipoDeCliente, TIPOS } from '@/components/clientes/editar/tipoCliente'
import { apiSoporte, hoyCDMX, fechaLarga } from '@/components/clientes/editar/utils'

interface Props {
  isOpen:    boolean
  cliente:   any
  onClose:   () => void
  onSuccess: () => void
}

type Tab = 'datos' | 'membresia' | 'plataforma' | 'seguimiento' | 'acceso'

const formVacio = {
  nombre: '', primer_apellido: '', segundo_apellido: '', email: '', telefono: '',
  fecha_nacimiento: '', sexo: '', sucursal_id: '', forma_pago: '', estatus: 'Activo',
  nps: '', fecha_alta_original: '',
}

export default function DrawerEditarCliente({ isOpen, cliente, onClose, onSuccess }: Props) {
  const { staff } = useAuth()
  const esDireccion = staff?.rol === 'direccion'

  const [tab,        setTab]        = useState<Tab>('datos')
  const [form,       setForm]       = useState(formVacio)
  const [notas,      setNotas]      = useState('')
  const [sucursales, setSucursales] = useState<{ id: string; nombre: string }[]>([])
  const [membresias, setMembresias] = useState<any[]>([])
  const [soporte,    setSoporte]    = useState<any>(null)
  const [cargandoSop, setCargandoSop] = useState(false)
  const [guardando,  setGuardando]  = useState(false)
  const [toast,      setToast]      = useState(false)
  const [error,      setError]      = useState('')

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const cargarMembresias = useCallback(async () => {
    if (!cliente) return
    const { data } = await supabase.from('membresias')
      .select('*, paquetes(nombre, vigencia_dias)')
      .eq('cliente_id', cliente.id)
      .order('fecha_inicio', { ascending: false })
    setMembresias(data || [])
  }, [cliente])

  const cargarSoporte = useCallback(async () => {
    if (!cliente) return
    setCargandoSop(true)
    try { setSoporte(await apiSoporte(`/cliente/${cliente.id}`)) }
    catch { setSoporte(null) }
    setCargandoSop(false)
  }, [cliente])

  useEffect(() => {
    if (!cliente || !isOpen) return
    setTab('datos'); setError(''); setSoporte(null)
    setForm({
      nombre:              cliente.nombre || cliente.nombre_completo?.split(' ')[0] || '',
      primer_apellido:     cliente.primer_apellido || '',
      segundo_apellido:    cliente.segundo_apellido || '',
      email:               cliente.email || '',
      telefono:            cliente.telefono || '',
      fecha_nacimiento:    cliente.fecha_nacimiento?.slice(0, 10) || '',
      sexo:                cliente.sexo || '',
      sucursal_id:         cliente.sucursal_id || '',
      forma_pago:          cliente.forma_pago || '',
      estatus:             cliente.estatus || 'Activo',
      nps:                 cliente.nps?.toString() || '',
      fecha_alta_original: cliente.fecha_alta_original?.slice(0, 10) || '',
    })
    cargarMembresias()
    cargarSoporte()
    supabase.from('sucursales').select('id, nombre').eq('estatus', 'Activa').order('nombre')
      .then(({ data }) => setSucursales(data || []))
  }, [cliente, isOpen, cargarMembresias, cargarSoporte])

  // Plan actual (para las notas y para saber si es cliente Navy)
  const hoy = hoyCDMX()
  const activas = membresias.filter(m => m.estatus === 'Activa')
  const actual = activas
      .filter(m => m.fecha_inicio <= hoy && m.fecha_fin >= hoy && !m.activacion_pendiente)
      .sort((a, b) => a.fecha_fin.localeCompare(b.fecha_fin))[0]
    || activas.find(m => m.activacion_pendiente) || null

  useEffect(() => { setNotas(actual?.notas || '') }, [actual?.id])  // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen || !cliente) return null

  const tipo = tipoDeCliente(cliente, activas.length > 0)
  const info = TIPOS[tipo]

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'datos', label: 'Datos', icon: User },
    ...(tipo === 'navy'      ? [{ key: 'membresia'   as Tab, label: 'Membresía', icon: CreditCard }] : []),
    ...(tipo === 'wellhub' || tipo === 'totalpass'
                             ? [{ key: 'plataforma'  as Tab, label: `Actividad en ${info.etiqueta}`, icon: Activity }] : []),
    ...(tipo === 'prospecto' ? [{ key: 'seguimiento' as Tab, label: 'Seguimiento', icon: Sparkles }] : []),
    { key: 'acceso', label: 'Acceso y soporte', icon: LifeBuoy },
  ]

  const iniciales = (cliente.nombre_completo || cliente.email || '?')
    .split(' ').filter(Boolean).slice(0, 2).map((p: string) => p[0]).join('').toUpperCase()
  const sucursal = sucursales.find(s => s.id === cliente.sucursal_id)?.nombre

  const guardar = async () => {
    if (!form.nombre.trim() || !form.email.trim()) { setError('El nombre y el correo son obligatorios.'); setTab('datos'); return }
    setGuardando(true); setError('')
    try {
      const email = form.email.trim().toLowerCase()
      const correoCambio = email !== (cliente.email || '').trim().toLowerCase()
      const nombreCompleto = [form.nombre, form.primer_apellido, form.segundo_apellido].map(x => x.trim()).filter(Boolean).join(' ')

      const { error: e1 } = await supabase.from('clientes').update({
        nombre_completo:     nombreCompleto,
        primer_apellido:     form.primer_apellido.trim(),
        segundo_apellido:    form.segundo_apellido.trim(),
        email,
        telefono:            form.telefono.trim(),
        fecha_nacimiento:    form.fecha_nacimiento || null,
        sexo:                form.sexo,
        sucursal_id:         form.sucursal_id || null,
        forma_pago:          form.forma_pago,
        estatus:             form.estatus,
        nps:                 form.nps ? Number(form.nps) : null,
        fecha_alta_original: form.fecha_alta_original || null,
      }).eq('id', cliente.id)
      if (e1) throw e1

      if (actual && (actual.notas || '') !== notas) {
        const { error: e2 } = await supabase.from('membresias').update({ notas: notas || null }).eq('id', actual.id)
        if (e2) throw e2
      }

      // Si cambió el correo y tiene cuenta, el correo de acceso cambia también
      let avisoCorreo = ''
      if (correoCambio && cliente.supabase_user_id) {
        try { await apiSoporte(`/cliente/${cliente.id}/sincronizar-correo`, 'POST') }
        catch (e: any) { avisoCorreo = e.message }
      }

      await logActividad({
        tipo:        'cliente_editado',
        descripcion: `${staff?.nombre} ${staff?.primer_apellido} editó el perfil de "${nombreCompleto}"`,
        tabla:       'clientes',
        accion:      'UPDATE',
        metadata:    { cliente_id: cliente.id, email, correo_cambio: correoCambio },
        sucursal_id: form.sucursal_id || null,
        staff_id:    staff?.id,
      })

      if (avisoCorreo) {
        setError(`Se guardaron los datos, pero el correo de acceso no se pudo cambiar: ${avisoCorreo}`)
        setTab('acceso')
      } else {
        setToast(true)
      }
      cargarSoporte()
      onSuccess()
    } catch (e: any) {
      setError(`No se pudo guardar: ${e.message || 'inténtalo de nuevo'}`)
    }
    setGuardando(false)
  }

  const muestraGuardar = tab === 'datos' || tab === 'membresia'

  return (
    <>
      {toast && <ToastExito titulo="Cliente actualizado" mensaje="Los cambios se guardaron correctamente." onClose={() => setToast(false)} />}

      <div onClick={onClose} className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" />

      <div className="fixed top-0 right-0 z-50 h-full w-full max-w-xl bg-gray-50 shadow-2xl flex flex-col">

        {/* Encabezado */}
        <div className="bg-white px-6 pt-5 pb-0 border-b border-gray-100">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-base font-black shrink-0 ${info.avatar}`}>{iniciales}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-gray-900 truncate">{cliente.nombre_completo || 'Sin nombre'}</h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${info.badge}`}>{info.etiqueta}</span>
                {cliente.origen === 'Migración' && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-amber-100 text-amber-700">Sistema anterior</span>
                )}
              </div>
              <p className="text-xs text-gray-400 truncate mt-0.5">{cliente.email}</p>
              <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-400">
                {sucursal && <span className="flex items-center gap-1"><MapPin size={11} /> {sucursal}</span>}
                <span className="flex items-center gap-1"><Calendar size={11} /> Desde {fechaLarga(cliente.created_at)}</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-1.5">{info.descripcion}</p>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={18} /></button>
          </div>

          {/* Pestañas */}
          <div className="flex gap-1 mt-4 -mb-px overflow-x-auto">
            {tabs.map(t => {
              const Icon = t.icon
              const activo = tab === t.key
              return (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition ${
                    activo ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>
                  <Icon size={13} /> {t.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error && <div className="mb-4 text-xs font-bold text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">{error}</div>}

          {tab === 'datos' && (
            <TabDatos cliente={cliente} form={form} set={set} sucursales={sucursales} tipo={tipo} correoOriginal={cliente.email} />
          )}
          {tab === 'membresia' && (
            <TabMembresia cliente={cliente} membresias={membresias} esDireccion={esDireccion}
              notas={notas} setNotas={setNotas}
              onCambio={() => { cargarMembresias(); cargarSoporte(); onSuccess() }} />
          )}
          {tab === 'plataforma' && (tipo === 'wellhub' || tipo === 'totalpass') && (
            <TabPlataforma cliente={cliente} tipo={tipo} soporte={soporte} cargando={cargandoSop} />
          )}
          {tab === 'seguimiento' && <TabProspecto cliente={cliente} soporte={soporte} cargando={cargandoSop} />}
          {tab === 'acceso' && (
            <TabAcceso cliente={cliente} tipo={tipo} soporte={soporte} cargando={cargandoSop}
              recargar={cargarSoporte} esDireccion={esDireccion} irA={t => setTab(t as Tab)} />
          )}
        </div>

        {/* Pie */}
        {muestraGuardar && (
          <div className="bg-white border-t border-gray-100 px-6 py-4 flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50">Cancelar</button>
            <button onClick={guardar} disabled={guardando}
              className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 disabled:opacity-50">
              {guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
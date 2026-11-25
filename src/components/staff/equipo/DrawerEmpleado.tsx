'use client'
// src/components/staff/equipo/DrawerEmpleado.tsx
// Alta y edición de staff en un solo drawer. Reemplaza a DrawerNuevoEmpleado y DrawerEditarEmpleado.
//  - Crea el acceso al CRM / app con /api/staff/crear-auth (igual que antes).
//  - Banco y CLABE se guardan en una tabla protegida a través del backend (solo Dirección).
//  - Las reglas de bono ya no van por persona: se configuran en la pestaña Tarifas y bonos.
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Check, Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { logActividad } from '@/lib/log-actividad'
import { limpiarCorreo } from '@/lib/correo'
import { esDireccion } from '@/lib/permisos'
import { backend } from '@/lib/backend'
import { NEGRO, TIPOS, NIVELES, CATEGORIAS, TIPOS_PAGO, ROLES } from './util'

interface Props {
  isOpen: boolean
  empleado?: any | null          // null/undefined = alta
  onClose: () => void
  onSuccess: (id: string) => void
}

const VACIO = {
  nombre: '', primer_apellido: '', segundo_apellido: '', email: '', telefono: '', rfc: '',
  fecha_ingreso: '', estatus: 'Activo', tipo: '', rol: 'staff_navy', nivel: '', categorias: [] as string[],
  sucursales_ids: [] as string[], sucursal_asignada_id: '', tipo_pago: '', sueldo_fijo: '',
  pago_en_efectivo: false, bio: '',
  contacto_emergencia_nombre: '', contacto_emergencia_relacion: '', contacto_emergencia_telefono: '',
  banco: '', clabe: '', titular: '',
}
const BORRADOR = 'draft_nuevo_empleado_crm'
const input = 'w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-400 focus:bg-white'
const emailOk = (v: string) => !v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
const telOk = (v: string) => !v.trim() || v.replace(/\D/g, '').length >= 10

export default function DrawerEmpleado({ isOpen, empleado, onClose, onSuccess }: Props) {
  const { staff: yo } = useAuth()
  const direccion = esDireccion(yo?.rol)
  const editando = !!empleado?.id
  const [f, setF] = useState({ ...VACIO })
  const [sucursales, setSucursales] = useState<any[]>([])
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bancoOriginal, setBancoOriginal] = useState('')

  const set = (k: keyof typeof VACIO, v: any) => setF(p => {
    const n = { ...p, [k]: v }
    if (!editando) { try { localStorage.setItem(BORRADOR, JSON.stringify(n)) } catch {} }
    return n
  })

  useEffect(() => {
    if (!isOpen) return
    setError(null)
    supabase.from('sucursales').select('id, nombre, color').eq('estatus', 'Activa').order('nombre')
      .then(({ data }: { data: any }) => setSucursales(data || []))

    if (!editando) {
      let base = { ...VACIO }
      try { const b = localStorage.getItem(BORRADOR); if (b) base = { ...VACIO, ...JSON.parse(b) } } catch {}
      setF(base)
      return
    }
    // Edición: cargar sucursales, categorías y (si es Dirección) datos bancarios
    Promise.all([
      supabase.from('staff_sucursales').select('sucursal_id').eq('staff_id', empleado.id),
      supabase.from('staff_categorias').select('categoria').eq('staff_id', empleado.id),
    ]).then(([sucs, cats]: any[]) => {
      setF({
        ...VACIO,
        nombre: empleado.nombre || '', primer_apellido: empleado.primer_apellido || '',
        segundo_apellido: empleado.segundo_apellido || '', email: empleado.email || '',
        telefono: empleado.telefono || '', rfc: empleado.rfc_identificacion || '',
        fecha_ingreso: empleado.fecha_ingreso || '', estatus: empleado.estatus || 'Activo',
        tipo: empleado.tipo || '', rol: empleado.rol || 'staff_navy', nivel: empleado.nivel || '',
        categorias: (cats.data || []).map((c: any) => c.categoria),
        sucursales_ids: (sucs.data || []).map((s: any) => s.sucursal_id),
        sucursal_asignada_id: empleado.sucursal_asignada_id || '',
        tipo_pago: empleado.tipo_pago || '', sueldo_fijo: empleado.sueldo_fijo != null ? String(empleado.sueldo_fijo) : '',
        pago_en_efectivo: !!empleado.pago_en_efectivo, bio: empleado.bio || '',
        contacto_emergencia_nombre: empleado.contacto_emergencia_nombre || '',
        contacto_emergencia_relacion: empleado.contacto_emergencia_relacion || '',
        contacto_emergencia_telefono: empleado.contacto_emergencia_telefono || '',
      })
    })
    if (direccion) {
      backend(`/staff-admin/perfil/${empleado.id}`).then((p: any) => {
        const b = p?.banco
        if (!b) return
        setF(prev => ({ ...prev, banco: b.banco || '', clabe: b.clabe || '', titular: b.titular || '' }))
        setBancoOriginal(JSON.stringify([b.banco || '', b.clabe || '', b.titular || '']))
      }).catch(() => {})
    }
  }, [isOpen, empleado?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const esCoach = f.tipo === 'Coach'
  const pago = f.tipo_pago || (esCoach ? 'Por clase' : 'Fijo')
  const faltantes = [
    !f.nombre.trim() && 'nombre',
    !f.primer_apellido.trim() && 'primer apellido',
    !f.tipo && 'puesto',
    esCoach && !f.nivel && 'nivel',
    f.sucursales_ids.length === 0 && 'al menos una sucursal',
    !emailOk(f.email) && 'un correo válido',
    !telOk(f.telefono) && 'un teléfono de 10 dígitos',
  ].filter(Boolean) as string[]

  const toggle = (k: 'categorias' | 'sucursales_ids', v: string) => {
    const lista = f[k].includes(v) ? f[k].filter(x => x !== v) : [...f[k], v]
    set(k, lista)
    if (k === 'sucursales_ids' && !lista.includes(f.sucursal_asignada_id)) set('sucursal_asignada_id', lista[0] || '')
  }

  const cerrar = () => { if (!guardando) onClose() }

  const guardar = async () => {
    if (faltantes.length || guardando) return
    setGuardando(true); setError(null)
    const datos: any = {
      nombre: f.nombre.trim(), primer_apellido: f.primer_apellido.trim(),
      segundo_apellido: f.segundo_apellido.trim() || null,
      email: f.email.trim() ? limpiarCorreo(f.email) : null,
      telefono: f.telefono.trim() || null, rfc_identificacion: f.rfc.trim() || null,
      fecha_ingreso: f.fecha_ingreso || null, estatus: f.estatus,
      tipo: f.tipo, rol: f.rol, nivel: esCoach ? f.nivel || null : null,
      sucursal_asignada_id: f.sucursal_asignada_id || f.sucursales_ids[0] || null,
      tipo_pago: pago,
      sueldo_fijo: pago.startsWith('Fijo') && f.sueldo_fijo ? Number(f.sueldo_fijo) : null,
      pago_en_efectivo: f.pago_en_efectivo, bio: esCoach ? f.bio.trim() || null : null,
      contacto_emergencia_nombre: f.contacto_emergencia_nombre.trim() || null,
      contacto_emergencia_relacion: f.contacto_emergencia_relacion.trim() || null,
      contacto_emergencia_telefono: f.contacto_emergencia_telefono.trim() || null,
    }
    try {
      let id = empleado?.id as string
      if (editando) {
        const { error: e } = await supabase.from('staff').update(datos).eq('id', id)
        if (e) throw new Error(e.message)
      } else {
        const { data, error: e } = await supabase.from('staff').insert(datos).select('id').single()
        if (e || !data) throw new Error(e?.message || 'No se pudo crear')
        id = data.id
      }

      // Sucursales y categorías: se reemplazan
      await supabase.from('staff_sucursales').delete().eq('staff_id', id)
      if (f.sucursales_ids.length) {
        await supabase.from('staff_sucursales').insert(f.sucursales_ids.map(s => ({ staff_id: id, sucursal_id: s })))
      }
      await supabase.from('staff_categorias').delete().eq('staff_id', id)
      if (esCoach && f.categorias.length) {
        await supabase.from('staff_categorias').insert(f.categorias.map(c => ({ staff_id: id, categoria: c })))
      }

      // Datos bancarios (solo Dirección, por el backend)
      const bancoNuevo = JSON.stringify([f.banco, f.clabe, f.titular])
      if (direccion && bancoNuevo !== bancoOriginal && (f.banco || f.clabe || f.titular || bancoOriginal)) {
        await backend(`/staff-admin/banco/${id}`, { method: 'PUT', body: { banco: f.banco, clabe: f.clabe, titular: f.titular } })
      }

      // Acceso al CRM / app (solo en el alta y si tiene correo)
      let aviso: string | null = null
      if (!editando && datos.email) {
        try {
          const r = await fetch('/api/staff/crear-auth', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: datos.email, staff_id: id }),
          })
          if (!r.ok) aviso = 'Se guardó, pero no se pudo crear su acceso. Revisa que el correo no esté ya registrado.'
        } catch { aviso = 'Se guardó, pero no se pudo crear su acceso.' }
      }

      const quien = `${yo?.nombre || ''} ${yo?.primer_apellido || ''}`.trim()
      await logActividad({
        tipo: editando ? 'staff_editado' : 'staff_creado',
        descripcion: `${quien} ${editando ? 'editó a' : 'dio de alta a'} ${datos.nombre} ${datos.primer_apellido} (${datos.tipo}, ${datos.rol})`,
        tabla: 'staff', accion: editando ? 'UPDATE' : 'INSERT',
        metadata: { empleado_id: id, tipo: datos.tipo, rol: datos.rol, nivel: datos.nivel, tipo_pago: datos.tipo_pago,
                    sucursales: f.sucursales_ids, banco_actualizado: direccion && bancoNuevo !== bancoOriginal },
        sucursal_id: datos.sucursal_asignada_id, staff_id: yo?.id,
      })

      if (!editando) { try { localStorage.removeItem(BORRADOR) } catch {} }
      if (aviso) alert(aviso)
      onSuccess(id)
      onClose()
    } catch (e: any) {
      setError(e.message || 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="fixed inset-0 z-[60]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-gray-900/35 backdrop-blur-[2px]" onClick={cerrar} />
          <motion.aside className="absolute bottom-3 right-3 top-3 flex w-[min(600px,calc(100vw-24px))] flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl"
            initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}>

            <header className="flex items-center justify-between px-6 py-5 text-white" style={{ background: NEGRO }}>
              <div>
                <p className="text-xs text-white/50">{editando ? 'Editar' : 'Nuevo empleado'}</p>
                <h2 className="text-xl font-black tracking-tight">
                  {editando ? `${empleado.nombre} ${empleado.primer_apellido || ''}`.trim() : (f.nombre ? `${f.nombre} ${f.primer_apellido}`.trim() : 'Alta de staff')}
                </h2>
              </div>
              <button onClick={cerrar} className="grid h-9 w-9 place-items-center rounded-xl text-white/60 transition hover:bg-white/10 hover:text-white"><X size={18} /></button>
            </header>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[#F4F5F7] p-4">
              <Seccion titulo="Persona">
                <div className="grid grid-cols-2 gap-3">
                  <Campo label="Nombre *"><input className={input} value={f.nombre} onChange={e => set('nombre', e.target.value)} /></Campo>
                  <Campo label="Primer apellido *"><input className={input} value={f.primer_apellido} onChange={e => set('primer_apellido', e.target.value)} /></Campo>
                  <Campo label="Segundo apellido"><input className={input} value={f.segundo_apellido} onChange={e => set('segundo_apellido', e.target.value)} /></Campo>
                  <Campo label="Fecha de ingreso"><input type="date" className={input} value={f.fecha_ingreso} onChange={e => set('fecha_ingreso', e.target.value)} /></Campo>
                  <Campo label="Correo" ayuda={!editando ? 'Con él se le crea su acceso al CRM y a la app.' : undefined} error={!emailOk(f.email)}>
                    <input className={input} value={f.email} onChange={e => set('email', e.target.value)} placeholder="nombre@correo.com" />
                  </Campo>
                  <Campo label="Teléfono" error={!telOk(f.telefono)}><input className={input} value={f.telefono} onChange={e => set('telefono', e.target.value)} placeholder="10 dígitos" /></Campo>
                  <Campo label="RFC / identificación"><input className={input} value={f.rfc} onChange={e => set('rfc', e.target.value.toUpperCase())} /></Campo>
                  <Campo label="Estatus">
                    <div className="flex gap-1.5">
                      {['Activo', 'Inactivo'].map(e => (
                        <Opcion key={e} on={f.estatus === e} onClick={() => set('estatus', e)}>{e}</Opcion>
                      ))}
                    </div>
                  </Campo>
                </div>
              </Seccion>

              <Seccion titulo="Puesto">
                <Campo label="Puesto *">
                  <div className="flex flex-wrap gap-1.5">
                    {TIPOS.map(t => <Opcion key={t} on={f.tipo === t} onClick={() => set('tipo', t)}>{t === 'Front' ? 'Front Desk' : t}</Opcion>)}
                  </div>
                </Campo>
                {esCoach && (
                  <>
                    <Campo label="Nivel *" ayuda="Define cuánto se le paga por clase y qué bonos le tocan.">
                      <div className="flex flex-wrap gap-1.5">
                        {NIVELES.map(n => <Opcion key={n} on={f.nivel === n} onClick={() => set('nivel', n)}>{n}</Opcion>)}
                      </div>
                    </Campo>
                    <Campo label="Clases que da">
                      <div className="flex flex-wrap gap-1.5">
                        {CATEGORIAS.map(c => <Opcion key={c} on={f.categorias.includes(c)} onClick={() => toggle('categorias', c)} chica>{c}</Opcion>)}
                      </div>
                    </Campo>
                  </>
                )}
                <Campo label="Sucursales *">
                  <div className="flex flex-wrap gap-1.5">
                    {sucursales.map(s => (
                      <Opcion key={s.id} on={f.sucursales_ids.includes(s.id)} onClick={() => toggle('sucursales_ids', s.id)}>
                        <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: s.color || '#9CA3AF' }} />{s.nombre}
                      </Opcion>
                    ))}
                  </div>
                </Campo>
                {f.sucursales_ids.length > 1 && (
                  <Campo label="Sucursal principal" ayuda="Donde aplica su horario y su sueldo base.">
                    <select className={input} value={f.sucursal_asignada_id} onChange={e => set('sucursal_asignada_id', e.target.value)}>
                      {f.sucursales_ids.map(id => <option key={id} value={id}>{sucursales.find(s => s.id === id)?.nombre || id}</option>)}
                    </select>
                  </Campo>
                )}
                <Campo label="Acceso al CRM">
                  <div className="grid grid-cols-2 gap-2">
                    {ROLES.filter(r => r.v !== 'direccion' || direccion).map(r => (
                      <button key={r.v} type="button" onClick={() => set('rol', r.v)}
                        className={`rounded-xl border p-3 text-left transition ${f.rol === r.v ? 'border-[#171B24] bg-[#171B24] text-white' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                        <b className="text-sm">{r.l}</b>
                        <p className={`mt-0.5 text-[11px] leading-snug ${f.rol === r.v ? 'text-white/60' : 'text-gray-400'}`}>{r.d}</p>
                      </button>
                    ))}
                  </div>
                </Campo>
              </Seccion>

              <Seccion titulo="Pago">
                <Campo label="Cómo se le paga">
                  <div className="flex flex-wrap gap-1.5">
                    {TIPOS_PAGO.map(t => <Opcion key={t} on={pago === t} onClick={() => set('tipo_pago', t)}>{t}</Opcion>)}
                  </div>
                </Campo>
                {pago.startsWith('Fijo') && (
                  <Campo label="Sueldo quincenal propio" ayuda="Déjalo vacío para usar el sueldo de su puesto en su sucursal (se configura en Tarifas).">
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                      <input className={`${input} pl-7`} inputMode="numeric" value={f.sueldo_fijo}
                        onChange={e => set('sueldo_fijo', e.target.value.replace(/[^\d.]/g, ''))} placeholder="Del puesto" />
                    </div>
                  </Campo>
                )}
                {pago === 'Por clase' && (
                  <p className="rounded-xl bg-gray-50 px-3.5 py-2.5 text-xs text-gray-500">
                    Cada clase se paga según su nivel, la duración y la sucursal, con las tarifas de la pestaña Tarifas y bonos.
                  </p>
                )}
                <label className="flex cursor-pointer items-center gap-2.5 text-sm text-gray-700">
                  <input type="checkbox" checked={f.pago_en_efectivo} onChange={e => set('pago_en_efectivo', e.target.checked)} className="h-4 w-4 accent-[#171B24]" />
                  Se le paga en efectivo
                </label>
              </Seccion>

              <Seccion titulo="Datos bancarios" icono={<Lock size={13} />}>
                {direccion ? (
                  <div className="grid grid-cols-2 gap-3">
                    <Campo label="Banco"><input className={input} value={f.banco} onChange={e => set('banco', e.target.value)} /></Campo>
                    <Campo label="Titular"><input className={input} value={f.titular} onChange={e => set('titular', e.target.value)} placeholder="Si es otra persona" /></Campo>
                    <div className="col-span-2">
                      <Campo label="CLABE" ayuda="18 dígitos. Solo Dirección la ve completa." error={!!f.clabe && ![16, 18].includes(f.clabe.replace(/\D/g, '').length)}>
                        <input className={`${input} font-mono tracking-wider`} inputMode="numeric" value={f.clabe}
                          onChange={e => set('clabe', e.target.value.replace(/[^\d ]/g, ''))} />
                      </Campo>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Solo Dirección captura y ve los datos bancarios completos.</p>
                )}
              </Seccion>

              <Seccion titulo="Contacto de emergencia">
                <div className="grid grid-cols-3 gap-3">
                  <Campo label="Nombre"><input className={input} value={f.contacto_emergencia_nombre} onChange={e => set('contacto_emergencia_nombre', e.target.value)} /></Campo>
                  <Campo label="Relación"><input className={input} value={f.contacto_emergencia_relacion} onChange={e => set('contacto_emergencia_relacion', e.target.value)} /></Campo>
                  <Campo label="Teléfono"><input className={input} value={f.contacto_emergencia_telefono} onChange={e => set('contacto_emergencia_telefono', e.target.value)} /></Campo>
                </div>
              </Seccion>

              {esCoach && (
                <Seccion titulo="Bio pública" ayuda="Se muestra a los clientes en la app, en las clases que da.">
                  <textarea className={`${input} min-h-[90px] resize-y`} value={f.bio} onChange={e => set('bio', e.target.value)} />
                </Seccion>
              )}
              {!editando && <p className="px-1 text-xs text-gray-400">Los documentos (INE, contrato…) se suben desde su perfil, en la pestaña Datos.</p>}
            </div>

            <footer className="flex items-center justify-between gap-3 border-t border-gray-100 bg-white px-6 py-4">
              <p className="min-w-0 truncate text-xs text-gray-400">
                {error ? <span className="font-semibold text-rose-600">{error}</span>
                  : faltantes.length ? `Falta: ${faltantes.join(', ')}` : 'Todo listo'}
              </p>
              <div className="flex shrink-0 gap-2">
                <button onClick={cerrar} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button onClick={guardar} disabled={!!faltantes.length || guardando}
                  className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-black text-white transition hover:brightness-125 disabled:opacity-40"
                  style={{ background: NEGRO }}>
                  <Check size={15} /> {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Dar de alta'}
                </button>
              </div>
            </footer>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Seccion({ titulo, ayuda, icono, children }: { titulo: string; ayuda?: string; icono?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
      <div>
        <p className="flex items-center gap-1.5 text-sm font-black text-gray-900">{icono}{titulo}</p>
        {ayuda && <p className="text-xs text-gray-400">{ayuda}</p>}
      </div>
      {children}
    </section>
  )
}

function Campo({ label, ayuda, error, children }: { label: string; ayuda?: string; error?: boolean; children: React.ReactNode }) {
  return (
    <div className="block">
      <span className={`mb-1 block text-xs font-bold ${error ? 'text-rose-600' : 'text-gray-500'}`}>{label}</span>
      {children}
      {ayuda && <span className="mt-1 block text-[11px] text-gray-400">{ayuda}</span>}
    </div>
  )
}

function Opcion({ on, onClick, chica, children }: { on: boolean; onClick: () => void; chica?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`inline-flex items-center rounded-xl border font-bold transition ${chica ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-[13px]'} ${
        on ? 'border-[#171B24] bg-[#171B24] text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'}`}>
      {children}
    </button>
  )
}
'use client'
// src/components/staff/equipo/PerfilStaff.tsx
// Perfil de una persona del staff. Reemplaza a DrawerStaff y sus pestañas viejas (Métricas,
// Performance, Nómina y Horas, que calculaban con supuestos o tenían datos de ejemplo).
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Pencil, Power, Trash2, AlertTriangle, Upload, Download, Lock, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { logActividad } from '@/lib/log-actividad'
import { esDireccion } from '@/lib/permisos'
import { backend } from '@/lib/backend'
import StaffTabClases from '@/components/staff/drawer/StaffTabClases'
import StaffTabAcceso from '@/components/staff/StaffTabAcceso'
import { NEGRO, grupo, puesto, pagoDe, nombreCompleto, iniciales, hora, diaHora, antiguedad,
         etiquetaQuincena, ESTADO_CLASE } from './util'

type Tab = 'resumen' | 'clases' | 'checadas' | 'pago' | 'datos' | 'acceso'
const DOCS = ['INE', 'Contrato firmado', 'Comprobante de domicilio']
const DIAS = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

export default function PerfilStaff({ staffId, isOpen, onClose, onEditar, onCambio }:
  { staffId: string | null; isOpen: boolean; onClose: () => void; onEditar: (e: any) => void; onCambio: () => void }) {
  const { staff: yo } = useAuth()
  const direccion = esDireccion(yo?.rol)
  const [emp, setEmp] = useState<any>(null)
  const [datos, setDatos] = useState<any>(null)
  const [tab, setTab] = useState<Tab>('resumen')
  const [error, setError] = useState<string | null>(null)
  const [accion, setAccion] = useState<null | 'estatus' | 'eliminar'>(null)

  const cargar = async () => {
    if (!staffId) return
    setError(null)
    const [{ data }, d] = await Promise.all([
      supabase.from('staff').select('*, staff_sucursales(sucursales(id, nombre, color)), staff_categorias(categoria), staff_documentos(*)')
        .eq('id', staffId).single(),
      backend(`/staff-admin/perfil/${staffId}`).catch((e: any) => { setError(e.message); return null }),
    ])
    setEmp(data); setDatos(d)
  }

  useEffect(() => {
    if (!isOpen || !staffId) return
    setEmp(null); setDatos(null); setTab('resumen'); setAccion(null)
    cargar()
  }, [isOpen, staffId]) // eslint-disable-line react-hooks/exhaustive-deps

  const esCoach = emp ? grupo(emp) === 'coach' : false
  const r = datos?.resumen || {}
  const ultima = datos?.checadas?.[0]
  const hoy = new Date().toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' })
  const adentro = ultima && ultima.tipo === 'entrada' && ['confirmada', 'automatica', 'manual'].includes(ultima.estado)
    && new Date(ultima.hora).toLocaleDateString('es-MX', { timeZone: 'America/Mexico_City' }) === hoy

  const cambiarEstatus = async () => {
    const nuevo = (emp.estatus || 'Activo') === 'Activo' ? 'Inactivo' : 'Activo'
    const { error: e } = await supabase.from('staff').update({ estatus: nuevo }).eq('id', emp.id)
    if (e) { alert('No se pudo cambiar el estatus: ' + e.message); return }
    await logActividad({
      tipo: nuevo === 'Activo' ? 'staff_activado' : 'staff_desactivado',
      descripcion: `${yo?.nombre || ''} ${yo?.primer_apellido || ''} ${nuevo === 'Activo' ? 'activó' : 'desactivó'} a ${nombreCompleto(emp)}`,
      tabla: 'staff', accion: 'UPDATE',
      metadata: { empleado_id: emp.id, estatus_antes: emp.estatus, estatus_despues: nuevo },
      sucursal_id: emp.sucursal_asignada_id || null, staff_id: yo?.id,
    })
    setAccion(null); await cargar(); onCambio()
  }

  const eliminar = async () => {
    await supabase.from('staff_sucursales').delete().eq('staff_id', emp.id)
    await supabase.from('staff_categorias').delete().eq('staff_id', emp.id)
    await supabase.from('staff_documentos').delete().eq('staff_id', emp.id)
    const { error: e } = await supabase.from('staff').delete().eq('id', emp.id)
    if (e) { alert('No se pudo eliminar: ' + e.message + '\n\nSi tiene clases o checadas en su historial, mejor desactívalo.'); return }
    await logActividad({
      tipo: 'staff_eliminado', descripcion: `${yo?.nombre || ''} ${yo?.primer_apellido || ''} eliminó a ${nombreCompleto(emp)}`,
      tabla: 'staff', accion: 'DELETE', metadata: { empleado_id: emp.id, nombre: nombreCompleto(emp), rol: emp.rol },
      sucursal_id: emp.sucursal_asignada_id || null, staff_id: yo?.id,
    })
    onCambio(); onClose()
  }

  const TABS: { v: Tab; l: string }[] = [
    { v: 'resumen', l: 'Resumen' }, ...(esCoach ? [{ v: 'clases' as Tab, l: 'Clases' }] : []),
    { v: 'checadas', l: 'Checadas' }, { v: 'pago', l: 'Pago' }, { v: 'datos', l: 'Datos' }, { v: 'acceso', l: 'Acceso' },
  ]

  const stats: [string, string][] = esCoach
    ? [['Clases', `${r.clases_impartidas ?? 0} de ${r.clases_programadas ?? 0}`], ['Asistentes prom.', r.asistentes_promedio != null ? String(r.asistentes_promedio) : '—'],
       ['Por revisar', String(r.sin_checar ?? 0)], ['Días checados', String(r.dias ?? 0)]]
    : [['Días', String(r.dias ?? 0)], ['Horas', `${r.horas ?? 0} h`],
       ['Turno hoy', datos?.horario?.hoy?.length
          ? `${horaCorta12(datos.horario.hoy[0].entrada)} – ${horaCorta12(datos.horario.hoy[0].salida)}${datos.horario.hoy.length > 1 ? ` +${datos.horario.hoy.length - 1}` : ''}`
          : 'Sin turno'],
       ['Antigüedad', antiguedad(emp?.fecha_ingreso)]]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="fixed inset-0 z-[55]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-gray-900/35 backdrop-blur-[2px]" onClick={onClose} />
          <motion.aside className="absolute bottom-3 right-3 top-3 flex w-[min(600px,calc(100vw-24px))] flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl"
            initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}>

            {!emp ? (
              <div className="flex flex-1 items-center justify-center gap-2 text-gray-400"><RefreshCw size={16} className="animate-spin" /> Cargando perfil…</div>
            ) : (
              <>
                <header className="p-6 text-white" style={{ background: NEGRO }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-4">
                      {emp.foto_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={emp.foto_url} alt="" className="h-16 w-16 rounded-[20px] object-cover" />
                        : <span className="grid h-16 w-16 shrink-0 place-items-center rounded-[20px] bg-white text-xl font-black text-gray-900">{iniciales(emp)}</span>}
                      <div className="min-w-0">
                        <h2 className="truncate text-2xl font-black tracking-tight">{nombreCompleto(emp)}</h2>
                        <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px] font-bold">
                          <span className="rounded-lg bg-white px-2 py-0.5 text-gray-900">{puesto(emp)}{esCoach && emp.nivel ? ` · ${emp.nivel}` : ''}</span>
                          <span className="rounded-lg bg-white/10 px-2 py-0.5">{pagoDe(emp)}</span>
                          {(emp.estatus || 'Activo') !== 'Activo' && <span className="rounded-lg bg-rose-500/20 px-2 py-0.5 text-rose-200">Inactivo</span>}
                          {adentro && <span className="rounded-lg bg-emerald-500/20 px-2 py-0.5 text-emerald-300">Adentro desde {hora(ultima.hora)}</span>}
                        </div>
                      </div>
                    </div>
                    <button onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white/60 hover:bg-white/10 hover:text-white"><X size={18} /></button>
                  </div>
                  <div className="mt-5 grid grid-cols-4 gap-2">
                    {stats.map(([t, v]) => (
                      <div key={t} className="rounded-2xl bg-white/[.07] px-3 py-2.5">
                        <p className="text-[11px] text-white/55">{t}</p>
                        <b className="block truncate text-lg font-black">{v}</b>
                      </div>
                    ))}
                  </div>
                </header>

                <nav className="flex gap-1 overflow-x-auto border-b border-gray-100 px-4 py-2.5">
                  {TABS.map(t => (
                    <button key={t.v} onClick={() => setTab(t.v)}
                      className={`shrink-0 rounded-xl px-3 py-1.5 text-[13px] font-bold transition ${tab === t.v ? 'bg-[#171B24] text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                      {t.l}
                    </button>
                  ))}
                </nav>

                <div className="min-h-0 flex-1 overflow-y-auto">
                  {error && <p className="m-5 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
                  {tab === 'resumen' && <Resumen emp={emp} datos={datos} esCoach={esCoach} />}
                  {tab === 'clases' && <StaffTabClases empleado={emp} />}
                  {tab === 'checadas' && <Checadas lista={datos?.checadas || []} />}
                  {tab === 'pago' && <Pago emp={emp} datos={datos} direccion={direccion} onEditar={() => onEditar(emp)} />}
                  {tab === 'datos' && <Datos emp={emp} onRefresh={cargar} />}
                  {tab === 'acceso' && <div className="p-1"><StaffTabAcceso empleado={emp} onRefresh={cargar} /></div>}
                </div>

                <footer className="flex items-center justify-between gap-2 border-t border-gray-100 px-5 py-3.5">
                  {accion ? (
                    <>
                      <p className="text-sm font-semibold text-gray-700">
                        {accion === 'eliminar' ? '¿Eliminar a esta persona? No se puede deshacer.'
                          : (emp.estatus || 'Activo') === 'Activo' ? '¿Desactivar? Ya no podrá checar ni entrar al CRM.' : '¿Volver a activar?'}
                      </p>
                      <div className="flex gap-2">
                        <button onClick={() => setAccion(null)} className="rounded-xl border border-gray-200 px-3.5 py-2 text-sm font-bold text-gray-600">No</button>
                        <button onClick={accion === 'eliminar' ? eliminar : cambiarEstatus}
                          className="rounded-xl bg-rose-600 px-3.5 py-2 text-sm font-bold text-white">Sí, confirmar</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex gap-1">
                        <button onClick={() => setAccion('estatus')}
                          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100">
                          <Power size={14} /> {(emp.estatus || 'Activo') === 'Activo' ? 'Desactivar' : 'Activar'}
                        </button>
                        {direccion && (
                          <button onClick={() => setAccion('eliminar')}
                            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-gray-400 hover:bg-rose-50 hover:text-rose-600">
                            <Trash2 size={14} /> Eliminar
                          </button>
                        )}
                      </div>
                      <button onClick={() => onEditar(emp)}
                        className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black text-white hover:brightness-125" style={{ background: NEGRO }}>
                        <Pencil size={14} /> Editar
                      </button>
                    </>
                  )}
                </footer>
              </>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ── Resumen ──────────────────────────────────────────────────────────────────
function Resumen({ emp, datos, esCoach }: { emp: any; datos: any; esCoach: boolean }) {
  if (!datos) return <p className="p-6 text-sm text-gray-400">Cargando…</p>
  const pendientes = (datos.clases || []).filter((c: any) => ['sin_checar', 'revisar'].includes(c.estado))
  return (
    <div className="space-y-4 p-5">
      {pendientes.length > 0 && (
        <div className="flex gap-2.5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{pendientes.length} clase{pendientes.length === 1 ? '' : 's'} sin checar. Revísala{pendientes.length === 1 ? '' : 's'} antes de cerrar la quincena.</span>
        </div>
      )}
      <p className="text-sm font-black text-gray-900">Esta quincena · {etiquetaQuincena(datos.quincena?.inicio, datos.quincena?.fin)}</p>

      {esCoach ? (
        (datos.clases || []).length === 0 ? <p className="text-sm text-gray-400">Sin clases en esta quincena.</p> : (
          <div>
            {datos.clases.map((c: any) => {
              const e = ESTADO_CLASE[c.estado] || ESTADO_CLASE.pendiente
              return (
                <div key={c.id} className="grid grid-cols-[150px_minmax(0,1fr)_auto] items-center gap-3 border-b border-gray-100 py-2.5 text-sm last:border-0">
                  <b className="text-[13px] text-gray-900">{diaHora(c.horario)}</b>
                  <div className="min-w-0">
                    <b className="block truncate text-gray-900">{c.nombre}</b>
                    <p className="truncate text-xs text-gray-500">{c.duracion} min · {c.sucursal} · {c.estado === 'impartida' ? `${c.llegaron} llegaron` : `${c.reservas}/${c.cupo} reservas`}</p>
                  </div>
                  <span className={`rounded-lg px-2 py-0.5 text-[11px] font-bold ${e.cls}`}>{e.txt}</span>
                </div>
              )
            })}
          </div>
        )
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Dato t="Días trabajados" v={String(datos.resumen?.dias ?? 0)} />
            <Dato t="Horas" v={`${datos.resumen?.horas ?? 0} h`} />
          </div>
          <TurnosQuincena horario={datos.horario} />
        </div>
      )}
    </div>
  )
}

// ── Checadas ─────────────────────────────────────────────────────────────────
function Checadas({ lista }: { lista: any[] }) {
  if (!lista.length) return <p className="p-6 text-sm text-gray-400">Sin checadas en los últimos 30 días.</p>
  const etiqueta = (c: any): [string, string] => {
    if (c.estado === 'rechazada') return [`Rechazada${c.motivo ? ` · ${c.motivo}` : ''}`, 'text-rose-600']
    if (c.estado === 'pendiente') return ['Esperando confirmación', 'text-gray-500']
    if (c.tipo === 'salida') return [c.estado === 'automatica' ? 'Salida automática' : 'Salida', 'text-gray-600']
    if (c.estado === 'manual') return ['Entrada manual', 'text-amber-600']
    if (c.estado === 'automatica') return ['Entrada · primera del día', 'text-emerald-600']
    return ['Entrada', 'text-emerald-600']
  }
  return (
    <div className="p-5">
      <p className="mb-2 text-xs font-bold text-gray-500">Últimos 30 días</p>
      {lista.map(c => {
        const [t, cls] = etiqueta(c)
        return (
          <div key={c.id} className="flex items-center gap-3 border-b border-gray-100 py-2.5 text-sm last:border-0">
            <span className="w-32 shrink-0 text-[13px] text-gray-500">{diaHora(c.hora)}</span>
            <span className="min-w-0 flex-1 truncate text-gray-700">{c.sucursal || '—'}</span>
            <span className={`text-xs font-bold ${cls}`}>{t}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Pago ─────────────────────────────────────────────────────────────────────
function Pago({ emp, datos, direccion, onEditar }: { emp: any; datos: any; direccion: boolean; onEditar: () => void }) {
  const b = datos?.banco
  const p = pagoDe(emp)
  return (
    <div className="space-y-4 p-5">
      <div className="grid grid-cols-2 gap-2">
        <Dato t="Cómo se le paga" v={p} />
        <Dato t={p.startsWith('Fijo') ? 'Sueldo quincenal' : 'Tarifa'}
              v={p.startsWith('Fijo') ? (emp.sueldo_fijo ? `$${Number(emp.sueldo_fijo).toLocaleString('es-MX')}` : 'El de su puesto') : 'Según nivel y duración'} />
      </div>
      {emp.pago_en_efectivo && <p className="rounded-xl bg-gray-50 px-4 py-2.5 text-sm text-gray-600">Se le paga en efectivo.</p>}
      <p className="rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-500">
        El cálculo de lo ganado en la quincena (clases, bonos, festivos y ajustes) aparece aquí cuando estén capturadas las tarifas.
      </p>

      <div className="rounded-2xl border border-gray-200 p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-sm font-black text-gray-900"><Lock size={13} /> Datos bancarios</p>
          {direccion && <button onClick={onEditar} className="text-xs font-bold text-gray-500 hover:text-gray-900">Editar</button>}
        </div>
        {!b ? <p className="text-sm text-gray-400">Sin capturar.</p> : (
          <div className="space-y-1.5 text-sm">
            <Fila t="Banco" v={b.banco || '—'} />
            <Fila t="CLABE" v={b.completo ? (b.clabe || '—') : (b.clabe_mascara || '—')} mono />
            {b.completo && <Fila t="Titular" v={b.titular || nombreCompleto(emp)} />}
            {!b.completo && <p className="pt-1 text-[11px] text-gray-400">Solo Dirección ve la CLABE completa.</p>}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Datos y documentos ───────────────────────────────────────────────────────
function Datos({ emp, onRefresh }: { emp: any; onRefresh: () => void }) {
  const [subiendo, setSubiendo] = useState<string | null>(null)
  const [tipo, setTipo] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  const sucs = (emp.staff_sucursales || []).map((x: any) => x.sucursales).filter(Boolean)
  const doc = (t: string) => (emp.staff_documentos || []).find((d: any) => d.tipo === t)

  const subir = async (file: File, t: string) => {
    setSubiendo(t)
    const path = `${emp.id}/${t.replace(/ /g, '_')}_${Date.now()}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from('staff-documentos').upload(path, file, { upsert: true })
    if (error) { alert('No se pudo subir: ' + error.message); setSubiendo(null); return }
    const { data } = supabase.storage.from('staff-documentos').getPublicUrl(path)
    await supabase.from('staff_documentos').delete().eq('staff_id', emp.id).eq('tipo', t)
    await supabase.from('staff_documentos').insert({ staff_id: emp.id, tipo: t, url: data.publicUrl, nombre_archivo: file.name })
    setSubiendo(null); onRefresh()
  }
  const borrar = async (d: any) => {
    if (!confirm('¿Eliminar este documento?')) return
    const path = (d.url || '').split('/staff-documentos/')[1]
    if (path) await supabase.storage.from('staff-documentos').remove([path])
    await supabase.from('staff_documentos').delete().eq('id', d.id)
    onRefresh()
  }

  return (
    <div className="space-y-4 p-5">
      <div className="space-y-1.5 rounded-2xl bg-gray-50 p-4 text-sm">
        <Fila t="Correo" v={emp.email || '—'} />
        <Fila t="Teléfono" v={emp.telefono || '—'} />
        <Fila t="RFC" v={emp.rfc_identificacion || '—'} />
        <Fila t="Ingreso" v={emp.fecha_ingreso ? `${new Date(emp.fecha_ingreso + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })} · ${antiguedad(emp.fecha_ingreso)}` : '—'} />
        <Fila t="Sucursales" v={sucs.map((s: any) => s.nombre).join(', ') || 'Ninguna'} />
        {(emp.staff_categorias || []).length > 0 && <Fila t="Clases que da" v={emp.staff_categorias.map((c: any) => c.categoria).join(', ')} />}
      </div>

      {(emp.contacto_emergencia_nombre || emp.contacto_emergencia_telefono) && (
        <div className="space-y-1.5 rounded-2xl bg-gray-50 p-4 text-sm">
          <p className="mb-1 text-xs font-bold text-gray-500">Contacto de emergencia</p>
          <Fila t="Nombre" v={`${emp.contacto_emergencia_nombre || '—'}${emp.contacto_emergencia_relacion ? ` (${emp.contacto_emergencia_relacion})` : ''}`} />
          <Fila t="Teléfono" v={emp.contacto_emergencia_telefono || '—'} />
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 p-4">
        <p className="mb-1 text-sm font-black text-gray-900">Documentos</p>
        {DOCS.map(t => {
          const d = doc(t)
          return (
            <div key={t} className="flex items-center justify-between border-b border-gray-100 py-2.5 text-sm last:border-0">
              <span className="text-gray-700">{t}</span>
              {d ? (
                <span className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-600">✓ Entregado</span>
                  <a href={d.url} target="_blank" rel="noreferrer" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><Download size={13} /></a>
                  <button onClick={() => borrar(d)} className="rounded-lg p-1.5 text-gray-300 hover:bg-rose-50 hover:text-rose-500"><Trash2 size={13} /></button>
                </span>
              ) : (
                <button onClick={() => { setTipo(t); ref.current?.click() }} disabled={subiendo === t}
                  className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-900">
                  {subiendo === t ? 'Subiendo…' : <><Upload size={12} /> Subir</>}
                </button>
              )}
            </div>
          )
        })}
        <input ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden"
          onChange={e => { const fl = e.target.files?.[0]; if (fl && tipo) subir(fl, tipo); e.target.value = '' }} />
      </div>
    </div>
  )
}

function Dato({ t, v }: { t: string; v: string }) {
  return (
    <div className="rounded-2xl bg-[#F4F5F7] px-4 py-3">
      <p className="text-xs text-gray-500">{t}</p>
      <b className="mt-0.5 block text-[17px] font-black tracking-tight text-gray-900">{v}</b>
    </div>
  )
}

function Fila({ t, v, mono }: { t: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-gray-500">{t}</span>
      <span className={`text-right font-semibold text-gray-900 ${mono ? 'font-mono tracking-wider' : ''}`}>{v}</span>
    </div>
  )
}


// ── Turnos de la quincena: una lista por semana, fácil de leer ──────────────────
const DIAS_LARGO = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** "07:00" → "7:00 a.m." · "15:30" → "3:30 p.m." */
export function hora12(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'a.m.' : 'p.m.'}`
}
/** "07:00" → "7 am" · "15:30" → "3:30 pm" (para espacios chicos) */
export function horaCorta12(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'am' : 'pm'}`
}

function TurnosQuincena({ horario }: { horario: any }) {
  const dias: any[] = horario?.dias || []
  if (!dias.length) return null
  // Semanas de lunes a domingo
  const semanas: any[][] = []
  for (const x of dias) {
    if (!semanas.length || x.dia_semana === 1) semanas.push([])
    semanas[semanas.length - 1].push(x)
  }
  const fechaTxt = (f: string) => { const d = new Date(f + 'T12:00:00'); return `${DIAS_LARGO[d.getDay()].toLowerCase()} ${d.getDate()}` }
  const mesDe = (f: string) => MESES[new Date(f + 'T12:00:00').getMonth()]

  return (
    <div className="space-y-4">
      {!horario?.con_horario && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          No tiene horario capturado: el checador no lo deja entrar. Captúralo en Staff → Horarios.
        </p>
      )}
      {semanas.map((sem, i) => (
        <div key={i}>
          <p className="mb-1.5 text-sm font-black text-gray-900">
            Semana {i + 1}
            <span className="ml-2 text-xs font-semibold text-gray-500">
              {sem.length === 1 ? `solo el ${fechaTxt(sem[0].fecha)} de ${mesDe(sem[0].fecha)}`
                : `del ${fechaTxt(sem[0].fecha)}${mesDe(sem[0].fecha) !== mesDe(sem[sem.length - 1].fecha) ? ` de ${mesDe(sem[0].fecha)}` : ''} al ${fechaTxt(sem[sem.length - 1].fecha)} de ${mesDe(sem[sem.length - 1].fecha)}`}
            </span>
          </p>
          <div className="overflow-hidden rounded-2xl border border-gray-200">
            {sem.map((x: any) => {
              const d = new Date(x.fecha + 'T12:00:00')
              const hoy = x.fecha === horario?.hoy_fecha
              const turnos: any[] = x.turnos || []
              return (
                <div key={x.fecha}
                  className={`flex items-center gap-3 border-t border-gray-100 px-4 py-2.5 first:border-t-0 ${hoy ? 'bg-emerald-50' : turnos.length ? 'bg-white' : 'bg-gray-50'}`}
                  style={hoy ? { boxShadow: 'inset 4px 0 0 #10B981' } : undefined}>
                  <div className="w-36 shrink-0">
                    <p className={`text-sm font-black ${turnos.length || hoy ? 'text-gray-900' : 'text-gray-400'}`}>{DIAS_LARGO[d.getDay()]} {d.getDate()}</p>
                    <p className="text-[11px] text-gray-400">de {MESES[d.getMonth()]}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    {turnos.length === 0
                      ? <p className="text-sm font-semibold text-gray-400">Descansa</p>
                      : turnos.map((t: any, j: number) => (
                          <p key={j} className="text-sm text-gray-900">
                            <b>{hora12(t.entrada)}</b> <span className="text-gray-400">a</span> <b>{hora12(t.salida)}</b>
                            {t.sucursal && <span className="ml-2 text-xs text-gray-500">· {t.sucursal}</span>}
                          </p>
                        ))}
                  </div>
                  {hoy && <span className="shrink-0 rounded-lg bg-emerald-500 px-2.5 py-1 text-xs font-black text-white">HOY</span>}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
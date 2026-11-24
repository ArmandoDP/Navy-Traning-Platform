'use client'
// src/app/dashboard/staff/page.tsx
// Módulo de Staff (solo Dirección y Managers).
// Parte 1: Equipo · Parte 2: Horarios, Checadas (faltas y retardos) y Festivos.
// Parte 3: Tarifas y bonos · Parte 4: Quincena.
import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Download, RefreshCw, Clock, Coins, ScanLine, FileSpreadsheet, CalendarDays } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useSucursal } from '@/context/SucursalContext'
import { backend } from '@/lib/backend'
import ListaEquipo from '@/components/staff/equipo/ListaEquipo'
import PerfilStaff from '@/components/staff/equipo/PerfilStaff'
import DrawerEmpleado from '@/components/staff/equipo/DrawerEmpleado'
import TabHorarios from '@/components/staff/horarios/TabHorarios'
import TabChecadas from '@/components/staff/checadas/TabChecadas'
import TabFestivos from '@/components/staff/festivos/TabFestivos'
import TabTarifas from '@/components/staff/tarifas/TabTarifas'
import TabQuincena from '@/components/staff/quincena/TabQuincena'
import { useAuth } from '@/context/AuthContext'
import { esDireccion } from '@/lib/permisos'
import { NEGRO, grupo, puesto, pagoDe, nombreCompleto, etiquetaQuincena } from '@/components/staff/equipo/util'

type Pestana = 'equipo' | 'horarios' | 'tarifas' | 'checadas' | 'quincena' | 'festivos'
const PESTANAS: { v: Pestana; l: string; icono: React.ElementType }[] = [
  { v: 'equipo', l: 'Equipo', icono: ScanLine },
  { v: 'horarios', l: 'Horarios', icono: Clock },
  { v: 'tarifas', l: 'Tarifas y bonos', icono: Coins },
  { v: 'checadas', l: 'Checadas', icono: ScanLine },
  { v: 'quincena', l: 'Quincena', icono: FileSpreadsheet },
  { v: 'festivos', l: 'Festivos', icono: CalendarDays },
]

export default function StaffPage() {
  const { sucursalId, sucursalActiva, sucursales } = useSucursal()
  const { staff: yo } = useAuth()
  const direccion = esDireccion(yo?.rol)
  const [pestana, setPestana] = useState<Pestana>('equipo')
  const [staff, setStaff] = useState<any[]>([])
  const [resumen, setResumen] = useState<{ quincena?: any; personas: Record<string, any> }>({ personas: {} })
  const [cargando, setCargando] = useState(true)
  const [aviso, setAviso] = useState<string | null>(null)
  const [perfilId, setPerfilId] = useState<string | null>(null)
  const [form, setForm] = useState<{ abierto: boolean; empleado: any | null }>({ abierto: false, empleado: null })

  const cargar = useCallback(async (primera = false) => {
    if (primera) setCargando(true)
    const [{ data, error }, r] = await Promise.all([
      supabase.from('staff')
        .select('id, nombre, primer_apellido, segundo_apellido, email, telefono, tipo, nivel, rol, estatus, tipo_pago, sueldo_fijo, supabase_user_id, foto_url, fecha_ingreso, sucursal_asignada_id, staff_sucursales(sucursales(id, nombre, color))')
        .order('nombre'),
      backend(`/staff-admin/equipo${sucursalId ? `?sucursal_id=${sucursalId}` : ''}`)
        .catch((e: any) => { setAviso(e.message); return { personas: {} } }),
    ])
    if (!error && data) {
      setStaff(sucursalId
        ? data.filter((s: any) => s.sucursal_asignada_id === sucursalId || (s.staff_sucursales || []).some((x: any) => x.sucursales?.id === sucursalId))
        : data)
    }
    setResumen(r || { personas: {} })
    setCargando(false)
  }, [sucursalId])

  useEffect(() => { cargar(true) }, [cargar])

  const activos = staff.filter(s => (s.estatus || 'Activo') === 'Activo')
  const coaches = activos.filter(s => grupo(s) === 'coach')
  const p = resumen.personas || {}
  const adentro = activos.filter(s => p[s.id]?.adentro_desde)
  const programadas = coaches.reduce((a, s) => a + (p[s.id]?.programadas || 0), 0)
  const impartidas = coaches.reduce((a, s) => a + (p[s.id]?.impartidas || 0), 0)
  const sinChecar = coaches.reduce((a, s) => a + (p[s.id]?.sin_checar || 0), 0)
  const sinCuenta = activos.filter(s => !s.supabase_user_id).length

  const exportar = () => {
    const filas = [['Nombre', 'Correo', 'Teléfono', 'Puesto', 'Nivel', 'Pago', 'Sucursales', 'Estatus', 'Cuenta app', 'Ingreso']]
    for (const s of staff) {
      filas.push([nombreCompleto(s), s.email || '', s.telefono || '', puesto(s), s.nivel || '', pagoDe(s),
        (s.staff_sucursales || []).map((x: any) => x.sucursales?.nombre).filter(Boolean).join(' / '),
        s.estatus || 'Activo', s.supabase_user_id ? 'Sí' : 'No', s.fecha_ingreso || ''])
    }
    const csv = '\ufeff' + filas.map(f => f.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    a.download = `staff-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  if (cargando) return (
    <div className="flex h-64 items-center justify-center gap-2 text-gray-400"><RefreshCw size={16} className="animate-spin" /> Cargando staff…</div>
  )

  return (
    <div className="flex flex-col gap-4 xl:h-[calc(100dvh-104px)]">
      <div className="flex shrink-0 flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Staff</h1>
          <p className="text-sm text-gray-400">Equipo, horarios y pago de coaches y staff{sucursalActiva ? ` · ${sucursalActiva.nombre}` : ''}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportar} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50">
            <Download size={15} /> Exportar
          </button>
          <button onClick={() => setForm({ abierto: true, empleado: null })}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black text-white hover:brightness-125" style={{ background: NEGRO }}>
            <Plus size={15} /> Nuevo empleado
          </button>
        </div>
      </div>

      <div className="flex w-max max-w-full shrink-0 gap-1 overflow-x-auto rounded-2xl border border-gray-200 bg-white p-1">
        {PESTANAS.map(t => (
          <button key={t.v} onClick={() => setPestana(t.v)}
            className={`relative shrink-0 rounded-xl px-4 py-2 text-[13px] font-bold transition ${pestana === t.v ? 'text-white' : 'text-gray-500 hover:text-gray-800'}`}>
            {pestana === t.v && <motion.span layoutId="staff-pestana" className="absolute inset-0 rounded-xl" style={{ background: NEGRO }}
              transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
            <span className="relative">{t.l}</span>
          </button>
        ))}
      </div>

      {aviso && <p className="shrink-0 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-800">No se pudo cargar lo del checador: {aviso}</p>}

      {pestana === 'equipo' ? (
        <>
          <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi t="Equipo activo" v={activos.length} s={`${nCoaches(coaches.length)} · ${activos.length - coaches.length} staff`} />
            <Kpi t="Adentro ahora" v={adentro.length} s={`${nCoaches(adentro.filter(s => grupo(s) === 'coach').length)} · ${adentro.filter(s => grupo(s) !== 'coach').length} staff`} />
            <Kpi t={`Clases · ${etiquetaQuincena(resumen.quincena?.inicio, resumen.quincena?.fin)}`} v={impartidas}
                 s={`de ${programadas} programadas${sinChecar ? ` · ${sinChecar} sin checar` : ''}`} alerta={sinChecar > 0} />
            <Kpi t="Sin cuenta de app" v={sinCuenta} s={sinCuenta ? 'No pueden checar ni ver sus clases' : 'Todos tienen acceso'} alerta={sinCuenta > 0} />
          </div>
          <ListaEquipo staff={staff} resumen={p} onVer={s => setPerfilId(s.id)} />
        </>
      ) : pestana === 'horarios' ? (
        <TabHorarios staff={staff} sucursalId={sucursalId} sucursalNombre={sucursalActiva?.nombre} />
      ) : pestana === 'checadas' ? (
        <TabChecadas staff={staff} sucursalId={sucursalId} direccion={direccion} />
      ) : pestana === 'tarifas' ? (
        <TabTarifas direccion={direccion} sucursales={sucursales || []} />
      ) : pestana === 'quincena' ? (
        <TabQuincena sucursalId={sucursalId} direccion={direccion} />
      ) : (
        <TabFestivos direccion={direccion} sucursales={sucursales || []} />
      )}

      <PerfilStaff staffId={perfilId} isOpen={!!perfilId} onClose={() => setPerfilId(null)}
        onEditar={e => { setPerfilId(null); setForm({ abierto: true, empleado: e }) }}
        onCambio={() => cargar()} />
      <DrawerEmpleado isOpen={form.abierto} empleado={form.empleado}
        onClose={() => setForm({ abierto: false, empleado: null })}
        onSuccess={id => { cargar(); setPerfilId(id) }} />
    </div>
  )
}

const nCoaches = (n: number) => `${n} coach${n === 1 ? '' : 'es'}`

function Kpi({ t, v, s, alerta }: { t: string; v: number; s: string; alerta?: boolean }) {
  return (
    <div className="rounded-[18px] border border-gray-200 bg-white p-4 shadow-sm">
      <p className="truncate text-xs text-gray-500">{t}</p>
      <motion.p key={v} initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-0.5 text-3xl font-black tracking-tight text-gray-900 tabular-nums">{v}</motion.p>
      <p className={`mt-0.5 truncate text-xs ${alerta ? 'font-semibold text-amber-700' : 'text-gray-500'}`}>{s}</p>
    </div>
  )
}
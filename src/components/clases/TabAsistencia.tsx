'use client'
// src/components/clases/TabAsistencia.tsx — lista de asistencia de una clase
import { useEffect, useMemo, useState } from 'react'
import { UserCheck, UserX, CheckCircle2, HelpCircle, Smartphone, Users, Sparkles, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Props {
  reservas:          any[]
  asistencias:       any[]
  historialClientes: Record<string, number>
  checkingIn:        string | boolean | null
  onCheckIn:         (reserva: any) => void
  onCancelar:        (reservaId: string) => void
}

type Historial = Record<string, { total: number; ultima?: string }>

// ── Canal por el que reservó ──────────────────────────────────────────────────
function getCanal(origen: string | null, esMuestra: boolean) {
  const o = (origen || '').toLowerCase()
  if (esMuestra)          return { label: 'Clase muestra', bg: '#f3e8ff', color: '#7c3aed', icon: Sparkles }
  if (o === 'wellhub')    return { label: 'Wellhub',       bg: '#fce7f3', color: '#be185d', icon: Smartphone }
  if (o === 'totalpass')  return { label: 'TotalPass',     bg: '#dcfce7', color: '#15803d', icon: Smartphone }
  return                         { label: 'Navy',          bg: '#111827', color: '#ffffff', icon: Users }
}

// ── Qué tan seguido viene (clases tomadas ANTES de esta) ──────────────────────
const NIVELES = [
  { hasta: 0,        emoji: '🌱', label: 'Primera vez', ayuda: 'Nunca ha tomado una clase en Navy. Dale la bienvenida.', bg: '#fef9c3', color: '#854d0e' },
  { hasta: 1,        emoji: '👋', label: '2ª clase',    ayuda: 'Regresó por más.',                                        bg: '#dbeafe', color: '#1d4ed8' },
  { hasta: 4,        emoji: '🚀', label: 'Empezando',   ayuda: 'De 3 a 5 clases: está armando su rutina.',               bg: '#dbeafe', color: '#1d4ed8' },
  { hasta: 10,       emoji: '💪', label: 'Regular',     ayuda: 'De 6 a 11 clases.',                                       bg: '#e0e7ff', color: '#4338ca' },
  { hasta: 20,       emoji: '🔥', label: 'Frecuente',   ayuda: 'De 12 a 21 clases.',                                      bg: '#d1fae5', color: '#065f46' },
  { hasta: Infinity, emoji: '🏆', label: 'Veterano',    ayuda: 'Más de 21 clases.',                                       bg: '#111827', color: '#ffffff' },
]
const nivelDe = (previas: number) => NIVELES.find(n => previas <= n.hasta)!

const hace = (iso?: string) => {
  if (!iso) return null
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  return d <= 0 ? 'hoy' : d === 1 ? 'ayer' : d < 30 ? `hace ${d} días` : `hace ${Math.floor(d / 30)} ${Math.floor(d / 30) === 1 ? 'mes' : 'meses'}`
}

export default function TabAsistencia({ reservas, asistencias, historialClientes, checkingIn, onCheckIn, onCancelar }: Props) {
  const [historial,    setHistorial]    = useState<Historial>({})
  const [verLeyenda,   setVerLeyenda]   = useState(false)

  // Una reserva por cliente (o por reserva, si es externa)
  const reservasUnicas = useMemo(() => reservas.filter((r, i, arr) =>
    arr.findIndex(x => (x.clientes?.id && x.clientes?.id === r.clientes?.id) || x.id === r.id) === i), [reservas])

  // Clases que cada cliente ya tomó ANTES de esta (de cualquier canal; sin canceladas ni faltas)
  useEffect(() => {
    const ids = [...new Set(reservasUnicas.map(r => r.clientes?.id || r.cliente_id).filter(Boolean))] as string[]
    const claseActual = reservasUnicas[0]?.clase_id
    if (!ids.length) return
    supabase.from('reservas')
      .select('cliente_id, clase_id, estatus, clases!inner(horario)')
      .in('cliente_id', ids)
      .not('estatus', 'in', '("Cancelada","No Show")')
      .lt('clases.horario', new Date().toISOString())
      .limit(10000)
      .then(({ data }) => {
        const h: Historial = {}
        for (const r of (data as any[]) || []) {
          if (r.clase_id === claseActual) continue
          const x = h[r.cliente_id] || (h[r.cliente_id] = { total: 0 })
          x.total++
          const horario = r.clases?.horario
          if (horario && (!x.ultima || horario > x.ultima)) x.ultima = horario
        }
        setHistorial(h)
      })
  }, [reservasUnicas])

  const estaPresente = (r: any) => {
    const clienteId = r.clientes?.id || r.cliente_id
    return r.estatus === 'Asistió' || asistencias.some(a => (clienteId && a.cliente_id === clienteId) || a.reserva_id === r.id)
  }
  const activos    = reservasUnicas.filter(r => r.estatus !== 'Cancelada')
  const cancelados = reservasUnicas.filter(r => r.estatus === 'Cancelada')
  const presentes  = activos.filter(estaPresente)
  const pendientes = activos.filter(r => !estaPresente(r))

  const previasDe = (clienteId?: string) => Math.max(
    historial[clienteId || '']?.total ?? 0,
    clienteId && historialClientes[clienteId] ? historialClientes[clienteId] - 1 : 0,
  )
  const primeraVez = activos.filter(r => (r.clientes?.id || r.cliente_id) && previasDe(r.clientes?.id || r.cliente_id) === 0).length
  const porCanal = activos.reduce((acc: Record<string, number>, r) => {
    const c = getCanal(r.origen, r.es_clase_muestra).label; acc[c] = (acc[c] || 0) + 1; return acc
  }, {})

  if (reservas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-8">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center"><UserCheck size={24} className="text-gray-300" /></div>
        <p className="text-sm font-bold text-gray-400">Sin reservas</p>
        <p className="text-xs text-gray-300">Nadie ha reservado esta clase todavía</p>
      </div>
    )
  }

  const total = activos.length || 1
  const pctPresentes = Math.round((presentes.length / total) * 100)

  const renderAlumno = (r: any) => {
    const cliente    = r.clientes
    const clienteId  = cliente?.id || r.cliente_id
    const presente   = estaPresente(r)
    const cancelada  = r.estatus === 'Cancelada'
    const canal      = getCanal(r.origen, r.es_clase_muestra)
    const CanalIcon  = canal.icon
    const previas    = clienteId ? previasDe(clienteId) : 0
    const nivel      = nivelDe(previas)
    const ultima     = hace(historial[clienteId]?.ultima)
    const spotNum    = r.room_spots?.numero
    const paquete    = cliente?.paquetes?.nombre || cliente?.plan
    const iniciales  = (cliente?.nombre_completo || r.nombre_externo || '?').split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()
    const guardando  = typeof checkingIn === 'boolean' ? checkingIn
      : Boolean(checkingIn && [r.id, clienteId].filter(Boolean).map(String).includes(String(checkingIn)))

    return (
      <div key={r.id} className={`px-5 py-4 transition ${cancelada ? 'opacity-40' : 'hover:bg-gray-50/80'}`}>
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black ${presente ? 'bg-emerald-500 text-white' : 'bg-gray-900 text-white'}`}>
              {iniciales}
            </div>
            {presente && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100">
                <CheckCircle2 size={12} className="text-emerald-500" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-black text-gray-900 truncate">{cliente?.nombre_completo || r.nombre_externo || '—'}</p>
                  {cliente?.is_founding_member && <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-yellow-100 text-yellow-700">⭐ FM</span>}
                </div>
                <p className="text-[11px] text-gray-400 truncate">{cliente?.email || r.email_externo || '—'}</p>
              </div>
              {spotNum && (
                <div className="flex-shrink-0 flex flex-col items-center bg-gray-900 text-white rounded-xl px-2.5 py-1">
                  <span className="text-[8px] font-bold tracking-widest text-gray-400">SPOT</span>
                  <span className="text-base font-black leading-none">{spotNum}</span>
                </div>
              )}
            </div>

            {/* Etiquetas */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black" style={{ backgroundColor: canal.bg, color: canal.color }}>
                <CanalIcon size={10} /> {canal.label}
              </span>
              {clienteId && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black" style={{ backgroundColor: nivel.bg, color: nivel.color }}
                  title={nivel.ayuda}>
                  {nivel.emoji} {nivel.label}
                </span>
              )}
              {paquete && paquete !== canal.label && (
                <span className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-600">{paquete}</span>
              )}
            </div>

            {/* Historial + acciones */}
            <div className="flex items-center justify-between gap-3 mt-2.5">
              <p className="text-[11px] text-gray-400 flex items-center gap-1">
                {clienteId ? (
                  previas === 0
                    ? <><Sparkles size={11} className="text-amber-500" /> Su primera clase en Navy</>
                    : <><Clock size={11} /> {previas} {previas === 1 ? 'clase' : 'clases'} antes{ultima ? ` · la última ${ultima}` : ''}</>
                ) : 'Invitado externo'}
              </p>

              {!cancelada ? (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {presente ? (
                    <span className="flex items-center gap-1.5 text-[11px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                      <CheckCircle2 size={12} /> Presente
                    </span>
                  ) : (
                    <>
                      <button onClick={() => onCheckIn(r)} disabled={guardando}
                        className="flex items-center gap-1 px-3.5 py-2 rounded-xl text-[11px] font-black bg-emerald-500 text-white hover:bg-emerald-600 transition disabled:opacity-40 shadow-sm shadow-emerald-200">
                        <UserCheck size={12} /> {guardando ? 'Guardando…' : 'Check-in'}
                      </button>
                      <button onClick={() => onCancelar(r.id)}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl text-[11px] font-black bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500 transition">
                        <UserX size={12} /> No-show
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <span className="text-[11px] text-gray-300 font-medium italic">Cancelada</span>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const Seccion = ({ titulo, n, tono, lista }: { titulo: string; n: number; tono: string; lista: any[] }) => lista.length === 0 ? null : (
    <>
      <div className={`px-5 py-2 border-y ${tono}`}>
        <p className="text-[10px] font-black uppercase tracking-widest">{titulo} · {n}</p>
      </div>
      <div className="divide-y divide-gray-100">{lista.map(renderAlumno)}</div>
    </>
  )

  return (
    <div>
      {/* Resumen visual */}
      <div className="px-5 py-4 bg-gray-50 border-b border-gray-100 space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-black text-gray-900 leading-none">{presentes.length}<span className="text-sm text-gray-400 font-bold"> / {activos.length} presentes</span></p>
            <p className="text-[11px] text-gray-400 mt-1">{pctPresentes}% de asistencia</p>
          </div>
          <button onClick={() => setVerLeyenda(v => !v)} className="flex items-center gap-1 text-[11px] font-bold text-gray-500 hover:text-gray-800">
            <HelpCircle size={12} /> ¿Qué significan las etiquetas?
          </button>
        </div>

        {/* Barra presentes / pendientes / canceladas */}
        <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-200">
          <div className="bg-emerald-500" style={{ width: `${(presentes.length / (reservasUnicas.length || 1)) * 100}%` }} />
          <div className="bg-amber-400" style={{ width: `${(pendientes.length / (reservasUnicas.length || 1)) * 100}%` }} />
          <div className="bg-gray-300" style={{ width: `${(cancelados.length / (reservasUnicas.length || 1)) * 100}%` }} />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-bold">
          <span className="flex items-center gap-1.5 text-gray-600"><span className="w-2 h-2 rounded-full bg-emerald-500" />{presentes.length} presentes</span>
          <span className="flex items-center gap-1.5 text-gray-600"><span className="w-2 h-2 rounded-full bg-amber-400" />{pendientes.length} por llegar</span>
          {cancelados.length > 0 && <span className="flex items-center gap-1.5 text-gray-400"><span className="w-2 h-2 rounded-full bg-gray-300" />{cancelados.length} cancelaron</span>}
          {primeraVez > 0 && <span className="flex items-center gap-1.5 text-amber-700">🌱 {primeraVez} {primeraVez === 1 ? 'viene' : 'vienen'} por primera vez</span>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(porCanal).map(([c, n]) => {
            const cfg = getCanal(c === 'Clase muestra' ? null : c, c === 'Clase muestra')
            return <span key={c} className="px-2 py-0.5 rounded-md text-[10px] font-black" style={{ backgroundColor: cfg.bg, color: cfg.color }}>{n} {c}</span>
          })}
        </div>

        {verLeyenda && (
          <div className="bg-white border border-gray-100 rounded-xl p-3 space-y-1.5">
            <p className="text-[11px] font-black text-gray-700">Qué tan seguido viene (cuenta sus clases anteriores en Navy, de cualquier canal)</p>
            {NIVELES.map(n => (
              <p key={n.label} className="text-[11px] text-gray-500 flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded-md font-black text-[10px]" style={{ backgroundColor: n.bg, color: n.color }}>{n.emoji} {n.label}</span> {n.ayuda}
              </p>
            ))}
          </div>
        )}
      </div>

      <Seccion titulo="Presentes"   n={presentes.length}  tono="bg-emerald-50 border-emerald-100 text-emerald-600" lista={presentes} />
      <Seccion titulo="Por llegar"  n={pendientes.length} tono="bg-amber-50 border-amber-100 text-amber-600"       lista={pendientes} />
      <Seccion titulo="Canceladas"  n={cancelados.length} tono="bg-gray-50 border-gray-100 text-gray-400"          lista={cancelados} />
    </div>
  )
}
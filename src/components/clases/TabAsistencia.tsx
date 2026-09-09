'use client'
import { UserCheck, UserX, CheckCircle2 } from 'lucide-react'

interface Props {
  reservas:         any[]
  asistencias:      any[]
  historialClientes: Record<string, number>
  checkingIn:       string | null
  onCheckIn:        (clienteId: string) => void
  onCancelar:       (reservaId: string) => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getCanal(origen: string | null, esMuestra: boolean) {
  if (esMuestra)                                         return { label: 'Clase Muestra',  bg: '#f3e8ff', color: '#7c3aed' }
  if (origen === 'Wellhub'   || origen === 'wellhub')   return { label: 'Wellhub',         bg: '#fce7f3', color: '#be185d' }
  if (origen === 'TotalPass' || origen === 'totalpass') return { label: 'TotalPass',        bg: '#dcfce7', color: '#15803d' }
  return                                                        { label: 'Navy',             bg: '#111827', color: '#ffffff' }
}

function getNivelExperiencia(total: number): { label: string; descripcion: string; bg: string; color: string } {
  if (total === 0) return { label: 'Primera clase',  descripcion: 'Es su primera vez en Navy',      bg: '#fef9c3', color: '#854d0e' }
  if (total === 1) return { label: '2ª clase',       descripcion: 'Regresó por más',                bg: '#dbeafe', color: '#1d4ed8' }
  if (total <= 4)  return { label: `${total + 1}ª clase`, descripcion: 'Comenzando su rutina',      bg: '#dbeafe', color: '#1d4ed8' }
  if (total <= 10) return { label: 'Regular',        descripcion: `${total + 1} clases en total`,   bg: '#e0e7ff', color: '#4338ca' }
  if (total <= 20) return { label: 'Frecuente',      descripcion: `${total + 1} clases — sólido`,   bg: '#d1fae5', color: '#065f46' }
  return                  { label: 'Veterano',       descripcion: `${total + 1} clases — élite`,    bg: '#111827', color: '#ffffff' }
}

function getOrigen(origen: string | null, isFounding: boolean): string | null {
  if (isFounding) return 'Founding Member'
  if (origen === 'Referido')       return 'Referido'
  if (origen === 'Redes Sociales') return 'Redes Sociales'
  if (origen === 'Walk-in')        return 'Walk-in'
  if (origen === 'Evento')         return 'Evento'
  return null
}

// ── Componente ────────────────────────────────────────────────────────────────
export default function TabAsistencia({
  reservas, asistencias, historialClientes, checkingIn, onCheckIn, onCancelar
}: Props) {

    // 1. Deduplicar reservas por cliente_id
    const reservasUnicas = reservas.filter((r, i, arr) =>
    arr.findIndex(x => x.clientes?.id === r.clientes?.id) === i
    )

    // 2. Filtrar los que no tienen cliente
    const reservasFiltradas = reservasUnicas.filter(r => r.clientes?.id)

  const activos   = reservas.filter(r => r.estatus !== 'Cancelada')
  const cancelados = reservas.filter(r => r.estatus === 'Cancelada')
  const presentes  = activos.filter(r => asistencias.some(a => a.cliente_id === r.clientes?.id))
  const pendientes = activos.filter(r => !asistencias.some(a => a.cliente_id === r.clientes?.id))

  if (reservas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-8">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
          <UserCheck size={24} className="text-gray-300" />
        </div>
        <p className="text-sm font-bold text-gray-400">Sin reservas</p>
        <p className="text-xs text-gray-300">Nadie ha reservado esta clase todavía</p>
      </div>
    )
  }

  const renderAlumno = (r: any) => {
    const cliente     = r.clientes
    const hizoChekin  = asistencias.some(a => a.cliente_id === cliente?.id)
    const cancelada   = r.estatus === 'Cancelada'
    const totalPrev   = (historialClientes[cliente?.id] || 1) - 1 // previas (sin contar esta)
    const canal       = getCanal(r.origen, r.es_clase_muestra)
    const nivel       = getNivelExperiencia(totalPrev)
    const origenLabel = getOrigen(cliente?.origen, cliente?.is_founding_member)
    const spotNum     = r.room_spots?.numero
    const paqueteNom  = cliente?.paquetes?.nombre || cliente?.plan
    const iniciales   = (cliente?.nombre_completo || '?').split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase()

    return (
      <div key={r.id} className={`px-5 py-4 transition ${cancelada ? 'opacity-30' : 'hover:bg-gray-50/80'}`}>
        <div className="flex items-start gap-4">

          {/* Avatar con indicador */}
          <div className="relative flex-shrink-0">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-black ${
              hizoChekin ? 'bg-emerald-500 text-white' : 'bg-gray-900 text-white'
            }`}>
              {iniciales}
            </div>
            {hizoChekin && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100">
                <CheckCircle2 size={12} className="text-emerald-500" />
              </div>
            )}
          </div>

          {/* Info principal */}
          <div className="flex-1 min-w-0">

            {/* Nombre + spot */}
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 min-w-0">
                <p className="text-sm font-black text-gray-900 truncate">{cliente?.nombre_completo}</p>
                {cliente?.is_founding_member && (
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-yellow-100 text-yellow-700 flex-shrink-0">⭐ FM</span>
                )}
              </div>
              {spotNum && (
                <div className="flex-shrink-0 flex items-center gap-1 bg-gray-100 border border-gray-200 rounded-lg px-2 py-1">
                  <span className="text-[10px] font-bold text-gray-500">SPOT</span>
                  <span className="text-sm font-black text-gray-900">{spotNum}</span>
                </div>
              )}
            </div>

            {/* Email */}
            <p className="text-[11px] text-gray-400 mb-2.5 truncate">{cliente?.email}</p>

            {/* Badges informativos */}
            <div className="flex flex-wrap gap-1.5 mb-3">

              {/* Canal */}
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black"
                style={{ backgroundColor: canal.bg, color: canal.color }}>
                {canal.label}
              </span>

              {/* Nivel experiencia */}
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black"
                style={{ backgroundColor: nivel.bg, color: nivel.color }}>
                {nivel.label}
              </span>

              {/* Paquete */}
              {paqueteNom && paqueteNom !== canal.label && (
                <span className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-600">
                  {paqueteNom}
                </span>
              )}

              {/* Origen */}
              {origenLabel && (
                <span className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-700">
                  {origenLabel}
                </span>
              )}
            </div>

            {/* Descripción de nivel */}
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-gray-400 italic">{nivel.descripcion}</p>

              {/* Acciones */}
              {!cancelada && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {hizoChekin ? (
                    <span className="flex items-center gap-1.5 text-[11px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                      <CheckCircle2 size={12}/> Presente
                    </span>
                  ) : (
                    <>
                      <button onClick={() => onCheckIn(cliente?.id)}
                        disabled={checkingIn === cliente?.id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-black bg-emerald-500 text-white hover:bg-emerald-600 transition disabled:opacity-40 shadow-sm shadow-emerald-200">
                        <UserCheck size={11}/> Check-in
                      </button>
                      <button onClick={() => onCancelar(r.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-black bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500 transition">
                        <UserX size={11}/> No-show
                      </button>
                    </>
                  )}
                </div>
              )}
              {cancelada && (
                <span className="text-[11px] text-gray-300 font-medium italic">Cancelada</span>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Resumen top */}
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-xs font-bold text-gray-600">{presentes.length} presentes</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-xs font-bold text-gray-600">{pendientes.length} pendientes</span>
        </div>
        {cancelados.length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-gray-300" />
            <span className="text-xs font-bold text-gray-400">{cancelados.length} canceladas</span>
          </div>
        )}
      </div>

      {/* Presentes */}
      {presentes.length > 0 && (
        <>
          <div className="px-5 py-2 bg-emerald-50 border-b border-emerald-100">
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Presentes · {presentes.length}</p>
          </div>
          <div className="divide-y divide-gray-100">
            {presentes.map(renderAlumno)}
          </div>
        </>
      )}

      {/* Pendientes */}
      {pendientes.length > 0 && (
        <>
          <div className="px-5 py-2 bg-amber-50 border-b border-amber-100 border-t border-t-gray-100">
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Pendientes · {pendientes.length}</p>
          </div>
          <div className="divide-y divide-gray-100">
            {pendientes.map(renderAlumno)}
          </div>
        </>
      )}

      {/* Canceladas */}
      {cancelados.length > 0 && (
        <>
          <div className="px-5 py-2 bg-gray-50 border-y border-gray-100">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Canceladas · {cancelados.length}</p>
          </div>
          <div className="divide-y divide-gray-100">
            {cancelados.map(renderAlumno)}
          </div>
        </>
      )}
    </div>
  )
}
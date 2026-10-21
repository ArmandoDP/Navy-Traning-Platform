'use client'
// src/components/clientes/editar/ZonaDireccion.tsx — unir un duplicado o eliminar al cliente (solo dirección)
import { useEffect, useState } from 'react'
import { GitMerge, Trash2, Search, User, AlertTriangle, Loader2, ShieldAlert } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL

async function api(path: string, method: 'GET' | 'POST' = 'GET', body?: any) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${BACKEND}/clientes-admin${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || 'No se pudo completar')
  return data
}

interface Props { cliente: any; duplicados: any[]; onListo: (mensaje: string) => void }

export default function ZonaDireccion({ cliente, duplicados, onListo }: Props) {
  const [modo, setModo] = useState<null | 'unir' | 'eliminar'>(null)
  const [resumen, setResumen] = useState<any>(null)
  const [destino, setDestino] = useState<any>(null)
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState<any[]>([])
  const [confirmacion, setConfirmacion] = useState('')
  const [trabajando, setTrabajando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!modo) return
    setError(''); setResumen(null)
    api(`/${cliente.id}/resumen`).then(setResumen).catch(e => setError(e.message))
  }, [modo, cliente.id])

  const buscar = async (q: string) => {
    setBusqueda(q)
    if (q.trim().length < 2) return setResultados([])
    const { data } = await supabase.from('clientes').select('id, nombre_completo, email, telefono, created_at')
      .neq('id', cliente.id).or(`nombre_completo.ilike.%${q.trim()}%,email.ilike.%${q.trim()}%,telefono.ilike.%${q.trim()}%`).limit(6)
    setResultados(data || [])
  }

  const unir = async () => {
    if (!destino) return
    setTrabajando(true); setError('')
    try {
      const r = await api(`/${cliente.id}/unir`, 'POST', { destino_id: destino.id })
      onListo(`Listo: todo quedó en la cuenta de ${r.destino.nombre} (${r.destino.email}).`)
    } catch (e: any) { setError(e.message) }
    setTrabajando(false)
  }

  const eliminar = async () => {
    setTrabajando(true); setError('')
    try {
      await api(`/${cliente.id}/eliminar`, 'POST', { confirmacion })
      onListo(`${cliente.nombre_completo} se eliminó por completo.`)
    } catch (e: any) { setError(e.message) }
    setTrabajando(false)
  }

  const correoOk = confirmacion.trim().toLowerCase() === (cliente.email || '').trim().toLowerCase()

  return (
    <div className="rounded-2xl border-2 border-dashed border-red-200 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldAlert size={16} className="text-red-500" />
        <p className="text-sm font-black text-gray-900">Zona de dirección</p>
      </div>

      {!modo && (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setModo('unir')} className="text-left rounded-xl border border-gray-200 p-3 hover:border-gray-300">
            <p className="text-sm font-black text-gray-900 flex items-center gap-1.5"><GitMerge size={14} /> Unir con otro cliente</p>
            <p className="text-[11px] text-gray-500 mt-1">Para duplicados: pasa todo a la cuenta buena y borra esta.</p>
          </button>
          <button onClick={() => setModo('eliminar')} className="text-left rounded-xl border border-red-200 bg-red-50/50 p-3 hover:bg-red-50">
            <p className="text-sm font-black text-red-700 flex items-center gap-1.5"><Trash2 size={14} /> Eliminar por completo</p>
            <p className="text-[11px] text-red-600/80 mt-1">Borra al cliente y todo lo suyo. No se puede deshacer.</p>
          </button>
        </div>
      )}

      {modo && !resumen && !error && <div className="py-4 flex justify-center"><Loader2 className="animate-spin text-gray-400" size={18} /></div>}

      {modo && resumen && (
        <div className="bg-gray-50 rounded-xl p-3 grid grid-cols-3 gap-2 text-center">
          {[
            ['Reservas', resumen.reservas], ['Futuras', resumen.reservas_futuras], ['Asistencias', resumen.asistencias],
            ['Membresías', resumen.membresias], ['Activas', resumen.membresias_activas], ['Pagos', resumen.pagos],
          ].map(([k, v]) => (
            <div key={k as string}><p className="text-lg font-black text-gray-900">{v as number}</p><p className="text-[10px] text-gray-500">{k}</p></div>
          ))}
        </div>
      )}

      {/* ── Unir ── */}
      {modo === 'unir' && resumen && (
        <div className="space-y-3">
          <p className="text-xs text-gray-600">
            Elige la <b>cuenta buena</b>. Todo lo de esta cuenta (<b>{cliente.email}</b>) pasa a esa, y esta se borra.
          </p>
          {duplicados.length > 0 && !destino && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-gray-500">POSIBLES DUPLICADOS</p>
              {duplicados.map((d: any) => (
                <button key={d.id} onClick={() => setDestino(d)} className="w-full text-left flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 hover:border-gray-400">
                  <User size={13} className="text-gray-400" />
                  <span className="text-xs"><b>{d.nombre_completo}</b> · {d.email}</span>
                </button>
              ))}
            </div>
          )}
          {!destino && (
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={busqueda} onChange={e => buscar(e.target.value)} placeholder="Buscar otra cuenta por nombre, correo o teléfono…"
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-400" />
              {resultados.length > 0 && (
                <div className="mt-1 border border-gray-200 rounded-xl overflow-hidden">
                  {resultados.map(r => (
                    <button key={r.id} onClick={() => { setDestino(r); setResultados([]) }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-xs border-b border-gray-100 last:border-0">
                      <b>{r.nombre_completo}</b> · {r.email}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {destino && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs space-y-1">
              <p className="font-black text-emerald-800">Cuenta buena: {destino.nombre_completo}</p>
              <p className="text-emerald-700">{destino.email}</p>
              <p className="text-emerald-700">Recibe: {resumen.reservas} reservas, {resumen.membresias} membresías y {resumen.pagos} pagos.
                {resumen.suscripcion_activa && ' Su suscripción de Stripe pasa a esta cuenta.'}</p>
              <button onClick={() => setDestino(null)} className="text-emerald-700 underline">Cambiar</button>
            </div>
          )}
        </div>
      )}

      {/* ── Eliminar ── */}
      {modo === 'eliminar' && resumen && (
        <div className="space-y-3">
          {(resumen.membresias_activas > 0 || resumen.pagos > 0) && (
            <p className="text-xs text-amber-800 bg-amber-50 rounded-xl p-3 flex gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              Tiene {resumen.membresias_activas > 0 ? 'un plan activo' : ''}{resumen.membresias_activas > 0 && resumen.pagos > 0 ? ' y ' : ''}{resumen.pagos > 0 ? `${resumen.pagos} pagos` : ''}.
              Si es un duplicado, mejor <b>únelo</b> para no perderlos. Los pagos borrados dejan de aparecer en Finanzas.
            </p>
          )}
          {resumen.suscripcion_activa && (
            <p className="text-xs text-red-700 bg-red-50 rounded-xl p-3">Tiene una suscripción activa en Stripe: se cancelará para que no se le vuelva a cobrar.</p>
          )}
          <div>
            <p className="text-xs text-gray-600 mb-1.5">Para confirmar, escribe su correo: <b className="select-all">{cliente.email}</b></p>
            <input value={confirmacion} onChange={e => setConfirmacion(e.target.value)} placeholder={cliente.email}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-red-400" />
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-600 bg-red-50 rounded-xl p-3 font-medium">{error}</p>}

      {modo && (
        <div className="flex gap-2">
          <button onClick={() => { setModo(null); setDestino(null); setConfirmacion(''); setError('') }} disabled={trabajando}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50">Cancelar</button>
          {modo === 'unir' ? (
            <button onClick={unir} disabled={!destino || trabajando}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-gray-900 hover:bg-gray-700 disabled:opacity-40 flex items-center justify-center gap-2">
              {trabajando ? <Loader2 size={14} className="animate-spin" /> : <GitMerge size={14} />} Unir cuentas
            </button>
          ) : (
            <button onClick={eliminar} disabled={!correoOk || trabajando}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 flex items-center justify-center gap-2">
              {trabajando ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Eliminar para siempre
            </button>
          )}
        </div>
      )}
    </div>
  )
}
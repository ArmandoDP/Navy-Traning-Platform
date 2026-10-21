'use client'
// src/components/clases/TabListaEspera.tsx — lista de espera de una clase (en vivo)
import { useCallback, useEffect, useState } from 'react'
import { Clock, Search, User, UserPlus, X, Smartphone, Store, ArrowRightCircle, Loader2, Hourglass, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL

async function api(path: string, method: 'GET' | 'POST' = 'GET', body?: any) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${BACKEND}/lista-espera${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || 'No se pudo completar')
  return data
}

const ESTATUS: Record<string, { t: string; c: string }> = {
  Asignado: { t: 'Recibió lugar',  c: 'bg-emerald-50 text-emerald-700' },
  SinLugar: { t: 'No se liberó',   c: 'bg-gray-100 text-gray-500' },
  Salio:    { t: 'Salió',          c: 'bg-gray-100 text-gray-500' },
  Omitido:  { t: 'Sin plan/clases', c: 'bg-amber-50 text-amber-700' },
  Cerrada:  { t: 'Clase cancelada', c: 'bg-gray-100 text-gray-500' },
}

const desde = (iso: string) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  return m < 1 ? 'ahora' : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.floor(m / 60)} h` : `hace ${Math.floor(m / 1440)} d`
}

export default function TabListaEspera({ claseId, onCambio }: { claseId: string; onCambio?: () => void }) {
  const [datos,     setDatos]     = useState<any>(null)
  const [error,     setError]     = useState('')
  const [trabajando, setTrabajando] = useState<string | null>(null)
  const [agregar,   setAgregar]   = useState<'Remota' | 'Sucursal' | null>(null)
  const [busqueda,  setBusqueda]  = useState('')
  const [resultados, setResultados] = useState<any[]>([])

  const cargar = useCallback(async () => {
    try { setDatos(await api(`/clase/${claseId}`)); setError('') } catch (e: any) { setError(e.message) }
  }, [claseId])

  // En vivo: cualquier cambio en la fila de esta clase
  useEffect(() => {
    cargar()
    const canal = supabase.channel(`crm-lista-${claseId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lista_espera', filter: `clase_id=eq.${claseId}` }, () => cargar())
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [claseId, cargar])

  const buscar = async (q: string) => {
    setBusqueda(q)
    if (q.trim().length < 2) return setResultados([])
    const { data } = await supabase.from('clientes').select('id, nombre_completo, email, telefono')
      .or(`nombre_completo.ilike.%${q.trim()}%,email.ilike.%${q.trim()}%,telefono.ilike.%${q.trim()}%`).limit(6)
    setResultados(data || [])
  }

  const accion = async (clave: string, fn: () => Promise<any>) => {
    setTrabajando(clave); setError('')
    try { await fn(); await cargar(); onCambio?.() } catch (e: any) { setError(e.message) }
    setTrabajando(null)
  }

  if (!datos) return (
    <div className="py-16 flex justify-center text-gray-400"><Loader2 className="animate-spin" size={20} /></div>
  )

  const lista: any[] = datos.lista || []
  const remota   = lista.filter(l => l.modo === 'Remota' && l.estatus === 'Esperando')
  const sucursal = lista.filter(l => l.modo === 'Sucursal' && l.estatus === 'Esperando')
  const historial = lista.filter(l => l.estatus !== 'Esperando')
  const cierre = new Date(datos.cierre)
  const minutosCierre = Math.round((cierre.getTime() - Date.now()) / 60000)

  const Fila = ({ l, n }: { l: any; n: number }) => (
    <div className="flex items-center gap-3 px-5 py-3">
      <div className="w-9 h-9 rounded-xl bg-gray-900 text-white flex items-center justify-center text-sm font-black shrink-0">#{n}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 truncate">{l.cliente?.nombre_completo || '—'}</p>
        <p className="text-[11px] text-gray-400 truncate">
          {[l.cliente?.telefono, l.cliente?.email].filter(Boolean).join(' · ')} · {l.origen === 'CRM' ? 'agregado por recepción' : 'desde la app'} · {desde(l.created_at)}
          {!l.cliente?.supabase_user_id && ' · sin app'}
        </p>
      </div>
      {l.modo === 'Sucursal' && (
        <button onClick={() => accion(`dar-${l.id}`, () => api(`/${l.id}/dar-lugar`, 'POST'))}
          disabled={!!trabajando || datos.libres <= 0}
          title={datos.libres <= 0 ? 'Primero marca como No Show o cancela a quien no llegó' : 'Reservarle el lugar y quitarlo de la fila'}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40">
          {trabajando === `dar-${l.id}` ? <Loader2 size={12} className="animate-spin" /> : <ArrowRightCircle size={12} />} Dar lugar
        </button>
      )}
      <button onClick={() => accion(`quitar-${l.id}`, () => api(`/${l.id}/quitar`, 'POST'))} disabled={!!trabajando}
        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50" title="Quitar de la lista">
        <X size={14} />
      </button>
    </div>
  )

  return (
    <div>
      {/* Resumen */}
      <div className="px-5 py-4 bg-gray-50 border-b border-gray-100 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-black text-gray-900">{remota.length + sucursal.length} esperando lugar</p>
          <span className={`text-[11px] font-bold px-2 py-1 rounded-lg ${datos.libres > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
            {datos.libres > 0 ? `${datos.libres} ${datos.libres === 1 ? 'lugar libre' : 'lugares libres'}` : 'Clase llena'}
          </span>
        </div>
        <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
          <Hourglass size={11} />
          {datos.cerrada
            ? 'La asignación automática ya terminó (3 h antes, o 10 pm de la noche anterior en clases antes de las 9 am). Los lugares que se liberen son para quien espera en sucursal.'
            : `La asignación automática cierra en ${minutosCierre >= 1440 ? `${Math.floor(minutosCierre / 1440)} d ${Math.floor((minutosCierre % 1440) / 60)} h` : `${Math.floor(minutosCierre / 60)} h ${minutosCierre % 60} min`}.`}
        </p>
        <div className="flex gap-2 pt-1">
          {!datos.cerrada && (
            <button onClick={() => setAgregar('Remota')} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:border-gray-300">
              <Smartphone size={13} /> Agregar a la lista automática
            </button>
          )}
          <button onClick={() => setAgregar('Sucursal')} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gray-900 text-xs font-bold text-white hover:bg-gray-700">
            <Store size={13} /> Espera en sucursal
          </button>
        </div>
      </div>

      {error && <p className="mx-5 mt-3 text-xs text-red-600 bg-red-50 rounded-xl p-3 font-medium">{error}</p>}

      {/* Agregar cliente */}
      {agregar && (
        <div className="mx-5 mt-3 border border-gray-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-black text-gray-900">{agregar === 'Sucursal' ? 'Está esperando aquí' : 'Lista automática'}</p>
              <p className="text-[11px] text-gray-500">
                {agregar === 'Sucursal'
                  ? 'Le das el lugar a mano cuando se libere (por ejemplo, si alguien no llega).'
                  : 'Si alguien cancela, se le reserva solo y le llega su QR. Esa reserva ya no se puede cancelar.'}
              </p>
            </div>
            <button onClick={() => { setAgregar(null); setBusqueda(''); setResultados([]) }} className="text-gray-400"><X size={16} /></button>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input autoFocus value={busqueda} onChange={e => buscar(e.target.value)} placeholder="Nombre, correo o teléfono del cliente…"
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-400" />
          </div>
          {resultados.map(c => (
            <button key={c.id} disabled={!!trabajando}
              onClick={() => accion(`agregar-${c.id}`, async () => {
                await api('/agregar', 'POST', { clase_id: claseId, cliente_id: c.id, modo: agregar })
                setAgregar(null); setBusqueda(''); setResultados([])
              })}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 text-left">
              <User size={14} className="text-gray-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{c.nombre_completo}</p>
                <p className="text-[11px] text-gray-400 truncate">{[c.email, c.telefono].filter(Boolean).join(' · ')}</p>
              </div>
              {trabajando === `agregar-${c.id}` ? <Loader2 size={14} className="animate-spin text-gray-400" /> : <UserPlus size={14} className="text-gray-400" />}
            </button>
          ))}
          <p className="text-[11px] text-gray-400">Si no es cliente todavía, primero dalo de alta en Clientes → Nuevo cliente.</p>
        </div>
      )}

      {/* Fila automática */}
      <div className="mt-3">
        <div className="px-5 py-2 bg-indigo-50 border-y border-indigo-100 flex items-center gap-2">
          <Smartphone size={12} className="text-indigo-600" />
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Lista automática · {remota.length}</p>
        </div>
        {remota.length === 0
          ? <p className="px-5 py-4 text-xs text-gray-400">Nadie en la lista automática.</p>
          : <div className="divide-y divide-gray-100">{remota.map((l, i) => <Fila key={l.id} l={l} n={i + 1} />)}</div>}
      </div>

      {/* En sucursal */}
      <div className="mt-3">
        <div className="px-5 py-2 bg-amber-50 border-y border-amber-100 flex items-center gap-2">
          <Store size={12} className="text-amber-600" />
          <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Esperando en sucursal · {sucursal.length}</p>
        </div>
        {sucursal.length === 0
          ? <p className="px-5 py-4 text-xs text-gray-400">Nadie esperando en sucursal.</p>
          : <div className="divide-y divide-gray-100">{sucursal.map((l, i) => <Fila key={l.id} l={l} n={i + 1} />)}</div>}
        {sucursal.length > 0 && datos.libres <= 0 && (
          <p className="px-5 pb-3 text-[11px] text-gray-500 flex items-center gap-1.5">
            <Clock size={11} /> Para darles lugar, primero marca como No Show (en Asistencia) a quien reservó y no llegó.
          </p>
        )}
      </div>

      {/* Historial */}
      {historial.length > 0 && (
        <div className="mt-3 pb-4">
          <div className="px-5 py-2 bg-gray-50 border-y border-gray-100">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Historial · {historial.length}</p>
          </div>
          <div className="divide-y divide-gray-50">
            {historial.map(l => (
              <div key={l.id} className="flex items-center gap-3 px-5 py-2.5">
                {l.estatus === 'Asignado' ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Clock size={14} className="text-gray-300" />}
                <p className="flex-1 text-xs text-gray-600 truncate">{l.cliente?.nombre_completo}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${(ESTATUS[l.estatus] || ESTATUS.Salio).c}`}>
                  {(ESTATUS[l.estatus] || ESTATUS.Salio).t}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
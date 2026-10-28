'use client'
// src/components/clases/ModalCancelarClase.tsx — cancelar y eliminar una clase (solo dirección), con verificación
import { useEffect, useState } from 'react'
import { X, Loader2, AlertTriangle, Mail, Smartphone, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL

async function api(path: string, method: 'GET' | 'POST' = 'GET', body?: any) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${BACKEND}${path}`, {
    method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(typeof data.detail === 'string' ? data.detail : data.detail?.mensaje || 'No se pudo completar'), { detalle: data.detail })
  return data
}

interface Props { claseId: string; onClose: () => void; onHecho: () => void }

export default function ModalCancelarClase({ claseId, onClose, onHecho }: Props) {
  const [prev,      setPrev]      = useState<any>(null)
  const [texto,     setTexto]     = useState('')
  const [enviando,  setEnviando]  = useState(false)
  const [error,     setError]     = useState('')
  const [forzable,  setForzable]  = useState(false)
  const [resultado, setResultado] = useState<any>(null)

  useEffect(() => {
    api(`/clases/${claseId}/cancelacion`).then(setPrev).catch(e => setError(e.message))
  }, [claseId])

  const frase = prev?.frase || 'CANCELAR CLASE'
  const listo = texto.trim().toUpperCase() === frase

  const cancelar = async (forzar = false) => {
    setEnviando(true); setError('')
    try {
      setResultado(await api('/clases/cancelar', 'POST', { clase_id: claseId, confirmacion: texto, forzar }))
    } catch (e: any) {
      setError(e.message); setForzable(!!e.detalle?.puede_forzar)
    }
    setEnviando(false)
  }

  const fecha = prev?.clase?.horario ? new Date(prev.clase.horario).toLocaleString('es-MX', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City' }) : ''
  const navy = (prev?.reservas || []).filter((r: any) => r.aviso.startsWith('Correo'))
  const plataformas = (prev?.reservas || []).filter((r: any) => !r.aviso.startsWith('Correo'))

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="bg-red-50 px-6 py-4 border-b border-red-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center"><AlertTriangle size={18} className="text-red-600" /></div>
          <div className="flex-1">
            <h3 className="text-sm font-black text-red-700">Cancelar y eliminar clase</h3>
            <p className="text-xs text-red-500">No se puede deshacer</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-red-100 text-red-400"><X size={16} /></button>
        </div>

        {resultado ? (
          <div className="p-6 space-y-4 text-center">
            <CheckCircle2 size={40} className="text-emerald-500 mx-auto" />
            <p className="font-black text-gray-900">Clase cancelada y eliminada</p>
            <p className="text-sm text-gray-600">
              {resultado.avisados_navy} {resultado.avisados_navy === 1 ? 'cliente avisado' : 'clientes avisados'} por correo y notificación
              {resultado.plataformas ? ` · ${resultado.plataformas} de Wellhub/TotalPass (les avisa su plataforma)` : ''}.
            </p>
            {resultado.forzada && <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-3">Se eliminó aunque una plataforma no respondió: revisa en su portal que ya no aparezca.</p>}
            <button onClick={onHecho} className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-sm">Listo</button>
          </div>
        ) : !prev ? (
          <div className="p-10 flex justify-center">{error ? <p className="text-sm text-red-600">{error}</p> : <Loader2 className="animate-spin text-gray-400" />}</div>
        ) : (
          <>
            <div className="p-6 space-y-4 overflow-y-auto">
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-sm font-black text-gray-900">{prev.clase.nombre}</p>
                <p className="text-xs text-gray-500 capitalize">{fecha} · {prev.clase.sucursal}</p>
                <p className="text-[11px] text-gray-400 mt-1">
                  Se quita de {[prev.clase.en_wellhub && 'Wellhub', prev.clase.en_totalpass && 'TotalPass'].filter(Boolean).join(' y ') || 'ninguna plataforma'} y se elimina del CRM.
                </p>
              </div>

              {prev.reservas.length === 0 ? (
                <p className="text-sm text-gray-600">No tiene reservas: nadie recibirá aviso.</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-bold text-gray-900">{prev.reservas.length} {prev.reservas.length === 1 ? 'persona reservada' : 'personas reservadas'}:</p>
                  {navy.length > 0 && (
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <p className="px-3 py-2 bg-gray-50 text-[11px] font-bold text-gray-600 flex items-center gap-1.5">
                        <Mail size={12} /> <Smartphone size={12} /> Les llega correo y notificación de cancelación ({navy.length})
                      </p>
                      <div className="max-h-40 overflow-y-auto divide-y divide-gray-100">
                        {navy.map((r: any, i: number) => (
                          <div key={i} className="px-3 py-1.5 text-xs flex justify-between gap-2">
                            <span className="text-gray-800 truncate">{r.cliente}</span><span className="text-gray-400 truncate">{r.email || 'sin correo'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {plataformas.length > 0 && (
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                      <p className="px-3 py-2 bg-gray-50 text-[11px] font-bold text-gray-600">Les avisa Wellhub o TotalPass al quitar la clase ({plataformas.length})</p>
                      <div className="max-h-32 overflow-y-auto divide-y divide-gray-100">
                        {plataformas.map((r: any, i: number) => (
                          <div key={i} className="px-3 py-1.5 text-xs flex justify-between gap-2">
                            <span className="text-gray-800 truncate">{r.cliente}</span><span className="text-gray-400">{r.origen}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Para confirmar, escribe <span className="font-black text-red-600">{frase}</span></label>
                <input value={texto} onChange={e => setTexto(e.target.value)} placeholder={frase} autoComplete="off"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-red-400 uppercase" />
              </div>

              {error && (
                <div className="text-xs text-red-600 bg-red-50 rounded-xl p-3 space-y-2">
                  <p className="font-medium">{error}</p>
                  {forzable && (
                    <button onClick={() => cancelar(true)} disabled={enviando}
                      className="w-full py-2 rounded-lg border border-red-300 font-bold hover:bg-red-100">
                      Eliminar en Navy de todos modos (la quito a mano de la plataforma)
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-2">
              <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-700">Volver</button>
              <button onClick={() => cancelar(false)} disabled={!listo || enviando}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2">
                {enviando && <Loader2 size={14} className="animate-spin" />} Cancelar y eliminar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
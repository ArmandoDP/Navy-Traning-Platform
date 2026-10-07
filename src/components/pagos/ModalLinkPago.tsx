'use client'
// src/components/pagos/ModalLinkPago.tsx
// Links de pago para nuevos clientes: se paga, se crea el cliente, su acceso a la app y su paquete.
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { X, Link2, Copy, Check, MessageCircle, Download, Ban, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Props { isOpen: boolean; onClose: () => void; sucursalInicial?: string | null }

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL

async function api(path: string, opts: { method?: string; body?: any } = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${BACKEND}/stripe${path}`, {
    method:  opts.method || (opts.body ? 'POST' : 'GET'),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
    body:    opts.body ? JSON.stringify(opts.body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || 'Error de conexión')
  return data
}

const pesos = (n: number) => `$${Number(n || 0).toLocaleString('es-MX')}`

export default function ModalLinkPago({ isOpen, onClose, sucursalInicial }: Props) {
  const [sucursales, setSucursales] = useState<any[]>([])
  const [paquetes,   setPaquetes]   = useState<any[]>([])
  const [sucursalId, setSucursalId] = useState<string>('')
  const [paqueteId,  setPaqueteId]  = useState<string>('')
  const [generando,  setGenerando]  = useState(false)
  const [error,      setError]      = useState('')
  const [nuevo,      setNuevo]      = useState<any>(null)
  const [qr,         setQr]         = useState('')
  const [copiado,    setCopiado]    = useState<string | null>(null)
  const [links,      setLinks]      = useState<any[]>([])

  useEffect(() => {
    if (!isOpen) return
    setNuevo(null); setQr(''); setError('')
    supabase.from('sucursales').select('id, nombre').eq('estatus', 'Activa').order('nombre')
      .then(({ data }) => {
        setSucursales(data || [])
        setSucursalId(sucursalInicial || data?.[0]?.id || '')
      })
  }, [isOpen])

  useEffect(() => {
    if (!sucursalId) return
    setPaqueteId('')
    supabase.from('paquete_precios')
      .select('precio_app, paquetes(id, nombre, es_recurrente, vigencia_dias, estatus)')
      .eq('sucursal_id', sucursalId).eq('activo', true)
      .then(({ data }) => {
        const lista = (data || [])
          .filter((r: any) => r.paquetes && r.paquetes.estatus === 'Activo' && Number(r.precio_app) > 0)
          .map((r: any) => ({ ...r.paquetes, precio: Number(r.precio_app) }))
          .sort((a: any, b: any) => a.nombre.localeCompare(b.nombre))
        setPaquetes(lista)
      })
    cargarLinks()
  }, [sucursalId])

  const cargarLinks = async () => {
    try {
      const d = await api(`/links${sucursalId ? `?sucursal_id=${sucursalId}` : ''}`)
      setLinks(d.links || [])
    } catch { setLinks([]) }
  }

  const generar = async () => {
    if (!paqueteId) { setError('Elige un paquete'); return }
    setGenerando(true); setError('')
    try {
      const link = await api('/links', { body: { paquete_id: paqueteId, sucursal_id: sucursalId } })
      setNuevo(link)
      setQr(await QRCode.toDataURL(link.url, { width: 260, margin: 1, color: { dark: '#171B24', light: '#ffffff' } }))
      cargarLinks()
    } catch (e: any) { setError(e.message) }
    setGenerando(false)
  }

  const copiar = async (url: string) => {
    await navigator.clipboard.writeText(url)
    setCopiado(url); setTimeout(() => setCopiado(null), 1800)
  }

  const whatsapp = (url: string, paquete: string) =>
    window.open(`https://wa.me/?text=${encodeURIComponent(
      `Hola 👋 Este es tu link para contratar ${paquete} en Navy Training Center:\n${url}\n\n` +
      `Usa el correo con el que quieres entrar a la app. Al pagar te llega tu acceso y tu comprobante.`)}`, '_blank')

  const desactivar = async (id: string) => {
    if (!confirm('¿Desactivar este link? Ya no se podrá pagar con él.')) return
    try { await api(`/links/${id}/desactivar`, { method: 'POST' }); cargarLinks() }
    catch (e: any) { alert(e.message) }
  }

  if (!isOpen) return null
  const paq = paquetes.find(p => p.id === paqueteId)

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center"><Link2 size={18} className="text-indigo-600" /></div>
            <div>
              <h2 className="text-base font-black text-gray-900">Link de pago</h2>
              <p className="text-xs text-gray-400">Para clientes nuevos o existentes · tarjeta, MSI, OXXO, Apple Pay y Google Pay</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={16} /></button>
        </div>

        <div className="p-6 space-y-6">
          {/* Generar */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Sucursal</label>
              <select value={sucursalId} onChange={e => setSucursalId(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-400">
                {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Paquete</label>
              <select value={paqueteId} onChange={e => setPaqueteId(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-400">
                <option value="">Elige un paquete</option>
                {paquetes.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre} · {pesos(p.precio)}{p.es_recurrente ? ' · recurrente' : ''}</option>
                ))}
              </select>
            </div>
          </div>

          {paq && (
            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 text-sm">
              <span className="text-gray-600">{paq.es_recurrente ? `Se cobra ${pesos(paq.precio)} y se renueva solo cada ${paq.vigencia_dias} días` : `Pago único de ${pesos(paq.precio)}`}</span>
              {!paq.es_recurrente && paq.precio >= 1500 && <span className="text-xs font-bold text-indigo-600">Acepta MSI</span>}
            </div>
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl p-3">{error}</p>}

          <button onClick={generar} disabled={generando || !paqueteId}
            className="w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2">
            {generando ? <RefreshCw size={15} className="animate-spin" /> : <Link2 size={15} />}
            {generando ? 'Generando...' : 'Generar link'}
          </button>

          {/* Resultado */}
          {nuevo && (
            <div className="border border-gray-200 rounded-2xl p-5 flex gap-5 items-center">
              {qr && <img src={qr} alt="QR del link de pago" className="w-36 h-36 rounded-xl border border-gray-100" />}
              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  <p className="text-sm font-black text-gray-900">{nuevo.paquete} · {pesos(nuevo.monto)}</p>
                  <p className="text-xs text-gray-500 truncate">{nuevo.url}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => copiar(nuevo.url)} className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5">
                    {copiado === nuevo.url ? <Check size={13} className="text-green-600" /> : <Copy size={13} />} {copiado === nuevo.url ? 'Copiado' : 'Copiar'}
                  </button>
                  <button onClick={() => whatsapp(nuevo.url, nuevo.paquete)} className="px-3 py-2 rounded-xl bg-green-500 text-white text-xs font-bold flex items-center gap-1.5">
                    <MessageCircle size={13} /> WhatsApp
                  </button>
                  {qr && (
                    <a href={qr} download={`link-${nuevo.paquete}.png`} className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-1.5">
                      <Download size={13} /> QR
                    </a>
                  )}
                </div>
                <p className="text-[11px] text-gray-400">El link se puede usar varias veces (ideal para redes o mostrador). Al pagar se crea el cliente, su acceso a la app y su paquete.</p>
              </div>
            </div>
          )}

          {/* Links activos */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Links activos</p>
            {links.length === 0 ? (
              <p className="text-sm text-gray-400">Aún no hay links en esta sucursal.</p>
            ) : (
              <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl">
                {links.map(l => (
                  <div key={l.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{l.paquetes?.nombre} · {pesos(l.monto)}</p>
                      <p className="text-xs text-gray-400">
                        {l.usos} pago{l.usos === 1 ? '' : 's'} · creado por {l.staff?.nombre || 'staff'} el {new Date(l.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <button onClick={() => copiar(l.url)} title="Copiar" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                      {copiado === l.url ? <Check size={15} className="text-green-600" /> : <Copy size={15} />}
                    </button>
                    <button onClick={() => whatsapp(l.url, l.paquetes?.nombre)} title="WhatsApp" className="p-2 rounded-lg hover:bg-gray-100 text-green-600"><MessageCircle size={15} /></button>
                    <button onClick={() => desactivar(l.id)} title="Desactivar" className="p-2 rounded-lg hover:bg-red-50 text-red-500"><Ban size={15} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
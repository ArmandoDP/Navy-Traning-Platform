'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Search, User, Wallet, Loader2 } from 'lucide-react'
import { logActividad } from '@/lib/log-actividad'
import { useAuth } from '@/context/AuthContext'

interface Props {
  carrito:       any[]
  total:         number
  sucursalId:    string | null
  onClose:       () => void
  onVentaCreada: () => void
}

type Metodo = 'tarjeta' | 'terminal'
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL

async function api(path: string, method: 'GET' | 'POST' = 'GET', body?: any) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${BACKEND}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || 'No se pudo cobrar')
  return data
}

export default function ModalNuevaVenta({ carrito, total, sucursalId, onClose, onVentaCreada }: Props) {
  const [metodoPago,      setMetodoPago]      = useState<Metodo>('terminal')
  const [numeroOperacion, setNumeroOperacion] = useState('')
  const [busquedaCliente, setBusquedaCliente] = useState('')
  const [clienteSel,      setClienteSel]      = useState<any>(null)
  const [clientes,        setClientes]        = useState<any[]>([])
  const [tarjeta,         setTarjeta]         = useState<any>(null)
  const [revisando,       setRevisando]       = useState(false)
  const [procesando,      setProcesando]      = useState(false)
  const [error,           setError]           = useState('')
  const { staff } = useAuth()

  // Promociones de The Galley: precio de cada producto (cambia si el cliente es nuevo o staff)
  const [promos, setPromos] = useState<Record<string, any>>({})
  useEffect(() => {
    api('/promociones/precios', 'POST', { cliente_id: clienteSel?.id || null, sucursal_id: sucursalId,
      items: carrito.map(i => ({ tipo: 'producto', id: i.id, precio: i.precio_sucursal })) })
      .then(r => setPromos(r.precios || {})).catch(() => setPromos({}))
  }, [clienteSel?.id])
  const precioDe = (i: any) => Number(promos[i.id]?.precio_final ?? i.precio_sucursal)
  const totalFinal = carrito.reduce((t, i) => t + precioDe(i) * i.cantidad, 0)
  const ahorro = total - totalFinal

  const buscarCliente = async (q: string) => {
    setBusquedaCliente(q)
    if (q.length < 2) { setClientes([]); return }
    const { data } = await supabase.from('clientes').select('id, nombre_completo, email')
      .or(`nombre_completo.ilike.%${q}%,email.ilike.%${q}%`).limit(5)
    setClientes(data || [])
  }

  // Al elegir cliente, se revisa si tiene tarjeta guardada (y se propone cobrarle ahí)
  const elegirCliente = async (c: any) => {
    setClienteSel(c); setClientes([]); setTarjeta(null); setError('')
    setRevisando(true)
    try {
      const op = await api(`/cobros/opciones/${c.id}`)
      setTarjeta(op.tarjeta)
      if (op.tarjeta) setMetodoPago('tarjeta')
    } catch { setTarjeta(null) }
    setRevisando(false)
  }

  const quitarCliente = () => {
    setClienteSel(null); setBusquedaCliente(''); setTarjeta(null)
    if (metodoPago === 'tarjeta') setMetodoPago('terminal')
  }

  const descontarInventario = async () => {
    for (const item of carrito) {
      if (item.tipo === 'con_receta') {
        for (let q = 0; q < item.cantidad; q++) {
          for (const ing of (item.receta_ingredientes || [])) {
            await supabase.rpc('decrementar_inventario', {
              p_insumo_id: ing.insumo_id, p_sucursal_id: sucursalId, p_cantidad: ing.cantidad,
            })
          }
        }
      } else if (item.tipo === 'simple') {
        await supabase.rpc('decrementar_inventario_producto', {
          p_producto_id: item.id, p_sucursal_id: sucursalId, p_cantidad: item.cantidad,
        })
      }
    }
  }

  const handleCobrar = async () => {
    if (metodoPago === 'terminal' && !numeroOperacion) return
    if (metodoPago === 'tarjeta' && (!clienteSel || !tarjeta)) return
    setProcesando(true); setError('')

    // 1. Venta (con tarjeta queda pendiente hasta que el cobro pase)
    const { data: venta } = await supabase.from('ventas').insert({
      sucursal_id:      sucursalId,
      cliente_id:       clienteSel?.id || null,
      total:            totalFinal,
      metodo_pago:      metodoPago,
      numero_operacion: numeroOperacion || null,
      estatus:          metodoPago === 'tarjeta' ? 'Pendiente' : 'Completada',
    }).select().single()
    if (!venta) { setError('No se pudo registrar la venta.'); setProcesando(false); return }

    await supabase.from('venta_items').insert(carrito.map(i => ({
      venta_id: venta.id, producto_id: i.id, cantidad: i.cantidad,
      precio_unitario: precioDe(i), subtotal: precioDe(i) * i.cantidad,
    })))
    if (Object.keys(promos).length) {
      api('/promociones/uso-venta', 'POST', { venta_id: venta.id, cliente_id: clienteSel?.id || null,
        items: carrito.filter(i => promos[i.id]).map(i => ({ producto_id: i.id, promocion_id: promos[i.id].promocion_id,
          precio_original: i.precio_sucursal * i.cantidad, precio_final: precioDe(i) * i.cantidad })) }).catch(() => {})
    }

    // 2. Cobro a su tarjeta guardada (manda comprobante y notificación al cliente)
    if (metodoPago === 'tarjeta') {
      try {
        await api('/stripe/cobrar-tarjeta', 'POST', {
          cliente_id: clienteSel.id, monto: totalFinal, sucursal_id: sucursalId, venta_id: venta.id,
          concepto: `The Galley · ${carrito.map(i => `${i.nombre} ×${i.cantidad}`).join(', ')}`.slice(0, 200),
        })
        await supabase.from('ventas').update({ estatus: 'Completada' }).eq('id', venta.id)
      } catch (e: any) {
        await supabase.from('ventas').update({ estatus: 'Cancelada' }).eq('id', venta.id)
        setError(`${e.message}. Cobra con terminal o pide que actualice su tarjeta en la app (Perfil → Métodos de pago).`)
        setProcesando(false)
        return
      }
    }

    // 3. Inventario
    await descontarInventario()

    // 4. Comprobante por correo (con tarjeta ya lo mandó Stripe)
    if (clienteSel?.email && metodoPago !== 'tarjeta') {
      fetch('/api/degali/comprobante', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ventaId: venta.id, email: clienteSel.email, nombre: clienteSel.nombre_completo,
          carrito: carrito.map(i => ({ ...i, precio_sucursal: precioDe(i) })), total: totalFinal, metodoPago, numeroOperacion, sucursalId,
        }),
      }).catch(() => {})
    }

    await logActividad({
      tipo:        'venta_galley',
      descripcion: `${staff?.nombre} ${staff?.primer_apellido} registró venta de $${totalFinal} (${metodoPago === 'tarjeta' ? 'tarjeta guardada' : metodoPago})${clienteSel ? ` para "${clienteSel.nombre_completo}"` : ''}`,
      tabla:       'ventas',
      accion:      'INSERT',
      metadata:    {
        venta_id: venta.id, total: totalFinal, ahorro, metodo: metodoPago, cliente_id: clienteSel?.id || null,
        productos: carrito.map(i => ({ nombre: i.nombre, cantidad: i.cantidad })),
      },
      sucursal_id: sucursalId,
      staff_id:    staff?.id,
    })
    setProcesando(false)
    onVentaCreada()
  }

  const metodos: { key: Metodo; label: string; disponible: boolean }[] = [
    { key: 'tarjeta',  label: '💳 Su tarjeta', disponible: !!tarjeta },
    { key: 'terminal', label: '🏧 Terminal',   disponible: true },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10 overflow-hidden">

        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h3 className="text-lg font-black text-gray-900">Cobrar orden</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={16} /></button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Resumen */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <p className="text-xs font-black text-gray-400 uppercase tracking-wide mb-3">Resumen</p>
            {carrito.map(i => (
              <div key={i.id} className="flex justify-between text-sm gap-2">
                <span className="text-gray-600">{i.nombre} ×{i.cantidad}{promos[i.id] && <span className="ml-1 text-[10px] font-bold text-emerald-600">🏷️ promo</span>}</span>
                <span className="font-bold text-gray-900 whitespace-nowrap">
                  {promos[i.id] && <s className="text-gray-400 font-normal mr-1.5">${(i.precio_sucursal * i.cantidad).toLocaleString('es-MX')}</s>}
                  ${(precioDe(i) * i.cantidad).toLocaleString('es-MX')}
                </span>
              </div>
            ))}
            <div className="border-t border-gray-200 pt-2 flex justify-between">
              <span className="font-black text-gray-900">Total</span>
              <span className="text-xl font-black text-gray-900">${totalFinal.toLocaleString('es-MX')}</span>
            </div>
            {ahorro > 0 && <p className="text-xs text-emerald-700 text-right font-bold">Ahorra ${ahorro.toLocaleString('es-MX')} con promoción</p>}
          </div>

          {/* Cliente */}
          <div className="space-y-2">
            <p className="text-xs font-black text-gray-500 uppercase tracking-wide">Cliente</p>
            {clienteSel ? (
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 space-y-2">
                <div className="flex items-center gap-3">
                  <User size={16} className="text-indigo-500" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-indigo-900">{clienteSel.nombre_completo}</p>
                    <p className="text-xs text-indigo-500">{clienteSel.email}</p>
                  </div>
                  <button onClick={quitarCliente} className="text-indigo-400 hover:text-indigo-600"><X size={14} /></button>
                </div>
                <p className="text-[11px] text-indigo-700 flex items-center gap-1.5">
                  {revisando ? <><Loader2 size={11} className="animate-spin" /> Revisando su tarjeta…</>
                    : tarjeta ? <><Wallet size={11} /> Tiene {tarjeta.marca} •••• {tarjeta.ultimos4} guardada</>
                    : 'No tiene tarjeta guardada'}
                </p>
              </div>
            ) : (
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input placeholder="Buscar cliente (para cobrar a su tarjeta)..."
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-400"
                  value={busquedaCliente} onChange={e => buscarCliente(e.target.value)} />
                {clientes.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 z-10 overflow-hidden">
                    {clientes.map(c => (
                      <button key={c.id} onClick={() => elegirCliente(c)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left text-sm">
                        <User size={14} className="text-gray-400" />
                        <div><p className="font-bold text-gray-900">{c.nombre_completo}</p><p className="text-xs text-gray-400">{c.email}</p></div>
                      </button>
                    ))}
                    <button onClick={() => { setClientes([]); setBusquedaCliente('') }}
                      className="w-full px-4 py-2.5 text-xs text-gray-400 hover:bg-gray-50 border-t border-gray-100">Continuar sin cliente</button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Método de pago */}
          <div className="space-y-2">
            <p className="text-xs font-black text-gray-500 uppercase tracking-wide">Método de pago</p>
            <div className="grid grid-cols-2 gap-2">
              {metodos.map(m => (
                <button key={m.key} disabled={!m.disponible} onClick={() => setMetodoPago(m.key)}
                  className={`py-3 rounded-xl text-sm font-bold border-2 transition ${
                    metodoPago === m.key ? 'border-gray-900 bg-gray-900 text-white'
                    : m.disponible ? 'border-gray-200 text-gray-600 hover:border-gray-400' : 'border-gray-100 text-gray-300 cursor-not-allowed'}`}>
                  {m.label}
                </button>
              ))}
            </div>
            {metodoPago === 'tarjeta' && tarjeta && (
              <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                Se cobra a su {tarjeta.marca} •••• {tarjeta.ultimos4} y le llega el comprobante a su app y correo.
              </p>
            )}
            {metodoPago === 'terminal' && (
              <input placeholder="Número de operación *"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-400"
                value={numeroOperacion} onChange={e => setNumeroOperacion(e.target.value)} />
            )}
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 rounded-xl p-3 font-medium">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-gray-100">
          <button onClick={handleCobrar}
            disabled={procesando || (metodoPago === 'terminal' && !numeroOperacion) || (metodoPago === 'tarjeta' && !tarjeta)}
            className="w-full py-3.5 rounded-xl text-sm font-black text-white disabled:opacity-40 transition" style={{ backgroundColor: '#171B24' }}>
            {procesando ? 'Procesando...'
              : metodoPago === 'tarjeta' ? `Cobrar $${totalFinal.toLocaleString('es-MX')} a su tarjeta`
              : `Confirmar pago $${totalFinal.toLocaleString('es-MX')}`}
          </button>
        </div>
      </div>
    </div>
  )
}
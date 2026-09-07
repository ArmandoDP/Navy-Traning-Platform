'use client'
import { useEffect, useState } from 'react'
import { supabase }            from '@/lib/supabase'
import { X, ChevronRight, ChevronLeft, ShoppingBag, CreditCard } from 'lucide-react'

interface Props { fechaInicio: string; fechaFin: string; sucursalId: string | null }

const selectCls = "border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 outline-none bg-white focus:border-gray-400 appearance-none cursor-pointer"

type Transaccion = {
  id:          string
  tipo:        'membresia' | 'galley'
  fecha:       string
  cliente:     string
  concepto:    string
  sucursal:    string
  sucursalColor: string
  metodo:      string
  monto:       number
  estatus:     string
  raw:         any
}

export default function FinanzasTransacciones({ fechaInicio, fechaFin, sucursalId }: Props) {
  const [loading,    setLoading]    = useState(true)
  const [items,      setItems]      = useState<Transaccion[]>([])
  const [sucursales, setSucursales] = useState<any[]>([])
  const [activo,     setActivo]     = useState<Transaccion | null>(null)
  const [detalle,    setDetalle]    = useState<any[]>([])
  const [page,       setPage]       = useState(1)
  const [filtros,    setFiltros]    = useState({ sucursal: '', tipo: '', estado: '', origen: '' })
  const PER_PAGE = 10

  useEffect(() => {
    const load = async () => {
      setLoading(true)

      const [{ data: pagosData }, { data: ventasData }, { data: sucsData }] = await Promise.all([
        // Membresías y pagos normales
        (() => {
          let q = supabase.from('pagos')
            .select('id, monto, estatus, fecha_pago, canal, concepto, metodo_pago, sucursal_id, stripe_payment_intent_id, cliente_id, clientes(nombre_completo), sucursales(nombre, color)')
            .gte('fecha_pago', fechaInicio)
            .lte('fecha_pago', fechaFin + 'T23:59:59')
            .in('estatus', ['Completado', 'Reembolsado'])
            .order('fecha_pago', { ascending: false })
          if (sucursalId) q = q.eq('sucursal_id', sucursalId)
          return q
        })(),

        // Ventas de Gali
        (() => {
          let q = supabase.from('ventas')
            .select('id, total, metodo_pago, numero_operacion, estatus, created_at, sucursal_id, cliente_id, clientes(nombre_completo), sucursales(nombre, color)')
            .gte('created_at', fechaInicio)
            .lte('created_at', fechaFin + 'T23:59:59')
            .order('created_at', { ascending: false })
          if (sucursalId) q = q.eq('sucursal_id', sucursalId)
          return q
        })(),

        supabase.from('sucursales').select('id, nombre, color').eq('estatus', 'Activa'),
      ])

      const txMembresias: Transaccion[] = (pagosData || []).map(p => {
        const cli = Array.isArray(p.clientes)   ? (p.clientes as any)[0]   : p.clientes as any
        const suc = Array.isArray(p.sucursales) ? (p.sucursales as any)[0] : p.sucursales as any
        return {
          id:            p.id,
          tipo:          'membresia' as const,
          fecha:         p.fecha_pago,
          cliente:       cli?.nombre_completo || '—',
          concepto:      p.concepto || 'Membresía',
          sucursal:      suc?.nombre || '—',
          sucursalColor: suc?.color || '#6b7280',
          metodo:        p.metodo_pago || '—',
          monto:         p.monto || 0,
          estatus:       p.estatus || '—',
          raw:           p,
        }
      })

      const txGalley: Transaccion[] = (ventasData || []).map(v => {
        const cli = Array.isArray(v.clientes)   ? (v.clientes as any)[0]   : v.clientes as any
        const suc = Array.isArray(v.sucursales) ? (v.sucursales as any)[0] : v.sucursales as any
        return {
          id:            v.id,
          tipo:          'galley' as const,
          fecha:         v.created_at,
          cliente:       cli?.nombre_completo || 'Cliente sin registro',
          concepto:      'The Galley',
          sucursal:      suc?.nombre || '—',
          sucursalColor: suc?.color || '#6b7280',
          metodo:        v.metodo_pago || '—',
          monto:         v.total || 0,
          estatus:       v.estatus === 'Completada' ? 'Completado' : v.estatus,
          raw:           v,
        }
      })

      // Combinar y ordenar por fecha
      const todas = [...txMembresias, ...txGalley].sort((a, b) =>
        new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      )

      setItems(todas)
      setSucursales(sucsData || [])
      setLoading(false)
    }
    load()
  }, [fechaInicio, fechaFin, sucursalId])

  const handleVerDetalle = async (tx: Transaccion) => {
    setActivo(tx)
    setDetalle([])
    if (tx.tipo === 'galley') {
      const { data } = await supabase.from('venta_items')
        .select('cantidad, precio_unitario, subtotal, producto_id, productos(nombre)')
        .eq('venta_id', tx.id)
      setDetalle(data || [])
    }
  }

  const filtrados = items.filter(p =>
    (!filtros.sucursal || p.raw.sucursal_id === filtros.sucursal) &&
    (!filtros.tipo     || p.metodo === filtros.tipo) &&
    (!filtros.estado   || p.estatus === filtros.estado) &&
    (!filtros.origen   || p.tipo === filtros.origen)
  )

  const totalPages = Math.ceil(filtrados.length / PER_PAGE)
  const paginated  = filtrados.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  if (loading) return <div className="p-10 text-center text-gray-400 italic text-sm">Cargando...</div>

  return (
    <div className="relative">
      {/* Drawer detalle */}
      {activo && (
        <>
          <div onClick={() => setActivo(null)} className="fixed inset-0 z-40 bg-black/20" />
          <div className="fixed top-0 right-0 z-50 h-full w-96 bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {activo.tipo === 'galley' ? (
                    <span className="flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
                      <ShoppingBag size={11}/> The Galley
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
                      <CreditCard size={11}/> Membresía
                    </span>
                  )}
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    activo.estatus === 'Completado' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                  }`}>{activo.estatus}</span>
                </div>
                <p className="text-sm font-black text-gray-900">Detalle de transacción</p>
                <p className="text-xs text-gray-400">txn_{activo.id?.slice(0,7)}</p>
              </div>
              <button onClick={() => setActivo(null)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
                <X size={16}/>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Monto */}
              <div className="text-center py-4">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{activo.concepto}</p>
                <p className="text-4xl font-black text-gray-900">${activo.monto?.toLocaleString()}</p>
              </div>

              {/* Datos */}
              <div className="border-t border-gray-100 pt-4 space-y-3">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Datos de la compra</p>
                {[
                  { label: 'Cliente',        val: activo.cliente },
                  { label: 'Sucursal',       val: activo.sucursal, color: activo.sucursalColor },
                  { label: 'Método de pago', val: activo.metodo },
                  { label: 'Fecha y hora',   val: new Date(activo.fecha).toLocaleString('es-MX') },
                  ...(activo.tipo === 'galley' && activo.raw.numero_operacion
                    ? [{ label: 'No. Operación', val: activo.raw.numero_operacion }]
                    : []),
                  ...(activo.tipo === 'membresia' && activo.raw.stripe_payment_intent_id
                    ? [{ label: 'ID Stripe', val: activo.raw.stripe_payment_intent_id }]
                    : []),
                ].map(r => (
                  <div key={r.label} className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">{r.label}</span>
                    {r.color ? (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg"
                        style={{ backgroundColor: `${r.color}20`, color: r.color }}>{r.val}</span>
                    ) : (
                      <span className="text-sm font-medium text-gray-900 text-right max-w-[180px] truncate">{r.val}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Desglose productos Gali */}
              {activo.tipo === 'galley' && (
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Productos</p>
                  {detalle.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">Sin productos registrados</p>
                  ) : detalle.map((item, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{item.productos?.nombre || 'Producto'}</p>
                        <p className="text-xs text-gray-400">x{item.cantidad} · ${item.precio_unitario?.toLocaleString()} c/u</p>
                      </div>
                      <p className="text-sm font-black text-gray-900">${item.subtotal?.toLocaleString()}</p>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-gray-100 pt-2">
                    <span className="text-sm font-black text-gray-900">Total</span>
                    <span className="text-sm font-black text-gray-900">${activo.monto?.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Header + Filtros */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-wrap gap-3">
          <p className="text-sm font-black text-gray-900">
            Todas las transacciones
            <span className="text-gray-400 font-normal text-xs ml-2">({filtrados.length} registros)</span>
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <select className={selectCls} value={filtros.origen}
              onChange={e => { setFiltros(p => ({ ...p, origen: e.target.value })); setPage(1) }}>
              <option value="">Todas las fuentes</option>
              <option value="membresia">💳 Membresías</option>
              <option value="galley">🛍️ The Galley</option>
            </select>
            <select className={selectCls} value={filtros.sucursal}
              onChange={e => { setFiltros(p => ({ ...p, sucursal: e.target.value })); setPage(1) }}>
              <option value="">Sucursal</option>
              {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
            <select className={selectCls} value={filtros.tipo}
              onChange={e => { setFiltros(p => ({ ...p, tipo: e.target.value })); setPage(1) }}>
              <option value="">Método</option>
              {['Tarjeta', 'card', 'link', 'Stripe', 'Efectivo', 'Terminal', 'Cortesía'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select className={selectCls} value={filtros.estado}
              onChange={e => { setFiltros(p => ({ ...p, estado: e.target.value })); setPage(1) }}>
              <option value="">Estado</option>
              {['Completado','Fallido','Pendiente'].map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            {(filtros.sucursal || filtros.tipo || filtros.estado || filtros.origen) && (
              <button onClick={() => { setFiltros({ sucursal: '', tipo: '', estado: '', origen: '' }); setPage(1) }}
                className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1">
                <X size={12}/> Limpiar
              </button>
            )}
          </div>
        </div>

        <table className="w-full text-left">
          <thead className="text-xs font-bold text-gray-400 uppercase border-b border-gray-100">
            <tr>
              <th className="px-5 py-3">Fecha</th>
              <th className="px-5 py-3">Hora</th>
              <th className="px-5 py-3">Cliente</th>
              <th className="px-5 py-3">Concepto</th>
              <th className="px-5 py-3">Sucursal</th>
              <th className="px-5 py-3">Método</th>
              <th className="px-5 py-3">Monto</th>
              <th className="px-5 py-3">Estado</th>
              <th className="px-5 py-3 w-8"/>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {paginated.length === 0 ? (
              <tr><td colSpan={9} className="px-5 py-12 text-center text-gray-400 italic text-sm">
                No hay transacciones para este período
              </td></tr>
            ) : paginated.map(p => (
              <tr key={`${p.tipo}-${p.id}`} className="hover:bg-gray-50 transition cursor-pointer" onClick={() => handleVerDetalle(p)}>
                <td className="px-5 py-3.5 text-sm text-gray-600">
                  {new Date(p.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-5 py-3.5 text-sm text-gray-600">
                  {new Date(p.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-5 py-3.5 text-sm font-medium text-gray-900">{p.cliente}</td>
                <td className="px-5 py-3.5">
                  <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full w-fit ${
                    p.tipo === 'galley' ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'
                  }`}>
                    {p.tipo === 'galley' ? <ShoppingBag size={10}/> : <CreditCard size={10}/>}
                    {p.concepto}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg"
                    style={{ backgroundColor: `${p.sucursalColor}20`, color: p.sucursalColor }}>
                    {p.sucursal}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-sm text-gray-600">{p.metodo}</td>
                <td className="px-5 py-3.5 text-sm font-black text-gray-900">${p.monto?.toLocaleString()}</td>
                <td className="px-5 py-3.5">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                    p.estatus === 'Completado' ? 'bg-emerald-50 text-emerald-600' :
                    p.estatus === 'Fallido'    ? 'bg-red-50 text-red-500' :
                    'bg-amber-50 text-amber-600'
                  }`}>{p.estatus}</span>
                </td>
                <td className="px-5 py-3.5"><ChevronRight size={16} className="text-gray-300"/></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 disabled:opacity-30 transition">
            <ChevronLeft size={16}/>
          </button>
          <span className="text-xs text-gray-400">Página {page} de {totalPages || 1}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page >= totalPages}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 disabled:opacity-30 transition">
            <ChevronRight size={16}/>
          </button>
        </div>
      </div>
    </div>
  )
}
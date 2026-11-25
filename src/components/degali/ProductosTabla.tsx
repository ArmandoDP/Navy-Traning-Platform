'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { RefreshCw, Plus, Copy } from 'lucide-react'
import DrawerProducto from './DrawerProducto'
import { useAuth } from '@/context/AuthContext'
import { logActividad } from '@/lib/log-actividad'
import { coincide } from '@/lib/buscar'
import ModalConfirmacion from './ModalConfirmacion'

interface Props { sucursalId: string | null }

const CATEGORIAS = ['Todas', 'Smoothie', 'Alimento', 'Bebida', 'Snack', 'Suplemento', 'Merch']

export default function ProductosTabla({ sucursalId }: Props) {
  const [productos,      setProductos]      = useState<any[]>([])
  const [loading,        setLoading]        = useState(true)
  const [categoria,      setCategoria]      = useState('Todas')
  const [drawerProducto, setDrawerProducto] = useState<any>(null)
  const [nuevoDrawer,    setNuevoDrawer]    = useState(false)
  const [capacidad,      setCapacidad]      = useState<Record<string, number>>({})
  const { staff, puedeEditar } = useAuth()
  const [verTodo,        setVerTodo]        = useState(false)          // false = solo lo que se vende en esta sucursal
  const [sucursales,     setSucursales]     = useState<any[]>([])
  const [origenCopia,    setOrigenCopia]    = useState('')
  const [copiando,       setCopiando]       = useState(false)
  const [aviso,          setAviso]          = useState('')
  const [busqueda,       setBusqueda]       = useState('')
  const [confirmarCopia, setConfirmarCopia] = useState(false)

  useEffect(() => {
    supabase.from('sucursales').select('id, nombre').eq('estatus', 'Activa').order('nombre')
      .then(({ data }) => setSucursales(data || []))
  }, [])

  useEffect(() => {
    if (!sucursalId) return
    fetchProductos()
  }, [sucursalId])

  const fetchProductos = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('productos')
      .select(`
        *,
        producto_precios(precio_venta, costo_total, sucursal_id, activo),
        receta_ingredientes(
          cantidad, unidad, insumo_id,
          insumos(nombre, unidad)
        )
      `)
      .order('categoria')

    if (data) {
      setProductos(data)
      if (sucursalId) calcularCapacidad(data, sucursalId)
    }
    setLoading(false)
  }

  const calcularCapacidad = async (prods: any[], sucId: string) => {
    // Traer inventario actual
    const { data: inv } = await supabase
      .from('inventario_insumos')
      .select('insumo_id, stock_actual')
      .eq('sucursal_id', sucId)

    if (!inv) return

    const stockMap: Record<string, number> = {}
    inv.forEach(i => { stockMap[i.insumo_id] = i.stock_actual })

    const caps: Record<string, number> = {}
    prods.forEach(p => {
      if (p.tipo !== 'con_receta' || !p.receta_ingredientes?.length) return
      let minCapacidad = Infinity
      for (const ing of p.receta_ingredientes) {
        const stock = stockMap[ing.insumo_id] || 0
        const posible = Math.floor(stock / ing.cantidad)
        if (posible < minCapacidad) minCapacidad = posible
      }
      caps[p.id] = minCapacidad === Infinity ? 0 : minCapacidad
    })
    setCapacidad(caps)
  }

  // Un producto se vende en la sucursal si tiene precio activo aquí
  const vendeAqui = (p: any) => p.producto_precios?.some((pp: any) =>
    pp.sucursal_id === sucursalId && pp.activo !== false && Number(pp.precio_venta) > 0)

  const filtrados = productos.filter(p =>
    (categoria === 'Todas' || p.categoria === categoria) && (verTodo || vendeAqui(p)) &&
    coincide(`${p.nombre} ${p.descripcion || ''}`, busqueda)
  )

  // Copia el menú de otra sucursal a esta: solo agrega los productos que aún no tiene (no cambia precios existentes)
  const origenNombre  = sucursales.find(s => s.id === origenCopia)?.nombre
  const destinoNombre = sucursales.find(s => s.id === sucursalId)?.nombre

  const copiarMenu = async () => {
    if (!sucursalId || !origenCopia) return
    const origen = sucursales.find(s => s.id === origenCopia)
    const destino = sucursales.find(s => s.id === sucursalId)
    setConfirmarCopia(false)
    setCopiando(true); setAviso('')
    const { data: filas, error } = await supabase.from('producto_precios')
      .select('producto_id, precio_venta, costo_total').eq('sucursal_id', origenCopia).eq('activo', true)
    if (error || !filas) { setAviso('No se pudo leer el menú de origen'); setCopiando(false); return }
    const nuevas = filas.map(f => ({ producto_id: f.producto_id, sucursal_id: sucursalId,
      precio_venta: f.precio_venta, costo_total: f.costo_total, activo: true }))
    const { error: err2 } = await supabase.from('producto_precios')
      .upsert(nuevas, { onConflict: 'producto_id,sucursal_id', ignoreDuplicates: true })
    if (err2) { setAviso('No se pudo copiar el menú: ' + err2.message); setCopiando(false); return }
    await logActividad({
      tipo: 'menu_copiado',
      descripcion: `${staff?.nombre} ${staff?.primer_apellido} copió el menú de ${origen?.nombre} a ${destino?.nombre}`,
      tabla: 'producto_precios', accion: 'INSERT',
      metadata: { origen: origenCopia, destino: sucursalId, productos: nuevas.length },
      sucursal_id: sucursalId, staff_id: staff?.id,
    })
    setAviso(`Listo: se revisaron ${nuevas.length} productos de ${origen?.nombre}`)
    setOrigenCopia(''); setCopiando(false)
    fetchProductos()
  }

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {CATEGORIAS.map(c => (
            <button key={c} onClick={() => setCategoria(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
                categoria === c ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {c}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setVerTodo(v => !v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${verTodo ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {verTodo ? 'Viendo todo el catálogo' : 'Ver todo el catálogo'}
          </button>
          <button onClick={fetchProductos} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
            <RefreshCw size={14} />
          </button>
          <button
            onClick={() => setNuevoDrawer(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition"
            style={{ backgroundColor: '#171B24' }}>
            <Plus size={14} /> Nuevo producto
          </button>
        </div>
      </div>

      {/* Buscador: ignora mayúsculas, acentos y espacios de más, y perdona errores leves de ortografía */}
      <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="Buscar producto…"
        className="w-full md:w-72 border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-gray-400 bg-white" />

      {/* Copiar menú de otra sucursal */}
      {puedeEditar('galley') && sucursales.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <select value={origenCopia} onChange={e => setOrigenCopia(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold text-gray-600 outline-none bg-white">
            <option value="">Copiar menú desde…</option>
            {sucursales.filter(s => s.id !== sucursalId).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
          <button onClick={() => setConfirmarCopia(true)} disabled={!origenCopia || copiando}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 transition disabled:opacity-40">
            <Copy size={12} /> {copiando ? 'Copiando…' : 'Copiar'}
          </button>
          {aviso && <span className="text-xs font-bold text-gray-500">{aviso}</span>}
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400 gap-2">
            <RefreshCw size={14} className="animate-spin" /> Cargando...
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="text-gray-400 text-[11px] font-bold uppercase border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-5 py-3">Producto</th>
                <th className="px-5 py-3">Categoría</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3 text-right">Precio sucursal</th>
                <th className="px-5 py-3 text-right">Costo</th>
                <th className="px-5 py-3 text-right">Podes hacer</th>
                <th className="px-5 py-3 text-center">Estatus</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtrados.map(p => {
                const precio = p.producto_precios?.find((pp: any) => pp.sucursal_id === sucursalId)
                const cap    = capacidad[p.id]
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-bold text-gray-900">{p.nombre}</p>
                      {!vendeAqui(p) && <span className="inline-block mt-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-600">No se vende aquí</span>}
                      {p.descripcion && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{p.descripcion}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        {p.categoria}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        p.tipo === 'con_receta' ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {p.tipo === 'con_receta' ? 'Con receta' : 'Simple'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-black text-gray-900">
                      {precio ? `$${precio.precio_venta.toLocaleString('es-MX')}` : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right text-sm text-gray-500">
                      {precio ? `$${precio.costo_total.toLocaleString('es-MX')}` : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {p.tipo === 'con_receta' ? (
                        <span className={`text-sm font-black ${
                          cap === 0 ? 'text-red-500' : cap <= 3 ? 'text-amber-500' : 'text-emerald-600'
                        }`}>
                          {cap ?? '—'}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        p.activo ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                      }`}>
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => setDrawerProducto(p)}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
                        Editar
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <ModalConfirmacion
        isOpen={confirmarCopia}
        icono={<Copy size={18} />}
        titulo="Copiar menú"
        subtitulo={`${origenNombre || ''} → ${destinoNombre || 'esta sucursal'}`}
        mensaje={<>Se copiarán a <b className="text-gray-900">{destinoNombre || 'esta sucursal'}</b> los productos y precios de <b className="text-gray-900">{origenNombre}</b>. Solo se agregan los que todavía no tiene; <b className="text-gray-900">no se cambia ningún precio existente</b>.</>}
        textoConfirmar="Copiar menú"
        onClose={() => setConfirmarCopia(false)}
        onConfirm={copiarMenu}
      />

      {(drawerProducto || nuevoDrawer) && (
        <DrawerProducto
          producto={drawerProducto}
          sucursalId={sucursalId}
          isOpen={!!(drawerProducto || nuevoDrawer)}
          onClose={() => { setDrawerProducto(null); setNuevoDrawer(false) }}
          onSuccess={() => { setDrawerProducto(null); setNuevoDrawer(false); fetchProductos() }}
        />
      )}
    </div>
  )
}
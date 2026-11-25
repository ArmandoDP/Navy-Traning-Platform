'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Plus, Trash2 } from 'lucide-react'
import { logActividad } from '@/lib/log-actividad'
import { useAuth } from '@/context/AuthContext'
import { useSucursal } from '@/context/SucursalContext'
import ModalConfirmacion from './ModalConfirmacion'
import MedidaInput from './MedidaInput'
import { convertir, normalizarUnidad, redondear, formatoNumero, equivalenciaInversa } from '@/lib/medidas'
import { aplicarEquivalenciaARecetas } from '@/lib/recetasMedidas'
import { limpiarNombre, normalizar } from '@/lib/buscar'

interface Props {
  producto:   any | null
  sucursalId: string | null
  isOpen:     boolean
  onClose:    () => void
  onSuccess:  () => void
}

const CATEGORIAS  = ['Smoothie', 'Alimento', 'Bebida', 'Snack', 'Suplemento', 'Merch']
const SUCURSALES_NAMES: Record<string, string> = {
  'f8f798a8-d89b-4874-a53a-cdcb6325ad2a': 'Condesa',
  '74ca16d9-3ac6-4a7b-ad91-149004bcda64': 'Interlomas Gym',
  '7e8352fe-2641-4474-a9eb-eb555f710f0b': 'Interlomas Studio',
  '249f4814-95fd-4d3b-919f-57e21e737910': 'Juriquilla',
  '00859e09-0c9d-4690-9265-9fe4a12d0492': 'Lomas',
  '800f4d25-1e08-4310-9359-24c5ccfbf4ec': 'Refugio',
}

export default function DrawerProducto({ producto, sucursalId, isOpen, onClose, onSuccess }: Props) {
  const esNuevo = !producto

  const [nombre,      setNombre]      = useState(producto?.nombre || '')
  const [categoria,   setCategoria]   = useState(producto?.categoria || 'Smoothie')
  const [tipo,        setTipo]        = useState<'simple' | 'con_receta'>(producto?.tipo || 'con_receta')
  const [descripcion, setDescripcion] = useState(producto?.descripcion || '')
  const [activo,      setActivo]      = useState(producto?.activo ?? true)
  const [precios,     setPrecios]     = useState<Record<string, string>>({})
  const [costos,      setCostos]      = useState<Record<string, string>>({})
  const [vendeEn,     setVendeEn]     = useState<Record<string, boolean>>({})   // sucursal → ¿se vende aquí?
  const [equivalencias, setEquivalencias] = useState<Record<string, number>>({}) // "insumo|medida" → cuánto vale en la unidad base del insumo
  const [equivTemp,     setEquivTemp]     = useState<Record<number, string>>({}) // equivalencia que se está escribiendo, por ingrediente
  const [equivListo,    setEquivListo]    = useState(true)                       // false si falta crear la tabla en la base
  const [errorReceta,   setErrorReceta]   = useState('')
  const [receta,      setReceta]      = useState<any[]>([])
  const [insumos,     setInsumos]     = useState<any[]>([])
  const [sucursales,  setSucursales]  = useState<any[]>([])
  const [guardando,   setGuardando]   = useState(false)
  const [activeTab,   setActiveTab]   = useState<'info' | 'receta' | 'precios'>('info')
  const { staff } = useAuth()
  // Dirección edita las de todas las sucursales; el demás personal, solo las suyas
  const { sucursales: misSucursales, puedeGlobal } = useSucursal()
  const puedeEnSucursal = (id: string) => puedeGlobal || misSucursales.some(s => s.id === id)

  useEffect(() => {
    if (!isOpen) return
    fetchInsumos()
    fetchSucursales()
    fetchEquivalencias()
    setErrorReceta('')
    if (producto) {
      // Cargar precios existentes
      const p: Record<string, string> = {}
      const c: Record<string, string> = {}
      const v: Record<string, boolean> = {}
      producto.producto_precios?.forEach((pp: any) => {
        p[pp.sucursal_id] = pp.precio_venta?.toString() || ''
        c[pp.sucursal_id] = pp.costo_total?.toString() || ''
        v[pp.sucursal_id] = pp.activo !== false
      })
      setPrecios(p)
      setCostos(c)
      setVendeEn(v)
      // Cargar receta existente: se lee directo para traer también la medida que se escribió (cucharadas, tazas…)
      supabase.from('receta_ingredientes').select('*, insumos(nombre)').eq('producto_id', producto.id)
        .then(({ data, error }) => {
          const filas = !error && data ? data : (producto.receta_ingredientes || [])
          setReceta(filas.map((ri: any) => ({
            insumo_id:   ri.insumo_id,
            cantidad:    (ri.cantidad_medida ?? ri.cantidad)?.toString(),
            unidad:      ri.unidad_medida || ri.unidad,
            es_opcional: ri.es_opcional || false,
            nombre:      ri.insumos?.nombre,
          })))
        })
    }
  }, [isOpen, producto])

  const fetchInsumos = async () => {
    const { data } = await supabase.from('insumos').select('id, nombre, unidad, categoria').order('nombre')
    setInsumos(data || [])
  }

  const fetchSucursales = async () => {
    const { data } = await supabase.from('sucursales').select('id, nombre').eq('estatus', 'Activa').order('nombre')
    setSucursales(data || [])
  }

  const fetchEquivalencias = async () => {
    const { data, error } = await supabase.from('insumo_equivalencias').select('insumo_id, unidad, cantidad_base')
    if (error) { setEquivListo(false); return }
    setEquivListo(true)
    const m: Record<string, number> = {}
    ;(data || []).forEach((e: any) => { m[`${e.insumo_id}|${e.unidad}`] = Number(e.cantidad_base) })
    setEquivalencias(m)
  }

  const claveEquiv = (insumoId: string, unidad: string) => `${insumoId}|${normalizarUnidad(unidad)}`

  // Guarda cuánto vale 1 medida (ej. 1 cucharada) de un insumo en su unidad base; sirve para todas las recetas
  const guardarEquivalencia = async (idx: number, r: any) => {
    const entrada = Number(equivTemp[idx])
    if (!(entrada > 0)) return
    // En insumos por pieza (plátano…) se escribe cuánto pesa 1 pza; se guarda cuántas piezas hay en 1 g
    const valor = equivalenciaInversa(insumos.find(i => i.id === r.insumo_id)?.unidad, r.unidad) ? 1 / entrada : entrada
    const { error } = await supabase.from('insumo_equivalencias').upsert(
      { insumo_id: r.insumo_id, unidad: normalizarUnidad(r.unidad), cantidad_base: valor },
      { onConflict: 'insumo_id,unidad' })
    if (error) {
      setErrorReceta(/does not exist|schema cache/i.test(error.message)
        ? 'Falta actualizar la base de datos para guardar equivalencias. Avisa a sistemas.'
        : 'No se pudo guardar la equivalencia: ' + error.message)
      return
    }
    // La equivalencia es del insumo: se aplica a todas las demás recetas que lo usan con esa medida
    const aplicada = await aplicarEquivalenciaARecetas(r.insumo_id, normalizarUnidad(r.unidad), valor)
    setErrorReceta(aplicada.error ? 'La equivalencia se guardó, pero no se pudieron actualizar otras recetas: ' + aplicada.error : '')
    setEquivalencias(prev => ({ ...prev, [claveEquiv(r.insumo_id, r.unidad)]: valor }))
    setEquivTemp(prev => { const n = { ...prev }; delete n[idx]; return n })
  }

  // Ingredientes listos para guardar: la cantidad se convierte a la unidad del inventario (para que descuente bien)
  // y se conserva lo que se escribió (2 cucharadas) para mostrarlo en la receta.
  const filasReceta = (productoId: string) => {
    const filas: any[] = []
    const faltan: string[] = []
    const sinMedida: string[] = []
    for (const r of receta.filter(x => x.insumo_id && x.cantidad)) {
      const ins = insumos.find(i => i.id === r.insumo_id)
      if (!String(r.unidad || '').trim()) { sinMedida.push(ins?.nombre || 'insumo'); continue }
      const conv = convertir(Number(r.cantidad), r.unidad, ins?.unidad, equivalencias[claveEquiv(r.insumo_id, r.unidad)])
      if (conv.base === null) { faltan.push(`${ins?.nombre || 'insumo'} (${r.unidad})`); continue }
      const igual = conv.via === 'igual'
      filas.push({
        producto_id: productoId, insumo_id: r.insumo_id,
        cantidad: redondear(conv.base), unidad: ins?.unidad || r.unidad, es_opcional: r.es_opcional,
        ...(igual ? {} : { cantidad_medida: Number(r.cantidad), unidad_medida: String(r.unidad).trim() }),
      })
    }
    return { filas, faltan, sinMedida }
  }

  const mensajeReceta = (msg: string) =>
    /cantidad_medida|unidad_medida/.test(msg)
      ? 'Falta actualizar la base de datos para guardar medidas como cucharadas o tazas. Avisa a sistemas.'
      : 'No se pudo guardar la receta: ' + msg

  // Debajo de cada ingrediente: a cuánto equivale en el inventario, o el campo para registrar la equivalencia
  const estadoIngrediente = (r: any, idx: number) => {
    const ins = insumos.find(i => i.id === r.insumo_id)
    if (ins && !String(r.unidad || '').trim()) {
      return <p className="text-[11px] text-gray-400">Escribe la medida que usan en la cocina (cualquiera). El inventario de {ins.nombre} se lleva en {ins.unidad}.</p>
    }
    if (!ins || !r.cantidad || !String(r.unidad || '').trim()) return null
    const clave = claveEquiv(r.insumo_id, r.unidad)
    const conv = convertir(Number(r.cantidad), r.unidad, ins.unidad, equivalencias[clave])
    const editando = equivTemp[idx] !== undefined
    const inversa = equivalenciaInversa(ins.unidad, r.unidad)

    if (conv.base !== null && !editando) {
      if (conv.via === 'igual') return null
      return (
        <p className="text-xs font-bold text-emerald-600">
          ≈ {formatoNumero(conv.base)} {ins.unidad} en el inventario
          {conv.via === 'equivalencia' && (
            <button type="button" onClick={() => setEquivTemp(prev => ({ ...prev, [idx]: String(inversa ? redondear(1 / equivalencias[clave]) : equivalencias[clave]) }))}
              className="ml-2 font-normal text-gray-400 underline">cambiar equivalencia</button>
          )}
        </p>
      )
    }
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 space-y-2">
        <p className="text-xs font-bold text-amber-700">
          {inversa
            ? <>¿Cuántos {normalizarUnidad(r.unidad)} pesa (o equivale) 1 pza de {ins.nombre}?</>
            : <>¿Cuántos {ins.unidad} equivale 1 {normalizarUnidad(r.unidad)} de {ins.nombre}?</>}
        </p>
        <div className="flex items-center gap-2">
          <input type="number" min="0" step="any" placeholder="Ej. 10" value={equivTemp[idx] ?? ''}
            onChange={e => setEquivTemp(prev => ({ ...prev, [idx]: e.target.value }))}
            className="w-28 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-gray-400 bg-white" />
          <span className="text-xs text-gray-500">{inversa ? normalizarUnidad(r.unidad) : ins.unidad}</span>
          <button type="button" onClick={() => guardarEquivalencia(idx, r)} disabled={!(Number(equivTemp[idx]) > 0)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-40" style={{ backgroundColor: '#171B24' }}>
            Guardar equivalencia
          </button>
        </div>
        <p className="text-[11px] text-gray-400">Se guarda para este insumo y se usa en todas las recetas. Así el inventario descuenta bien.</p>
        {!equivListo && <p className="text-[11px] font-bold text-red-500">Falta actualizar la base de datos para guardar equivalencias. Avisa a sistemas.</p>}
      </div>
    )
  }

  const agregarIngrediente = () => {
    setReceta(prev => [...prev, { insumo_id: '', cantidad: '', unidad: '', es_opcional: false, nombre: '' }])
  }

  const actualizarIngrediente = (idx: number, campo: string, valor: any) => {
    setReceta(prev => prev.map((r, i) => {
      if (i !== idx) return r
      if (campo === 'insumo_id') {
        const ins = insumos.find(ins => ins.id === valor)
        return { ...r, insumo_id: valor, nombre: ins?.nombre || '' }
      }
      return { ...r, [campo]: valor }
    }))
  }

  const [nombreRepetido, setNombreRepetido] = useState<string | null>(null)   // aviso de nombre ya existente

  const handleGuardar = async (forzar = false) => {
    const nombreLimpio = limpiarNombre(nombre)          // sin espacios al inicio, al final ni dobles
    if (!nombreLimpio || !categoria) return
    setGuardando(true)

    // Aviso (no bloquea) si ya hay otro producto con el mismo nombre
    const { data: existentes } = await supabase.from('productos').select('id, nombre')
    const repetido = (existentes || []).some(p => p.id !== producto?.id && normalizar(p.nombre) === normalizar(nombreLimpio))
    if (repetido && !forzar) {
      setNombreRepetido(nombreLimpio)
      setGuardando(false)
      return
    }

    // Toda medida de la receta debe poder convertirse a la unidad del inventario
    setErrorReceta('')
    if (tipo === 'con_receta') {
      const { faltan, sinMedida } = filasReceta('')
      if (sinMedida.length || faltan.length) {
        setErrorReceta(sinMedida.length
          ? `Escribe la medida de: ${sinMedida.join(', ')} (por ejemplo g, ml, cucharada, taza).`
          : `Falta la equivalencia de: ${faltan.join(', ')}. Escríbela debajo del ingrediente.`)
        setActiveTab('receta'); setGuardando(false)
        return
      }
    }

    if (esNuevo) {
      // Crear producto
      const { data: prod } = await supabase.from('productos').insert({
        nombre: nombreLimpio, categoria, tipo, descripcion, activo
      }).select().single()

      if (!prod) { setGuardando(false); return }

      // Insertar receta (si falla, se deshace el producto para no dejarlo a medias)
      if (tipo === 'con_receta') {
        const { filas } = filasReceta(prod.id)
        if (filas.length) {
          const { error: errR } = await supabase.from('receta_ingredientes').insert(filas)
          if (errR) {
            await supabase.from('productos').delete().eq('id', prod.id)
            setErrorReceta(mensajeReceta(errR.message)); setGuardando(false)
            return
          }
        }
      }

      // Insertar precios
      const preciosInsert = sucursales
        .filter(s => precios[s.id] && vendeEn[s.id] && puedeEnSucursal(s.id))
        .map(s => ({
          producto_id:  prod.id,
          sucursal_id:  s.id,
          precio_venta: parseFloat(precios[s.id]),
          costo_total:  parseFloat(costos[s.id] || '0'),
          activo:       true,
        }))
      if (preciosInsert.length > 0) await supabase.from('producto_precios').insert(preciosInsert)

    } else {
      // Actualizar producto
      await supabase.from('productos').update({ nombre: nombreLimpio, categoria, tipo, descripcion, activo }).eq('id', producto.id)

      // Actualizar receta: primero se inserta la nueva y solo si salió bien se borra la anterior
      if (tipo === 'con_receta') {
        const { data: viejas } = await supabase.from('receta_ingredientes').select('id').eq('producto_id', producto.id)
        const { filas } = filasReceta(producto.id)
        if (filas.length) {
          const { error: errR } = await supabase.from('receta_ingredientes').insert(filas)
          if (errR) { setErrorReceta(mensajeReceta(errR.message)); setGuardando(false); return }
        }
        const ids = (viejas || []).map((v: any) => v.id)
        if (ids.length) await supabase.from('receta_ingredientes').delete().in('id', ids)
      }

      // Actualizar precios — upsert
      // "Se vende aquí" apagado = activo:false (no se borra, para conservar el precio)
      for (const s of sucursales) {
        if (!puedeEnSucursal(s.id)) continue              // no se tocan los precios de otras sucursales
        const existe = producto.producto_precios?.some((pp: any) => pp.sucursal_id === s.id)
        const vende  = !!vendeEn[s.id]
        if (!existe && !(vende && precios[s.id])) continue
        if (precios[s.id]) {
          await supabase.from('producto_precios').upsert({
            producto_id:  producto.id,
            sucursal_id:  s.id,
            precio_venta: parseFloat(precios[s.id]),
            costo_total:  parseFloat(costos[s.id] || '0'),
            activo:       vende,
          }, { onConflict: 'producto_id,sucursal_id' })
        } else if (existe && !vende) {
          await supabase.from('producto_precios').update({ activo: false })
            .eq('producto_id', producto.id).eq('sucursal_id', s.id)
        }
      }
    }

    await logActividad({
      tipo:        producto ? 'producto_editado' : 'producto_creado',
      descripcion: `${staff?.nombre} ${staff?.primer_apellido} ${producto ? 'editó' : 'creó'} el producto "${nombreLimpio}"`,
      tabla:       'productos',
      accion:      producto ? 'UPDATE' : 'INSERT',
      metadata:    { 
        producto_id: producto?.id ?? null,
        nombre: nombreLimpio,
        categoria,
        tipo,
      },
      sucursal_id: null,
      staff_id:    staff?.id,
    })

    setGuardando(false)
    onSuccess()
  }

  if (!isOpen) return null

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" />
      <div className="fixed top-0 right-0 z-50 h-full bg-white shadow-2xl flex flex-col" style={{ width: '560px' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-base font-black text-gray-900">
              {esNuevo ? 'Nuevo producto' : `Editar · ${producto.nombre}`}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">{esNuevo ? 'THE GALLEY Smoothie Bar' : producto.categoria}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {[
            { key: 'info',    label: '📋 Info' },
            { key: 'receta',  label: '🧪 Receta', show: tipo === 'con_receta' },
            { key: 'precios', label: '💰 Precios' },
          ].filter(t => t.show !== false).map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key as any)}
              className={`flex-1 py-3 text-xs font-bold border-b-2 transition ${
                activeTab === t.key ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {activeTab === 'info' && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Nombre</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-400"
                  value={nombre} onChange={e => setNombre(e.target.value)}
                  placeholder="Nombre del producto"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Categoría</label>
                  <select
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-400 bg-white"
                    value={categoria} onChange={e => setCategoria(e.target.value)}>
                    {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Tipo</label>
                  <select
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-400 bg-white"
                    value={tipo} onChange={e => setTipo(e.target.value as any)}>
                    <option value="con_receta">Con receta</option>
                    <option value="simple">Simple</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Descripción</label>
                <textarea
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-400 resize-none"
                  rows={3} value={descripcion} onChange={e => setDescripcion(e.target.value)}
                  placeholder="Descripción del producto"
                />
              </div>

              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-gray-900">Producto activo</p>
                  <p className="text-xs text-gray-400">Aparece en el punto de venta</p>
                </div>
                <button onClick={() => setActivo((p: boolean) => !p)}
                  className={`w-10 h-6 rounded-full transition-colors relative ${activo ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${activo ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </>
          )}

          {activeTab === 'receta' && tipo === 'con_receta' && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-black text-gray-900">{receta.length} ingredientes</p>
                <button onClick={agregarIngrediente}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
                  <Plus size={12} /> Agregar
                </button>
              </div>

              <div className="space-y-3">
                {receta.map((r, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-gray-500">Ingrediente {idx + 1}</p>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                          <input type="checkbox" checked={r.es_opcional}
                            onChange={e => actualizarIngrediente(idx, 'es_opcional', e.target.checked)}
                            className="rounded" />
                          Opcional
                        </label>
                        <button onClick={() => { setReceta(prev => prev.filter((_, i) => i !== idx)); setEquivTemp({}) }}
                          className="p-1 hover:bg-red-50 rounded text-red-400">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <select
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 bg-white"
                      value={r.insumo_id}
                      onChange={e => actualizarIngrediente(idx, 'insumo_id', e.target.value)}>
                      <option value="">Seleccionar insumo...</option>
                      {insumos.map(ins => (
                        <option key={ins.id} value={ins.id}>{ins.nombre} ({ins.unidad})</option>
                      ))}
                    </select>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number" placeholder="Cantidad" min="0" step="any"
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400"
                        value={r.cantidad}
                        onChange={e => actualizarIngrediente(idx, 'cantidad', e.target.value)}
                      />
                      <MedidaInput
                        value={r.unidad || ''}
                        onChange={v => actualizarIngrediente(idx, 'unidad', v)}
                        extras={[
                          ...(insumos.find(i => i.id === r.insumo_id)?.unidad ? [insumos.find(i => i.id === r.insumo_id)!.unidad] : []),
                          ...Object.keys(equivalencias).filter(k => k.startsWith(`${r.insumo_id}|`)).map(k => k.split('|')[1]),
                        ]}
                      />
                    </div>
                    {estadoIngrediente(r, idx)}
                  </div>
                ))}
                {receta.length === 0 && (
                  <div className="text-center py-8 text-gray-400 text-sm italic">
                    Sin ingredientes — agrega uno
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'precios' && (
            <div className="space-y-3">
              {sucursales.map(s => (
                <div key={s.id} className={`border border-gray-200 rounded-xl p-4 ${puedeEnSucursal(s.id) ? '' : 'opacity-50'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-black text-gray-900">{s.nombre}</p>
                    {!puedeEnSucursal(s.id) && <span className="text-[10px] font-bold text-gray-400 mr-auto ml-2">Solo lectura · no es tu sucursal</span>}
                    <button type="button" disabled={!puedeEnSucursal(s.id)}
                      onClick={() => setVendeEn(prev => ({ ...prev, [s.id]: !prev[s.id] }))}
                      className="flex items-center gap-2 text-xs font-bold text-gray-500">
                      {vendeEn[s.id] ? 'Se vende aquí' : 'No se vende aquí'}
                      <span className={`w-9 h-5 rounded-full transition-colors relative ${vendeEn[s.id] ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${vendeEn[s.id] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400">Precio venta</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                        <input
                          type="number" min="0" placeholder="0" disabled={!puedeEnSucursal(s.id)}
                          className="w-full pl-7 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400"
                          value={precios[s.id] || ''}
                          onChange={e => {
                            const v = e.target.value
                            setPrecios(prev => ({ ...prev, [s.id]: v }))
                            if (v && vendeEn[s.id] === undefined) setVendeEn(prev => ({ ...prev, [s.id]: true }))
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-400">Costo total</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                        <input
                          type="number" min="0" placeholder="0" disabled={!puedeEnSucursal(s.id)}
                          className="w-full pl-7 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400"
                          value={costos[s.id] || ''}
                          onChange={e => setCostos(prev => ({ ...prev, [s.id]: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                  {precios[s.id] && costos[s.id] && (
                    <p className="text-xs text-gray-400 mt-2">
                      Margen: {(((parseFloat(precios[s.id]) - parseFloat(costos[s.id])) / parseFloat(precios[s.id])) * 100).toFixed(1)}%
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100">
          {errorReceta && <p className="mb-3 text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{errorReceta}</p>}
          <button
            onClick={() => handleGuardar()}
            disabled={!nombre || guardando}
            className="w-full py-3 rounded-xl text-sm font-black text-white disabled:opacity-40 transition"
            style={{ backgroundColor: '#171B24' }}>
            {guardando ? 'Guardando...' : esNuevo ? 'Crear producto' : 'Guardar cambios'}
          </button>
        </div>
      </div>
      <ModalConfirmacion
        isOpen={!!nombreRepetido}
        titulo="Ya existe un producto con ese nombre"
        subtitulo="Puede ser un duplicado"
        mensaje={<>Ya hay un producto llamado <b className="text-gray-900">"{nombreRepetido}"</b>. Si es el mismo, conviene editar el existente en lugar de crear otro.</>}
        textoConfirmar="Guardar de todos modos"
        onClose={() => setNombreRepetido(null)}
        onConfirm={() => { setNombreRepetido(null); handleGuardar(true) }}
      />
    </>
  )
}
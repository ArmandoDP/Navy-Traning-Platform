'use client'
// src/app/dashboard/promociones/page.tsx — promociones y descuentos (solo dirección)
import { useEffect, useMemo, useState } from 'react'
import { Plus, Tag, Search, X, Loader2, Send, Pencil, CheckSquare, Square, Percent, DollarSign, BadgeDollarSign } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL
async function api(path: string, method: 'GET' | 'POST' | 'PUT' = 'GET', body?: any) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${BACKEND}/promociones${path}`, {
    method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || 'No se pudo completar')
  return data
}
const $ = (n: any) => `$${Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`

type Promo = any
const VACIA = { nombre: '', mensaje: '', tipo: 'porcentaje', valor: 10, duracion: 'primera', meses: 3, audiencia: 'todos',
  sucursales: [] as string[], inicia: '', termina: '', usos_maximos: '', activa: true, items: [] as { tipo: string; id: string }[] }

const ESTADO: Record<string, string> = {
  Activa: 'bg-emerald-50 text-emerald-700', Programada: 'bg-blue-50 text-blue-700', Terminada: 'bg-gray-100 text-gray-500',
  Agotada: 'bg-amber-50 text-amber-700', Apagada: 'bg-gray-100 text-gray-400',
}

function precioCon(p: any, base: number) {
  const v = Number(p.valor || 0)
  const f = p.tipo === 'porcentaje' ? base * (1 - v / 100) : p.tipo === 'monto' ? base - v : v
  return Math.max(0, Math.min(base, Math.round(f * 100) / 100))
}
function textoDuracion(p: any) {
  return p.duracion === 'siempre' ? 'Para siempre (mientras mantenga su plan)'
    : p.duracion === 'meses' ? `Los primeros ${p.meses} meses; después paga normal`
    : 'Solo el primer pago; después paga normal'
}
function textoDescuento(p: any) {
  return p.tipo === 'porcentaje' ? `${p.valor}% de descuento` : p.tipo === 'monto' ? `${$(p.valor)} menos` : `Precio especial de ${$(p.valor)}`
}

export default function PromocionesPage() {
  const [promos, setPromos] = useState<Promo[]>([])
  const [catalogo, setCatalogo] = useState<any>({ paquetes: [], productos: [], sucursales: [] })
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [editando, setEditando] = useState<any>(null)
  const [notificando, setNotificando] = useState<Promo | null>(null)

  const cargar = async () => {
    try {
      const [a, b] = await Promise.all([api(''), api('/catalogo')])
      setPromos(a.promociones || []); setCatalogo(b); setError('')
    } catch (e: any) { setError(e.message) }
    setCargando(false)
  }
  useEffect(() => { cargar() }, [])

  const nombreSuc = (id: string) => catalogo.sucursales.find((s: any) => s.id === id)?.nombre || '—'
  const prender = async (p: Promo) => { await api(`/${p.id}/activa`, 'POST', { activa: !p.activa }); cargar() }

  if (cargando) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-gray-400" /></div>
  if (error) return <div className="p-10 text-sm text-red-600">{error}</div>

  return (
    <div className="p-4 xl:p-6 space-y-5 max-w-6xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-2"><Tag size={20} /> Promociones</h1>
          <p className="text-xs text-gray-500 mt-1">Se aplican solas en la app, en los cobros de recepción, en los links de pago y en The Galley. Si a alguien le tocan dos, se queda con la mejor.</p>
        </div>
        <button onClick={() => setEditando({ ...VACIA })}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-700">
          <Plus size={16} /> Nueva promoción
        </button>
      </div>

      {promos.length === 0 && (
        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center text-sm text-gray-400">
          Todavía no hay promociones. Crea la primera con "Nueva promoción".
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        {promos.map(p => (
          <div key={p.id} className="bg-white border border-gray-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-black text-gray-900 truncate">{p.nombre}</p>
                {p.mensaje && <p className="text-xs text-gray-500 truncate">Lo que ve el cliente: “{p.mensaje}”</p>}
              </div>
              <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${ESTADO[p.estado] || ''}`}>{p.estado}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              <span className="px-2 py-0.5 rounded-md bg-gray-900 text-white font-bold">{textoDescuento(p)}</span>
              <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">{textoDuracion(p)}</span>
              <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                {p.audiencia === 'todos' ? 'Todos los clientes' : p.audiencia === 'nuevos' ? 'Solo clientes nuevos' : 'Solo staff y coaches'}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                {p.sucursales?.length ? p.sucursales.map(nombreSuc).join(', ') : 'Todas las sucursales'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center bg-gray-50 rounded-xl p-2">
              <div><p className="font-black text-gray-900">{p.items.length}</p><p className="text-[10px] text-gray-500">artículos</p></div>
              <div><p className="font-black text-gray-900">{p.usos}{p.usos_maximos ? `/${p.usos_maximos}` : ''}</p><p className="text-[10px] text-gray-500">ventas</p></div>
              <div><p className="font-black text-gray-900">{$(p.vendido)}</p><p className="text-[10px] text-gray-500">vendido ({$(p.descontado)} desc.)</p></div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => prender(p)}
                className={`relative w-10 h-6 rounded-full transition ${p.activa ? 'bg-emerald-500' : 'bg-gray-300'}`} title={p.activa ? 'Apagar' : 'Prender'}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition ${p.activa ? 'left-[18px]' : 'left-0.5'}`} />
              </button>
              <span className="text-xs text-gray-500 flex-1">{p.activa ? 'Prendida' : 'Apagada'}</span>
              <button onClick={() => setNotificando(p)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50">
                <Send size={12} /> Avisar
              </button>
              <button onClick={() => setEditando({ ...p, inicia: p.inicia?.slice(0, 16) || '', termina: p.termina?.slice(0, 16) || '', usos_maximos: p.usos_maximos || '', sucursales: p.sucursales || [] })}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50">
                <Pencil size={12} /> Editar
              </button>
            </div>
          </div>
        ))}
      </div>

      {editando && <Editor inicial={editando} catalogo={catalogo} onClose={() => setEditando(null)} onGuardado={() => { setEditando(null); cargar() }} />}
      {notificando && <Avisar promo={notificando} catalogo={catalogo} onClose={() => setNotificando(null)} />}
    </div>
  )
}

// ── Editor ────────────────────────────────────────────────────────────────────
function Editor({ inicial, catalogo, onClose, onGuardado }: any) {
  const [p, setP] = useState<any>(inicial)
  const [pestana, setPestana] = useState<'paquete' | 'producto'>('paquete')
  const [buscar, setBuscar] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const set = (k: string, v: any) => setP((x: any) => ({ ...x, [k]: v }))
  const sucRef = p.sucursales?.[0] || catalogo.sucursales[0]?.id

  const precioDe = (it: any, tipo: string) => tipo === 'paquete' ? Number(it.precios?.[sucRef] || Object.values(it.precios || {})[0] || it.precio || 0) : Number(it.precio || 0)
  const lista = useMemo(() => {
    const base = pestana === 'paquete' ? catalogo.paquetes : catalogo.productos
    const q = buscar.trim().toLowerCase()
    return base.filter((it: any) => !q || (it.nombre || '').toLowerCase().includes(q))
  }, [pestana, buscar, catalogo])
  const elegido = (tipo: string, id: string) => p.items.some((i: any) => i.tipo === tipo && i.id === id)
  const alternar = (tipo: string, id: string) =>
    set('items', elegido(tipo, id) ? p.items.filter((i: any) => !(i.tipo === tipo && i.id === id)) : [...p.items, { tipo, id }])
  const todosElegidos = lista.length > 0 && lista.every((it: any) => elegido(pestana, it.id))
  const elegirTodos = () => {
    const ids = new Set(lista.map((it: any) => it.id))
    set('items', todosElegidos ? p.items.filter((i: any) => !(i.tipo === pestana && ids.has(i.id)))
      : [...p.items.filter((i: any) => !(i.tipo === pestana && ids.has(i.id))), ...lista.map((it: any) => ({ tipo: pestana, id: it.id }))])
  }
  const ejemplo = p.items[0] && ((p.items[0].tipo === 'paquete' ? catalogo.paquetes : catalogo.productos).find((x: any) => x.id === p.items[0].id))

  const guardar = async () => {
    setGuardando(true); setError('')
    try {
      const body = { ...p, valor: Number(p.valor), meses: Number(p.meses) || null, usos_maximos: Number(p.usos_maximos) || null,
        inicia: p.inicia ? new Date(p.inicia).toISOString() : null, termina: p.termina ? new Date(p.termina).toISOString() : null }
      if (!p.items.length) throw new Error('Elige al menos un paquete o producto')
      p.id ? await api(`/${p.id}`, 'PUT', body) : await api('', 'POST', body)
      onGuardado()
    } catch (e: any) { setError(e.message) }
    setGuardando(false)
  }

  const Opcion = ({ k, v, children }: any) => (
    <button onClick={() => set(k, v)} className={`flex-1 px-3 py-2 rounded-xl border text-xs font-bold transition ${p[k] === v ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>{children}</button>
  )

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div className="w-full max-w-2xl h-full bg-white overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
          <p className="font-black text-gray-900">{p.id ? 'Editar promoción' : 'Nueva promoción'}</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-xs font-bold text-gray-600">Nombre (interno)
              <input value={p.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Unlimited Juriquilla noviembre"
                className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-normal outline-none focus:border-gray-400" />
            </label>
            <label className="text-xs font-bold text-gray-600">Lo que ve el cliente
              <input value={p.mensaje || ''} onChange={e => set('mensaje', e.target.value)} placeholder="Precio especial de lanzamiento"
                className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-normal outline-none focus:border-gray-400" />
            </label>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-600 mb-1.5">Tipo de descuento</p>
            <div className="flex gap-2">
              <Opcion k="tipo" v="porcentaje"><Percent size={12} className="inline mr-1" />Porcentaje</Opcion>
              <Opcion k="tipo" v="monto"><DollarSign size={12} className="inline mr-1" />Monto fijo</Opcion>
              <Opcion k="tipo" v="precio_especial"><BadgeDollarSign size={12} className="inline mr-1" />Precio especial</Opcion>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input type="number" min={0} value={p.valor} onChange={e => set('valor', e.target.value)}
                className="w-32 px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-400" />
              <span className="text-xs text-gray-500">{p.tipo === 'porcentaje' ? '% de descuento' : p.tipo === 'monto' ? 'pesos menos' : 'pesos: el precio final'}</span>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-600 mb-1.5">¿Cuánto dura el descuento? <span className="font-normal text-gray-400">(en planes que se renuevan)</span></p>
            <div className="flex gap-2">
              <Opcion k="duracion" v="primera">Solo el primer pago</Opcion>
              <Opcion k="duracion" v="meses">Los primeros meses</Opcion>
              <Opcion k="duracion" v="siempre">Para siempre</Opcion>
            </div>
            {p.duracion === 'meses' && (
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                Los primeros <input type="number" min={1} max={36} value={p.meses} onChange={e => set('meses', e.target.value)}
                  className="w-16 px-2 py-1.5 border border-gray-200 rounded-lg text-sm" /> meses; después paga el precio normal.
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-bold text-gray-600 mb-1.5">¿Para quién?</p>
            <div className="flex gap-2">
              <Opcion k="audiencia" v="todos">Todos</Opcion>
              <Opcion k="audiencia" v="nuevos">Solo clientes nuevos</Opcion>
              <Opcion k="audiencia" v="staff">Staff y coaches</Opcion>
            </div>
            {p.audiencia === 'staff' && <p className="text-[11px] text-gray-400 mt-1">Aplica a los clientes marcados como "Es staff" en su ficha.</p>}
          </div>

          <div>
            <p className="text-xs font-bold text-gray-600 mb-1.5">Sucursales <span className="font-normal text-gray-400">(sin elegir = todas)</span></p>
            <div className="flex flex-wrap gap-1.5">
              {catalogo.sucursales.map((s: any) => {
                const on = p.sucursales.includes(s.id)
                return <button key={s.id} onClick={() => set('sucursales', on ? p.sucursales.filter((x: string) => x !== s.id) : [...p.sucursales, s.id])}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border ${on ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}>{s.nombre}</button>
              })}
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <label className="text-xs font-bold text-gray-600">Empieza <span className="font-normal text-gray-400">(opcional)</span>
              <input type="datetime-local" value={p.inicia} onChange={e => set('inicia', e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-normal" />
            </label>
            <label className="text-xs font-bold text-gray-600">Termina <span className="font-normal text-gray-400">(opcional)</span>
              <input type="datetime-local" value={p.termina} onChange={e => set('termina', e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-normal" />
            </label>
            <label className="text-xs font-bold text-gray-600">Límite de ventas <span className="font-normal text-gray-400">(opcional)</span>
              <input type="number" min={1} value={p.usos_maximos} onChange={e => set('usos_maximos', e.target.value)} placeholder="Sin límite" className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-xl text-sm font-normal" />
            </label>
          </div>

          {/* Artículos */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden">
            <div className="flex border-b border-gray-200">
              {(['paquete', 'producto'] as const).map(t => (
                <button key={t} onClick={() => setPestana(t)} className={`flex-1 py-2.5 text-xs font-bold ${pestana === t ? 'bg-gray-900 text-white' : 'text-gray-600'}`}>
                  {t === 'paquete' ? 'Paquetes y clases' : 'Productos de The Galley'} ({p.items.filter((i: any) => i.tipo === t).length})
                </button>
              ))}
            </div>
            <div className="p-3 flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="Buscar…" className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-sm outline-none" />
              </div>
              <button onClick={elegirTodos} className="flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 whitespace-nowrap">
                {todosElegidos ? <CheckSquare size={13} /> : <Square size={13} />} {todosElegidos ? 'Quitar todos' : 'Seleccionar todos'}
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
              {lista.length === 0 && <p className="p-4 text-xs text-gray-400 text-center">Nada que mostrar</p>}
              {lista.map((it: any) => {
                const on = elegido(pestana, it.id), base = precioDe(it, pestana)
                return (
                  <button key={it.id} onClick={() => alternar(pestana, it.id)} className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 ${on ? 'bg-emerald-50/50' : ''}`}>
                    {on ? <CheckSquare size={16} className="text-gray-900 shrink-0" /> : <Square size={16} className="text-gray-300 shrink-0" />}
                    <span className="flex-1 text-sm text-gray-800 truncate">{it.nombre}{it.es_recurrente && <span className="ml-1 text-[10px] text-gray-400">· se renueva</span>}</span>
                    {base > 0 && (on
                      ? <span className="text-xs whitespace-nowrap"><s className="text-gray-400 mr-1">{$(base)}</s><b className="text-emerald-700">{$(precioCon(p, base))}</b></span>
                      : <span className="text-xs text-gray-400 whitespace-nowrap">{$(base)}</span>)}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Vista previa */}
          {ejemplo && (
            <div className="rounded-2xl bg-gray-900 text-white p-4">
              <p className="text-[10px] font-bold tracking-widest text-gray-400">ASÍ LO VE EL CLIENTE</p>
              <p className="font-black mt-1">{ejemplo.nombre}</p>
              {(() => { const base = precioDe(ejemplo, p.items[0].tipo), fin = precioCon(p, base); return (
                <>
                  <p className="mt-1"><s className="text-gray-400 mr-2">{$(base)}</s><span className="text-2xl font-black">{$(fin)}</span></p>
                  <p className="text-xs text-gray-300 mt-1">{p.mensaje || 'Precio especial'}{ejemplo.es_recurrente && p.duracion !== 'siempre'
                    ? ` · ${p.duracion === 'meses' ? `los primeros ${p.meses} meses` : 'el primer mes'}; después ${$(base)}` : ''}</p>
                </>
              ) })()}
            </div>
          )}

          {error && <p className="text-xs text-red-600 bg-red-50 rounded-xl p-3 font-medium">{error}</p>}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 flex gap-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-700">Cancelar</button>
          <button onClick={guardar} disabled={guardando} className="flex-1 py-3 rounded-xl bg-gray-900 text-white text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
            {guardando && <Loader2 size={14} className="animate-spin" />} Guardar promoción
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Avisar a los clientes ─────────────────────────────────────────────────────
function Avisar({ promo, catalogo, onClose }: any) {
  const item = promo.items[0] && ((promo.items[0].tipo === 'paquete' ? catalogo.paquetes : catalogo.productos).find((x: any) => x.id === promo.items[0].id))
  const suc = promo.sucursales?.length === 1 ? catalogo.sucursales.find((s: any) => s.id === promo.sucursales[0])?.nombre : ''
  const base = item ? Number(promo.items[0].tipo === 'paquete' ? (item.precios?.[promo.sucursales?.[0]] || Object.values(item.precios || {})[0] || item.precio) : item.precio) : 0
  const [titulo, setTitulo] = useState(item ? `Precio especial en ${item.nombre}${suc ? ` ${suc}` : ''}` : 'Precio especial en Navy')
  const [texto, setTexto] = useState(item && base ? `De ${$(base)} a ${$(precioCon(promo, base))}. ${promo.mensaje || 'Aprovéchalo desde la app.'}` : (promo.mensaje || ''))
  const [estado, setEstado] = useState<'' | 'enviando' | string>('')

  const enviar = async () => {
    setEstado('enviando')
    try { const r = await api(`/${promo.id}/notificar`, 'POST', { titulo, texto }); setEstado(`Enviada a ${r.enviados} clientes`) }
    catch (e: any) { setEstado(e.message) }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl p-5 space-y-3" onClick={e => e.stopPropagation()}>
        <p className="font-black text-gray-900">Avisar a los clientes</p>
        <p className="text-xs text-gray-500">Se manda una notificación a los clientes con app de {promo.sucursales?.length ? 'las sucursales de la promoción' : 'todas las sucursales'}
          {promo.audiencia === 'nuevos' ? ' que nunca han comprado' : promo.audiencia === 'staff' ? ' marcados como staff' : ''}.</p>
        <input value={titulo} onChange={e => setTitulo(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-bold" />
        <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={3} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
        {estado && estado !== 'enviando' && <p className="text-xs font-bold text-gray-700">{estado}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-700">Cerrar</button>
          <button onClick={enviar} disabled={estado === 'enviando'} className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
            {estado === 'enviando' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Enviar
          </button>
        </div>
      </div>
    </div>
  )
}
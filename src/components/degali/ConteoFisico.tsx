'use client'
// Conteo físico semanal del inventario de The Galley (todos los jueves).
// El conteo compara lo que hay en el estante contra lo que dice el sistema, guarda las diferencias
// y, si se quiere, ajusta el inventario al resultado.
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { RefreshCw, ClipboardCheck, AlertTriangle, CheckCircle2, ChevronDown } from 'lucide-react'
import { logActividad } from '@/lib/log-actividad'
import { useAuth } from '@/context/AuthContext'
import { useSucursal } from '@/context/SucursalContext'
import { DIA_CONTEO, hoyCDMX, aFecha, juevesDelCiclo } from '@/lib/galley'

interface Props { sucursalId: string | null }

const fechaLarga = (f: string) => aFecha(f.slice(0, 10)).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })

const redondear = (n: number) => Math.round(n * 10000) / 10000

export default function ConteoFisico({ sucursalId }: Props) {
  const { staff, puedeEditar } = useAuth()
  const { sucursales, puedeGlobal } = useSucursal()
  const puede = puedeEditar('galley') && (puedeGlobal || sucursales.some(s => s.id === sucursalId))

  const [conteos,   setConteos]   = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)
  const [sinTablas, setSinTablas] = useState(false)
  const [items,     setItems]     = useState<any[] | null>(null)     // null = no hay conteo en curso
  const [notas,     setNotas]     = useState('')
  const [ajustar,   setAjustar]   = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error,     setError]     = useState('')
  const [abierto,   setAbierto]   = useState<string | null>(null)
  const [detalle,   setDetalle]   = useState<Record<string, any[]>>({})

  const hoy = hoyCDMX()
  const jueves = juevesDelCiclo(hoy)
  const esJueves = aFecha(hoy).getDay() === DIA_CONTEO
  const conteoDeLaSemana = conteos.find(c => c.semana === jueves)

  useEffect(() => { if (sucursalId) { setItems(null); cargar() } }, [sucursalId])

  const cargar = async () => {
    setLoading(true)
    const { data, error: err } = await supabase.from('conteos_inventario').select('*')
      .eq('sucursal_id', sucursalId).order('created_at', { ascending: false }).limit(12)
    if (err) {
      setSinTablas(/does not exist|schema cache|42P01/i.test(err.message) || err.code === '42P01')
      setConteos([]); setLoading(false); return
    }
    setSinTablas(false)
    const lista = data || []
    const ids = [...new Set(lista.map(c => c.realizado_por).filter(Boolean))]
    const { data: st } = ids.length ? await supabase.from('staff').select('id, nombre, primer_apellido').in('id', ids) : { data: [] as any[] }
    const nombres = new Map((st || []).map((s: any) => [s.id, `${s.nombre} ${s.primer_apellido || ''}`.trim()]))
    setConteos(lista.map(c => ({ ...c, quien: nombres.get(c.realizado_por) })))
    setLoading(false)
  }

  const iniciar = async () => {
    setError('')
    const { data, error: err } = await supabase.from('inventario_insumos')
      .select('id, insumo_id, stock_actual, insumos(nombre, unidad, categoria)')
      .eq('sucursal_id', sucursalId)
    if (err || !data) { setError('No se pudo leer el inventario'); return }
    const ordenados = [...data].sort((a: any, b: any) =>
      `${a.insumos?.categoria || ''} ${a.insumos?.nombre || ''}`.localeCompare(`${b.insumos?.categoria || ''} ${b.insumos?.nombre || ''}`))
    setItems(ordenados.map((i: any) => ({
      inv_id: i.id, insumo_id: i.insumo_id, nombre: i.insumos?.nombre, unidad: i.insumos?.unidad,
      categoria: i.insumos?.categoria, stock_sistema: Number(i.stock_actual) || 0, contado: '',
    })))
    setNotas(''); setAjustar(true)
  }

  const contados = (items || []).filter(i => i.contado !== '').length
  const total    = (items || []).length
  const difDe = (i: any) => redondear(Number(i.contado) - i.stock_sistema)
  const conDiferencia = (items || []).filter(i => i.contado !== '' && difDe(i) !== 0).length

  const cambiar = (idx: number, valor: string) =>
    setItems(prev => (prev || []).map((it, k) => k === idx ? { ...it, contado: valor } : it))

  const guardar = async () => {
    if (!items || !sucursalId || contados < total) return
    setGuardando(true); setError('')

    const { data: conteo, error: errC } = await supabase.from('conteos_inventario').insert({
      sucursal_id: sucursalId, semana: jueves, realizado_por: staff?.id || null,
      total_insumos: total, con_diferencia: conDiferencia, ajuste_aplicado: ajustar, notas: notas.trim() || null,
    }).select().single()
    if (errC || !conteo) { setError('No se pudo guardar el conteo: ' + (errC?.message || '')); setGuardando(false); return }

    const { error: errI } = await supabase.from('conteo_inventario_items').insert(items.map(i => ({
      conteo_id: conteo.id, insumo_id: i.insumo_id, stock_sistema: i.stock_sistema,
      stock_contado: Number(i.contado), diferencia: difDe(i),
    })))
    if (errI) {
      await supabase.from('conteos_inventario').delete().eq('id', conteo.id)
      setError('No se pudo guardar el detalle del conteo: ' + errI.message); setGuardando(false); return
    }

    if (ajustar) {
      const ahora = new Date().toISOString()
      for (const i of items.filter(x => difDe(x) !== 0)) {
        await supabase.from('inventario_insumos').update({ stock_actual: Number(i.contado), updated_at: ahora }).eq('id', i.inv_id)
      }
    }

    await logActividad({
      tipo: 'conteo_inventario',
      descripcion: `${staff?.nombre} ${staff?.primer_apellido} registró el conteo físico: ${total} insumos, ${conDiferencia} con diferencia${ajustar ? ' (inventario ajustado)' : ''}`,
      tabla: 'conteos_inventario', accion: 'INSERT',
      metadata: { conteo_id: conteo.id, total, con_diferencia: conDiferencia, ajuste_aplicado: ajustar },
      sucursal_id: sucursalId, staff_id: staff?.id,
    })
    setItems(null); setGuardando(false)
    cargar()
  }

  const abrir = async (c: any) => {
    setAbierto(abierto === c.id ? null : c.id)
    if (detalle[c.id]) return
    const { data } = await supabase.from('conteo_inventario_items').select('*').eq('conteo_id', c.id)
    const ids = [...new Set((data || []).map((x: any) => x.insumo_id))]
    const { data: ins } = ids.length ? await supabase.from('insumos').select('id, nombre, unidad').in('id', ids) : { data: [] as any[] }
    const por = new Map((ins || []).map((i: any) => [i.id, i]))
    setDetalle(prev => ({ ...prev, [c.id]: (data || []).map((x: any) => ({ ...x, insumo: por.get(x.insumo_id) })) }))
  }

  // ── Estado del ciclo de esta semana ──
  const estado = conteoDeLaSemana
    ? { tono: 'ok',   texto: `Conteo de esta semana hecho el ${fechaLarga(conteoDeLaSemana.created_at)}` }
    : esJueves
      ? { tono: 'hoy',  texto: 'Hoy toca el conteo físico del inventario' }
      : { tono: 'tarde', texto: `Conteo pendiente: tocaba el ${fechaLarga(jueves)}` }

  const estilos: Record<string, string> = {
    ok:    'bg-emerald-50 border-emerald-200 text-emerald-700',
    hoy:   'bg-indigo-50 border-indigo-200 text-indigo-700',
    tarde: 'bg-amber-50 border-amber-200 text-amber-700',
  }

  if (sinTablas) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-sm text-amber-800">
        <p className="font-black mb-1">Falta preparar la base de datos para el conteo físico</p>
        <p>Avisa a sistemas: hay que correr el script <code>the_galley_merma_conteo.sql</code> en Supabase.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Estado de la semana */}
      {!loading && (
        <div className={`flex items-center justify-between gap-3 border rounded-xl px-4 py-3 ${estilos[estado.tono]}`}>
          <div className="flex items-center gap-3">
            {estado.tono === 'ok' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <p className="text-sm font-bold">{estado.texto}</p>
          </div>
          {puede && items === null && (
            <button onClick={iniciar}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition flex-shrink-0"
              style={{ backgroundColor: '#171B24' }}>
              <ClipboardCheck size={14} /> {conteoDeLaSemana ? 'Hacer otro conteo' : 'Iniciar conteo'}
            </button>
          )}
        </div>
      )}

      {error && <p className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

      {/* Conteo en curso */}
      {items !== null && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h3 className="text-base font-black text-gray-900">Conteo físico</h3>
              <p className="text-xs text-gray-400 mt-0.5">Escribe lo que hay realmente en el estante. Llevas {contados} de {total}
                {conDiferencia > 0 && <> · <b className="text-amber-600">{conDiferencia} con diferencia</b></>}</p>
            </div>
            <button onClick={() => setItems(null)} disabled={guardando}
              className="px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 text-gray-600 hover:bg-gray-50 transition">Cancelar</button>
          </div>

          {total === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">Esta sucursal no tiene insumos en su inventario.</div>
          ) : (
            <table className="w-full text-left">
              <thead className="text-gray-400 text-[11px] font-bold uppercase border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="px-5 py-3">Insumo</th>
                  <th className="px-5 py-3">Categoría</th>
                  <th className="px-5 py-3 text-right">Sistema</th>
                  <th className="px-5 py-3 text-right w-36">Contado</th>
                  <th className="px-5 py-3 text-right">Diferencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((i, idx) => {
                  const dif = i.contado === '' ? null : difDe(i)
                  return (
                    <tr key={i.inv_id} className={dif ? 'bg-amber-50/40' : ''}>
                      <td className="px-5 py-2.5 text-sm font-bold text-gray-900">{i.nombre}</td>
                      <td className="px-5 py-2.5 text-xs text-gray-400">{i.categoria}</td>
                      <td className="px-5 py-2.5 text-right text-sm text-gray-500">{i.stock_sistema} <span className="text-xs text-gray-300">{i.unidad}</span></td>
                      <td className="px-5 py-2.5 text-right">
                        <input type="number" min="0" step="any" inputMode="decimal" value={i.contado}
                          onChange={e => cambiar(idx, e.target.value)} placeholder="—"
                          className="w-28 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-right outline-none focus:border-gray-400" />
                      </td>
                      <td className={`px-5 py-2.5 text-right text-sm font-black ${dif === null ? 'text-gray-300' : dif === 0 ? 'text-emerald-600' : dif < 0 ? 'text-red-500' : 'text-blue-500'}`}>
                        {dif === null ? '—' : dif === 0 ? 'OK' : `${dif > 0 ? '+' : ''}${dif}`}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          <div className="px-5 py-4 border-t border-gray-100 space-y-3">
            <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} placeholder="Notas del conteo (opcional)"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gray-400 resize-none" />
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={ajustar} onChange={e => setAjustar(e.target.checked)} />
              Ajustar el inventario del sistema a lo contado
            </label>
            <button onClick={guardar} disabled={guardando || contados < total || total === 0}
              className="w-full py-3 rounded-xl text-sm font-black text-white transition disabled:opacity-40"
              style={{ backgroundColor: '#171B24' }}>
              {guardando ? 'Guardando…' : contados < total ? `Faltan ${total - contados} por contar` : 'Guardar conteo'}
            </button>
          </div>
        </div>
      )}

      {/* Historial */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <p className="text-sm font-black text-gray-900">Conteos anteriores</p>
          <button onClick={cargar} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><RefreshCw size={14} /></button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-24 text-gray-400 gap-2"><RefreshCw size={14} className="animate-spin" /> Cargando...</div>
        ) : conteos.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-gray-400 text-sm">Todavía no hay conteos en esta sucursal</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {conteos.map(c => (
              <div key={c.id}>
                <button onClick={() => abrir(c)} className="w-full flex items-center justify-between gap-3 px-5 py-3 text-left hover:bg-gray-50 transition">
                  <div>
                    <p className="text-sm font-bold text-gray-900 capitalize">{fechaLarga(c.created_at)}</p>
                    <p className="text-xs text-gray-400">{c.quien || '—'} · {c.total_insumos} insumos{c.ajuste_aplicado ? ' · inventario ajustado' : ''}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.con_diferencia ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {c.con_diferencia ? `${c.con_diferencia} con diferencia` : 'Sin diferencias'}
                    </span>
                    <ChevronDown size={14} className={`text-gray-400 transition ${abierto === c.id ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                {abierto === c.id && (
                  <div className="px-5 pb-4 bg-gray-50/50">
                    {c.notas && <p className="text-xs text-gray-500 italic mb-2">“{c.notas}”</p>}
                    {(detalle[c.id] || []).filter(x => Number(x.diferencia) !== 0).length === 0 ? (
                      <p className="text-xs text-gray-400">{detalle[c.id] ? 'Todo coincidió con el sistema.' : 'Cargando…'}</p>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead className="text-gray-400 font-bold uppercase"><tr><th className="py-1">Insumo</th><th className="py-1 text-right">Sistema</th><th className="py-1 text-right">Contado</th><th className="py-1 text-right">Diferencia</th></tr></thead>
                        <tbody>
                          {(detalle[c.id] || []).filter(x => Number(x.diferencia) !== 0).map(x => (
                            <tr key={x.id} className="border-t border-gray-100">
                              <td className="py-1.5 font-bold text-gray-700">{x.insumo?.nombre || '—'}</td>
                              <td className="py-1.5 text-right text-gray-500">{x.stock_sistema}</td>
                              <td className="py-1.5 text-right text-gray-500">{x.stock_contado}</td>
                              <td className={`py-1.5 text-right font-black ${Number(x.diferencia) < 0 ? 'text-red-500' : 'text-blue-500'}`}>{Number(x.diferencia) > 0 ? '+' : ''}{x.diferencia}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

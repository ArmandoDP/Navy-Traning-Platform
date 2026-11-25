'use client'
// Vista "Global" de The Galley (solo Dirección): un resumen por sucursal.
// Para operar (vender, contar, editar inventario) se elige una sucursal; aquí solo se compara y se entra a cada una.
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useSucursal } from '@/context/SucursalContext'
import { RefreshCw, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react'
import { hoyCDMX, juevesDelCiclo, traerTodo } from '@/lib/galley'

interface Resumen {
  ventas7:    number
  total7:     number
  bajoMinimo: number
  insumos:    number
  conteo:     'hecho' | 'pendiente' | 'sin_dato'
  merma30:    number
  productos:  number
}

const vacio = (): Resumen => ({ ventas7: 0, total7: 0, bajoMinimo: 0, insumos: 0, conteo: 'sin_dato', merma30: 0, productos: 0 })
const pesos = (n: number) => `$${Math.round(n).toLocaleString('es-MX')}`

export default function GalleyGlobal() {
  const { sucursales, setSucursalActiva } = useSucursal()
  const [datos,   setDatos]   = useState<Record<string, Resumen>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (sucursales.length) cargar() }, [sucursales.length])

  const cargar = async () => {
    setLoading(true)
    const hoy    = hoyCDMX()
    const jueves = juevesDelCiclo(hoy)
    const hace7  = new Date(Date.now() - 7 * 86400000).toISOString()
    const hace30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

    const [ventas, inventario, merma, precios, conteos] = await Promise.all([
      traerTodo((a, b) => supabase.from('ventas').select('sucursal_id, total, estatus').gte('created_at', hace7).range(a, b)),
      traerTodo((a, b) => supabase.from('inventario_insumos').select('sucursal_id, stock_actual, stock_minimo').range(a, b)),
      traerTodo((a, b) => supabase.from('merma').select('sucursal_id').gte('fecha', hace30).range(a, b)),
      traerTodo((a, b) => supabase.from('producto_precios').select('sucursal_id, precio_venta, activo').range(a, b)),
      supabase.from('conteos_inventario').select('sucursal_id').eq('semana', jueves),   // puede no existir si falta el SQL
    ])

    const r: Record<string, Resumen> = {}
    sucursales.forEach(s => { r[s.id] = vacio() })
    ventas.forEach((v: any) => {
      if (!r[v.sucursal_id] || v.estatus === 'Cancelada') return
      r[v.sucursal_id].ventas7++; r[v.sucursal_id].total7 += Number(v.total) || 0
    })
    inventario.forEach((i: any) => {
      if (!r[i.sucursal_id]) return
      r[i.sucursal_id].insumos++
      if (Number(i.stock_actual) <= Number(i.stock_minimo)) r[i.sucursal_id].bajoMinimo++
    })
    merma.forEach((m: any) => { if (r[m.sucursal_id]) r[m.sucursal_id].merma30++ })
    precios.forEach((p: any) => {
      if (r[p.sucursal_id] && p.activo !== false && Number(p.precio_venta) > 0) r[p.sucursal_id].productos++
    })
    const hechos = new Set((conteos.data || []).map((c: any) => c.sucursal_id))
    sucursales.forEach(s => {
      r[s.id].conteo = conteos.error ? 'sin_dato' : hechos.has(s.id) ? 'hecho' : 'pendiente'
    })
    setDatos(r)
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Resumen de todas las sucursales. Para vender, contar o editar el inventario, abre una sucursal (o elígela en el selector de arriba).
        </p>
        <button onClick={cargar} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><RefreshCw size={14} /></button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400 gap-2"><RefreshCw size={14} className="animate-spin" /> Cargando...</div>
        ) : (
          <table className="w-full text-left">
            <thead className="text-gray-400 text-[11px] font-bold uppercase border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-5 py-3">Sucursal</th>
                <th className="px-5 py-3 text-right">Ventas · 7 días</th>
                <th className="px-5 py-3 text-right">Productos que vende</th>
                <th className="px-5 py-3 text-right">Bajo el mínimo</th>
                <th className="px-5 py-3 text-center">Conteo de la semana</th>
                <th className="px-5 py-3 text-right">Merma · 30 días</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sucursales.map(s => {
                const d = datos[s.id] || vacio()
                return (
                  <tr key={s.id} className="hover:bg-gray-50 transition cursor-pointer" onClick={() => setSucursalActiva(s)}>
                    <td className="px-5 py-3.5 text-sm font-black text-gray-900">{s.nombre}</td>
                    <td className="px-5 py-3.5 text-right text-sm">
                      {d.ventas7 ? <><span className="font-black text-gray-900">{pesos(d.total7)}</span> <span className="text-xs text-gray-400">· {d.ventas7}</span></> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right text-sm font-bold">
                      {d.productos ? <span className="text-gray-700">{d.productos}</span> : <span className="text-amber-600 text-xs">Sin menú</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right text-sm font-bold">
                      {d.bajoMinimo
                        ? <span className="inline-flex items-center gap-1 text-amber-600"><AlertTriangle size={12} /> {d.bajoMinimo}</span>
                        : d.insumos ? <span className="text-gray-300">0</span> : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {d.conteo === 'hecho'
                        ? <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600"><CheckCircle2 size={13} /> Hecho</span>
                        : d.conteo === 'pendiente'
                          ? <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">Pendiente</span>
                          : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right text-sm text-gray-500">{d.merma30 || <span className="text-gray-300">0</span>}</td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-500">Abrir <ArrowRight size={12} /></span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

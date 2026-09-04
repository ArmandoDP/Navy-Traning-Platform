'use client'
import { useState, useEffect } from 'react'
import { supabase }            from '@/lib/supabase'
import { useSucursal }         from '@/context/SucursalContext'
import { Plus, Search, User, Calendar, MapPin, Mail } from 'lucide-react'
import DrawerClaseMuestra from '@/components/clases-muestra/DrawerClaseMuestra'

export default function ClasesMuestraPage() {
  const { sucursalId } = useSucursal()
  const [prospectos,  setProspectos]  = useState<any[]>([])
  const [loading,     setLoading]     = useState(true)
  const [busqueda,    setBusqueda]    = useState('')
  const [drawerOpen,  setDrawerOpen]  = useState(false)

  const fetchProspectos = async () => {
    setLoading(true)
    let q = supabase
      .from('clientes')
      .select(`
        *,
        reservas!inner(
          id, estatus, es_clase_muestra,
          clases(nombre_clase, horario, sucursales(nombre))
        )
      `)
      .eq('origen', 'Clase Muestra')
      .eq('reservas.es_clase_muestra', true)
      .order('created_at', { ascending: false })

    if (sucursalId) {
      q = q.eq('sucursal_id', sucursalId)
    }

    const { data } = await q
    setProspectos(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchProspectos() }, [sucursalId])

  const filtrados = prospectos.filter(p =>
    p.nombre_completo?.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.email?.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Clases Muestra</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Registra prospectos para una clase de muestra gratuita
          </p>
        </div>
        <button onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-700 transition">
          <Plus size={15}/> Nueva clase muestra
        </button>
      </div>

      {/* Buscador */}
      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 w-72">
        <Search size={14} className="text-gray-400"/>
        <input placeholder="Buscar prospecto..."
          value={busqueda} onChange={e => setBusqueda(e.target.value)}
          className="bg-transparent text-sm text-gray-600 outline-none w-full placeholder:text-gray-400" />
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-20 text-gray-400 text-sm">Cargando...</div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <User size={28} className="text-gray-300"/>
          </div>
          <p className="text-gray-400 text-sm">Sin prospectos registrados</p>
          <p className="text-gray-300 text-xs mt-1">Registra la primera clase muestra</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-black text-gray-400 uppercase tracking-widest">Prospecto</th>
                <th className="text-left px-5 py-3 text-xs font-black text-gray-400 uppercase tracking-widest">Clase</th>
                <th className="text-left px-5 py-3 text-xs font-black text-gray-400 uppercase tracking-widest">Sucursal</th>
                <th className="text-left px-5 py-3 text-xs font-black text-gray-400 uppercase tracking-widest">Estatus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtrados.map(p => {
                const reserva = p.reservas?.[0]
                const clase   = reserva?.clases
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-4">
                      <p className="text-sm font-bold text-gray-900">{p.nombre_completo}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <Mail size={11}/> {p.email}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      {clase ? (
                        <>
                          <p className="text-sm font-bold text-gray-900">{clase.nombre_clase}</p>
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <Calendar size={11}/>
                            {new Date(clase.horario).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                            {' · '}
                            {new Date(clase.horario).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <MapPin size={12}/> {clase?.sucursales?.nombre || '—'}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        reserva?.estatus === 'Confirmada'
                          ? 'bg-emerald-50 text-emerald-600'
                          : reserva?.estatus === 'No Show'
                          ? 'bg-red-50 text-red-500'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {reserva?.estatus || 'Pendiente'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <DrawerClaseMuestra
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => { setDrawerOpen(false); fetchProspectos() }}
      />
    </div>
  )
}
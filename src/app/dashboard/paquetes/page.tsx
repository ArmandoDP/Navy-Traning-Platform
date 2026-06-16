'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Plus, Package, Users, Clock, Tag } from 'lucide-react'
import ModalCrearPaquete from '@/components/paquetes/ModalCrearPaquete'

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Paquete {
  id: string
  nombre: string
  precio: number
  duracion: number
  numero_clases: number | null
  descripcion: string
  estatus: string
  created_at: string
  total_clientes?: number
}

// ─── Componente ───────────────────────────────────────────────────────────────
export default function PaquetesPage() {
  const [paquetes,  setPaquetes]  = useState<Paquete[]>([])
  const [loading,   setLoading]   = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [filtro,    setFiltro]    = useState<'Todos' | 'Activo' | 'Inactivo'>('Todos')

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchPaquetes = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('paquetes')
      .select('*, clientes(id)')
      .order('precio', { ascending: true })

    if (!error && data) {
      const mapped = data.map((p: any) => ({
        ...p,
        total_clientes: p.clientes?.length || 0,
      }))
      setPaquetes(mapped)
    }
    setLoading(false)
  }

  useEffect(() => { fetchPaquetes() }, [])

  // ── Métricas ───────────────────────────────────────────────────────────────
  const activos       = paquetes.filter(p => p.estatus === 'Activo').length
  const totalClientes = paquetes.reduce((a, p) => a + (p.total_clientes || 0), 0)
  const precioPromedio = paquetes.length > 0
    ? Math.round(paquetes.reduce((a, p) => a + p.precio, 0) / paquetes.length)
    : 0
  const masPopular = paquetes.reduce((a, b) => (a.total_clientes || 0) > (b.total_clientes || 0) ? a : b, paquetes[0])

  const paquetesFiltrados = paquetes.filter(p =>
    filtro === 'Todos' || p.estatus === filtro
  )

  if (loading) return <div className="p-10 text-zinc-500 italic">Cargando paquetes Navy...</div>

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">Paquetes</h1>
          <p className="text-zinc-500 text-sm mt-1">{paquetes.length} paquetes registrados</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-white text-black px-4 py-2 rounded-xl font-bold text-sm hover:bg-zinc-200 transition flex items-center gap-2 w-fit"
        >
          <Plus size={16} /> Nuevo Paquete
        </button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
            <Package size={10}/> Paquetes Activos
          </p>
          <p className="text-3xl font-black mt-1 text-green-500">{activos}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
            <Users size={10}/> Clientes con Paquete
          </p>
          <p className="text-3xl font-black mt-1">{totalClientes}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
            <Tag size={10}/> Precio Promedio
          </p>
          <p className="text-3xl font-black mt-1">${precioPromedio.toLocaleString()}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Más Popular</p>
          <p className="text-lg font-black mt-1 truncate">{masPopular?.nombre || '—'}</p>
          <p className="text-zinc-500 text-xs">{masPopular?.total_clientes || 0} clientes</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {(['Todos', 'Activo', 'Inactivo'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-3 py-1 rounded-full text-xs font-bold border transition ${
              filtro === f ? 'bg-white text-black border-white' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Grid de paquetes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {paquetesFiltrados.length === 0 ? (
          <div className="col-span-3 text-center text-zinc-600 italic py-16">No hay paquetes</div>
        ) : paquetesFiltrados.map(p => (
          <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-4 hover:border-zinc-600 transition">

            {/* Header card */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-black text-white text-lg">{p.nombre}</h3>
                {p.descripcion && <p className="text-zinc-500 text-xs mt-1 line-clamp-2">{p.descripcion}</p>}
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${
                p.estatus === 'Activo' ? 'bg-green-500/10 text-green-500' : 'bg-zinc-700 text-zinc-400'
              }`}>
                {p.estatus}
              </span>
            </div>

            {/* Precio */}
            <div className="border-t border-zinc-800 pt-4">
              <p className="text-3xl font-black text-white">${p.precio.toLocaleString()}</p>
              <p className="text-zinc-500 text-xs mt-0.5">MXN por paquete</p>
            </div>

            {/* Detalles */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-zinc-400 text-sm">
                <Clock size={13} />
                <span>{p.duracion} días de vigencia</span>
              </div>
              {p.numero_clases && (
                <div className="flex items-center gap-2 text-zinc-400 text-sm">
                  <Package size={13} />
                  <span>{p.numero_clases} clases incluidas</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-zinc-400 text-sm">
                <Users size={13} />
                <span>{p.total_clientes} clientes activos</span>
              </div>
            </div>

            {/* Barra de popularidad */}
            {totalClientes > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-zinc-600">
                  <span>Popularidad</span>
                  <span>{Math.round(((p.total_clientes || 0) / totalClientes) * 100)}%</span>
                </div>
                <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-white h-full transition-all"
                    style={{ width: `${Math.round(((p.total_clientes || 0) / totalClientes) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Acción */}
            <Link
              href={`/dashboard/paquetes/${p.id}`}
              className="mt-auto w-full text-center py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl transition"
            >
              Ver detalle
            </Link>
          </div>
        ))}
      </div>

      <ModalCrearPaquete
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchPaquetes}
      />
    </div>
  )
}
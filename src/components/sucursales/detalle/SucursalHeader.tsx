'use client'
import Link from 'next/link'
import { ArrowLeft, Pencil, TrendingUp, TrendingDown, MapPin, Phone, Clock } from 'lucide-react'

interface Sucursal {
  id: string; nombre: string; ciudad: string; direccion: string
  gerente: string; telefono: string; capacidad: number; estatus: string; color: string
}

interface Props {
  sucursal:      Sucursal
  delta:         number
  onEditar:      () => void
}

const HORARIOS = [
  { dia: 'Domingo',   m: '10–11 a.m.',   t: ''            },
  { dia: 'Lunes',     m: '5:45–11 a.m.', t: '5–9:30 p.m.' },
  { dia: 'Martes',    m: '5:45–11 a.m.', t: '5–9:30 p.m.' },
  { dia: 'Miércoles', m: '5:45–11 a.m.', t: '5–9:30 p.m.' },
  { dia: 'Jueves',    m: '5:45–11 a.m.', t: '5–9:30 p.m.' },
  { dia: 'Viernes',   m: '5:45–11 a.m.', t: '5–9:30 p.m.' },
  { dia: 'Sábado',    m: '7:50–11 a.m.', t: ''            },
]

export default function SucursalHeader({ sucursal, delta, onEditar }: Props) {
  const pos   = delta >= 0
  const color = sucursal.color || '#6366f1'
  const nombreCiudad = sucursal.ciudad === 'QRO' ? 'Querétaro' : sucursal.ciudad

  return (
    <>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Link href="/dashboard/sucursales" className="flex items-center gap-1 hover:text-gray-700 transition">
          <ArrowLeft size={14} /> Sucursales
        </Link>
        <span>›</span>
        <span className="text-gray-900 font-semibold">{sucursal.nombre}, {nombreCiudad}</span>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 border border-gray-200 bg-white rounded-xl px-3 py-2 text-sm text-gray-600 cursor-pointer hover:bg-gray-50 transition">
          📅 Últimos 30 días ▾
        </div>
        <button
          onClick={onEditar}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition"
        >
          <Pencil size={14} /> Editar sucursal
        </button>
      </div>

      {/* Mapa + Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Mapa placeholder */}
        <div className="bg-gray-100 border border-gray-200 rounded-2xl overflow-hidden h-64 flex items-center justify-center text-gray-400 text-sm">
          🗺️ {sucursal.direccion || 'Sin dirección registrada'}
        </div>

        {/* Info */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
          {/* Nombre + estatus + crecimiento */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black text-gray-900">{sucursal.nombre}, {sucursal.ciudad}</h1>
                <span className="px-2 py-0.5 bg-green-100 text-green-600 text-xs font-bold rounded-full">
                  {sucursal.estatus}
                </span>
              </div>
              <p className="text-gray-500 text-sm mt-0.5">Gerente: {sucursal.gerente || '—'}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-400 uppercase font-bold">Crecimiento</p>
              <span className={`flex items-center justify-end gap-0.5 text-sm font-black ${pos ? 'text-green-500' : 'text-red-500'}`}>
                {pos ? <TrendingUp size={13}/> : <TrendingDown size={13}/>}
                {pos ? '+' : ''}{delta}%
              </span>
            </div>
          </div>

          {/* Dirección */}
          {sucursal.direccion && (
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <MapPin size={14} className="mt-0.5 flex-shrink-0" style={{ color }} />
              {sucursal.direccion}
            </div>
          )}

          {/* Teléfono */}
          {sucursal.telefono && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone size={14} style={{ color }} /> {sucursal.telefono}
            </div>
          )}

          {/* Horarios */}
          <div className="flex items-start gap-2">
            <Clock size={14} className="mt-0.5 flex-shrink-0" style={{ color }} />
            <div className="space-y-0.5 text-xs">
              {HORARIOS.map(h => (
                <div key={h.dia} className="flex gap-3">
                  <span className="w-20 font-semibold text-gray-700">{h.dia}:</span>
                  <span className="text-gray-500">{h.m}{h.t ? ` › ${h.t}` : ''}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
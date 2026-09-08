'use client'
import { Pencil, Star } from 'lucide-react'

interface Props {
  cliente:  any
  reservas: any[]
  pagos:    any[]
  onEditar: () => void
  noShows:  number
}

export default function DrawerClienteHeader({ cliente, reservas, pagos, onEditar, noShows }: Props) {
  const sucNombre = cliente.sucursales?.nombre || ''
  const sucColor  = cliente.sucursales?.color  || '#6b7280'

  // Calcular dinámico desde datos reales
  const visitas     = reservas.filter(r => r.estatus === 'Confirmada').length
  const valorCliente = pagos
    .filter(p => p.estatus === 'Completado')
    .reduce((acc, p) => acc + (Number(p.monto) || 0), 0)

  return (
    <div className="px-6 pt-5 pb-4 border-b border-gray-100">
      {/* Nombre */}
      <div className="flex items-start justify-between mb-1">
        <h2 className="text-xl font-black text-gray-900">{cliente.nombre_completo}</h2>
      </div>

      {/* Email + teléfono */}
      <p className="text-xs text-gray-400 mb-3">
        {cliente.email}
        {cliente.telefono && <> · <span>{cliente.telefono}</span></>}
      </p>

      {/* Botón editar */}
      <button onClick={onEditar}
        className="flex items-center gap-1.5 bg-gray-900 px-3 py-1.5 rounded-xl text-xs font-bold text-white hover:bg-gray-700 transition mb-3">
        <Pencil size={12}/> Información de cliente y cuenta app
      </button>

      {/* Badges */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
          cliente.estatus === 'Activo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
        }`}>
          {cliente.estatus}
        </span>
        {sucNombre && (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold text-white"
            style={{ backgroundColor: sucColor }}>
            {sucNombre}
          </span>
        )}
        {cliente.plan && (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700">
            {cliente.plan}
          </span>
        )}
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-4 divide-x divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden">
        {[
          {
            label: 'Valor',
            val: valorCliente > 0
              ? `$${valorCliente >= 1000 ? `${(valorCliente/1000).toFixed(1)}K` : valorCliente.toLocaleString()}`
              : '—',
          },
          { label: 'Visitas',  val: visitas },
          { label: 'No shows', val: noShows },
          {
            label: 'NPS',
            val: cliente.nps ? (
              <span className="flex items-center gap-1">
                {cliente.nps}
                <Star size={12} className="text-yellow-400 fill-yellow-400"/>
              </span>
            ) : '—',
          },
        ].map(m => (
          <div key={m.label} className="px-4 py-3">
            <p className="text-xs text-gray-400 mb-0.5">{m.label}</p>
            <p className="text-base font-black text-gray-900">{m.val}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
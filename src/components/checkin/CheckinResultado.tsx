'use client'
import { CheckCircle, XCircle, AlertTriangle, MapPin, Sparkles } from 'lucide-react'

interface Props {
  resultado: any
  onReset:   () => void
}

export default function CheckinResultado({ resultado, onReset }: Props) {
  const configs = {
    exito: {
      icon:    <CheckCircle size={40} className="text-emerald-500" />,
      bg:      'bg-emerald-50',
      border:  'border-emerald-100',
      titulo:  '¡Check-in exitoso!',
      color:   'text-emerald-700',
    },
    clase_muestra: {
      icon:   <Sparkles size={40} className="text-purple-500" />,
      bg:     'bg-gradient-to-br from-purple-50 to-indigo-50',
      border: 'border-purple-200',
      titulo: '¡Clase Muestra!',
      color:  'text-purple-700',
    },
    error: {
      icon:    <XCircle size={40} className="text-red-500" />,
      bg:      'bg-red-50',
      border:  'border-red-100',
      titulo:  'QR inválido',
      color:   'text-red-700',
    },
    duplicado: {
      icon:    <AlertTriangle size={40} className="text-amber-500" />,
      bg:      'bg-amber-50',
      border:  'border-amber-100',
      titulo:  'Ya registrado',
      color:   'text-amber-700',
    },
    sucursal_incorrecta: {
      icon:    <MapPin size={40} className="text-indigo-500" />,
      bg:      'bg-indigo-50',
      border:  'border-indigo-100',
      titulo:  'Sucursal incorrecta',
      color:   'text-indigo-700',
    },
  }

  const cfg = configs[resultado.tipo as keyof typeof configs] || configs.error

  return (
    <div className={`${cfg.bg} border ${cfg.border} rounded-2xl p-6 text-center space-y-4`}>
      <div className="flex justify-center">{cfg.icon}</div>
      <div>
        <p className={`text-lg font-black ${cfg.color}`}>{cfg.titulo}</p>
        <p className="text-sm text-gray-600 mt-1">{resultado.mensaje}</p>
      </div>

      {resultado.tipo === 'exito' && resultado.reserva && (
        <div className="bg-white rounded-xl p-4 text-left space-y-2 border border-gray-100">
          <p className="text-base font-black text-gray-900">
            {resultado.reserva.clientes?.nombre_completo}
          </p>
          <p className="text-sm text-gray-500">
            {resultado.reserva.clases?.nombre_clase} · {new Date(resultado.reserva.clases?.horario).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="text-xs text-gray-400">
            {resultado.reserva.clientes?.paquetes?.nombre || 'Sin paquete'}
          </p>
        </div>
      )}

      {resultado.tipo === 'clase_muestra' && resultado.reserva && (
        <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl p-5 text-white text-left space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🎯</span>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-purple-200">Clase Muestra</p>
              <p className="text-lg font-black">{resultado.reserva.clientes?.nombre_completo}</p>
            </div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-purple-200">Clase</span>
              <span className="font-bold">{resultado.reserva.clases?.nombre_clase}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-purple-200">Hora</span>
              <span className="font-bold">{new Date(resultado.reserva.clases?.horario).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
          <div className="bg-amber-400 text-amber-900 rounded-xl px-4 py-3 text-sm font-bold flex items-center gap-2">
            ⚠️ Este cliente viene de clase muestra — asegúrate de darle una buena introducción a Navy
          </div>
        </div>
      )}

      {resultado.tipo === 'sucursal_incorrecta' && resultado.detalle && (
        <div className="bg-white rounded-xl p-4 text-left space-y-1 border border-gray-100">
          <p className="text-sm font-bold text-gray-700">Este QR pertenece a:</p>
          <p className="text-sm text-gray-900 font-black">{resultado.detalle.clase}</p>
          <p className="text-sm text-gray-500">{resultado.detalle.sucursal} · {resultado.detalle.horario}</p>
        </div>
      )}

      <button onClick={onReset}
        className="w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-700 transition">
        Escanear siguiente →
      </button>
    </div>
  )
}
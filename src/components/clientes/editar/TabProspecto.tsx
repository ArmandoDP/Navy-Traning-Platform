// src/components/clientes/editar/TabProspecto.tsx
'use client'
import { useState } from 'react'
import { Sparkles, MessageCircle, Link2, CalendarCheck } from 'lucide-react'
import ModalLinkPago from '@/components/pagos/ModalLinkPago'
import { Section, Aviso, Boton, Dato, Cargando } from './ui'
import { fechaLarga, fechaHora, hace } from './utils'

interface Props { cliente: any; soporte: any; cargando: boolean }

export default function TabProspecto({ cliente, soporte, cargando }: Props) {
  const [linkPago, setLinkPago] = useState(false)
  if (cargando && !soporte) return <Cargando />

  const r = soporte?.reservas || {}
  const tel = (cliente.telefono || '').replace(/\D/g, '')
  const nombre1 = (cliente.nombre || cliente.nombre_completo || '').split(' ')[0]
  const mensaje = encodeURIComponent(`¡Hola ${nombre1}! Somos Navy Training Center 💪 ¿Qué te pareció tu clase muestra? Te comparto nuestros planes para que sigas entrenando con nosotros.`)

  return (
    <div className="space-y-4">
      <Aviso tono="info" titulo="Tomó una clase muestra">
        Todavía no compra un plan. Es un buen momento para darle seguimiento: entre más pronto, más probable es que se inscriba.
      </Aviso>

      <Section icon={<CalendarCheck size={15} />} titulo="Su experiencia" descripcion="Lo que ha hecho en Navy hasta ahora.">
        <div className="grid grid-cols-3 gap-3 bg-gray-50 rounded-xl p-3">
          <Dato etiqueta="Registrado" valor={hace(cliente.created_at)} sub={fechaLarga(cliente.created_at)} />
          <Dato etiqueta="Clases" valor={r.total ?? 0} />
          <Dato etiqueta="Próximas" valor={r.proximas ?? 0} />
        </div>
        {r.ultima && (
          <p className="text-[11px] text-gray-400">
            Última clase: {r.ultima.clases?.nombre_clase?.trim() || 'clase'} · {fechaHora(r.ultima.clases?.horario)}
          </p>
        )}
      </Section>

      <Section icon={<Sparkles size={15} />} titulo="Siguiente paso" descripcion="Invítalo a inscribirse.">
        <div className="space-y-3">
          <div className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-[11px] font-black flex items-center justify-center shrink-0">1</span>
            <div className="flex-1">
              <p className="text-[13px] font-bold text-gray-900">Escríbele por WhatsApp</p>
              <p className="text-[11px] text-gray-400 mb-2">Pregúntale cómo le fue y comparte los planes.</p>
              {tel.length >= 10
                ? <a href={`https://wa.me/52${tel.slice(-10)}?text=${mensaje}`} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-gray-200 text-gray-800 hover:bg-gray-50 transition">
                    <MessageCircle size={12} /> Abrir WhatsApp
                  </a>
                : <p className="text-[11px] text-amber-600">No tiene teléfono registrado. Agrégalo en la pestaña Datos.</p>}
            </div>
          </div>
          <div className="flex gap-3">
            <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-[11px] font-black flex items-center justify-center shrink-0">2</span>
            <div className="flex-1">
              <p className="text-[13px] font-bold text-gray-900">Mándale un link de pago</p>
              <p className="text-[11px] text-gray-400 mb-2">Paga desde su celular y su plan se activa solo, con acceso a la app.</p>
              <Boton variante="primario" onClick={() => setLinkPago(true)}><Link2 size={12} /> Generar link de pago</Boton>
            </div>
          </div>
        </div>
      </Section>

      <ModalLinkPago isOpen={linkPago} onClose={() => setLinkPago(false)} sucursalInicial={cliente.sucursal_id} />
    </div>
  )
}

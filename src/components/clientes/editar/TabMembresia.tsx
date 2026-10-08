// src/components/clientes/editar/TabMembresia.tsx
'use client'
import { useState } from 'react'
import { CreditCard, Calendar, Clock, Repeat, Layers, History, Link2, StickyNote, Lock } from 'lucide-react'
import ModalFechasMembresia from '@/components/clientes/ModalFechasMembresia'
import ModalLinkPago from '@/components/pagos/ModalLinkPago'
import { Section, Aviso, Boton, Dato, Pill, Vacio, inputCls } from './ui'
import { hoyCDMX, fechaLarga, fechaCorta, diasHasta, dinero } from './utils'

interface Props {
  cliente:     any
  membresias:  any[]
  esDireccion: boolean
  notas:       string
  setNotas:    (v: string) => void
  onCambio:    () => void
}

export default function TabMembresia({ cliente, membresias, esDireccion, notas, setNotas, onCambio }: Props) {
  const [fechasDe, setFechasDe] = useState<string | null>(null)
  const [linkPago, setLinkPago] = useState(false)

  const hoy     = hoyCDMX()
  const activas = membresias.filter(m => m.estatus === 'Activa')
  const actual  = activas
      .filter(m => m.fecha_inicio <= hoy && m.fecha_fin >= hoy && !m.activacion_pendiente)
      .sort((a, b) => a.fecha_fin.localeCompare(b.fecha_fin))[0]
    || activas.find(m => m.activacion_pendiente)
    || null
  const enCola = activas
    .filter(m => m.id !== actual?.id && m.fecha_inicio > hoy && !m.activacion_pendiente)
    .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio))[0] || null
  const historial = membresias.filter(m => m.id !== actual?.id && m.id !== enCola?.id)

  const dias = actual && !actual.activacion_pendiente ? diasHasta(actual.fecha_fin) : null
  const estado = !actual ? null
    : actual.activacion_pendiente ? { texto: 'En espera', tono: 'ambar' as const }
    : (dias ?? 0) <= 7 ? { texto: 'Por vencer', tono: 'rojo' as const }
    : { texto: 'Vigente', tono: 'verde' as const }

  return (
    <div className="space-y-4">
      <Aviso tono="info" titulo="¿Cómo funcionan los planes?">
        El plan empieza a contar <b>el día de su primera reserva</b>. Si tiene renovación automática, Stripe le cobra
        el mismo día en que vence. Para mover fechas usa <b>Editar fechas</b>: el cobro de Stripe se recorre solo.
      </Aviso>

      {/* Plan actual */}
      <Section icon={<CreditCard size={15} />} titulo="Plan actual"
        descripcion="El plan con el que puede reservar hoy."
        derecha={estado && <Pill tono={estado.tono}>{estado.texto}</Pill>}>
        {!actual ? (
          <div className="space-y-3">
            <Vacio>No tiene un plan vigente. En la app le va a pedir comprar uno para poder reservar.</Vacio>
            <div className="flex flex-wrap gap-2">
              <Boton variante="primario" onClick={() => setLinkPago(true)}><Link2 size={12} /> Generar link de pago</Boton>
            </div>
            <p className="text-[11px] text-gray-400">También puedes cobrarle en sucursal desde la ficha del cliente → Membresía.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-black text-gray-900">{actual.paquetes?.nombre || 'Paquete'}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {actual.paquetes?.vigencia_dias ? `${actual.paquetes.vigencia_dias} días` : ''}
                  {actual.origen ? ` · vendido por ${actual.origen}` : ''}
                  {actual.precio_pagado ? ` · ${dinero(actual.precio_pagado)}` : ''}
                </p>
              </div>
            </div>

            {actual.activacion_pendiente ? (
              <Aviso tono="aviso" titulo="Arranca con su primera reserva">
                Todavía no empieza a contar. El día que reserve su primera clase, su plan arranca con sus {actual.paquetes?.vigencia_dias || ''} días completos.
                {actual.fecha_compra && <> Lo compró el {fechaLarga(actual.fecha_compra)}; si no reserva, se activa solo a los 30 días.</>}
              </Aviso>
            ) : (
              <div className="grid grid-cols-3 gap-3 bg-gray-50 rounded-xl p-3">
                <Dato etiqueta="Inicio" valor={fechaCorta(actual.fecha_inicio)} />
                <Dato etiqueta="Vence" valor={fechaCorta(actual.fecha_fin)} />
                <Dato etiqueta="Le quedan" valor={`${Math.max(0, dias ?? 0)} días`} />
              </div>
            )}

            {actual.stripe_subscription_id && (
              <div className="flex items-start gap-2 text-xs text-indigo-800 bg-indigo-50 rounded-xl p-3">
                <Repeat size={14} className="mt-0.5 shrink-0" />
                <span>
                  {actual.renovacion_cancelada
                    ? 'Canceló su renovación automática: no se le volverá a cobrar.'
                    : actual.activacion_pendiente
                      ? 'Tiene renovación automática. El primer cobro se programa cuando arranque su plan.'
                      : <>Tiene renovación automática: Stripe le cobra el <b>{fechaLarga(actual.fecha_fin)}</b> y su plan se extiende solo.</>}
                </span>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {esDireccion ? (
                <Boton variante="primario" onClick={() => setFechasDe(actual.id)}><Calendar size={12} /> Editar fechas</Boton>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-400"><Lock size={11} /> Solo dirección puede cambiar fechas</span>
              )}
            </div>
          </div>
        )}
      </Section>

      {/* Próximo paquete */}
      {enCola && (
        <Section icon={<Layers size={15} />} titulo="Próximo plan en cola"
          descripcion="Ya lo pagó. Empieza automáticamente cuando termine el actual.">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-gray-900">{enCola.paquetes?.nombre}</p>
              <p className="text-xs text-gray-400">{fechaCorta(enCola.fecha_inicio)} → {fechaCorta(enCola.fecha_fin)}</p>
            </div>
            {esDireccion && <Boton onClick={() => setFechasDe(enCola.id)}><Calendar size={12} /> Editar fechas</Boton>}
          </div>
        </Section>
      )}

      {/* Historial */}
      <Section icon={<History size={15} />} titulo="Historial de planes" descripcion="Todos los planes que ha tenido, del más reciente al más antiguo.">
        {historial.length === 0 ? <Vacio>Sin planes anteriores.</Vacio> : (
          <div className="divide-y divide-gray-100">
            {historial.slice(0, 12).map(m => (
              <div key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-gray-900 truncate">{m.paquetes?.nombre || 'Paquete'}</p>
                  <p className="text-[11px] text-gray-400">
                    {fechaCorta(m.fecha_inicio)} → {fechaCorta(m.fecha_fin)}{m.origen ? ` · ${m.origen}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {m.precio_pagado ? <span className="text-xs font-bold text-gray-500">{dinero(m.precio_pagado)}</span> : null}
                  <Pill tono={m.estatus === 'Cancelada' ? 'rojo' : m.estatus === 'Activa' ? 'verde' : 'gris'}>{m.estatus}</Pill>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Notas */}
      {actual && (
        <Section icon={<StickyNote size={15} />} titulo="Notas del plan" descripcion="Cualquier acuerdo especial (descuentos, promesas, aclaraciones). Se guarda con el botón de abajo.">
          <textarea rows={3} className={`${inputCls} resize-none`} placeholder="Ej. Se le dio una semana extra por la lesión de septiembre."
            value={notas} onChange={e => setNotas(e.target.value)} />
        </Section>
      )}

      <ModalFechasMembresia isOpen={!!fechasDe} membresiaId={fechasDe}
        onClose={() => setFechasDe(null)} onSuccess={onCambio} />
      <ModalLinkPago isOpen={linkPago} onClose={() => setLinkPago(false)} sucursalInicial={cliente.sucursal_id} />
    </div>
  )
}

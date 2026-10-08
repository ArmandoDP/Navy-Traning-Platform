// src/components/clientes/editar/TabPlataforma.tsx
'use client'
import { useState } from 'react'
import { CalendarCheck, ScanLine, Sparkles, Link2 } from 'lucide-react'
import ModalLinkPago from '@/components/pagos/ModalLinkPago'
import { Section, Aviso, Boton, Dato, Pill, Vacio, Cargando } from './ui'
import { fechaHora } from './utils'

interface Props { cliente: any; tipo: 'wellhub' | 'totalpass'; soporte: any; cargando: boolean }

const NOMBRE = { wellhub: 'Wellhub', totalpass: 'TotalPass' }

export default function TabPlataforma({ cliente, tipo, soporte, cargando }: Props) {
  const [linkPago, setLinkPago] = useState(false)
  if (cargando && !soporte) return <Cargando />

  const p = soporte?.plataformas || {}
  const reservas = (tipo === 'wellhub' ? p.wellhub_reservas : p.totalpass_reservas) || []
  const checkins = (tipo === 'wellhub' ? p.wellhub_checkins : p.totalpass_checkins) || []
  const validado = (c: any) => tipo === 'wellhub' ? !!c.validado : c.estatus === 'Validado'
  const nombre = NOMBRE[tipo]
  const canceladas = reservas.filter((r: any) => (r.estatus || '').toLowerCase().startsWith('cancel')).length
  const noValidados = checkins.filter((c: any) => !validado(c)).length

  return (
    <div className="space-y-4">
      <Aviso tono="info" titulo={`Entra con su membresía de ${nombre}`}>
        No es cliente de Navy: no paga en Navy ni necesita un paquete. Reserva desde la app de {nombre} y, cuando llega,
        hace check-in ahí mismo. {nombre} le paga a Navy por cada visita <b>validada</b>.
      </Aviso>

      <div className="grid grid-cols-3 gap-3 bg-white border border-gray-100 rounded-2xl p-4">
        <Dato etiqueta="Reservas" valor={reservas.length} sub="recientes" />
        <Dato etiqueta="Visitas" valor={checkins.length} sub={`${noValidados} sin validar`} />
        <Dato etiqueta="Canceló" valor={canceladas} sub="reservas" />
      </div>

      <Section icon={<ScanLine size={15} />} titulo="Visitas (check-in)"
        descripcion={`Cada vez que llega y hace check-in en ${nombre}, el sistema la valida sola. Si no se valida, ${nombre} no paga esa visita.`}>
        {noValidados > 0 && (
          <Aviso tono="aviso">
            Hay {noValidados} {noValidados === 1 ? 'visita' : 'visitas'} sin validar. Si se repite, avisa a soporte con la fecha y hora.
          </Aviso>
        )}
        {checkins.length === 0 ? <Vacio>Todavía no tiene visitas registradas.</Vacio> : (
          <div className="divide-y divide-gray-100">
            {checkins.map((c: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2 text-xs">
                <span className="text-gray-700 font-bold">{fechaHora(c.created_at)}</span>
                {validado(c) ? <Pill tono="verde">Validada</Pill> : <Pill tono="rojo">No validada</Pill>}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section icon={<CalendarCheck size={15} />} titulo="Reservas" descripcion={`Las que hizo desde ${nombre}. Ocupan un lugar en la clase igual que cualquier cliente.`}>
        {reservas.length === 0 ? <Vacio>Sin reservas recientes.</Vacio> : (
          <div className="divide-y divide-gray-100">
            {reservas.map((r: any, i: number) => {
              const est = (r.estatus || '').toLowerCase()
              return (
                <div key={i} className="flex items-center justify-between gap-3 py-2 text-xs">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">{r.clase?.nombre_clase?.trim() || 'Clase'}</p>
                    <p className="text-gray-400">{r.clase?.horario ? fechaHora(r.clase.horario) : `reservó ${fechaHora(r.created_at)}`}</p>
                  </div>
                  <Pill tono={est.startsWith('cancel') ? 'gris' : est.startsWith('rechaz') ? 'rojo' : 'verde'}>{r.estatus}</Pill>
                </div>
              )
            })}
          </div>
        )}
      </Section>

      <Section icon={<Sparkles size={15} />} titulo={`¿Quiere un plan de Navy?`}
        descripcion="Si le gusta Navy y quiere más clases o beneficios, puede comprar un plan propio.">
        <Boton variante="primario" onClick={() => setLinkPago(true)}><Link2 size={12} /> Generar link de pago</Boton>
        <p className="text-[11px] text-gray-400">Al pagar, se vuelve cliente Navy y en este drawer verás su membresía.</p>
      </Section>

      <ModalLinkPago isOpen={linkPago} onClose={() => setLinkPago(false)} sucursalInicial={cliente.sucursal_id} />
    </div>
  )
}

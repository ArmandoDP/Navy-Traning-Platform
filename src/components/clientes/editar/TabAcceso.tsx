// src/components/clientes/editar/TabAcceso.tsx
'use client'
import { useState } from 'react'
import { KeyRound, CalendarCheck, Bell, Ban, CreditCard, Users, AlertTriangle, Fingerprint, Copy, RefreshCw, Smartphone } from 'lucide-react'
import { Section, Aviso, Boton, Dato, Vacio, Cargando } from './ui'
import { TipoCliente } from './tipoCliente'
import { apiSoporte, fechaLarga, fechaHora, hace, dinero } from './utils'

interface Props {
  cliente:     any
  tipo:        TipoCliente
  soporte:     any
  cargando:    boolean
  recargar:    () => void
  esDireccion: boolean
  irA:         (tab: string) => void
}

export default function TabAcceso({ cliente, tipo, soporte, cargando, recargar, esDireccion, irA }: Props) {
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState<{ tono: 'ok' | 'error'; texto: string } | null>(null)

  const accion = async (clave: string, path: string, exito: string) => {
    setOcupado(clave); setMensaje(null)
    try {
      await apiSoporte(path, 'POST')
      setMensaje({ tono: 'ok', texto: exito })
      recargar()
    } catch (e: any) {
      setMensaje({ tono: 'error', texto: e.message })
    }
    setOcupado(null)
  }

  if (cargando && !soporte) return <Cargando />
  if (!soporte) return <Aviso tono="error" titulo="No se pudo cargar el diagnóstico">Revisa tu conexión e inténtalo otra vez.
    <div className="pt-2"><Boton onClick={recargar}><RefreshCw size={12} /> Reintentar</Boton></div></Aviso>

  const { acceso, membresia, penalizaciones, notificaciones, reservas, stripe, duplicados, alertas } = soporte
  const plataforma = tipo === 'wellhub' || tipo === 'totalpass'
  const usaApp = !plataforma

  // ── Resumen de problemas ──
  const problemas: string[] = []
  if (usaApp && acceso.estado !== 'ok') problemas.push('acceso')
  if (!acceso.correo_valido) problemas.push('correo')
  if (usaApp && tipo === 'navy' && !membresia.vigente && !membresia.en_espera) problemas.push('plan')
  if (penalizaciones.length) problemas.push('penalizacion')
  if (usaApp && !notificaciones.dispositivos) problemas.push('notificaciones')
  if (stripe?.suscripcion?.estado === 'past_due') problemas.push('cobro')
  if (duplicados.length) problemas.push('duplicados')

  const copiar = (t: string) => navigator.clipboard?.writeText(t)

  return (
    <div className="space-y-4">
      {problemas.length === 0
        ? <Aviso tono="ok" titulo="Todo en orden">No encontramos nada que le impida usar Navy.</Aviso>
        : <Aviso tono="aviso" titulo={`Encontramos ${problemas.length} ${problemas.length === 1 ? 'cosa' : 'cosas'} por revisar`}>
            Abajo te explicamos cada una y cómo resolverla. Úsalo cuando un cliente diga que &quot;no puede entrar&quot; o &quot;no puede reservar&quot;.
          </Aviso>}

      {mensaje && <Aviso tono={mensaje.tono}>{mensaje.texto}</Aviso>}

      {/* 1. Cuenta de acceso */}
      {usaApp && (
        <Section icon={<KeyRound size={15} />} titulo="Cuenta para entrar a la app"
          descripcion="Entra a la app de Navy con su correo. Ya no usa contraseña."
          derecha={<Boton onClick={recargar} cargando={cargando}><RefreshCw size={11} /></Boton>}>
          {!acceso.correo_valido && (
            <Aviso tono="error" titulo="Su correo no es válido" acciones={<Boton onClick={() => irA('datos')}>Corregir en Datos</Boton>}>
              Con un correo mal escrito no puede entrar ni recibir comprobantes.
            </Aviso>
          )}
          {acceso.estado === 'ok' && (
            <Aviso tono="ok" titulo="Tiene cuenta y está bien ligada">
              Entra con <b>{acceso.cuenta?.email}</b>. Último inicio de sesión: <b>{acceso.cuenta?.last_sign_in_at ? `${fechaHora(acceso.cuenta.last_sign_in_at)} (${hace(acceso.cuenta.last_sign_in_at)})` : 'nunca ha entrado'}</b>.
            </Aviso>
          )}
          {acceso.estado === 'correo_distinto' && (
            <Aviso tono="error" titulo="Su correo de acceso es distinto al del CRM"
              acciones={<Boton variante="primario" cargando={ocupado === 'correo'}
                onClick={() => accion('correo', `/cliente/${cliente.id}/sincronizar-correo`, 'Listo: ahora entra con el correo del CRM.')}>
                Usar el correo del CRM para entrar</Boton>}>
              En la app entra con <b>{acceso.cuenta?.email}</b>, pero en el CRM tiene <b>{cliente.email}</b>.
              Por eso a veces dice que &quot;no lo encuentra&quot; o no le llegan los avisos.
            </Aviso>
          )}
          {acceso.estado === 'sin_vincular' && (
            <Aviso tono="aviso" titulo="Tiene cuenta, pero no está ligada a este cliente"
              acciones={<Boton variante="primario" cargando={ocupado === 'crear'}
                onClick={() => accion('crear', `/cliente/${cliente.id}/crear-acceso`, 'Listo: su cuenta quedó ligada.')}>Ligar su cuenta</Boton>}>
              Existe una cuenta con su correo, pero el CRM no la reconoce. Al entrar a la app podría no ver su plan ni sus reservas.
            </Aviso>
          )}
          {(acceso.estado === 'sin_cuenta' || acceso.estado === 'vinculo_roto') && acceso.correo_valido && (
            <Aviso tono="error" titulo="No tiene cuenta para entrar a la app"
              acciones={<Boton variante="primario" cargando={ocupado === 'crear'}
                onClick={() => accion('crear', `/cliente/${cliente.id}/crear-acceso`, `Listo: ya puede entrar a la app con ${cliente.email}.`)}>Crear su acceso</Boton>}>
              {acceso.estado === 'vinculo_roto'
                ? 'Tenía una cuenta que ya no existe. Hay que crearle una nueva.'
                : 'Todavía no tiene cuenta. Al crearla, podrá entrar a la app con su correo.'}
            </Aviso>
          )}
          {acceso.correo_valido && !acceso.correo_normalizado && (
            <Aviso tono="aviso">Su correo tiene mayúsculas o espacios. Se corrige solo al guardar en la pestaña Datos.</Aviso>
          )}
        </Section>
      )}

      {/* 2. Puede reservar */}
      {usaApp && (
        <Section icon={<CalendarCheck size={15} />} titulo="¿Puede reservar?" descripcion="Para reservar en la app necesita un plan vigente o en espera.">
          {membresia.vigente ? (
            <Aviso tono="ok">Sí. Tiene <b>{membresia.vigente.paquetes?.nombre}</b> hasta el <b>{fechaLarga(membresia.vigente.fecha_fin)}</b>.</Aviso>
          ) : membresia.en_espera ? (
            <Aviso tono="ok">Sí. Su <b>{membresia.en_espera.paquetes?.nombre}</b> arranca con su primera reserva.</Aviso>
          ) : (
            <Aviso tono={tipo === 'prospecto' ? 'info' : 'error'} titulo="No tiene plan vigente"
              acciones={tipo === 'navy' ? <Boton onClick={() => irA('membresia')}>Ver membresía</Boton> : undefined}>
              Por eso la app le pide comprar un plan.
              {membresia.ultima_vencida && <> Su último plan ({membresia.ultima_vencida.paquetes?.nombre}) terminó el {fechaLarga(membresia.ultima_vencida.fecha_fin)}.</>}
            </Aviso>
          )}
          <div className="grid grid-cols-3 gap-3 bg-gray-50 rounded-xl p-3">
            <Dato etiqueta="Reservas" valor={reservas.total} />
            <Dato etiqueta="Próximas" valor={reservas.proximas} />
            <Dato etiqueta="Canceladas" valor={reservas.canceladas} />
          </div>
          {reservas.ultima && (
            <p className="text-[11px] text-gray-400">
              Última reserva: {reservas.ultima.clases?.nombre_clase?.trim() || 'clase'} · {fechaHora(reservas.ultima.clases?.horario)} (por {reservas.ultima.origen || 'app'})
            </p>
          )}
        </Section>
      )}

      {/* 3. Penalizaciones */}
      {penalizaciones.length > 0 && (
        <Section icon={<Ban size={15} />} titulo="Penalizaciones por No Show"
          descripcion="Mientras tenga una penalización sin pagar, la app no le deja reservar.">
          {penalizaciones.map((p: any) => (
            <Aviso key={p.id} tono="error" titulo={`${dinero(p.monto)} sin pagar`}
              acciones={esDireccion
                ? <Boton variante="peligro" cargando={ocupado === p.id}
                    onClick={() => accion(p.id, `/cliente/${cliente.id}/condonar/${p.id}`, 'Penalización condonada: ya puede reservar.')}>Condonar</Boton>
                : <span className="text-[11px]">Solo dirección puede condonarla.</span>}>
              Faltó a una clase sin cancelar ({fechaHora(p.created_at)}). Puede pagarla desde la app.
            </Aviso>
          ))}
        </Section>
      )}

      {/* 4. Notificaciones */}
      {usaApp && (
        <Section icon={<Bell size={15} />} titulo="Notificaciones" descripcion="Recordatorios de clase, avisos de pago y renovaciones.">
          {notificaciones.dispositivos > 0 ? (
            <Aviso tono="ok" titulo={`Activas en ${notificaciones.dispositivos} ${notificaciones.dispositivos === 1 ? 'teléfono' : 'teléfonos'}`}
              acciones={<Boton cargando={ocupado === 'push'}
                onClick={() => accion('push', `/cliente/${cliente.id}/push-prueba`, 'Notificación de prueba enviada. Pregúntale si le llegó.')}>
                <Smartphone size={12} /> Enviar notificación de prueba</Boton>}>
              Si dice que no le llegan, envíale una prueba. Si tampoco le llega, que revise en su teléfono: Ajustes → Navy → Notificaciones.
            </Aviso>
          ) : (
            <Aviso tono="aviso" titulo="No tiene notificaciones activadas">
              No le llegan recordatorios ni avisos. Pídele que abra la app y acepte las notificaciones, o que las active en Ajustes → Navy → Notificaciones.
            </Aviso>
          )}
        </Section>
      )}

      {/* 5. Pagos con tarjeta */}
      {tipo === 'navy' && stripe && !stripe.error && (
        <Section icon={<CreditCard size={15} />} titulo="Tarjetas y cobros" descripcion="Tarjetas guardadas en su cuenta y estado de su renovación automática.">
          {stripe.suscripcion?.estado === 'past_due' && (
            <Aviso tono="error" titulo="Su último cobro falló">
              No se pudo cobrar su renovación. Pídele que actualice su tarjeta en la app (Perfil → Métodos de pago).
            </Aviso>
          )}
          {stripe.tarjetas.length === 0 ? <Vacio>No tiene tarjetas guardadas.</Vacio> : (
            <div className="space-y-2">
              {stripe.tarjetas.map((t: any, i: number) => (
                <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5 text-xs">
                  <span className="font-bold text-gray-900 uppercase">{t.marca} •••• {t.ultimos4}</span>
                  <span className="text-gray-400">vence {t.vence}</span>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* 6. Duplicados */}
      {duplicados.length > 0 && (
        <Section icon={<Users size={15} />} titulo="Posibles duplicados" descripcion="Otros clientes con el mismo correo o teléfono.">
          <Aviso tono="aviso">
            Si es la misma persona, sus reservas y pagos pueden estar repartidos entre dos registros. Avisa a soporte para unirlos.
          </Aviso>
          <div className="divide-y divide-gray-100">
            {duplicados.map((d: any) => (
              <div key={d.id} className="py-2 text-xs">
                <p className="font-bold text-gray-900">{d.nombre_completo || 'Sin nombre'}</p>
                <p className="text-gray-400">{d.email} · {d.origen || 'sin origen'} · registrado {fechaLarga(d.created_at)}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 7. Alertas */}
      {alertas.length > 0 && (
        <Section icon={<AlertTriangle size={15} />} titulo="Alertas recientes" descripcion="Avisos del sistema relacionados con este cliente.">
          <div className="divide-y divide-gray-100">
            {alertas.map((a: any, i: number) => (
              <div key={i} className="py-2 text-xs">
                <p className="font-bold text-gray-900">{a.titulo}</p>
                <p className="text-gray-400">{fechaHora(a.created_at)}{a.descripcion ? ` · ${a.descripcion}` : ''}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 8. Identificadores */}
      <Section icon={<Fingerprint size={15} />} titulo="Identificadores" descripcion="Para cuando soporte técnico los pida.">
        {[
          ['ID del cliente', cliente.id],
          ['ID de acceso', acceso.supabase_user_id || acceso.cuenta?.id],
          ['Cliente en Stripe', cliente.stripe_customer_id],
        ].filter(([, v]) => v).map(([k, v]) => (
          <div key={k as string} className="flex items-center justify-between gap-2 text-xs">
            <span className="text-gray-400 font-bold">{k}</span>
            <button onClick={() => copiar(v as string)} className="flex items-center gap-1.5 font-mono text-[11px] text-gray-700 hover:text-gray-900">
              {(v as string).slice(0, 18)}… <Copy size={11} />
            </button>
          </div>
        ))}
      </Section>
    </div>
  )
}

// src/components/clientes/editar/TabDatos.tsx
'use client'
import { User, Phone, MapPin, ClipboardList } from 'lucide-react'
import { Field, Section, Aviso, inputCls, selectCls } from './ui'
import { TipoCliente } from './tipoCliente'
import { fechaLarga } from './utils'

const SEXOS       = ['Masculino', 'Femenino', 'Prefiero no decir']
const FORMAS_PAGO = ['Tarjeta', 'Efectivo', 'Transferencia', 'Terminal', 'OXXO']
const ESTATUS: Record<string, string> = {
  Activo:   'Viene a entrenar o tiene un plan vigente.',
  Inactivo: 'Dejó de venir. No recibe recordatorios de clases.',
  Vencido:  'Su plan terminó y no ha renovado.',
}

interface Props {
  cliente:    any
  form:       any
  set:        (k: string, v: string) => void
  sucursales: { id: string; nombre: string }[]
  tipo:       TipoCliente
  correoOriginal: string
}

export default function TabDatos({ cliente, form, set, sucursales, tipo, correoOriginal }: Props) {
  const esNavy = tipo === 'navy'
  const correoCambio = form.email.trim().toLowerCase() !== (correoOriginal || '').trim().toLowerCase()

  return (
    <div className="space-y-4">
      <Section icon={<User size={15} />} titulo="Identidad" descripcion="Cómo se llama y datos básicos. Así aparece en reservas, listas y correos.">
        <Field label="Nombre" required>
          <input className={inputCls} value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej. Ana" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Primer apellido">
            <input className={inputCls} value={form.primer_apellido} onChange={e => set('primer_apellido', e.target.value)} />
          </Field>
          <Field label="Segundo apellido">
            <input className={inputCls} value={form.segundo_apellido} onChange={e => set('segundo_apellido', e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sexo">
            <select className={selectCls} value={form.sexo} onChange={e => set('sexo', e.target.value)}>
              <option value="">Sin especificar</option>
              {SEXOS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Fecha de nacimiento" hint="Para felicitarlo en su cumpleaños.">
            <input type="date" className={inputCls} value={form.fecha_nacimiento} onChange={e => set('fecha_nacimiento', e.target.value)} />
          </Field>
        </div>
      </Section>

      <Section icon={<Phone size={15} />} titulo="Contacto" descripcion="Por dónde le llegan los avisos, comprobantes y su acceso a la app.">
        <Field label="Correo" required
          hint={tipo === 'navy' || tipo === 'prospecto'
            ? 'Es el correo con el que entra a la app y donde recibe sus comprobantes.'
            : `Es el correo que tiene registrado en ${tipo === 'wellhub' ? 'Wellhub' : 'TotalPass'}. Así lo identificamos cuando reserva.`}>
          <input type="email" className={inputCls} value={form.email} onChange={e => set('email', e.target.value)} placeholder="correo@ejemplo.com" />
        </Field>
        {correoCambio && cliente.supabase_user_id && (
          <Aviso tono="aviso" titulo="Vas a cambiar su correo de acceso">
            Al guardar, también cambia el correo con el que entra a la app. A partir de ahora deberá entrar con <b>{form.email.trim().toLowerCase()}</b>.
          </Aviso>
        )}
        {correoCambio && (tipo === 'wellhub' || tipo === 'totalpass') && (
          <Aviso tono="aviso">
            Si el correo no coincide con el de su cuenta de {tipo === 'wellhub' ? 'Wellhub' : 'TotalPass'}, sus próximas reservas podrían crear un cliente nuevo.
          </Aviso>
        )}
        <Field label="Teléfono" hint="A 10 dígitos. Se usa para WhatsApp y para encontrar clientes duplicados.">
          <input className={inputCls} value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="55 1234 5678" />
        </Field>
      </Section>

      <Section icon={<MapPin size={15} />} titulo="Sucursal y estado"
        descripcion="Su sucursal principal se usa para sugerirle clases, en los recordatorios y en los reportes.">
        <Field label="Sucursal principal">
          <select className={selectCls} value={form.sucursal_id} onChange={e => set('sucursal_id', e.target.value)}>
            <option value="">Sin sucursal</option>
            {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </Field>
        <Field label="Estado del cliente" hint={ESTATUS[form.estatus]}>
          <select className={selectCls} value={form.estatus} onChange={e => set('estatus', e.target.value)}>
            {Object.keys(ESTATUS).map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </Field>
      </Section>

      <Section icon={<ClipboardList size={15} />} titulo="Seguimiento" descripcion="Información para conocer mejor al cliente.">
        <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 rounded-xl p-3">
          <div>
            <p className="text-gray-400 font-bold">Cómo llegó</p>
            <p className="text-gray-900 font-bold mt-0.5">{cliente.origen || 'Sin registro'}</p>
          </div>
          <div>
            <p className="text-gray-400 font-bold">Registrado</p>
            <p className="text-gray-900 font-bold mt-0.5">{fechaLarga(cliente.created_at)}</p>
          </div>
        </div>
        {esNavy && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Forma de pago preferida" hint="Cómo suele pagar en sucursal.">
              <select className={selectCls} value={form.forma_pago} onChange={e => set('forma_pago', e.target.value)}>
                <option value="">Sin especificar</option>
                {FORMAS_PAGO.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="NPS (0 a 10)" hint="Qué tanto nos recomendaría.">
              <input type="number" min={0} max={10} className={inputCls} value={form.nps} onChange={e => set('nps', e.target.value)} />
            </Field>
          </div>
        )}
        <Field label="Fecha de alta original" hint="Si venía de otro sistema o sucursal, cuándo se inscribió por primera vez.">
          <input type="date" className={inputCls} value={form.fecha_alta_original} onChange={e => set('fecha_alta_original', e.target.value)} />
        </Field>
      </Section>
    </div>
  )
}

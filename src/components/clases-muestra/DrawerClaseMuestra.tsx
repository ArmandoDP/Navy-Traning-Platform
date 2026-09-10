'use client'
import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import PasoProspecto from './PasoProspecto'
import PasoClase from './PasoClase'
import PasoSpot from './PasoSpot'

export type ReservaAEditar = {
  id: string
  clase_id_anterior?: string
  prospecto: {
    nombre: string
    email: string
    telefono: string
    clienteId?: string
  }
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  reservaAEditar?: ReservaAEditar | null // Prop opcional para modo edición / reagendar
}

export type ProspectoData = {
  nombre: string
  email: string
  telefono: string
  esNuevo: boolean
  clienteId?: string
}

export type ClaseData = {
  claseId: string
  nombre: string
  horario: string
  sucursalId: string
  sucursal: string
  roomId: string
  duracion: number
}

type Paso = 1 | 2 | 3

export default function DrawerClaseMuestra({ isOpen, onClose, onSuccess, reservaAEditar }: Props) {
  const [paso, setPaso] = useState<Paso>(1)
  const [prospecto, setProspecto] = useState<ProspectoData | null>(null)
  const [clase, setClase] = useState<ClaseData | null>(null)
  const [guardando, setGuardando] = useState(false)

  // Cargar datos predeterminados en modo edición/reagendamiento
  useEffect(() => {
    if (reservaAEditar && isOpen) {
      setProspecto({
        nombre: reservaAEditar.prospecto.nombre,
        email: reservaAEditar.prospecto.email,
        telefono: reservaAEditar.prospecto.telefono,
        esNuevo: false,
        clienteId: reservaAEditar.prospecto.clienteId,
      })
      setPaso(2) // Salta directo a seleccionar la nueva clase
    }
  }, [reservaAEditar, isOpen])

  const handleClose = () => {
    setPaso(1)
    setProspecto(null)
    setClase(null)
    onClose()
  }

  const handleConfirmar = async (spotId: string, spotNumero?: string) => {
    if (!prospecto || !clase) return
    setGuardando(true)

    try {
      let clienteId = prospecto.clienteId

      if (!clienteId) {
        const { data: cli, error: cliErr } = await supabase
          .from('clientes')
          .insert({
            nombre_completo: prospecto.nombre,
            email: prospecto.email,
            telefono: prospecto.telefono,
            estatus: 'Prospecto',
            origen: 'Clase Muestra',
            origen_detalle: 'Clase muestra presencial',
            sucursal_id: clase.sucursalId,
            acepto_terminos: false,
          })
          .select()
          .single()

        if (cliErr) console.error('Error al crear cliente:', cliErr)
        clienteId = cli?.id
      }

      let reservaId = reservaAEditar?.id

      if (reservaAEditar && reservaId) {
        // === MODO REAGENDAR / EDITAR ===
        
        // 1. Si cambió de clase, liberamos el espacio ocupado de la clase anterior
        if (reservaAEditar.clase_id_anterior && reservaAEditar.clase_id_anterior !== clase.claseId) {
          const { data: claseAnt } = await supabase
            .from('clases')
            .select('espacios_ocupados')
            .eq('id', reservaAEditar.clase_id_anterior)
            .single()

          if (claseAnt && (claseAnt.espacios_ocupados || 0) > 0) {
            await supabase
              .from('clases')
              .update({ espacios_ocupados: claseAnt.espacios_ocupados - 1 })
              .eq('id', reservaAEditar.clase_id_anterior)
          }
        }

        // 2. Actualizamos la reserva existente reactivándola como "Confirmada"
        const { error: resUpdErr } = await supabase
          .from('reservas')
          .update({
            clase_id: clase.claseId,
            estatus: 'Confirmada',
            spot_id: spotId || null,
            spot_numero: spotNumero || spotId || null,
          })
          .eq('id', reservaId)

        if (resUpdErr) throw new Error(resUpdErr.message)

      } else {
        // === MODO CREAR NUEVA RESERVA ===
        const { data: reserva, error: resErr } = await supabase
          .from('reservas')
          .insert({
            cliente_id: clienteId,
            clase_id: clase.claseId,
            estatus: 'Confirmada',
            origen: 'Clase Muestra',
            es_clase_muestra: true,
            spot_id: spotId || null,
            spot_numero: spotNumero || spotId || null,
          })
          .select()
          .single()

        if (resErr) throw new Error(resErr.message)
        reservaId = reserva?.id
      }

      // 3. Incrementar el contador de espacios ocupados en la nueva clase
      const { data: claseActual } = await supabase
        .from('clases')
        .select('espacios_ocupados')
        .eq('id', clase.claseId)
        .single()

      await supabase
        .from('clases')
        .update({ espacios_ocupados: (claseActual?.espacios_ocupados || 0) + 1 })
        .eq('id', clase.claseId)

      // 4. Enviar correo de confirmación o reagendamiento
      await fetch('/api/correo/clase-muestra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: prospecto.email,
          nombre: prospecto.nombre,
          clase_nombre: clase.nombre,
          horario: clase.horario,
          sucursal: clase.sucursal,
          duracion: clase.duracion,
          qr_token: reservaId,
          spot_numero: spotNumero || null,
          es_reagendado: !!reservaAEditar, // Flag que indica si es un cambio de horario
        }),
      })

      onSuccess()
      handleClose()
    } catch (e: any) {
      console.error('ERROR:', e.message)
      alert('Error: ' + e.message)
    }
    setGuardando(false)
  }

  if (!isOpen) return null

  const PASOS = ['Prospecto', 'Clase', 'Spot']

  return (
    <>
      <div onClick={handleClose} className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" />
      <div className="fixed top-0 right-0 z-50 h-full w-full max-w-xl bg-white shadow-2xl flex flex-col">

        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-gray-900">
              {reservaAEditar ? 'Reagendar clase muestra' : 'Nueva clase muestra'}
            </h2>
            <button onClick={handleClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition">
              <X size={18} />
            </button>
          </div>

          {/* Steps */}
          <div className="flex items-center gap-2">
            {PASOS.map((label, i) => {
              const n = (i + 1) as Paso
              const activo = paso === n
              const completo = paso > n
              return (
                <div key={label} className="flex items-center gap-2 flex-1">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${
                      completo
                        ? 'bg-emerald-500 text-white'
                        : activo
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {completo ? '✓' : n}
                  </div>
                  <span className={`text-xs font-bold ${activo ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
                  {i < PASOS.length - 1 && <div className="flex-1 h-px bg-gray-100 ml-1" />}
                </div>
              )
            })}
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto">
          {paso === 1 && (
            <PasoProspecto
              onContinuar={(data) => {
                setProspecto(data)
                setPaso(2)
              }}
            />
          )}
          {paso === 2 && (
            <PasoClase
              onContinuar={(data) => {
                setClase(data)
                setPaso(3)
              }}
              onBack={() => setPaso(1)}
            />
          )}
          {paso === 3 && clase && (
            <PasoSpot
              clase={clase}
              guardando={guardando}
              onConfirmar={handleConfirmar}
              onBack={() => setPaso(2)}
            />
          )}
        </div>
      </div>
    </>
  )
}
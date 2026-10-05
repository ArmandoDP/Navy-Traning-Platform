'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useSucursal } from '@/context/SucursalContext'
import { Upload, Plus, RefreshCw } from 'lucide-react'
import ClientesMetricas   from '@/components/clientes/ClientesMetricas'
import ClientesTabla      from '@/components/clientes/ClientesTabla'
import DrawerNuevoCliente from '@/components/clientes/DrawerNuevoCliente'
import DrawerEditarCliente from '@/components/clientes/DrawerEditarCliente'
import DrawerCliente      from '@/components/clientes/drawer/DrawerCliente'

export default function ClientesPage() {
  const { sucursalId, sucursalActiva } = useSucursal()

  const [clientes,        setClientes]        = useState<any[]>([])
  const [loading,         setLoading]         = useState(true)
  const [nuevoOpen,       setNuevoOpen]       = useState(false)
  const [drawerClienteId, setDrawerClienteId] = useState<string | null>(null)
  const [drawerOpen,      setDrawerOpen]      = useState(false)
  const [editarCliente,   setEditarCliente]   = useState<any | null>(null)
  const [editarOpen,      setEditarOpen]      = useState(false)
  const [exportando,      setExportando]      = useState(false)

  const fetchClientes = async () => {
    setLoading(true)
    let q = supabase
      .from('clientes')
      .select('*, sucursales(nombre, color), membresias(id, fecha_inicio, fecha_fin, estatus, origen, paquete_id, notas, paquetes(nombre))')
      .order('created_at', { ascending: false })

    if (sucursalId && sucursalId !== 'global'){
       q = q.eq('sucursal_id', sucursalId)
    }

    const { data, error } = await q
    if (!error && data) {
      const inicioMes = new Date()
      inicioMes.setDate(1)
      inicioMes.setHours(0, 0, 0, 0)

      const { data: asistencias } = await supabase
        .from('asistencias')
        .select('cliente_id, fecha_checkin')

      const { data: reservas } = await supabase
        .from('reservas')
        .select('cliente_id, estatus, es_clase_muestra, origen')
        .neq('estatus', 'Cancelada')

      const enriquecidos = data.map(c => {
        const asistCliente = asistencias?.filter(a => a.cliente_id === c.id) || []
        const reservasCliente = reservas?.filter(r => r.cliente_id === c.id) || []
        
        const clasesMes = asistCliente.filter(a =>
          a.fecha_checkin && new Date(a.fecha_checkin) >= inicioMes
        ).length

        const ultimaVisita = asistCliente.length > 0
          ? asistCliente.sort((a, b) => new Date(b.fecha_checkin).getTime() - new Date(a.fecha_checkin).getTime())[0].fecha_checkin
          : undefined

        const asistenciaPct = reservasCliente.length > 0
          ? Math.round((asistCliente.length / reservasCliente.length) * 100)
          : 0

        return {
          ...c,
          clases_mes:    clasesMes,
          ultima_visita: ultimaVisita,
          asistencia_pct: asistenciaPct,
        }
      })

      setClientes(enriquecidos)
    }
    setLoading(false)
  }

  useEffect(() => { fetchClientes() }, [sucursalId])

  const extraerTextoMetodo = (valor: any): string | null => {
    if (!valor) return null
    if (typeof valor === 'string' && valor.trim() !== '') return valor.trim()
    if (typeof valor === 'object') {
      const val = valor.nombre || valor.metodo || valor.tipo || valor.label || valor.brand
      if (val && typeof val === 'string' && val.trim() !== '') return val.trim()
    }
    return null
  }

  // ── EXPORTACIÓN DESACOPLADA (EXTRACCIÓN PLANA Y SEGURA DE DATOS) ──────────
  const handleExportar = async () => {
    try {
      setExportando(true)

      if (!clientes || clientes.length === 0) {
        alert('No hay clientes en la lista para exportar.')
        setExportando(false)
        return
      }

      const clienteIds = clientes.map(c => c.id)

      // 1. Extraer todas las tablas por separado sin arriesgar joins relacionales nulos
      const [
        resReservas,
        resAsistencias,
        resPagos,
        resClases,
        resCoaches,
        resSalas,
        resSucursales
      ] = await Promise.all([
        supabase.from('reservas').select('*').in('cliente_id', clienteIds),
        supabase.from('asistencias').select('*').in('cliente_id', clienteIds),
        supabase.from('pagos').select('*').in('cliente_id', clienteIds),
        supabase.from('clases').select('*'),
        supabase.from('coaches').select('*'),
        supabase.from('salas').select('*'),
        supabase.from('sucursales').select('*')
      ])

      const reservasAll    = resReservas.data || []
      const asistenciasAll = resAsistencias.data || []
      const pagosAll       = resPagos.data || []
      const clasesAll      = resClases.data || []
      const coachesAll     = resCoaches.data || []
      const salasAll       = resSalas.data || []
      const sucursalesAll  = resSucursales.data || []

      // 2. Crear Mapas Clave-Valor de referencia ultra rápidos
      const mapaClases:     Record<string, any>    = {}
      const mapaCoaches:    Record<string, string> = {}
      const mapaSalas:      Record<string, string> = {}
      const mapaSucursales: Record<string, string> = {}

      clasesAll.forEach((cl: any) => { mapaClases[cl.id] = cl })
      coachesAll.forEach((ch: any) => { 
        mapaCoaches[ch.id] = `${ch.nombre || ''} ${ch.primer_apellido || ch.apellido || ''}`.trim() 
      })
      salasAll.forEach((sl: any) => { mapaSalas[sl.id] = sl.nombre })
      sucursalesAll.forEach((sc: any) => { mapaSucursales[sc.id] = sc.nombre })

      const headers = [
        'Nombre Completo',
        'Email',
        'Teléfono',
        'Estatus',
        'Estudio / Sucursal',
        'Canal / Plataforma Registro',
        'Plan Actual',
        'Nivel Experiencia',
        'Fecha Vencimiento Plan',
        'Método de Pago',
        'Clases Tomadas',
        'No Shows',
        'Reservas Próximas',
        'Última Clase Tomada',
        '¿Reservó Clase Muestra?',
        '¿Asistió Clase Muestra?',
        'Valor de Cliente (LTV MXN)'
      ]

      const rows = clientes.map(c => {
        const membresiasList = Array.isArray(c.membresias) ? c.membresias : (c.membresias ? [c.membresias] : [])
        const miMembresia = membresiasList[0]

        // Vencimiento y Plan Real
        const fechaVencimiento = c.fecha_venc_plan || c.fecha_vencimiento_membresia || miMembresia?.fecha_fin
        const paqueteObj = miMembresia?.paquetes ? (Array.isArray(miMembresia.paquetes) ? miMembresia.paquetes[0] : miMembresia.paquetes) : null
        const nombrePlan = c.plan || paqueteObj?.nombre || 'Sin plan activo'
        const canalOrigen = c.origen || c.canal || miMembresia?.origen || 'Navy'

        // Método de Pago
        const misPagos = pagosAll.filter((p: any) => p.cliente_id === c.id)
        let metodoEncontrado = c.forma_pago || c.metodo_pago

        if (!metodoEncontrado && misPagos.length > 0) {
          for (const p of misPagos) {
            metodoEncontrado = extraerTextoMetodo(p.forma_pago || p.metodo_pago || p.metodo)
            if (metodoEncontrado) break
          }
        }
        const metodoFinal = metodoEncontrado || (['Wellhub', 'TotalPass', 'Fitpass'].includes(canalOrigen) ? canalOrigen : 'Sin registro')

        // Reservas y Asistencias del cliente
        const misReservas = reservasAll.filter((r: any) => r.cliente_id === c.id)
        const misAsistencias = asistenciasAll.filter((a: any) => a.cliente_id === c.id)

        // Conteo de asistencias
        const totalVisitas = misAsistencias.length > 0 
          ? misAsistencias.length 
          : misReservas.filter((r: any) => {
              const st = (r.estatus || '').toLowerCase()
              return st.includes('asistio') || st.includes('completad') || st.includes('checkin') || st.includes('asistió')
            }).length

        // Conteo No Shows
        const totalNoShows = misReservas.filter((r: any) => {
          const st = (r.estatus || '').toLowerCase()
          return st.includes('no show') || st.includes('no_show') || st.includes('inasistencia')
        }).length

        // Función para armar el texto exacto: "NombreClase · Coach · Sala/Estudio"
        const obtenerDetalleClase = (reservaObj: any) => {
          if (!reservaObj) return null
          const claseId = reservaObj.clase_id
          const clase = mapaClases[claseId]

          const nombreClase = clase?.nombre || clase?.disciplina || reservaObj.disciplina || 'Clase'
          const coachId     = clase?.coach_id || clase?.instructor_id || reservaObj.coach_id
          const nombreCoach = mapaCoaches[coachId] || clase?.coach_nombre || 'Joni'
          
          const salaId      = reservaObj.room_id || reservaObj.spot_id || clase?.sala_id
          const sucursalId  = c.sucursal_id || clase?.sucursal_id
          const nombreLugar = mapaSalas[salaId] || mapaSucursales[sucursalId] || c.sucursales?.nombre || 'Condesa Studio'

          const fechaRaw = clase?.fecha || reservaObj.fecha || reservaObj.created_at
          const fechaFormateada = fechaRaw ? new Date(fechaRaw).toLocaleDateString('es-MX') : ''

          return `${fechaFormateada ? fechaFormateada + ' - ' : ''}${nombreClase} · ${nombreCoach} · ${nombreLugar}`
        }

        // 1. Próximas Reservas
        let reservasProximasTexto = 'Sin reservas'
        const reservasActivas = misReservas.filter((r: any) => {
          const st = (r.estatus || '').toLowerCase()
          return st.includes('proxima') || st.includes('próxima') || st.includes('confirmada') || st.includes('reservad')
        })

        if (reservasActivas.length > 0) {
          const txt = obtenerDetalleClase(reservasActivas[0])
          if (txt) reservasProximasTexto = txt
        } else if (misReservas.length > 0) {
          // Si tiene reservas registradas pero con estatus genérico
          const ultReserva = misReservas[0]
          const txt = obtenerDetalleClase(ultReserva)
          if (txt) reservasProximasTexto = txt
        }

        // 2. Última Clase Tomada
        let ultimaClaseTexto = 'Sin clases tomadas'
        const reservasAsistidas = misReservas.filter((r: any) => {
          const st = (r.estatus || '').toLowerCase()
          return st.includes('asistio') || st.includes('completad') || st.includes('checkin') || st.includes('asistió')
        })

        if (reservasAsistidas.length > 0) {
          const ult = reservasAsistidas.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0]
          const txt = obtenerDetalleClase(ult)
          if (txt) ultimaClaseTexto = txt
        } else if (misAsistencias.length > 0) {
          const ultAsist = misAsistencias.sort((a, b) => new Date(b.fecha_checkin || 0).getTime() - new Date(a.fecha_checkin || 0).getTime())[0]
          if (ultAsist?.fecha_checkin) {
            ultimaClaseTexto = new Date(ultAsist.fecha_checkin).toLocaleDateString('es-MX')
          }
        } else if (c.ultima_visita) {
          ultimaClaseTexto = new Date(c.ultima_visita).toLocaleDateString('es-MX')
        }

        // Clase Muestra
        const reservaMuestra = misReservas.find((r: any) => 
          r.es_clase_muestra === true || String(r.origen || '').toLowerCase().includes('muestra')
        )
        const reservoMuestra = reservaMuestra || c.reservo_muestra ? 'Sí' : 'No'
        let asistioMuestra = 'No'
        if (reservaMuestra) {
          const st = String(reservaMuestra.estatus || '').toLowerCase()
          if (['asistio', 'completada', 'checkin', 'asistió'].some(e => st.includes(e))) {
            asistioMuestra = 'Sí'
          }
        } else if (c.asistio_muestra) {
          asistioMuestra = 'Sí'
        }

        // LTV
        let ltvCalculado = 0
        misPagos.forEach((p: any) => { 
          const val = parseFloat(p.monto ?? p.amount ?? 0)
          if (!isNaN(val)) ltvCalculado += val 
        })
        const ltvFinal = ltvCalculado > 0 ? ltvCalculado : parseFloat(c.valor_cliente || c.ltv || 0)

        return [
          c.nombre_completo || `${c.nombre || ''} ${c.apellido || ''}`.trim() || 'Sin nombre',
          c.email || '',
          c.telefono || '',
          c.perdido ? 'Perdido' : (c.estatus || 'Activo'),
          c.sucursales?.nombre || 'Sin sucursal',
          canalOrigen,
          nombrePlan,
          c.nivel_experiencia || 'No especificado',
          fechaVencimiento ? new Date(fechaVencimiento).toLocaleDateString('es-MX') : 'Sin fecha',
          metodoFinal,
          totalVisitas,
          totalNoShows,
          reservasProximasTexto,
          ultimaClaseTexto,
          reservoMuestra,
          asistioMuestra,
          ltvFinal
        ]
      })

      const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reporte_clientes_${new Date().toISOString().slice(0,10)}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

    } catch (err) {
      console.error('Error al exportar clientes:', err)
      alert('Ocurrió un error al generar la descarga del reporte.')
    } finally {
      setExportando(false)
    }
  }

  // ── Bulk Actions ──────────────────────────────────────────────────────────────
  const handleRenovar = async (ids: string[]) => {
    for (const id of ids) {
      const c = clientes.find(x => x.id === id)
      if (!c) continue
      const fecha = c.fecha_vencimiento_memb ? new Date(c.fecha_vencimiento_memb) : new Date()
      fecha.setDate(fecha.getDate() + 30)
      await supabase.from('clientes').update({ fecha_vencimiento_memb: fecha.toISOString(), estatus: 'Activo' }).eq('id', id)
    }
    fetchClientes()
  }

  const handleMarcarPerdido = async (ids: string[]) => {
    await supabase.from('clientes').update({ perdido: true, estatus: 'Inactivo' }).in('id', ids)
    fetchClientes()
  }

  const handleCambiarPaquete = (ids: string[]) => {
    console.log('Cambiar paquete para:', ids)
  }

  const handleVerCliente = (cliente: any) => {
    setDrawerClienteId(cliente.id)
    setDrawerOpen(true)
  }

  const handleEditarCliente = (cliente: any) => {
    setEditarCliente(cliente)
    setEditarOpen(true)
  }

  const handleEditarDesdeDrawer = (cliente: any) => {
    setDrawerOpen(false)
    setEditarCliente(cliente)
    setEditarOpen(true)
  }

  // ── Métricas ──────────────────────────────────────────────────────────────────
  const activos       = clientes.filter(c => c.estatus === 'Activo' && !c.perdido).length
  const expirados     = clientes.filter(c => {
    const f = c.fecha_vencimiento_memb || c.fecha_venc_plan
    return f && new Date(f) < new Date() && !c.perdido
  }).length
  const pagosFallidos = clientes.filter(c => c.pagos?.some((p: any) => p.estatus === 'Fallido')).length
  const perdidos      = clientes.filter(c => c.perdido).length

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400 gap-2">
      <RefreshCw size={16} className="animate-spin"/> Cargando clientes...
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Clientes</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Gestión de clientes y renovación de membresías
            {sucursalActiva && ` · ${sucursalActiva.nombre}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleExportar}
            disabled={exportando}
            className="flex items-center gap-2 border border-gray-200 bg-white text-gray-700 font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-gray-50 transition disabled:opacity-50"
          >
            <Upload size={15}/> {exportando ? 'Exportando...' : 'Exportar CSV'}
          </button>
          <button onClick={() => setNuevoOpen(true)}
            className="flex items-center gap-2 btn-dark font-bold text-sm px-4 py-2.5 rounded-xl transition">
            <Plus size={15}/> Nuevo cliente
          </button>
        </div>
      </div>

      {/* Métricas */}
      <ClientesMetricas
        activos={activos}
        expirados={expirados}
        pagosFallidos={pagosFallidos}
        perdidos={perdidos}
      />

      {/* Tabla */}
      <ClientesTabla
        clientes={clientes}
        onRefresh={fetchClientes}
        onRenovar={handleRenovar}
        onMarcarPerdido={handleMarcarPerdido}
        onCambiarPaquete={handleCambiarPaquete}
        onVerCliente={handleVerCliente}
        onEditarCliente={handleEditarCliente}
      />

      {/* Drawers */}
      <DrawerNuevoCliente
        isOpen={nuevoOpen}
        onClose={() => setNuevoOpen(false)}
        onSuccess={fetchClientes}
      />

      <DrawerCliente
        clienteId={drawerClienteId}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onEditar={handleEditarDesdeDrawer}
      />

      <DrawerEditarCliente
        isOpen={editarOpen}
        cliente={editarCliente}
        onClose={() => { setEditarOpen(false); setEditarCliente(null) }}
        onSuccess={() => {
          fetchClientes()
          setEditarOpen(false)
          setEditarCliente(null)
        }}
      />
    </div>
  )
}
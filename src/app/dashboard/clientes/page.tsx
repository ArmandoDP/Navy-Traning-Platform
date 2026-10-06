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

    if (sucursalId && sucursalId !== 'global') {
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

  const handleExportar = async () => {
    try {
      setExportando(true)

      if (!clientes || clientes.length === 0) {
        alert('No hay clientes cargados en la pantalla para exportar.')
        setExportando(false)
        return
      }

      const clienteIds = clientes.map(c => c.id).filter(Boolean)

      // 1. Consultas individuales en paralelo sin relaciones anidadas en Supabase
      const [
        resReservas,
        resAsistencias,
        resPagos,
        resClases,
        resSalas,
        resSucursales
      ] = await Promise.all([
        supabase.from('reservas').select('*').in('cliente_id', clienteIds),
        supabase.from('asistencias').select('*').in('cliente_id', clienteIds),
        supabase.from('pagos').select('*').in('cliente_id', clienteIds),
        supabase.from('clases').select('*'),
        supabase.from('salas').select('*'),
        supabase.from('sucursales').select('*')
      ])

      if (resReservas.error) console.warn('Aviso al traer reservas:', resReservas.error)
      if (resAsistencias.error) console.warn('Aviso al traer asistencias:', resAsistencias.error)
      if (resPagos.error) console.warn('Aviso al traer pagos:', resPagos.error)
      if (resClases.error) console.warn('Aviso al traer clases:', resClases.error)

      const reservasAll    = resReservas.data || []
      const asistenciasAll = resAsistencias.data || []
      const pagosAll       = resPagos.data || []
      const clasesAll      = resClases.data || []
      const salasAll       = resSalas.data || []
      const sucursalesAll  = resSucursales.data || []

      // Mapas de búsqueda rápida en memoria
      const mapaClases:     Record<string, any>    = {}
      const mapaSalas:      Record<string, string> = {}
      const mapaSucursales: Record<string, string> = {}

      clasesAll.forEach((cl: any) => { if (cl?.id) mapaClases[cl.id] = cl })
      salasAll.forEach((sl: any) => { if (sl?.id) mapaSalas[sl.id] = sl.nombre })
      sucursalesAll.forEach((sc: any) => { if (sc?.id) mapaSucursales[sc.id] = sc.nombre })

      const headers = [
        'Nombre Completo',
        'Email',
        'Teléfono',
        'Estatus',
        'Estudio / Sucursal',
        'Canal / Plataforma Registro',
        'Plan Actual',
        'Fecha Alta',
        'Antigüedad',
        'Nivel Experiencia',
        'Fecha Vencimiento Plan',
        'Método de Pago',
        'Clases Tomadas (Visitas)',
        'No Shows',
        '% Asistencia',
        'Reservas Próximas',
        'Última Clase Tomada',
        '¿Reservó Clase Muestra?',
        '¿Asistió Clase Muestra?',
        'Valor de Cliente (LTV MXN)'
      ]

      const ahora = new Date()

      const rows = clientes.map(c => {
        const membresiasList = Array.isArray(c.membresias) ? c.membresias : (c.membresias ? [c.membresias] : [])
        const miMembresia = membresiasList[0]

        const fechaVencimiento = c.fecha_venc_plan || c.fecha_vencimiento_membresia || miMembresia?.fecha_fin
        const paqueteObj = miMembresia?.paquetes ? (Array.isArray(miMembresia.paquetes) ? miMembresia.paquetes[0] : miMembresia.paquetes) : null
        const nombrePlan = c.plan || paqueteObj?.nombre || 'Sin plan activo'
        
        let canalOrigen = c.origen || c.canal || miMembresia?.origen || 'Prospecto'
        if (c.plan === 'Wellhub' || c.origen === 'Wellhub') canalOrigen = 'Wellhub'
        else if (c.plan === 'TotalPass' || c.origen === 'TotalPass') canalOrigen = 'TotalPass'
        else if (c.estatus === 'Prospecto' || (!c.plan && (!c.membresias || c.membresias.length === 0))) canalOrigen = 'Prospecto'
        else if (!canalOrigen || canalOrigen === 'Prospecto') canalOrigen = 'Navy'

        const fechaAltaStr = (c.created_at || c.fecha_alta_original) 
          ? new Date(c.fecha_alta_original || c.created_at).toLocaleDateString('es-MX') 
          : 'Sin fecha'
          
        let antiguedadStr = 'Hoy'
        if (c.created_at || c.fecha_alta_original) {
          const dias = Math.floor((ahora.getTime() - new Date(c.fecha_alta_original || c.created_at).getTime()) / (1000 * 3600 * 24))
          antiguedadStr = dias <= 0 ? 'Hoy' : `${dias} días`
        }

        const misPagos = pagosAll.filter((p: any) => p.cliente_id === c.id)
        let metodoEncontrado = c.forma_pago || c.metodo_pago

        if (!metodoEncontrado && misPagos.length > 0) {
          for (const p of misPagos) {
            metodoEncontrado = extraerTextoMetodo(p.forma_pago || p.metodo_pago || p.metodo)
            if (metodoEncontrado) break
          }
        }
        const metodoFinal = metodoEncontrado || (['Wellhub', 'TotalPass', 'Fitpass'].includes(canalOrigen) ? canalOrigen : 'Sin registro')

        const misReservas = reservasAll.filter((r: any) => r.cliente_id === c.id)
        const misAsistencias = asistenciasAll.filter((a: any) => a.cliente_id === c.id)

        const totalVisitas = misAsistencias.length > 0 
          ? misAsistencias.length 
          : (c.visitas || misReservas.filter((r: any) => {
              const st = String(r.estatus || '').toLowerCase()
              return st.includes('asistio') || st.includes('completad') || st.includes('checkin') || st.includes('asistió')
            }).length || 0)

        const totalNoShows = c.no_shows !== undefined 
          ? c.no_shows 
          : misReservas.filter((r: any) => {
              const st = String(r.estatus || '').toLowerCase()
              return st.includes('no show') || st.includes('no_show') || st.includes('inasistencia')
            }).length

        const pctAsistencia = c.asistencia_pct !== undefined 
          ? `${c.asistencia_pct}%` 
          : (misReservas.length > 0 ? `${Math.round((totalVisitas / misReservas.length) * 100)}%` : '0%')

        // Extrae el objeto fecha de la reserva o clase asociada
        const getFechaObjeto = (r: any): Date => {
          if (!r) return new Date(0)
          const clase = mapaClases[r.clase_id] || {}
          const fRaw = r.horario || r.fecha || clase.horario || clase.fecha_hora || clase.fecha || r.created_at
          return fRaw ? new Date(fRaw) : new Date(0)
        }

        // Formatea el detalle completo de la clase
        const obtenerDetalleClase = (r: any) => {
          if (!r) return null
          const clase = mapaClases[r.clase_id] || {}

          const nombreClase = r.nombre_clase || clase.nombre_clase || clase.nombre || 'Clase'
          const instructor  = r.instructor || clase.instructor || clase.coach || 'Sin instructor'
          
          const sucursalId  = r.sucursal_id || clase.sucursal_id || c.sucursal_id
          const nombreLugar = mapaSalas[r.room_id || r.spot_id] || mapaSucursales[sucursalId] || c.sucursales?.nombre || 'Condesa Studio'

          const fechaObj = getFechaObjeto(r)
          let fechaFormateada = ''
          if (fechaObj.getTime() > 0) {
            const fStr = fechaObj.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
            const hStr = fechaObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
            fechaFormateada = `${fStr} ${hStr}`
          }

          return `${fechaFormateada} - ${nombreClase} · ${instructor} · ${nombreLugar}`
        }

        // 1. RESERVAS PRÓXIMAS
        let reservasProximasTexto = 'Sin reservas'
        const reservasValidas = misReservas.filter((r: any) => {
          const st = String(r.estatus || '').toLowerCase()
          return !st.includes('cancel')
        })

        if (reservasValidas.length > 0) {
          const ordenadas = [...reservasValidas].sort((a: any, b: any) => getFechaObjeto(b).getTime() - getFechaObjeto(a).getTime())
          const txt = obtenerDetalleClase(ordenadas[0])
          if (txt) reservasProximasTexto = txt
        }

        // 2. ÚLTIMA CLASE TOMADA
        let ultimaClaseTexto = 'Sin clases tomadas'
        if (misAsistencias.length > 0) {
          const ultAsist = [...misAsistencias].sort((a: any, b: any) => new Date(b.fecha_checkin || 0).getTime() - new Date(a.fecha_checkin || 0).getTime())[0]
          const txt = obtenerDetalleClase(ultAsist)
          if (txt) ultimaClaseTexto = txt
          else if (ultAsist.fecha_checkin) ultimaClaseTexto = new Date(ultAsist.fecha_checkin).toLocaleDateString('es-MX')
        } else if (reservasValidas.length > 0) {
          const txt = obtenerDetalleClase(reservasValidas[0])
          if (txt) ultimaClaseTexto = txt
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
          if (['asistio', 'completada', 'checkin', 'asistió', 'confirmada'].some(e => st.includes(e))) {
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
        const ltvTexto = isNaN(ltvFinal) || ltvFinal === 0 ? '0' : ltvFinal.toFixed(2)

        return [
          c.nombre_completo || `${c.nombre || ''} ${c.apellido || ''}`.trim() || 'Sin nombre',
          c.email || '',
          c.telefono || '',
          c.perdido ? 'Perdido' : (c.estatus || 'Activo'),
          c.sucursales?.nombre || 'Sin sucursal',
          canalOrigen,
          nombrePlan,
          fechaAltaStr,
          antiguedadStr,
          c.nivel_experiencia || 'No especificado',
          fechaVencimiento ? new Date(fechaVencimiento).toLocaleDateString('es-MX') : 'Sin fecha',
          metodoFinal,
          totalVisitas,
          totalNoShows,
          pctAsistencia,
          reservasProximasTexto,
          ultimaClaseTexto,
          reservoMuestra,
          asistioMuestra,
          ltvTexto
        ]
      })

      // Generar archivo CSV
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

      alert('¡Exportación completada con éxito!')

    } catch (err: any) {
      console.error('Error al exportar:', err)
      alert(`Error al exportar: ${err?.message || 'Revisa la consola del navegador'}`)
    } finally {
      setExportando(false)
    }
  }

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

      <ClientesMetricas
        activos={activos}
        expirados={expirados}
        pagosFallidos={pagosFallidos}
        perdidos={perdidos}
      />

      <ClientesTabla
        clientes={clientes}
        onRefresh={fetchClientes}
        onRenovar={handleRenovar}
        onMarcarPerdido={handleMarcarPerdido}
        onCambiarPaquete={handleCambiarPaquete}
        onVerCliente={handleVerCliente}
        onEditarCliente={handleEditarCliente}
      />

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
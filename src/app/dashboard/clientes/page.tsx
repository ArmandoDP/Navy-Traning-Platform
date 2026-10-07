'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useSucursal } from '@/context/SucursalContext'
import { Upload, Plus, RefreshCw } from 'lucide-react'
import ClientesMetricas from '@/components/clientes/ClientesMetricas'
import ClientesTabla from '@/components/clientes/ClientesTabla'
import DrawerNuevoCliente from '@/components/clientes/DrawerNuevoCliente'
import DrawerEditarCliente from '@/components/clientes/DrawerEditarCliente'
import DrawerCliente from '@/components/clientes/drawer/DrawerCliente'

export default function ClientesPage() {
  const { sucursalId, sucursalActiva } = useSucursal()

  const [clientes, setClientes] = useState<any[]>([])
  const [clientesFiltrados, setClientesFiltrados] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [nuevoOpen, setNuevoOpen] = useState(false)
  const [drawerClienteId, setDrawerClienteId] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editarCliente, setEditarCliente] = useState<any | null>(null)
  const [editarOpen, setEditarOpen] = useState(false)
  const [exportando, setExportando] = useState(false)

  const fetchClientes = async () => {
    setLoading(true)
    try {
      let q = supabase
        .from('clientes')
        .select('*, sucursales(nombre, color), membresias(id, fecha_inicio, fecha_fin, estatus, origen, paquete_id, notas, paquetes(nombre))')
        .order('created_at', { ascending: false })

      if (sucursalId && sucursalId !== 'global') {
        q = q.eq('sucursal_id', sucursalId)
      }

      const { data, error } = await q
      if (error) throw error

      if (data) {
        const ahora = new Date()
        const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1)

        const { data: reservas } = await supabase
          .from('reservas')
          .select('cliente_id, usuario_id, estatus, status, fecha, horario, created_at')

        const enriquecidos = data.map(c => {
          const misReservas = reservas?.filter(r => 
            r.cliente_id === c.id || r.usuario_id === c.id
          ) || []
          
          const misAsistencias = misReservas.filter(r => {
            const st = String(r.estatus || r.status || '').toLowerCase().trim()
            if (st.includes('cancel') || st.includes('no show') || st.includes('inasistencia')) return false
            
            const fRaw = r.fecha || r.horario || r.created_at
            const fFecha = fRaw ? new Date(fRaw) : new Date(0)
            
            const esEstadoAsistio = ['asistió', 'asistio', 'asistida', 'completada', 'checkin'].includes(st)
            const esPasadaValida = fFecha.getTime() > 0 && fFecha <= ahora

            return esEstadoAsistio || esPasadaValida
          })

          const clasesMes = misAsistencias.filter(a => {
            const f = a.fecha || a.horario || a.created_at
            return f && new Date(f) >= inicioMes
          }).length

          const ultimasAsistencias = [...misAsistencias].sort((a, b) => {
            const fA = new Date(a.fecha || a.horario || a.created_at).getTime()
            const fB = new Date(b.fecha || b.horario || b.created_at).getTime()
            return fB - fA
          })

          const ultimaVisita = ultimasAsistencias[0] 
            ? (ultimasAsistencias[0].fecha || ultimasAsistencias[0].horario || ultimasAsistencias[0].created_at)
            : undefined

          const reservasValidas = misReservas.filter(r => {
            const st = String(r.estatus || r.status || '').toLowerCase()
            return !st.includes('cancel')
          })

          const asistenciaPct = reservasValidas.length > 0
            ? Math.round((misAsistencias.length / reservasValidas.length) * 100)
            : 0

          return {
            ...c,
            clases_mes: clasesMes,
            ultima_visita: ultimaVisita,
            asistencia_pct: asistenciaPct,
          }
        })

        setClientes(enriquecidos)
        setClientesFiltrados(enriquecidos)
      }
    } catch (err) {
      console.error('Error al cargar clientes:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClientes()
  }, [sucursalId])

  const extraerTextoMetodo = (valor: any): string | null => {
    if (!valor) return null
    if (typeof valor === 'string' && valor.trim() !== '') return valor.trim()
    if (typeof valor === 'object') {
      const val = valor.nombre || valor.metodo || valor.tipo || valor.label || valor.brand
      if (val && typeof val === 'string' && val.trim() !== '') return val.trim()
    }
    return null
  }

  const fetchAllTableComplete = async (tableName: string) => {
    let allData: any[] = []
    let page = 0
    const pageSize = 1000
    let keepFetching = true

    while (keepFetching) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (error) {
        console.warn(`Error al consultar ${tableName}:`, error)
        break
      }
      if (data && data.length > 0) {
        allData = [...allData, ...data]
        if (data.length < pageSize) keepFetching = false
        else page++
      } else {
        keepFetching = false
      }
    }
    return allData
  }

  const handleExportar = async () => {
    try {
      setExportando(true)

      const listaAExportar = clientesFiltrados.length > 0 ? clientesFiltrados : clientes

      if (!listaAExportar || listaAExportar.length === 0) {
        setExportando(false)
        return
      }

      const [
        reservasAll,
        pagosAll,
        clasesAll,
        salasAll,
        sucursalesAll
      ] = await Promise.all([
        fetchAllTableComplete('reservas'),
        fetchAllTableComplete('pagos'),
        fetchAllTableComplete('clases'),
        fetchAllTableComplete('salas'),
        fetchAllTableComplete('sucursales')
      ])

      const mapaClases: Record<string, any> = {}
      const mapaSalas: Record<string, string> = {}
      const mapaSucursales: Record<string, string> = {}

      clasesAll.forEach((cl: any) => { if (cl?.id) mapaClases[cl.id] = cl })
      salasAll.forEach((sl: any) => { if (sl?.id) mapaSalas[sl.id] = sl.nombre || sl.name })
      sucursalesAll.forEach((sc: any) => { if (sc?.id) mapaSucursales[sc.id] = sc.nombre || sc.name })

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

      const rows = listaAExportar.map(c => {
        const membresiasList = Array.isArray(c.membresias) ? c.membresias : (c.membresias ? [c.membresias] : [])
        const miMembresia = membresiasList.find((m: any) => m.estatus === 'activa') || membresiasList[0]

        const fechaVencimiento = miMembresia?.fecha_fin || c.fecha_venc_plan || c.fecha_vencimiento_membresia || c.fecha_vencimiento_memb
        const paqueteObj = miMembresia?.paquetes ? (Array.isArray(miMembresia.paquetes) ? miMembresia.paquetes[0] : miMembresia.paquetes) : null
        const nombrePlan = c.plan || c.paquete || paqueteObj?.nombre || miMembresia?.notas || 'Sin plan activo'
        
        let canalOrigen = c.origen || c.canal || miMembresia?.origen || 'Prospecto'
        const planLower = String(nombrePlan).toLowerCase()
        const origenLower = String(canalOrigen).toLowerCase()

        if (planLower.includes('wellhub') || origenLower.includes('wellhub')) canalOrigen = 'Wellhub'
        else if (planLower.includes('totalpass') || origenLower.includes('totalpass')) canalOrigen = 'TotalPass'
        else if (planLower.includes('fitpass') || origenLower.includes('fitpass')) canalOrigen = 'Fitpass'
        else if (c.estatus === 'Prospecto' || (!c.plan && (!c.membresias || c.membresias.length === 0))) canalOrigen = 'Prospecto'
        else if (!canalOrigen || canalOrigen === 'Prospecto') canalOrigen = 'Navy'

        const fechaAltaStr = (c.created_at || c.fecha_alta_original) 
          ? new Date(c.fecha_alta_original || c.created_at).toLocaleDateString('es-MX') 
          : 'Sin fecha'
          
        let antiguedadStr = 'Hoy'
        const fAltaRaw = c.fecha_alta_original || c.created_at
        if (fAltaRaw) {
          const dias = Math.floor((ahora.getTime() - new Date(fAltaRaw).getTime()) / (1000 * 3600 * 24))
          antiguedadStr = dias <= 0 ? 'Hoy' : `${dias} días`
        }

        const misPagos = pagosAll.filter((p: any) => p.cliente_id === c.id || p.usuario_id === c.id)
        let metodoEncontrado = c.forma_pago || c.metodo_pago

        if (!metodoEncontrado && misPagos.length > 0) {
          for (const p of misPagos) {
            metodoEncontrado = extraerTextoMetodo(p.forma_pago || p.metodo_pago || p.metodo || p.payment_method)
            if (metodoEncontrado) break
          }
        }

        let metodoFinal = 'Sin registro'
        if (['Wellhub', 'TotalPass', 'Fitpass'].includes(canalOrigen)) {
          metodoFinal = canalOrigen
        } else {
          metodoFinal = metodoEncontrado || 'Sin registro'
        }

        const misReservas = reservasAll.filter((r: any) => r.cliente_id === c.id || r.usuario_id === c.id)
        
        const getFechaObjeto = (r: any): Date => {
          if (!r) return new Date(0)
          const clase = mapaClases[r.clase_id] || {}
          const fRaw = r.horario || r.fecha || r.fecha_checkin || clase.horario || clase.fecha_hora || clase.fecha || r.created_at
          return fRaw ? new Date(fRaw) : new Date(0)
        }

        let inicioPeriodo = miMembresia?.fecha_inicio ? new Date(miMembresia.fecha_inicio) : null
        let finPeriodo = miMembresia?.fecha_fin ? new Date(miMembresia.fecha_fin) : null

        if (!inicioPeriodo || isNaN(inicioPeriodo.getTime())) {
          inicioPeriodo = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
        }
        if (!finPeriodo || isNaN(finPeriodo.getTime())) {
          finPeriodo = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59)
        }

        const misAsistencias = misReservas.filter((r: any) => {
          const st = String(r.estatus || r.status || '').toLowerCase().trim()
          if (st.includes('cancel') || st.includes('no show') || st.includes('inasistencia')) return false
          
          const fObj = getFechaObjeto(r)
          const fTime = fObj.getTime()
          if (fTime === 0) return false

          const esEstadoAsistio = ['asistió', 'asistio', 'asistida', 'completada', 'checkin'].includes(st)
          const esPasadaValida = fTime <= ahora.getTime()

          const estaEnPeriodo = fTime >= inicioPeriodo!.getTime() && fTime <= finPeriodo!.getTime()

          return (esEstadoAsistio || esPasadaValida) && estaEnPeriodo
        })

        const totalVisitas = misAsistencias.length

        const totalNoShows = misReservas.filter((r: any) => {
          const st = String(r.estatus || r.status || '').toLowerCase()
          return st.includes('no show') || st.includes('no_show') || st.includes('inasistencia')
        }).length

        const reservasValidas = misReservas.filter((r: any) => !String(r.estatus || r.status || '').toLowerCase().includes('cancel'))
        const pctAsistencia = reservasValidas.length > 0 ? `${Math.round((totalVisitas / reservasValidas.length) * 100)}%` : '0%'

        const obtenerDetalleClase = (r: any) => {
          if (!r) return null
          const clase = mapaClases[r.clase_id] || {}

          const nombreClase = r.nombre_clase || clase.nombre_clase || clase.nombre || 'Clase'
          const instructor = r.instructor || clase.instructor || clase.coach || 'Sin instructor'
          
          const sucursalId = r.sucursal_id || clase.sucursal_id || c.sucursal_id
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

        const reservasFuturas = reservasValidas.filter((r: any) => getFechaObjeto(r).getTime() > ahora.getTime())
        let reservasProximasTexto = 'Sin reservas'
        if (reservasFuturas.length > 0) {
          const ordenadasFuturas = [...reservasFuturas].sort((a: any, b: any) => getFechaObjeto(a).getTime() - getFechaObjeto(b).getTime())
          const txt = obtenerDetalleClase(ordenadasFuturas[0])
          if (txt) reservasProximasTexto = txt
        }

        let ultimaClaseTexto = 'Sin clases tomadas'
        if (misAsistencias.length > 0) {
          const ultAsist = [...misAsistencias].sort((a: any, b: any) => getFechaObjeto(b).getTime() - getFechaObjeto(a).getTime())[0]
          const txt = obtenerDetalleClase(ultAsist)
          if (txt) ultimaClaseTexto = txt
          else {
            const fObj = getFechaObjeto(ultAsist)
            if (fObj.getTime() > 0) ultimaClaseTexto = fObj.toLocaleDateString('es-MX')
          }
        }

        const reservaMuestra = misReservas.find((r: any) => 
          r.es_clase_muestra === true || String(r.origen || '').toLowerCase().includes('muestra')
        )
        const reservoMuestra = reservaMuestra || c.reservo_muestra ? 'Sí' : 'No'
        let asistioMuestra = 'No'
        if (reservaMuestra) {
          const st = String(reservaMuestra.estatus || reservaMuestra.status || '').toLowerCase()
          if (['asistio', 'asistió', 'completada', 'checkin', 'confirmada'].some(e => st.includes(e))) {
            asistioMuestra = 'Sí'
          }
        } else if (c.asistio_muestra) {
          asistioMuestra = 'Sí'
        }

        let ltvCalculado = 0
        misPagos.forEach((p: any) => { 
          const val = parseFloat(p.monto ?? p.amount ?? p.total ?? 0)
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

      const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reporte_clientes_filtrados_${new Date().toISOString().slice(0,10)}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

    } catch (err: any) {
      console.error('Error al exportar:', err)
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

  const activos = clientes.filter(c => c.estatus === 'Activo' && !c.perdido).length
  const expirados = clientes.filter(c => {
    const f = c.fecha_vencimiento_memb || c.fecha_venc_plan
    return f && new Date(f) < new Date() && !c.perdido
  }).length
  const pagosFallidos = clientes.filter(c => c.pagos?.some((p: any) => p.estatus === 'Fallido')).length
  const perdidos = clientes.filter(c => c.perdido).length

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
            <Upload size={15}/> {exportando ? 'Exportando...' : `Exportar (${clientesFiltrados.length})`}
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
        onFiltradosChange={setClientesFiltrados}
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
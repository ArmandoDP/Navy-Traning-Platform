'use client'
import { useState } from 'react'
import { Download, Calendar, Coffee, Store, Building2 } from 'lucide-react'
import FinanzasResumen       from '@/components/finanzas/FinanzasResumen'
import FinanzasIngresos      from '@/components/finanzas/FinanzasIngresos'
import FinanzasTransacciones from '@/components/finanzas/FinanzasTransacciones'
import FinanzasPagosFallidos from '@/components/finanzas/FinanzasPagosFallidos'
import FinanzasNomina        from '@/components/finanzas/FinanzasNomina'
import { useSucursal }       from '@/context/SucursalContext'
import { supabase }          from '../../../lib/supabase'

type Tab = 'resumen' | 'ingresos' | 'transacciones' | 'fallidos' | 'nomina'
type TipoFiltroGalley = 'todos' | 'galley_solo' | 'sucursal_limpia'

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'resumen',        label: 'Resumen',           icon: '▦' },
  { key: 'ingresos',       label: 'Ingresos · Detalle', icon: '↗' },
  { key: 'transacciones',  label: 'Transacciones',    icon: '▤' },
  { key: 'fallidos',       label: 'Pagos fallidos',   icon: '⚠' },
  { key: 'nomina',         label: 'Nómina coaches',   icon: '▤' },
]

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
]

export default function FinanzasPage() {
  const [tab, setTab] = useState<Tab>('resumen')
  const [modoFecha, setModoFecha] = useState<'mes' | 'rango'>('mes')
  const [mes, setMes] = useState(new Date().getMonth())
  const [anio, setAnio] = useState(new Date().getFullYear())
  
  const todayStr = new Date().toISOString().split('T')[0]
  const firstDayStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  const [customInicio, setCustomInicio] = useState(firstDayStr)
  const [customFin, setCustomFin] = useState(todayStr)

  const [filtroGalley, setFiltroGalley] = useState<TipoFiltroGalley>('todos')
  const { sucursalId } = useSucursal()

  const fechaInicio = modoFecha === 'mes' 
    ? new Date(anio, mes, 1).toISOString().split('T')[0]
    : customInicio

  const fechaFin = modoFecha === 'mes'
    ? new Date(anio, mes + 1, 0).toISOString().split('T')[0]
    : customFin

  const subProps: any = { fechaInicio, fechaFin, sucursalId: sucursalId || undefined, filtroGalley }

  const descargarCSV = (nombreBase: string, encabezados: string[], filas: (string | number)[][]) => {
    const csvContent = [encabezados.join(','), ...filas.map((f) => f.join(','))].join('\n')
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Reporte_${nombreBase}_${fechaInicio}_al_${fechaFin}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const obtenerFechaHoraLocal = (rawFecha: string | number) => {
    if (!rawFecha) return { fecha: fechaInicio, hora: '00:00:00' }
    const d = new Date(rawFecha)
    
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    const seconds = String(d.getSeconds()).padStart(2, '0')

    return {
      fecha: `${year}-${month}-${day}`,
      hora: `${hours}:${minutes}:${seconds}`
    }
  }

  const obtenerMapaClientesYOrigen = async (registros: any[]) => {
    const mapEmails: Record<string, string> = {}
    const mapSucursalesCliente: Record<string, string> = {}
    const idsToFetch = new Set<string>()

    registros.forEach((p: any) => {
      const directEmail = p.email || p.cliente_email || p.customer_email || p.user_email
      if (directEmail && directEmail.includes('@')) {
        if (p.cliente_id) mapEmails[p.cliente_id] = directEmail
        if (p.id) mapEmails[p.id] = directEmail
      } else if (p.cliente_id) {
        idsToFetch.add(p.cliente_id)
      } else if (p.user_id) {
        idsToFetch.add(p.user_id)
      }
    })

    if (idsToFetch.size > 0) {
      const arrayIds = Array.from(idsToFetch)
      const { data: clientesData } = await supabase.from('clientes').select('id, email, sucursal_id').in('id', arrayIds)
      if (clientesData) {
        clientesData.forEach((c: any) => { 
          if (c.email) mapEmails[c.id] = c.email 
          if (c.sucursal_id) mapSucursalesCliente[c.id] = c.sucursal_id
        })
      }

      const faltantes = arrayIds.filter(id => !mapEmails[id])
      if (faltantes.length > 0) {
        const { data: usuariosData } = await supabase.from('usuarios').select('id, email').in('id', faltantes)
        if (usuariosData) usuariosData.forEach((u: any) => { if (u.email) mapEmails[u.id] = u.email })
      }
    }
    return { mapEmails, mapSucursalesCliente }
  }

  const ejecutarExportacion = async () => {
    try {
      const startMs = new Date(`${fechaInicio}T00:00:00`).getTime()
      const endMs = new Date(`${fechaFin}T23:59:59`).getTime()

      // -------------------------------------------------------------
      // 1. INGRESOS DETALLE (Identificación precisa de canal y sede)
      // -------------------------------------------------------------
      if (tab === 'ingresos') {
        const [resSucursales, resPagos] = await Promise.all([
          supabase.from('sucursales').select('id, nombre'),
          supabase.from('pagos').select('*')
        ])

        const sucursales = resSucursales.data || []
        const listaPagos = (resPagos.data || []).filter(p => {
          const t = new Date(p.created_at || p.fecha || p.fecha_pago).getTime()
          const st = (p.estatus || p.status || '').toLowerCase()
          const esExitoso = ['completado', 'completed', 'paid', 'exitoso', 'succeeded'].some(e => st.includes(e))
          return t >= startMs && t <= endMs && esExitoso
        })

        const { mapSucursalesCliente } = await obtenerMapaClientesYOrigen(listaPagos)

        const matriz: Record<string, {
          navy: number, orkestapay: number, stripe: number, fitpass: number,
          totalpass: number, wellhub: number, bruto: number, comision: number, neto: number
        }> = {}

        const mapaNombresSucursales: Record<string, string> = {}
        sucursales.forEach(s => {
          mapaNombresSucursales[s.id] = s.nombre
          matriz[s.nombre] = { navy: 0, orkestapay: 0, stripe: 0, fitpass: 0, totalpass: 0, wellhub: 0, bruto: 0, comision: 0, neto: 0 }
        })
        matriz['Venta Web / Suscripción Online'] = { navy: 0, orkestapay: 0, stripe: 0, fitpass: 0, totalpass: 0, wellhub: 0, bruto: 0, comision: 0, neto: 0 }

        listaPagos.forEach((p: any) => {
          // Intentar resolver la sucursal del pago o por perfil de cliente
          const idSucFinal = p.sucursal_id || mapSucursalesCliente[p.cliente_id]
          const sucNombre = mapaNombresSucursales[idSucFinal] || p.sucursal_nombre || 'Venta Web / Suscripción Online'
          
          if (!matriz[sucNombre]) {
            matriz[sucNombre] = { navy: 0, orkestapay: 0, stripe: 0, fitpass: 0, totalpass: 0, wellhub: 0, bruto: 0, comision: 0, neto: 0 }
          }

          const monto = Number(p.monto ?? p.amount ?? 0)
          const canal = String(p.pasarela || p.metodo_pago || p.canal || p.concepto || '').toLowerCase()

          let comisionTransaccion = Number(p.comision ?? p.fee ?? 0)

          if (canal.includes('orkesta')) {
            matriz[sucNombre].orkestapay += monto
            if (!comisionTransaccion) comisionTransaccion = monto * 0.029
          } else if (canal.includes('stripe')) {
            matriz[sucNombre].stripe += monto
            if (!comisionTransaccion) comisionTransaccion = (monto * 0.036) + (monto > 0 ? 3 : 0)
          } else if (canal.includes('fitpass')) {
            matriz[sucNombre].fitpass += monto
            if (!comisionTransaccion) comisionTransaccion = monto * 0.15
          } else if (canal.includes('totalpass')) {
            matriz[sucNombre].totalpass += monto
            if (!comisionTransaccion) comisionTransaccion = monto * 0.15
          } else if (canal.includes('wellhub')) {
            matriz[sucNombre].wellhub += monto
            if (!comisionTransaccion) comisionTransaccion = monto * 0.15
          } else {
            matriz[sucNombre].navy += monto
            if (!comisionTransaccion) comisionTransaccion = monto * 0.015
          }

          matriz[sucNombre].bruto += monto
          matriz[sucNombre].comision += comisionTransaccion
        })

        const encabezados = ['Origen / Sucursal', 'NAVY (MXN)', 'OrkestaPay (MXN)', 'Stripe (MXN)', 'Fitpass (MXN)', 'Totalpass (MXN)', 'Wellhub (MXN)', 'Ingreso Bruto', 'Comisiones Plataforma', 'Ingreso Neto']
        const filas = Object.entries(matriz)
          .filter(([sucNombre, m]) => m.bruto > 0 && (!sucursalId || sucursalId === 'Global' || mapaNombresSucursales[sucursalId] === sucNombre))
          .map(([sucNombre, m]) => {
            const comisionTotal = Math.round(m.comision)
            const netoCalculado = m.bruto - comisionTotal

            return [
              `"${sucNombre}"`,
              Math.round(m.navy),
              Math.round(m.orkestapay),
              Math.round(m.stripe),
              Math.round(m.fitpass),
              Math.round(m.totalpass),
              Math.round(m.wellhub),
              Math.round(m.bruto),
              `-${comisionTotal}`,
              Math.round(netoCalculado)
            ]
          })

        descargarCSV('Ingresos_Detalle_por_Sucursal', encabezados, filas)
        return
      }

      // -------------------------------------------------------------
      // 2. RESUMEN / TRANSACCIONES
      // -------------------------------------------------------------
      if (tab === 'resumen' || tab === 'transacciones') {
        const [resSucursales, resPagos, resVentas] = await Promise.all([
          supabase.from('sucursales').select('id, nombre'),
          supabase.from('pagos').select('*'),
          supabase.from('ventas').select(`
            *,
            clientes(nombre_completo, email),
            venta_items(cantidad, precio_unitario, subtotal, productos(nombre))
          `)
        ])

        const mapaSucursales: Record<string, string> = {}
        if (resSucursales.data) {
          resSucursales.data.forEach(s => { mapaSucursales[s.id] = s.nombre })
        }

        let listaPagos = resPagos.data || []
        let listaVentas = resVentas.data || []

        if (sucursalId && sucursalId !== 'Global') {
          listaPagos = listaPagos.filter((p: any) => p.sucursal_id === sucursalId)
          listaVentas = listaVentas.filter((v: any) => v.sucursal_id === sucursalId)
        }

        const { mapEmails, mapSucursalesCliente } = await obtenerMapaClientesYOrigen(listaPagos)

        const itemsEstudio = listaPagos
          .filter((p: any) => {
            const st = (p.estatus || p.status || '').toLowerCase()
            return ['completado', 'completed', 'paid', 'exitoso', 'succeeded'].some(e => st.includes(e))
          })
          .map((p: any) => {
            const idSucFinal = p.sucursal_id || mapSucursalesCliente[p.cliente_id]
            const nombreSuc = mapaSucursales[idSucFinal] || p.sucursal_nombre || 'Venta Web / Online'

            return {
              idUnico: `PAGO_${p.id}`,
              fechaRaw: p.created_at || p.fecha || p.fecha_pago,
              cliente_id: p.cliente_id,
              user_id: p.user_id,
              emailDirecto: p.email,
              concepto: p.concepto || p.descripcion || 'Servicio Estudio',
              sucursal: nombreSuc,
              categoriaOrigen: 'Estudio (Servicios)',
              monto: p.monto ?? p.amount ?? 0,
              estatus: 'Completado',
              metodo: p.metodo_pago || p.metodo || 'Tarjeta',
              esGalley: false
            }
          })

        const itemsGalley = listaVentas.map((v: any) => {
          const nombresProds = v.venta_items?.map((i: any) => `${i.cantidad}x ${i.productos?.nombre || 'Producto'}`).join(' + ') || 'Venta POS Galley'
          return {
            idUnico: `VENTA_${v.id}`,
            fechaRaw: v.created_at,
            cliente_id: v.cliente_id,
            user_id: null,
            emailDirecto: v.clientes?.email || null,
            concepto: `[Galley] ${nombresProds}`,
            sucursal: mapaSucursales[v.sucursal_id] || 'Condesa Gym',
            categoriaOrigen: 'The Galley (POS)',
            monto: v.total ?? 0,
            estatus: 'Completado',
            metodo: v.metodo_pago === 'efectivo' ? 'Efectivo' : 'Terminal',
            esGalley: true
          }
        })

        let poolUnificado = [...itemsEstudio, ...itemsGalley]

        poolUnificado = poolUnificado.filter((item: any) => {
          if (!item.fechaRaw) return false
          const t = new Date(item.fechaRaw).getTime()
          return t >= startMs && t <= endMs
        })

        if (filtroGalley === 'galley_solo') {
          poolUnificado = poolUnificado.filter(i => i.esGalley)
        } else if (filtroGalley === 'sucursal_limpia') {
          poolUnificado = poolUnificado.filter(i => !i.esGalley)
        }

        if (poolUnificado.length === 0) {
          return alert(`No se encontraron transacciones completadas para los filtros seleccionados entre ${fechaInicio} y ${fechaFin}.`)
        }

        const encabezados = ['Fecha', 'Hora', 'Email Cliente', 'Sucursal / Origen', 'Concepto / Servicio', 'Categoría (Origen)', 'Monto (MXN)', 'Estatus', 'Metodo']
        const filas = poolUnificado.map((item: any) => {
          const { fecha, hora } = obtenerFechaHoraLocal(item.fechaRaw)
          const email = item.emailDirecto || mapEmails[item.cliente_id] || mapEmails[item.user_id] || 'Venta Mostrador / POS'

          return [
            `"${fecha}"`,
            `"${hora}"`,
            `"${email.replace(/"/g, '""')}"`,
            `"${item.sucursal.replace(/"/g, '""')}"`,
            `"${item.concepto.replace(/"/g, '""')}"`,
            `"${item.categoriaOrigen}"`,
            item.monto,
            `"${item.estatus}"`,
            `"${item.metodo.replace(/"/g, '""')}"`
          ]
        })

        descargarCSV(`Transacciones_${filtroGalley.toUpperCase()}`, encabezados, filas)
        return
      }

      // -------------------------------------------------------------
      // 3. PAGOS FALLIDOS
      // -------------------------------------------------------------
      if (tab === 'fallidos') {
        const [resSucursales, resPagos] = await Promise.all([
          supabase.from('sucursales').select('id, nombre'),
          supabase.from('pagos').select('*')
        ])

        const mapaSucursales: Record<string, string> = {}
        if (resSucursales.data) {
          resSucursales.data.forEach(s => { mapaSucursales[s.id] = s.nombre })
        }

        const filtrados = (resPagos.data || []).filter((p: any) => {
          const raw = p.created_at || p.fecha || p.fecha_pago
          const t = raw ? new Date(raw).getTime() : 0
          const st = (p.estatus || p.status || '').toLowerCase()
          const esFallido = ['fallido', 'failed', 'rechazado', 'error', 'declined', 'past_due', 'canceled', 'unpaid'].some(e => st.includes(e))
          return (t >= startMs && t <= endMs) && esFallido
        })

        if (filtrados.length === 0) return alert('No hay pagos fallidos en este periodo.')

        const { mapEmails, mapSucursalesCliente } = await obtenerMapaClientesYOrigen(filtrados)
        const encabezados = ['Cliente', 'Motivo', 'Sucursal / Origen', 'Fecha', 'Hora', 'Estado', 'Monto', 'Intentos']
        const filas = filtrados.map((p: any) => {
          const rawFecha = p.created_at || p.fecha || p.fecha_pago
          const { fecha, hora } = obtenerFechaHoraLocal(rawFecha)
          const email = p.email || p.cliente_email || mapEmails[p.cliente_id] || mapEmails[p.user_id] || 'Sin Correo Asignado'
          
          const idSucFinal = p.sucursal_id || mapSucursalesCliente[p.cliente_id]
          const sucNombre = mapaSucursales[idSucFinal] || p.sucursal_nombre || 'Venta Web / Online'

          return [
            `"${email.replace(/"/g, '""')}"`,
            `"${(p.motivo_error || p.motivo || 'Tarjeta Declinada').replace(/"/g, '""')}"`,
            `"${sucNombre.replace(/"/g, '""')}"`,
            `"${fecha}"`,
            `"${hora}"`,
            `"${(p.estatus || p.status || 'Fallido').replace(/"/g, '""')}"`,
            p.monto ?? p.amount ?? 0,
            p.intentos || p.attempts || 1
          ]
        })

        descargarCSV('Pagos_Fallidos', encabezados, filas)
        return
      }

      // -------------------------------------------------------------
      // 4. NÓMINA STAFF
      // -------------------------------------------------------------
      if (tab === 'nomina') {
        const [resStaff, resNominaDetalles] = await Promise.all([
          supabase.from('staff').select('*'),
          supabase.from('nomina_detalles').select('*')
        ])

        let staffList = resStaff.data || []
        if (staffList.length === 0) {
          const { data: resCoaches } = await supabase.from('coaches').select('*')
          staffList = resCoaches || []
        }

        if (staffList.length === 0) return alert('No se encontraron miembros de staff registrados.')

        if (sucursalId && sucursalId !== 'Global') {
          staffList = staffList.filter((s: any) => !s.sucursal_id || s.sucursal_id === sucursalId)
        }

        const mapNomina: Record<string, any> = {}
        if (resNominaDetalles.data) {
          resNominaDetalles.data.forEach((n: any) => {
            const key = n.staff_id || n.coach_id || n.email
            if (key) mapNomina[key] = n
          })
        }

        const encabezados = ['Empleado', 'Tipo', 'Sucursales', 'Nivel', 'Clases', 'Bono', 'Ajuste', 'Horas', 'Nomina']
        const filas = staffList.map((s: any) => {
          const key = s.id || s.email
          const det = mapNomina[key] || {}

          const nombre = s.nombre ? `${s.nombre} ${s.primer_apellido || ''}`.trim() : (s.name || s.nombre_completo || s.email || 'Empleado')
          const tipo = s.tipo || s.puesto || s.rol || 'Staff'
          const sucursales = s.sucursales || s.sucursal_nombre || 'Condesa Studio'
          const nivel = s.nivel || s.level || 'General'

          const clases = s.clases || s.total_clases || det.clases || 0
          const bono = s.bono || s.bonos || det.bono || 0
          const ajuste = s.ajuste || det.ajuste || 0
          const horas = s.horas || s.horas_trabajadas || det.horas || (clases > 0 ? clases * 1.5 : 80)

          let sueldoBase = s.sueldo || s.salario || s.sueldo_base || s.monto || s.pago_quincenal || det.monto || det.sueldo || 0
          
          if (!sueldoBase || sueldoBase === 0) {
            if (clases > 0) {
              sueldoBase = (clases * (s.tarifa_clase || 300)) + Number(bono) + Number(ajuste)
            } else {
              const p = tipo.toLowerCase()
              if (p.includes('recep') || p.includes('front')) sueldoBase = 8500
              else if (p.includes('limp') || p.includes('manten')) sueldoBase = 7500
              else if (p.includes('admin') || p.includes('gerent')) sueldoBase = 15000
              else sueldoBase = 6000
            }
          }

          return [
            `"${nombre.replace(/"/g, '""')}"`,
            `"${tipo.toString().replace(/"/g, '""')}"`,
            `"${sucursales.toString().replace(/"/g, '""')}"`,
            `"${nivel.toString().replace(/"/g, '""')}"`,
            clases, bono, ajuste, horas, sueldoBase
          ]
        })

        descargarCSV('Nomina_Staff', encabezados, filas)
        return
      }

    } catch (err: any) {
      console.error('Error exportando:', err)
      alert(`Error al generar el reporte: ${err.message || 'Error inesperado'}`)
    }
  }

  const muestraFiltroGalley = ['resumen', 'ingresos', 'transacciones'].includes(tab)

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Finanzas</h1>
          <p className="text-gray-400 text-sm mt-0.5 font-medium">Gestión de membresías, ingresos y reportes</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 text-xs font-bold shadow-inner">
            <button onClick={() => setModoFecha('mes')} className={`px-3 py-1.5 rounded-lg transition ${modoFecha === 'mes' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>Mes</button>
            <button onClick={() => setModoFecha('rango')} className={`px-3 py-1.5 rounded-lg transition ${modoFecha === 'rango' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>Rango</button>
          </div>

          {modoFecha === 'mes' ? (
            <div className="flex items-center gap-2 border border-gray-200 bg-white rounded-xl px-3 py-2 shadow-sm">
              <Calendar size={14} className="text-gray-400" />
              <select className="text-xs font-bold text-gray-800 outline-none bg-transparent cursor-pointer" value={mes} onChange={e => setMes(Number(e.target.value))}>
                {MESES.map((m, i) => <option key={i} value={i}>{m} {anio}</option>)}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-2 border border-gray-200 bg-white rounded-xl px-3 py-1.5 text-xs font-semibold shadow-sm">
              <Calendar size={14} className="text-gray-400" />
              <input type="date" value={customInicio} onChange={e => setCustomInicio(e.target.value)} className="outline-none bg-transparent text-gray-800 cursor-pointer" />
              <span className="text-gray-300">a</span>
              <input type="date" value={customFin} onChange={e => setCustomFin(e.target.value)} className="outline-none bg-transparent text-gray-800 cursor-pointer" />
            </div>
          )}

          <button onClick={ejecutarExportacion} className="flex items-center gap-2 bg-gray-900 text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-gray-800 transition shadow-sm cursor-pointer">
            <Download size={14} /> Exportar Reporte
          </button>
        </div>
      </div>

      {muestraFiltroGalley && (
        <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900 px-2">
            <Coffee size={16} className="text-amber-600" />
            <span>Filtrar origen de venta:</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-amber-200/60 text-xs font-bold shadow-sm">
            <button onClick={() => setFiltroGalley('todos')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${filtroGalley === 'todos' ? 'bg-amber-500 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-50'}`}>
              <Building2 size={13} /> Venta Total
            </button>
            <button onClick={() => setFiltroGalley('sucursal_limpia')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${filtroGalley === 'sucursal_limpia' ? 'bg-amber-500 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-50'}`}>
              <Store size={13} /> Solo Estudio
            </button>
            <button onClick={() => setFiltroGalley('galley_solo')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${filtroGalley === 'galley_solo' ? 'bg-amber-500 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-50'}`}>
              <Coffee size={13} /> Solo The Galley
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl p-1 flex gap-1 shadow-sm">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer ${tab === t.key ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-400 hover:text-gray-700'}`}>
            <span>{t.icon}</span>
            <span className="hidden md:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'resumen'       && <FinanzasResumen       {...subProps} />}
      {tab === 'ingresos'      && <FinanzasIngresos      {...subProps} />}
      {tab === 'transacciones' && <FinanzasTransacciones {...subProps} />}
      {tab === 'fallidos'      && <FinanzasPagosFallidos {...subProps} />}
      {tab === 'nomina'        && <FinanzasNomina        {...subProps} />}
    </div>
  )
}
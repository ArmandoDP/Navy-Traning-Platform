'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { SucursalProvider } from '@/context/SucursalContext'
import SucursalSelector     from '@/components/SucursalSelector'
import { LayoutDashboard, Package, Bell, BarChart2, Settings, LogOut, ChevronLeft,
  ChevronRight, BookOpen, Calendar, Users, ChevronDown, DollarSign, MapPin, Puzzle,
  ShoppingBag, Lock, Sparkles, Tag, ScanLine, Activity, UserCog, History
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Modulo, RUTAS_MODULOS } from '@/lib/permisos'

// Logo oficial de Navy (versión blanca, para el sidebar oscuro)
const LOGO_NAVY_BLANCO = '/images/navy-icon-white.png'
const NEGRO_NAVY = '#171B24'

interface NavItem  { href: string; label: string; icon: React.ElementType }
interface NavGrupo { titulo: string; items: NavItem[] }

const NAV: NavGrupo[] = [
  { titulo: 'Operación', items: [
    { href: '/dashboard/ejecutivo',      label: 'Dashboard',      icon: LayoutDashboard },
    { href: '/dashboard/checkin',        label: 'Check-in',       icon: Activity        },
    { href: '/dashboard/checador',       label: 'Checador staff', icon: ScanLine        },
    { href: '/dashboard/reservas',       label: 'Reservas',       icon: Calendar        },
    { href: '/dashboard/clases',         label: 'Clases',         icon: BookOpen        },
    { href: '/dashboard/clases-muestra', label: 'Clases Muestra', icon: Sparkles        },
    { href: '/dashboard/degali',         label: 'The Galley',     icon: ShoppingBag     },
  ]},
  { titulo: 'Gestión', items: [
    { href: '/dashboard/clientes',       label: 'Clientes',       icon: Users           },
    { href: '/dashboard/staff',          label: 'Staff',          icon: UserCog         },
    { href: '/dashboard/paquetes',       label: 'Paquetes',       icon: Package         },
    { href: '/dashboard/promociones',    label: 'Promociones',    icon: Tag             },
    { href: '/dashboard/sucursales',     label: 'Sucursales',     icon: MapPin          },
  ]},
  { titulo: 'Análisis', items: [
    { href: '/dashboard/finanzas',       label: 'Finanzas',       icon: DollarSign      },
    { href: '/dashboard/reportes',       label: 'Reportes',       icon: BarChart2       },
    { href: '/dashboard/alertas',        label: 'Alertas',        icon: Bell            },
    { href: '/dashboard/actividad',      label: 'Actividad',      icon: History         },
  ]},
  { titulo: 'Sistema', items: [
    { href: '/dashboard/integraciones',  label: 'Integraciones',  icon: Puzzle          },
    { href: '/dashboard/configuracion',  label: 'Configuración',  icon: Settings        },
  ]},
]

// Mapeo ruta → módulo
const RUTA_A_MODULO: Record<string, Modulo> = {
  '/dashboard/ejecutivo':    'dashboard',
  '/dashboard/checkin':      'checkin',
  '/dashboard/degali':       'galley',
  '/dashboard/reservas':     'reservas',
  '/dashboard/clases':       'clases',
  '/dashboard/sucursales':   'sucursales',
  '/dashboard/clientes':     'clientes',
  '/dashboard/staff':        'staff',
  '/dashboard/paquetes':     'paquetes',
  '/dashboard/finanzas':     'finanzas',
  '/dashboard/alertas':      'alertas',
  '/dashboard/reportes':     'reportes',
  '/dashboard/actividad':   'actividad',
  '/dashboard/integraciones':'integraciones',
  '/dashboard/configuracion':'configuracion',
}

// Tipo del staff logueado (Coach, Front, Manager…). Front Desk tiene rol "staff_navy" igual que
// los coaches, así que para el checador se distingue por su tipo. Si el AuthContext no lo trae, se consulta.
function useTipoStaff(staff: any): string | null {
  const [tipo, setTipo] = useState<string | null>(staff?.tipo ?? null)
  useEffect(() => {
    if (!staff) { setTipo(null); return }
    if (staff.tipo !== undefined) { setTipo(staff.tipo); return }
    supabase.from('staff').select('tipo').eq('id', staff.id).maybeSingle()
      .then(({ data }: { data: any }) => setTipo(data?.tipo ?? null))
  }, [staff?.id, staff?.tipo])
  return tipo
}

// Checador de staff: lo abren Front Desk, gerentes y dirección (el backend lo vuelve a validar).
function puedeVerChecador(staff: any, tipo: string | null): boolean {
  if (!staff) return false
  if (staff.rol === 'direccion' || staff.rol === 'gerente') return true
  const t = (tipo || '').toLowerCase()
  return t === 'front' || t === 'manager' || t === 'submanager' || t === 'admin'
}

// Modal sin acceso
function ModalSinAcceso({ modulo, rol, onClose }: { modulo: string; rol: string; onClose: () => void }) {
  const ROL_LABELS: Record<string, string> = {
    direccion:    'Dirección / Finanzas',
    gerente:      'Gerente de Sucursal',
    staff_navy:   'Staff Navy',
    staff_galley: 'Staff The Galley',
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
        <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Lock size={24} className="text-gray-400" />
        </div>
        <h2 className="text-lg font-black text-gray-900 mb-2">Sin acceso</h2>
        <p className="text-sm text-gray-500 mb-1">
          Tu rol de <span className="font-bold text-gray-700">{ROL_LABELS[rol] || rol}</span> no tiene permiso para acceder a esta sección.
        </p>
        <p className="text-xs text-gray-400 mb-6">Contacta a tu administrador si necesitas acceso.</p>
        <button onClick={onClose}
          className="w-full py-3 bg-gray-900 text-white font-bold text-sm rounded-xl hover:bg-gray-700 transition">
          Entendido
        </button>
      </div>
    </div>
  )
}

const ROLES: Record<string, string> = {
  direccion:    'Dirección',
  gerente:      'Gerente',
  staff_navy:   'Staff Navy',
  staff_galley: 'The Galley',
}

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname()
  const { staff, tieneAcceso, loading } = useAuth()
  const tipoStaff = useTipoStaff(staff)
  const [modalBlocked, setModalBlocked] = useState<{ modulo: string } | null>(null)
  const [modalLogout, setModalLogout] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [sinLogo, setSinLogo] = useState(false)

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const handleLogout = () => {
    if (loggingOut) return
    setLoggingOut(true)
    supabase.auth.signOut() // sin await
    document.cookie = 'navy_rol=; path=/; max-age=0'
    window.location.href = '/login'
  }

  const visible = (item: NavItem) =>
    (item.href !== '/dashboard/promociones' || staff?.rol === 'direccion') &&
    (item.href !== '/dashboard/checador' || puedeVerChecador(staff, tipoStaff))

  const iniciales = staff ? (staff.nombre[0] + (staff.primer_apellido?.[0] || '')).toUpperCase() : ''

  return (
    <>
      {/* Contenedor con margen: el sidebar "flota" sobre el fondo del CRM */}
      <div className="h-screen flex-shrink-0 py-3 pl-3">
        <aside
          style={{ backgroundColor: NEGRO_NAVY, width: collapsed ? 76 : 244 }}
          className="relative flex h-full flex-col rounded-[26px] shadow-[0_24px_60px_-24px_rgba(17,24,39,.55)] ring-1 ring-white/[.06] transition-[width] duration-300 ease-[cubic-bezier(.22,1,.36,1)]">

          {/* Botón para contraer / expandir */}
          <button onClick={onToggle} title={collapsed ? 'Expandir menú' : 'Contraer menú'}
            className="absolute -right-3 top-9 z-10 grid h-7 w-7 place-items-center rounded-full bg-white text-gray-700 shadow-md ring-1 ring-black/5 transition hover:scale-110 hover:text-black">
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>

          {/* Logo al centro */}
          <div className="flex shrink-0 flex-col items-center px-3 pb-4 pt-6">
            {sinLogo ? (
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-lg font-black text-black">N</span>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={LOGO_NAVY_BLANCO} alt="Navy Training Center" draggable={false}
                   onError={() => setSinLogo(true)}
                   className={`w-auto select-none object-contain transition-all duration-300 ${collapsed ? 'h-9' : 'h-14'}`} />
            )}
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className="mt-2 overflow-hidden whitespace-nowrap text-[11px] font-semibold tracking-[.18em] text-white/40">
                  CRM
                </motion.p>
              )}
            </AnimatePresence>
            <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          </div>

          {/* Navegación */}
          <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-3 [scrollbar-color:rgba(255,255,255,.15)_transparent] [scrollbar-width:thin]">
            {NAV.map((grupo, gi) => {
              const items = grupo.items.filter(visible)
              if (!items.length) return null
              return (
                <div key={grupo.titulo} className={gi ? 'mt-3' : ''}>
                  {collapsed
                    ? (gi > 0 && <div className="mx-auto mb-3 h-px w-6 bg-white/10" />)
                    : <p className="mb-1.5 px-3 text-[11px] font-semibold text-white/35">{grupo.titulo}</p>}

                  <div className="space-y-0.5">
                    {items.map(item => {
                      const active  = isActive(item.href)
                      const modulo  = RUTA_A_MODULO[item.href]
                      const blocked = !loading && modulo ? !tieneAcceso(modulo) : false

                      const contenido = (
                        <>
                          {active && (
                            <motion.span layoutId="nav-activo" className="absolute inset-0 rounded-xl bg-white shadow-sm"
                              transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
                          )}
                          <item.icon size={18} strokeWidth={active ? 2.4 : 2}
                            className={`relative shrink-0 ${active ? 'text-gray-900' : 'text-white/75 group-hover:text-white'}`} />
                          {!collapsed && (
                            <span className={`relative truncate text-[14px] ${active ? 'font-extrabold text-gray-900' : 'font-medium text-white/80 group-hover:text-white'}`}>
                              {item.label}
                            </span>
                          )}
                          {blocked && !collapsed && <Lock size={12} className="relative ml-auto text-white/60" />}
                        </>
                      )
                      const clases = `group relative flex h-9 items-center gap-3 rounded-xl transition-colors ${collapsed ? 'justify-center' : 'px-3'}`

                      if (blocked) return (
                        <div key={item.href} title={item.label} onClick={() => setModalBlocked({ modulo: modulo! })}
                          className={`${clases} cursor-not-allowed select-none opacity-30`}>
                          {contenido}
                        </div>
                      )
                      return (
                        <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined}
                          className={`${clases} ${active ? '' : 'hover:bg-white/[.06]'}`}>
                          {contenido}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </nav>

          {/* Usuario y cerrar sesión */}
          <div className="shrink-0 p-3 pt-0">
            <div className={`flex items-center gap-2.5 rounded-2xl bg-white/[.05] p-2 ring-1 ring-white/[.06] ${collapsed ? 'flex-col' : ''}`}>
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-xs font-black text-gray-900">
                {loading || !staff ? '…' : iniciales}
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-white">{staff ? `${staff.nombre} ${staff.primer_apellido || ''}`.trim() : 'Cargando…'}</p>
                  <p className="truncate text-[11px] text-white/45">{ROLES[staff?.rol || ''] || staff?.rol?.replace('_', ' ') || ''}</p>
                </div>
              )}
              <button onClick={() => setModalLogout(true)} title="Cerrar sesión"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white/60 transition hover:bg-red-500/15 hover:text-red-400">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Modal sin acceso */}
      {modalBlocked && (
        <ModalSinAcceso
          modulo={modalBlocked.modulo}
          rol={staff?.rol || ''}
          onClose={() => setModalBlocked(null)}
        />
      )}

      {/* Modal cerrar sesión */}
      <AnimatePresence>
        {modalLogout && (
          <motion.div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div onClick={() => setModalLogout(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div className="relative w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl"
              initial={{ y: 20, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 10, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
                <LogOut size={24} className="text-red-500" />
              </div>
              <h2 className="mb-2 text-lg font-black text-gray-900">¿Cerrar sesión?</h2>
              <p className="mb-6 text-sm text-gray-400">Se cerrará tu sesión y tendrás que volver a iniciar sesión para acceder al CRM.</p>
              <div className="flex gap-3">
                <button onClick={() => setModalLogout(false)}
                  className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50">
                  Cancelar
                </button>
                <button onClick={handleLogout} disabled={loggingOut}
                  className="flex-1 rounded-xl bg-red-500 py-3 text-sm font-bold text-white transition hover:bg-red-600 disabled:opacity-60">
                  {loggingOut ? 'Cerrando...' : 'Cerrar sesión'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function Topbar() {
  const { staff, tieneAcceso, loading } = useAuth()
  const iniciales = staff ? (staff.nombre[0] + (staff.primer_apellido?.[0] || '')).toUpperCase() : '...'

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 w-72">
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input placeholder="Buscar..." className="bg-transparent text-sm text-gray-600 outline-none w-full placeholder:text-gray-400" />
      </div>

      <div className="flex items-center gap-3">
        <SucursalSelector />
        <button className="relative p-2 hover:bg-gray-100 rounded-xl transition">
          <Bell size={18} className="text-gray-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded-xl px-2 py-1.5 transition">
          <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-black">
            {iniciales}
          </div>
          <span className="text-sm font-medium text-gray-700">{staff ? `${staff.nombre} ${staff.primer_apellido || ''}`.trim() : 'Cargando...'}</span>
          <ChevronDown size={14} className="text-gray-400" />
        </div>
      </div>
    </header>
  )
}

// Después de iniciar sesión desde el checador del celular, regresar a "Mi día" en lugar del CRM
function RegresoDespuesDeLogin() {
  const router = useRouter()
  const { staff, loading } = useAuth()
  useEffect(() => {
    if (loading || !staff) return
    const destino = localStorage.getItem('navy_despues_login')
    if (destino) {
      localStorage.removeItem('navy_despues_login')
      router.replace(destino)
    }
  }, [staff, loading, router])
  return null
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  // Recordar si el menú estaba contraído
  useEffect(() => { setCollapsed(localStorage.getItem('navy_sidebar') === 'contraido') }, [])
  const alternar = () => setCollapsed(c => { localStorage.setItem('navy_sidebar', c ? 'abierto' : 'contraido'); return !c })

  return (
    <SucursalProvider>
      <RegresoDespuesDeLogin />
      <div className="flex h-screen bg-[#F4F5F7]">
        <Sidebar collapsed={collapsed} onToggle={alternar} />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SucursalProvider>
  )
}
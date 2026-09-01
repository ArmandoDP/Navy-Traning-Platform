'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { SucursalProvider } from '@/context/SucursalContext'
import SucursalSelector     from '@/components/SucursalSelector'
import { LayoutDashboard, Package, Bell, BarChart2, Settings, LogOut, ChevronLeft,
  ChevronRight, BookOpen, Calendar, UserCircle,
  Users, CreditCard, Star, Activity, ChevronDown,
  DollarSign, MapPin, Puzzle, ShoppingBag, Lock
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Modulo, RUTAS_MODULOS } from '@/lib/permisos'

interface NavChild  { href: string; label: string }
interface NavItem   { href?: string; label: string; icon: React.ElementType; children?: NavChild[] }
interface Integration { label: string; icon: string; href: string }

const NAV: NavItem[] = [
  { href: '/dashboard/ejecutivo',    label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/dashboard/checkin',      label: 'Check-in',      icon: Activity        },
  { href: '/dashboard/degali',       label: 'THE GALLEY',    icon: ShoppingBag     },
  { href: '/dashboard/reservas',     label: 'Reservas',      icon: Calendar        },
  { href: '/dashboard/clases',       label: 'Clases',        icon: BookOpen        },
  { href: '/dashboard/sucursales',   label: 'Sucursales',    icon: MapPin          },
  { href: '/dashboard/clientes',     label: 'Clientes',      icon: Users           },
  { href: '/dashboard/staff',        label: 'Staff',         icon: Users           },
  { href: '/dashboard/paquetes',     label: 'Paquetes',      icon: Package         },
  { href: '/dashboard/finanzas',     label: 'Finanzas',      icon: DollarSign      },
  { href: '/dashboard/alertas',      label: 'Alertas',       icon: Bell            },
  { href: '/dashboard/reportes',     label: 'Reportes',      icon: BarChart2       },
  { href: '/dashboard/integraciones',label: 'Integraciones', icon: Puzzle          },
  { href: '/dashboard/configuracion',label: 'Configuración', icon: Settings        },
]

const INTEGRATIONS: Integration[] = [
  { label: 'Stripe',  icon: '💳', href: '/dashboard/integraciones/stripe'  },
  { label: 'Fitpass', icon: '🏃', href: '/dashboard/integraciones/fitpass' },
  { label: 'InBody',  icon: '⚡', href: '/dashboard/integraciones/inbody'  },
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
  '/dashboard/integraciones':'integraciones',
  '/dashboard/configuracion':'configuracion',
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

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname              = usePathname()
  const router                = useRouter()
  const { staff, tieneAcceso, loading } = useAuth()
  const [modalBlocked, setModalBlocked] = useState<{ modulo: string } | null>(null)
  const [modalLogout, setModalLogout] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const handleLogout = () => {
    if (loggingOut) return
    setLoggingOut(true)
    supabase.auth.signOut() // sin await
    document.cookie = 'navy_rol=; path=/; max-age=0'
    window.location.href = '/login'
  }

  const handleNavClick = (href: string, e: React.MouseEvent) => {
    const modulo = RUTA_A_MODULO[href]
    if (modulo && !tieneAcceso(modulo)) {
      e.preventDefault()
      setModalBlocked({ modulo })
    }
  }

  const itemBase    = 'flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-150 whitespace-nowrap w-full'
  const itemActive  = 'bg-white text-gray-900 font-bold'
  const itemDefault = 'text-white hover:bg-[#232B38]'
  const itemBlocked = 'text-white/30 cursor-pointer'

  return (
    <>
      <aside
        style={{ backgroundColor: '#171B24', width: collapsed ? '60px' : '220px' }}
        className="flex flex-col h-screen flex-shrink-0 transition-all duration-300 overflow-hidden border-r border-[#2A3344]"
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-3 py-4 border-b border-[#2A3344] min-h-[56px]">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center flex-shrink-0 text-black font-black text-sm">
              N
            </div>
            {!collapsed && (
              <span className="text-white font-black text-sm tracking-tight whitespace-nowrap">NAVY CRM</span>
            )}
          </div>
          <button onClick={onToggle} className="text-[#A0AABF] hover:text-white transition flex-shrink-0">
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {NAV.map((item) => {
            const active  = isActive(item.href!)
            const modulo  = RUTA_A_MODULO[item.href!]
            const blocked = !loading && modulo ? !tieneAcceso(modulo) : false

            if (blocked) return (
              <div key={item.href}
                className={`${itemBase} opacity-30 cursor-not-allowed select-none`}>
                <item.icon size={16} className="text-white" />
                {!collapsed && (
                  <>
                    <span className="text-sm flex-1 text-white">{item.label}</span>
                    <Lock size={11} className="text-white flex-shrink-0" />
                  </>
                )}
              </div>
            )

            return (
              <Link key={item.href} href={item.href!}
                className={`${itemBase} ${active ? itemActive : itemDefault}`}>
                <item.icon size={16} className={active ? 'text-gray-900' : 'text-white'} />
                {!collapsed && <span className="text-sm">{item.label}</span>}
              </Link>
            )
          })}

          {/* Integraciones */}
          {!collapsed && (
            <div className="pt-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#4B5563] px-2.5 mb-2">
                Integraciones
              </p>
              {INTEGRATIONS.map(i => (
                <Link key={i.label} href={i.href}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[#A0AABF] hover:text-white hover:bg-[#232B38] transition text-sm">
                  <span className="text-base">{i.icon}</span>
                  {i.label}
                </Link>
              ))}
            </div>
          )}
          {collapsed && (
            <div className="pt-4 space-y-0.5">
              {INTEGRATIONS.map(i => (
                <Link key={i.label} href={i.href} title={i.label}
                  className="flex items-center justify-center px-2.5 py-2 rounded-lg text-[#A0AABF] hover:text-white hover:bg-[#232B38] transition">
                  <span className="text-base">{i.icon}</span>
                </Link>
              ))}
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="border-t border-[#2A3344] p-2 space-y-1">
          {!collapsed && !loading && staff &&(
            <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg mb-1">
              <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-black flex-shrink-0">
                {(staff.nombre[0] + (staff.primer_apellido?.[0] || '')).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-bold truncate">{staff.nombre} {staff.primer_apellido}</p>
                <p className="text-[#4B5563] text-[10px] capitalize truncate">{staff.rol?.replace('_', ' ')}</p>
              </div>
            </div>
          )}
          <button onClick={() => setModalLogout(true)}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[#A0AABF] hover:text-red-400 hover:bg-red-500/10 transition w-full group">
            <LogOut size={16} className="group-hover:text-red-400 transition flex-shrink-0" />
            {!collapsed && <span className="text-sm">Cerrar sesión</span>}
          </button>
        </div>
      </aside>

      {/* Modal sin acceso */}
      {modalBlocked && (
        <ModalSinAcceso
          modulo={modalBlocked.modulo}
          rol={staff?.rol || ''}
          onClose={() => setModalBlocked(null)}
        />
      )}
      {/* Modal cerrar sesión */}
      {modalLogout && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div onClick={() => setModalLogout(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <LogOut size={24} className="text-red-500" />
            </div>
            <h2 className="text-lg font-black text-gray-900 mb-2">¿Cerrar sesión?</h2>
            <p className="text-sm text-gray-400 mb-6">Se cerrará tu sesión y tendrás que volver a iniciar sesión para acceder al CRM.</p>
            <div className="flex gap-3">
              <button onClick={() => setModalLogout(false)}
                className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button onClick={handleLogout} disabled={loggingOut}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition disabled:opacity-60">
                {loggingOut ? 'Cerrando...' : 'Cerrar sesión'}
              </button>
            </div>
          </div>
        </div>
      )}
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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <SucursalProvider>
      <div className="flex h-screen bg-[#F4F5F7]">  {/* ← quita overflow-hidden */}
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SucursalProvider>
  )
}
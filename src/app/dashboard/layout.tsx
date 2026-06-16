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
  DollarSign,
  MapPin,
} from 'lucide-react'

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface NavChild {
  href:  string
  label: string
}
interface NavItem {
  href?:     string
  label:     string
  icon:      React.ElementType
  children?: NavChild[]
}
interface Integration {
  label: string
  icon:  string
  href:  string
}

// ─── Config nav ───────────────────────────────────────────────────────────────
const NAV: NavItem[] = [
  { href: '/dashboard/ejecutivo', label: 'Dashboard',     icon: LayoutDashboard },
  {
    label: 'Sucursales', icon: MapPin,
    children: [
      { href: '/dashboard/reservas',  label: 'Reservas'  },
      { href: '/dashboard/clases',    label: 'Clases'    },
      { href: '/dashboard/coaches',   label: 'Coaches'   },
      { href: '/dashboard/clientes',  label: 'Clientes'  },
    ],
  },
  { href: '/dashboard/staff', label: 'Staff', icon: Users },
  { href: '/dashboard/paquetes',      label: 'Paquetes',      icon: Package      },
  { href: '/dashboard/finanzas',      label: 'Finanzas',      icon: DollarSign   },
  { href: '/dashboard/alertas',       label: 'Alertas',       icon: Bell         },
  { href: '/dashboard/reportes',      label: 'Reportes',      icon: BarChart2    },
  { href: '/dashboard/configuracion', label: 'Configuración', icon: Settings     },
]

const INTEGRATIONS: Integration[] = [
  { label: 'Stripe',   icon: '💳', href: '/dashboard/integraciones/stripe'  },
  { label: 'Fitpass',  icon: '🏃', href: '/dashboard/integraciones/fitpass' },
  { label: 'InBody',   icon: '⚡', href: '/dashboard/integraciones/inbody'  },
]

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname()
  const router   = useRouter()

  const SUC_PATHS = ['/dashboard/sucursales','/dashboard/reservas','/dashboard/clases','/dashboard/coaches','/dashboard/clientes']
  const enSucursales = SUC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
  const [sucOpen, setSucOpen] = useState(() => enSucursales)

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Estilos reutilizables
  const itemBase    = 'flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-150 whitespace-nowrap w-full'
  const itemActive  = 'bg-white text-gray-900 font-bold'
  const itemDefault = 'text-white hover:bg-[#232B38]'
  const subActive   = 'text-gray-900 font-bold bg-white rounded-xl'
  const subDefault  = 'text-white hover:bg-[#232B38] rounded-xl'

  return (
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

          // ── Item con submenú (Sucursales) ──────────────────────────────────
          if (item.children) {
            return (
              <div key={item.label}>
                {/* Botón padre — navega a /sucursales y abre submenú */}
                <div className={`${itemBase} ${enSucursales ? itemActive : itemDefault}`}>
                  <Link
                    href="/dashboard/sucursales"
                    className="flex items-center gap-2.5 flex-1 min-w-0"
                  >
                    <item.icon size={16} className={enSucursales ? 'text-gray-900' : 'text-white'} />
                    {!collapsed && (
                      <span className={`text-sm ${enSucursales ? 'text-gray-900' : 'text-white'}`}>
                        {item.label}
                      </span>
                    )}
                  </Link>
                  {!collapsed && (
                    <button
                      onClick={e => { e.preventDefault(); e.stopPropagation(); setSucOpen(o => !o) }}
                      className="p-1 rounded hover:bg-black/10 transition flex-shrink-0"
                    >
                      <ChevronDown
                        size={12}
                        className={`transition-transform duration-200 ${sucOpen ? 'rotate-180' : ''} ${enSucursales ? 'text-gray-600' : 'text-[#A0AABF]'}`}
                      />
                    </button>
                  )}
                </div>

                {/* Submenú */}
                {!collapsed && sucOpen && (
                  <div className="ml-3 mt-0.5 border-l border-[#2A3344] pl-2 space-y-0.5">
                    {item.children.map(child => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`block px-2.5 py-1.5 text-xs transition whitespace-nowrap ${
                          isActive(child.href) ? subActive : subDefault
                        }`}
                      >
                        — {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          // ── Item normal ────────────────────────────────────────────────────
          const active = isActive(item.href!)
          return (
            <Link
              key={item.href}
              href={item.href!}
              className={`${itemBase} ${active ? itemActive : itemDefault}`}
            >
              <item.icon size={16} className={active ? 'text-gray-900' : 'text-white'} />
              {!collapsed && (
                <span className="text-sm">{item.label}</span>
              )}
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
              <Link
                key={i.label}
                href={i.href}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[#A0AABF] hover:text-white hover:bg-[#232B38] transition text-sm"
              >
                <span className="text-base">{i.icon}</span>
                {i.label}
              </Link>
            ))}
          </div>
        )}
        {collapsed && (
          <div className="pt-4 space-y-0.5">
            {INTEGRATIONS.map(i => (
              <Link
                key={i.label}
                href={i.href}
                title={i.label}
                className="flex items-center justify-center px-2.5 py-2 rounded-lg text-[#A0AABF] hover:text-white hover:bg-[#232B38] transition"
              >
                <span className="text-base">{i.icon}</span>
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-[#2A3344] p-2">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[#A0AABF] hover:text-red-400 hover:bg-[#232B38] transition w-full"
        >
          <LogOut size={16} />
          {!collapsed && <span className="text-sm">Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  )
}

// ─── Topbar ───────────────────────────────────────────────────────────────────
function Topbar() {
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
      {/* Buscador */}
      <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 w-72">
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          placeholder="Buscar..."
          className="bg-transparent text-sm text-gray-600 outline-none w-full placeholder:text-gray-400"
        />
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-3">
        <SucursalSelector />
        <button className="relative p-2 hover:bg-gray-100 rounded-xl transition">
          <Bell size={18} className="text-gray-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded-xl px-2 py-1.5 transition">
          <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-black">
            SA
          </div>
          <span className="text-sm font-medium text-gray-700">Sebastián Alcazar</span>
          <ChevronDown size={14} className="text-gray-400" />
        </div>
      </div>
    </header>
  )
}

// ─── Layout principal ─────────────────────────────────────────────────────────
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <SucursalProvider>
      <div className="flex h-screen overflow-hidden bg-[#F4F5F7]">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SucursalProvider>
  )
}
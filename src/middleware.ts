import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { RUTAS_MODULOS, PERMISOS, normalizarRol } from '@/lib/permisos'

const PUBLIC_ROUTES = [
  '/login',
  '/login/recuperar',
  '/login/nueva-password',
  '/login/cambiar-password',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/icons') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  if (PUBLIC_ROUTES.some(r => pathname.startsWith(r))) {
    return NextResponse.next()
  }

  const allCookies = [...request.cookies.getAll()]
  const token      = allCookies.find(c => c.name.startsWith('sb-'))?.value
  const rolCookie  = allCookies.find(c => c.name === 'navy_rol')?.value
  const rol        = normalizarRol(rolCookie ? decodeURIComponent(rolCookie) : null)

  if (pathname === '/') {
    if (token) return NextResponse.redirect(new URL('/dashboard/ejecutivo', request.url))
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (pathname.startsWith('/dashboard')) {
    if (!token) return NextResponse.redirect(new URL('/login', request.url))
    if (!rol) {
      // Sin rol o con un rol que no existe: a iniciar sesión de nuevo (y se borra la cookie mala)
      const r = NextResponse.redirect(new URL('/login', request.url))
      r.cookies.set('navy_rol', '', { path: '/', maxAge: 0 })
      return r
    }

    // La ruta más específica primero ("/dashboard/clases-muestra" antes que "/dashboard/clases")
    const modulo = Object.entries(RUTAS_MODULOS)
      .sort((a, b) => b[0].length - a[0].length)
      .find(([ruta]) => pathname === ruta || pathname.startsWith(ruta + '/'))?.[1]

    if (modulo && (PERMISOS[rol]?.[modulo] ?? 'sin_acceso') === 'sin_acceso') {
      return NextResponse.redirect(new URL('/dashboard/sin-acceso', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images|icons).*)'],
}
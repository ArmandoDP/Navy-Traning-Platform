import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { RUTAS_MODULOS, PERMISOS, Rol } from '@/lib/permisos'

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
  const rol        = allCookies.find(c => c.name === 'navy_rol')?.value as Rol | undefined

  if (pathname === '/') {
    if (token && rol) return NextResponse.redirect(new URL('/dashboard/ejecutivo', request.url))
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (pathname.startsWith('/dashboard')) {
    // Sin token → login
    if (!token) return NextResponse.redirect(new URL('/login', request.url))

    // Con token pero sin navy_rol → es cliente, no staff → login
    if (!rol) return NextResponse.redirect(new URL('/login', request.url))

    // Verificar permisos por ruta
    const modulo = Object.entries(RUTAS_MODULOS).find(([ruta]) =>
      pathname.startsWith(ruta)
    )?.[1]

    if (modulo && PERMISOS[rol]?.[modulo] === 'sin_acceso') {
      return NextResponse.redirect(new URL('/dashboard/sin-acceso', request.url))
    }
  }

  // Si ya tiene sesión e intenta ir al login → dashboard
  if (token && rol && PUBLIC_ROUTES.some(r => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL('/dashboard/ejecutivo', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images|icons).*)'],
}
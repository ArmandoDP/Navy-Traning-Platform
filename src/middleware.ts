import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rutas públicas que no requieren auth
const PUBLIC_ROUTES = [
  '/login',
  '/login/recuperar',
  '/login/nueva-password',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Permitir rutas públicas
  if (PUBLIC_ROUTES.some(r => pathname.startsWith(r))) {
    return NextResponse.next()
  }

  // Permitir assets y api
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/icons') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Verificar sesión via cookie (sin llamar a Supabase en edge)
  const token = request.cookies.get('sb-access-token')?.value ||
                request.cookies.get('supabase-auth-token')?.value ||
                // Supabase v2 usa este formato
                [...request.cookies.getAll()].find(c => c.name.includes('auth-token'))?.value

  if (!token && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|icons).*)',
  ],
}
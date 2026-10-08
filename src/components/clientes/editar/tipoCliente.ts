// src/components/clientes/editar/tipoCliente.ts
export type TipoCliente = 'navy' | 'wellhub' | 'totalpass' | 'prospecto'

/**
 * Qué tipo de cliente es, para mostrarle a Navy solo lo que aplica.
 * Si tiene un plan de Navy activo, es cliente Navy aunque haya llegado por una plataforma.
 */
export function tipoDeCliente(cliente: any, tienePlanNavy: boolean): TipoCliente {
  if (tienePlanNavy) return 'navy'
  const origen = (cliente?.origen || '').toLowerCase()
  const plan   = (cliente?.plan || '').toLowerCase()
  if (origen === 'wellhub'   || plan === 'wellhub')   return 'wellhub'
  if (origen === 'totalpass' || plan === 'totalpass') return 'totalpass'
  if (origen === 'clase muestra') return 'prospecto'
  return 'navy'
}

export const TIPOS: Record<TipoCliente, { etiqueta: string; descripcion: string; badge: string; avatar: string }> = {
  navy: {
    etiqueta:    'Cliente Navy',
    descripcion: 'Compra sus planes directamente con Navy.',
    badge:       'bg-gray-900 text-white',
    avatar:      'bg-gray-900 text-white',
  },
  wellhub: {
    etiqueta:    'Wellhub',
    descripcion: 'Entra con su membresía de Wellhub. No paga en Navy.',
    badge:       'bg-pink-100 text-pink-700',
    avatar:      'bg-pink-500 text-white',
  },
  totalpass: {
    etiqueta:    'TotalPass',
    descripcion: 'Entra con su membresía de TotalPass. No paga en Navy.',
    badge:       'bg-emerald-100 text-emerald-700',
    avatar:      'bg-emerald-500 text-white',
  },
  prospecto: {
    etiqueta:    'Clase muestra',
    descripcion: 'Tomó una clase de prueba y todavía no compra un plan.',
    badge:       'bg-sky-100 text-sky-700',
    avatar:      'bg-sky-500 text-white',
  },
}

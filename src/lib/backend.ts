// src/lib/backend.ts
// Llamadas del CRM al backend (Railway) con la sesión del usuario logueado.
import { supabase } from '@/lib/supabase'

export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'https://navy-traning-backend-production.up.railway.app'

export class SesionRequerida extends Error {}

export async function backend<T = any>(
  ruta: string,
  opciones: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: unknown } = {},
): Promise<T> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new SesionRequerida('Inicia sesión para continuar.')

  const res = await fetch(`${BACKEND_URL}${ruta}`, {
    method:  opciones.method || (opciones.body !== undefined ? 'POST' : 'GET'),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body:    opciones.body !== undefined ? JSON.stringify(opciones.body) : undefined,
    cache:   'no-store',
  })

  const texto = await res.text()
  let json: any = {}
  try { json = texto ? JSON.parse(texto) : {} } catch { json = { detail: texto } }

  if (res.status === 401) throw new SesionRequerida(json.detail || 'Tu sesión venció. Vuelve a iniciar sesión.')
  if (!res.ok) throw new Error(json.detail || `Error ${res.status}`)
  return json as T
}
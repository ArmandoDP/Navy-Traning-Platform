// src/components/clientes/editar/ui.tsx
'use client'
import { ReactNode } from 'react'
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react'

export const inputCls  = 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 bg-white transition placeholder:text-gray-400 disabled:bg-gray-50 disabled:text-gray-400'
export const selectCls = `${inputCls} appearance-none cursor-pointer`

/** Campo con etiqueta y una ayuda corta debajo, para que se entienda para qué sirve. */
export function Field({ label, hint, required, children }: { label: string; hint?: ReactNode; required?: boolean; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[13px] font-bold text-gray-800">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] leading-4 text-gray-400">{hint}</p>}
    </div>
  )
}

/** Bloque con título, explicación y contenido. */
export function Section({ icon, titulo, descripcion, children, derecha }:
  { icon?: ReactNode; titulo: string; descripcion?: string; children: ReactNode; derecha?: ReactNode }) {
  return (
    <section className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="flex items-start gap-3">
        {icon && <div className="w-8 h-8 rounded-xl bg-gray-50 text-gray-500 flex items-center justify-center shrink-0">{icon}</div>}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-black text-gray-900">{titulo}</h3>
          {descripcion && <p className="text-xs text-gray-400 mt-0.5 leading-5">{descripcion}</p>}
        </div>
        {derecha}
      </div>
      {children}
    </section>
  )
}

type Tono = 'ok' | 'aviso' | 'error' | 'info'
const TONOS: Record<Tono, { caja: string; icono: ReactNode }> = {
  ok:    { caja: 'bg-emerald-50 border-emerald-100 text-emerald-800', icono: <CheckCircle2 size={16} className="text-emerald-500" /> },
  aviso: { caja: 'bg-amber-50 border-amber-100 text-amber-800',       icono: <AlertTriangle size={16} className="text-amber-500" /> },
  error: { caja: 'bg-red-50 border-red-100 text-red-800',             icono: <XCircle size={16} className="text-red-500" /> },
  info:  { caja: 'bg-indigo-50 border-indigo-100 text-indigo-800',    icono: <Info size={16} className="text-indigo-500" /> },
}

/** Mensaje con color según su importancia, opcionalmente con botones de acción. */
export function Aviso({ tono = 'info', titulo, children, acciones }:
  { tono?: Tono; titulo?: string; children?: ReactNode; acciones?: ReactNode }) {
  const t = TONOS[tono]
  return (
    <div className={`border rounded-xl p-3.5 ${t.caja}`}>
      <div className="flex gap-2.5">
        <div className="mt-0.5 shrink-0">{t.icono}</div>
        <div className="flex-1 min-w-0 space-y-1">
          {titulo && <p className="text-[13px] font-black">{titulo}</p>}
          {children && <div className="text-xs leading-5 opacity-90">{children}</div>}
          {acciones && <div className="flex flex-wrap gap-2 pt-1.5">{acciones}</div>}
        </div>
      </div>
    </div>
  )
}

export function Boton({ onClick, children, variante = 'secundario', disabled, cargando }:
  { onClick?: () => void; children: ReactNode; variante?: 'primario' | 'secundario' | 'peligro'; disabled?: boolean; cargando?: boolean }) {
  const estilos = {
    primario:   'bg-gray-900 text-white hover:bg-gray-800',
    secundario: 'bg-white border border-gray-200 text-gray-800 hover:bg-gray-50',
    peligro:    'bg-white border border-red-200 text-red-600 hover:bg-red-50',
  }[variante]
  return (
    <button onClick={onClick} disabled={disabled || cargando}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-50 ${estilos}`}>
      {cargando ? 'Procesando...' : children}
    </button>
  )
}

/** Dato pequeño: etiqueta arriba, valor abajo. */
export function Dato({ etiqueta, valor, sub }: { etiqueta: string; valor: ReactNode; sub?: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">{etiqueta}</p>
      <p className="text-sm font-bold text-gray-900 mt-0.5 truncate">{valor}</p>
      {sub && <p className="text-[11px] text-gray-400 truncate">{sub}</p>}
    </div>
  )
}

export function Pill({ children, tono = 'gris' }: { children: ReactNode; tono?: 'gris' | 'verde' | 'ambar' | 'rojo' | 'indigo' }) {
  const t = {
    gris:   'bg-gray-100 text-gray-600',
    verde:  'bg-emerald-100 text-emerald-700',
    ambar:  'bg-amber-100 text-amber-700',
    rojo:   'bg-red-100 text-red-700',
    indigo: 'bg-indigo-100 text-indigo-700',
  }[tono]
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide ${t}`}>{children}</span>
}

export function Vacio({ children }: { children: ReactNode }) {
  return <p className="text-xs text-gray-400 text-center py-4 bg-gray-50 rounded-xl">{children}</p>
}

export function Cargando() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map(i => <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />)}
    </div>
  )
}

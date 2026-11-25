'use client'
// Campo de medida de las recetas: se puede escribir CUALQUIER medida; mientras se escribe sugiere las que coinciden
// (al escribir "cu" aparecen cucharada y cucharadita). Las sugerencias solo ayudan: no limitan lo que se escribe.
import { useState, useRef, useEffect } from 'react'
import { normalizarUnidad, SUGERENCIAS_UNIDAD } from '@/lib/medidas'

interface Props {
  value:        string
  onChange:     (v: string) => void
  extras?:      string[]        // medidas ya usadas con este insumo (salen primero)
  placeholder?: string
}

export default function MedidaInput({ value, onChange, extras = [], placeholder = 'Medida (ej. cucharada)' }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [activo,  setActivo]  = useState(0)
  const caja = useRef<HTMLDivElement>(null)

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const fuera = (e: MouseEvent) => { if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false) }
    document.addEventListener('mousedown', fuera)
    return () => document.removeEventListener('mousedown', fuera)
  }, [])

  const todas = [...new Set([...extras, ...SUGERENCIAS_UNIDAD])]
  const q = normalizarUnidad(value)
  const opciones = (q
    ? [
        ...todas.filter(o => normalizarUnidad(o).startsWith(q)),                                   // primero las que empiezan igual
        ...todas.filter(o => !normalizarUnidad(o).startsWith(q) && normalizarUnidad(o).includes(q)), // luego las que lo contienen
      ]
    : todas
  ).filter(o => normalizarUnidad(o) !== q).slice(0, 8)                                              // no repetir lo ya escrito completo

  const elegir = (o: string) => { onChange(o); setAbierto(false); setActivo(0) }

  const teclas = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setAbierto(true); setActivo(a => Math.min(a + 1, Math.max(opciones.length - 1, 0))) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActivo(a => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter' && abierto && opciones[activo]) { e.preventDefault(); elegir(opciones[activo]) }
    else if (e.key === 'Escape' || e.key === 'Tab') setAbierto(false)
  }

  return (
    <div ref={caja} className="relative">
      <input
        value={value} placeholder={placeholder} autoComplete="off"
        onChange={e => { onChange(e.target.value); setAbierto(true); setActivo(0) }}
        onFocus={() => setAbierto(true)}
        onKeyDown={teclas}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400"
      />
      {abierto && opciones.length > 0 && (
        <ul role="listbox" className="absolute z-30 left-0 right-0 mt-1 max-h-52 overflow-auto bg-white border border-gray-200 rounded-xl shadow-lg py-1">
          {opciones.map((o, i) => (
            <li key={o} role="option" aria-selected={i === activo}>
              <button type="button" onMouseDown={e => { e.preventDefault(); elegir(o) }} onMouseEnter={() => setActivo(i)}
                className={`w-full text-left px-3 py-1.5 text-sm transition ${i === activo ? 'bg-gray-100 text-gray-900 font-bold' : 'text-gray-600'}`}>
                {o}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

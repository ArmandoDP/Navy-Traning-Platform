'use client'
import { RotateCcw, Search } from 'lucide-react'

interface Props {
  filtros:   { nombre: string; sucursal: string; plan: string; fecha: string; estado: string; canal: string }
  onChange:  (k: string, v: string) => void
  onLimpiar: () => void
}

const CANALES = [
  { key: '',          label: 'Todos',     bg: 'bg-gray-100',   text: 'text-gray-500',  activeBg: 'bg-gray-200',   activeText: 'text-gray-700' },
  { key: 'Navy',      label: 'Navy',      bg: 'bg-gray-900',   text: 'text-white',     activeBg: 'bg-gray-900',   activeText: 'text-white' },
  { key: 'Prospecto', label: 'Prospecto', bg: 'bg-amber-100',  text: 'text-amber-700', activeBg: 'bg-amber-200',  activeText: 'text-amber-800' },
  { key: 'Wellhub',   label: 'Wellhub',   bg: 'bg-pink-100',   text: 'text-pink-600',  activeBg: 'bg-pink-200',   activeText: 'text-pink-700' },
  { key: 'TotalPass', label: 'TotalPass', bg: 'bg-green-100',  text: 'text-green-700', activeBg: 'bg-green-200',  activeText: 'text-green-800' },
]

function FiltroInput({ placeholder, value, onChange, icon }: { placeholder: string; value: string; onChange: (v: string) => void; icon?: React.ReactNode }) {
  return (
    <div className="relative flex items-center">
      {icon && <span className="absolute left-2.5 text-gray-400">{icon}</span>}
      <input placeholder={placeholder}
        className={`border border-gray-200 rounded-lg py-1.5 text-xs text-gray-600 outline-none focus:border-indigo-400 bg-white transition ${icon ? 'pl-7 pr-3' : 'px-3'} min-w-[100px]`}
        value={value} onChange={e => onChange(e.target.value)} />
    </div>
  )
}

function FiltroSelect({ placeholder, value, options, onChange }: {
  placeholder: string; value: string; options: string[]; onChange: (v: string) => void
}) {
  return (
    <div className="relative">
      <select className="appearance-none border border-gray-200 rounded-lg pl-3 pr-7 py-1.5 text-xs text-gray-600 outline-none focus:border-indigo-400 bg-white cursor-pointer min-w-[100px]"
        value={value} onChange={e => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-[10px]">▾</span>
    </div>
  )
}

export default function ClientesFilters({ filtros, onChange, onLimpiar }: Props) {
  const hay = Object.values(filtros).some(v => v !== '')

  return (
    <div className="space-y-2">

      {/* Fila 1 — Canal pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {CANALES.map(c => {
          const activo = filtros.canal === c.key
          return (
            <button key={c.key}
              onClick={() => onChange('canal', c.key)}
              className={`px-3 py-1 rounded-full text-[11px] font-black transition border-2 ${
                activo
                  ? `${c.activeBg} ${c.activeText} border-transparent shadow-sm`
                  : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300 hover:text-gray-600'
              }`}>
              {c.label}
            </button>
          )
        })}
      </div>

      {/* Fila 2 — Filtros de texto */}
      <div className="flex flex-wrap items-center gap-2">
        <FiltroInput
          placeholder="Buscar nombre o email"
          value={filtros.nombre}
          onChange={v => onChange('nombre', v)}
          icon={<Search size={11}/>}
        />
        <FiltroInput    placeholder="Sucursal" value={filtros.sucursal} onChange={v => onChange('sucursal', v)} />
        <FiltroInput    placeholder="Plan"     value={filtros.plan}     onChange={v => onChange('plan', v)} />
        <div className="flex items-center border border-gray-200 rounded-lg px-2.5 py-1.5 gap-1.5 bg-white">
          <span className="text-gray-400 text-xs">📅</span>
          <input type="date" className="text-xs text-gray-600 outline-none bg-transparent"
            value={filtros.fecha} onChange={e => onChange('fecha', e.target.value)} />
        </div>
        <FiltroSelect placeholder="Estado" value={filtros.estado}
          options={['Activo','Expirado','Pago fallido','Perdido','Inactivo','Prospecto','Vencido']}
          onChange={v => onChange('estado', v)} />
        {hay && (
          <button onClick={onLimpiar}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition px-2 py-1.5 rounded-lg hover:bg-gray-100">
            <RotateCcw size={11}/> Limpiar
          </button>
        )}
      </div>

    </div>
  )
}
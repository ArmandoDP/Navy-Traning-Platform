'use client'
import CheckinScanner    from './CheckinScanner'
import CheckinFeed       from './CheckinFeed'
import CheckinContadores from './CheckinContadores'
import CheckinClasesHoy  from './CheckinClasesHoy'

interface Props {
  sucursalId:     string | null
  sucursalNombre: string
  checkins:       any[]
  loading:        boolean
  onCheckin:      () => void
}

export default function CheckinLayout({ sucursalId, sucursalNombre, checkins, loading, onCheckin }: Props) {
  return (
    <div className="space-y-5">
      {/* Contadores */}
      <CheckinContadores checkins={checkins} />

      {/* 3 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

        {/* Col 1 — Scanner */}
        <CheckinScanner
          sucursalId={sucursalId}
          sucursalNombre={sucursalNombre}
          onCheckin={onCheckin}
        />


        {/* Col 3 — Feed */}
        <CheckinFeed checkins={checkins} loading={loading} />

        {/* Col 2 — Clases de hoy */}
        <CheckinClasesHoy
          sucursalId={sucursalId}
          onCheckin={onCheckin}
        />
      </div>
    </div>
  )
}
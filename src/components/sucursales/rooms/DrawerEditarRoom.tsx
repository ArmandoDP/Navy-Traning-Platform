'use client'
// Editar room: usa el editor compartido (estilo Navy).
import EditorRoom from './EditorRoom'

interface Props {
  isOpen:    boolean
  room:      any
  onClose:   () => void
  onSuccess: () => void
}

export default function DrawerEditarRoom({ isOpen, room, onClose, onSuccess }: Props) {
  return <EditorRoom isOpen={isOpen && !!room} modo="editar" room={room} onClose={onClose} onSuccess={onSuccess} />
}
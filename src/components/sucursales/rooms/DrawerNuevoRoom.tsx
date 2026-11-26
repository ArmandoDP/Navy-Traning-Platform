'use client'
// Nuevo room: usa el editor compartido (estilo Navy).
import EditorRoom from './EditorRoom'

interface Props {
  isOpen:         boolean
  sucursalId:     string
  sucursalNombre: string
  onClose:        () => void
  onSuccess:      () => void
}

export default function ModalNuevoRoom({ isOpen, sucursalId, sucursalNombre, onClose, onSuccess }: Props) {
  return <EditorRoom isOpen={isOpen} modo="nuevo" sucursalId={sucursalId} sucursalNombre={sucursalNombre} onClose={onClose} onSuccess={onSuccess} />
}
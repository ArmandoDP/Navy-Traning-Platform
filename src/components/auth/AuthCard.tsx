import { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

export default function AuthCard({ children }: Props) {
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 relative"
      style={{
        backgroundImage: 'url(/images/salon-hybrid.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay oscuro */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Card */}
      <div className="relative z-10 bg-white rounded-3xl shadow-2xl w-full max-w-md px-10 py-10">
        {children}
      </div>
    </div>
  )
}
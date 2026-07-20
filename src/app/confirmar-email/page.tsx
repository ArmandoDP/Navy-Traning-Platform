'use client'
import { useEffect, useState } from 'react'
import { useSearchParams }     from 'next/navigation'

export default function ConfirmarEmailPage() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')

  useEffect(() => {
    // Supabase manda el token en la URL, solo mostramos la página de éxito
    const emailParam = searchParams.get('email') || ''
    setEmail(emailParam)
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#171B24',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'sans-serif',
      padding: '20px',
    }}>
      <div style={{
        backgroundColor: '#1f2937',
        borderRadius: '24px',
        padding: '48px 40px',
        maxWidth: '420px',
        width: '100%',
        textAlign: 'center',
      }}>
        {/* Logo */}
        <p style={{ color: '#fff', fontSize: '32px', fontWeight: 900, letterSpacing: '-1px', marginBottom: '4px' }}>NAVY</p>
        <p style={{ color: '#6b7280', fontSize: '11px', letterSpacing: '4px', textTransform: 'uppercase', marginBottom: '40px' }}>Training Center</p>

        {/* Check */}
        <div style={{
          width: '72px', height: '72px', borderRadius: '50%',
          backgroundColor: '#22c55e', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
        }}>
          <span style={{ color: '#fff', fontSize: '36px' }}>✓</span>
        </div>

        <h1 style={{ color: '#fff', fontSize: '26px', fontWeight: 900, marginBottom: '12px' }}>
          ¡Email confirmado!
        </h1>
        <p style={{ color: '#9ca3af', fontSize: '15px', lineHeight: '24px', marginBottom: '40px' }}>
          Tu cuenta está activa. Abre la app de Navy Training Center e inicia sesión con tu correo y contraseña.
        </p>

        {/* Botón abrir app */}
        <a href="navyapp://"
          style={{
            display: 'block',
            backgroundColor: '#fff',
            color: '#111',
            fontWeight: 900,
            fontSize: '16px',
            padding: '18px',
            borderRadius: '16px',
            textDecoration: 'none',
            marginBottom: '16px',
          }}>
          Abrir Navy App →
        </a>

        <p style={{ color: '#6b7280', fontSize: '12px' }}>
          ¿No tienes la app? Descárgala en App Store o Google Play
        </p>
      </div>
    </div>
  )
}
'use client'
import { useState, useRef } from 'react'
import { useRouter }        from 'next/navigation'
import { supabase }         from '@/lib/supabase'
import AuthCard             from '@/components/auth/AuthCard'
import AuthLogo             from '@/components/auth/AuthLogo'
import AuthToast            from '@/components/auth/AuthToast'

type ToastInfo = { mensaje: string; tipo: 'error' | 'warning' | 'success' } | null
type Paso = 'correo' | 'otp'

export default function LoginPage() {
  const router = useRouter()
  const [paso,    setPaso]    = useState<Paso>('correo')
  const [email,   setEmail]   = useState('')
  const [otp,     setOtp]     = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [toast,   setToast]   = useState<ToastInfo>(null)
  const [error,   setError]   = useState('')
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  const handleEnviarOtp = async () => {
    setError('')
    if (!email) { setError('Ingresa tu correo electrónico.'); return }

    setLoading(true)

    const { data: staffData } = await supabase
      .from('staff').select('id, estatus').eq('email', email).maybeSingle()

    if (!staffData) {
      setError('Este correo no tiene acceso al CRM.')
      setLoading(false)
      return
    }

    if (staffData.estatus === 'Inactivo') {
      setError('Tu cuenta está inactiva. Contacta a tu manager.')
      setLoading(false)
      return
    }

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    })

    if (otpError) {
      setError('Error al enviar el código. Intenta de nuevo.')
      setLoading(false)
      return
    }

    setToast({ mensaje: `Código enviado a ${email}`, tipo: 'success' })
    setPaso('otp')
    setLoading(false)
    setTimeout(() => inputsRef.current[0]?.focus(), 300)
  }

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const newOtp = [...otp]
    newOtp[index] = digit
    setOtp(newOtp)
    setError('')
    if (digit && index < 5) inputsRef.current[index + 1]?.focus()
    if (newOtp.every(d => d) && digit) handleVerificarOtp(newOtp.join(''))
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      const newOtp = pasted.split('')
      setOtp(newOtp)
      inputsRef.current[5]?.focus()
      handleVerificarOtp(pasted)
    }
  }

  const handleVerificarOtp = async (code?: string) => {
    const token = code || otp.join('')
    setError('')
    if (token.length < 6) { setError('Ingresa los 6 dígitos del código.'); return }

    setLoading(true)

    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    })

    if (verifyError || !data.user) {
      setError('Código incorrecto o expirado.')
      setOtp(['', '', '', '', '', ''])
      setTimeout(() => inputsRef.current[0]?.focus(), 100)
      setLoading(false)
      return
    }

    const { data: staffData } = await supabase
      .from('staff').select('rol').eq('email', email).maybeSingle()

    document.cookie = `navy_rol=${staffData?.rol || 'staff_navy'}; path=/; max-age=31536000`
    router.push('/dashboard/ejecutivo')
  }

  return (
    <AuthCard>
      {toast && <AuthToast mensaje={toast.mensaje} tipo={toast.tipo} onClose={() => setToast(null)} />}

      <AuthLogo />

      {paso === 'correo' ? (
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-black text-gray-900">Bienvenido</h1>
            <p className="text-gray-400 text-sm mt-1">Ingresa tu correo para acceder al CRM</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700">Correo electrónico</label>
            <input
              type="email"
              placeholder="tu@navytrainingcenter.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleEnviarOtp()}
              className={`w-full border rounded-xl px-4 py-3 text-sm outline-none transition ${
                error ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50 focus:border-gray-400 focus:bg-white'
              }`}
            />
            {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
          </div>

          <button
            onClick={handleEnviarOtp}
            disabled={loading}
            className="w-full bg-gray-900 hover:bg-gray-700 text-white font-bold py-3.5 rounded-xl text-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                Enviando...
              </>
            ) : (
              'Enviar código de acceso →'
            )}
          </button>
        </div>

      ) : (
        <div className="space-y-6">
          <div className="text-center">
            {/* Icono animado */}
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-900 to-gray-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">✉️</span>
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full flex items-center justify-center border-2 border-white">
                <span className="text-[9px]">✓</span>
              </div>
            </div>
            <h1 className="text-2xl font-black text-gray-900">Revisa tu correo</h1>
            <p className="text-gray-400 text-sm mt-1.5 leading-relaxed">
              Enviamos un código de 6 dígitos a<br/>
              <span className="font-black text-gray-700">{email}</span>
            </p>
          </div>

          {/* Inputs OTP */}
          <div className="space-y-3">
            <div className="flex gap-2 justify-center" onPaste={handlePaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { inputsRef.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  className={`w-12 h-14 text-center text-xl font-black rounded-xl border-2 outline-none transition ${
                    digit
                      ? 'border-gray-900 bg-gray-900 text-white shadow-lg'
                      : error
                      ? 'border-red-300 bg-red-50 text-gray-900'
                      : 'border-gray-200 bg-gray-50 text-gray-900 focus:border-gray-400 focus:bg-white'
                  }`}
                />
              ))}
            </div>
            {error && (
              <p className="text-xs text-red-500 font-medium text-center">{error}</p>
            )}
            <p className="text-xs text-gray-400 text-center">
              El código expira en 10 minutos
            </p>
          </div>

          <button
            onClick={() => handleVerificarOtp()}
            disabled={loading || otp.some(d => !d)}
            className="w-full bg-gray-900 hover:bg-gray-700 text-white font-bold py-3.5 rounded-xl text-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                Verificando...
              </>
            ) : (
              'Entrar al CRM →'
            )}
          </button>

          <div className="flex items-center justify-between text-xs text-gray-400">
            <button onClick={() => { setPaso('correo'); setOtp(['','','','','','']); setError('') }}
              className="hover:text-gray-700 transition">
              ← Cambiar correo
            </button>
            <button onClick={handleEnviarOtp} disabled={loading}
              className="hover:text-gray-700 transition disabled:opacity-40">
              Reenviar código
            </button>
          </div>
        </div>
      )}
    </AuthCard>
  )
}
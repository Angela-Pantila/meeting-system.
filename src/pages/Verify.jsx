import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CalendarCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Alert } from '../components/ui'

export default function Verify() {
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') || ''
  const type = searchParams.get('type') || 'email'
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resent, setResent] = useState(false)
  const inputRefs = useRef([])
  const navigate = useNavigate()

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return
    const next = [...digits]
    next[index] = value.slice(-1)
    setDigits(next)
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
    if (next.every((d) => d !== '')) {
      doVerify(next.join(''))
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!text) return
    e.preventDefault()
    const next = text.split('').concat(['', '', '', '', '', '']).slice(0, 6)
    setDigits(next)
    const firstEmpty = next.findIndex((d) => d === '')
    inputRefs.current[firstEmpty === -1 ? 5 : firstEmpty]?.focus()
    if (next.every((d) => d !== '')) {
      doVerify(next.join(''))
    }
  }

  const doVerify = async (code) => {
    setLoading(true)
    setError('')
    const { error: verErr } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type,
    })
    setLoading(false)
    if (verErr) {
      setError('Invalid code. Please try again.')
      setDigits(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
      return
    }
    navigate('/dashboard')
  }

  const handleResend = async () => {
    setResent(false)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) {
      setError(error.message)
    } else {
      setResent(true)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-lg shadow-brand-500/30">
            <CalendarCheck size={28} />
          </div>
          <h1 className="text-2xl font-bold text-white">Check your email</h1>
          <p className="mt-2 text-sm text-slate-400">
            We sent a 6-digit code to{' '}
            <span className="font-medium text-white">{email || 'your email'}</span>
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur">
          {error && (
            <div className="mb-4 rounded-lg bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">
              {error}
            </div>
          )}

          <div className="mb-6 flex justify-center gap-2.5">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => (inputRefs.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={i === 0 ? handlePaste : undefined}
                disabled={loading}
                className="h-14 w-12 rounded-xl border border-white/10 bg-white/5 text-center text-xl font-bold text-white outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 disabled:opacity-50"
              />
            ))}
          </div>

          {loading && (
            <div className="mb-4 flex items-center justify-center gap-2 text-sm text-slate-400">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-300 border-t-brand-600" />
              Verifying...
            </div>
          )}

          <div className="flex items-center justify-center gap-1 text-sm text-slate-500">
            Didn't receive the code?{' '}
            <button
              onClick={handleResend}
              disabled={resent}
              className="font-medium text-brand-400 hover:text-brand-300 disabled:opacity-50"
            >
              {resent ? 'Sent!' : 'Resend'}
            </button>
          </div>
        </div>

        <Link
          to="/login"
          className="mt-6 inline-block text-sm text-slate-500 hover:text-slate-300"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  )
}

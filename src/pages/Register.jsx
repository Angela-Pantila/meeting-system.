import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarCheck, Mail, Lock, User, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Alert } from '../components/ui'

export default function Register() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('password')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (mode === 'password') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      setLoading(false)
      if (error) {
        setError(error.message)
        return
      }
      navigate('/login')
    } else {
      const fakePw = crypto.randomUUID()
      const { error: regErr } = await supabase.auth.signUp({
        email,
        password: fakePw,
        options: { data: { full_name: fullName } },
      })
      if (regErr && !regErr.message?.includes('already')) {
        setLoading(false)
        setError(regErr.message)
        return
      }
      const { error: otpErr } = await supabase.auth.signInWithOtp({ email })
      setLoading(false)
      if (otpErr) {
        setError(otpErr.message)
        return
      }
      navigate(`/verify?email=${encodeURIComponent(email)}&type=email`)
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-950">
      <div className="hidden flex-1 items-center justify-center lg:flex">
        <div className="relative w-full max-w-lg px-8">
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-brand-600/30 blur-[80px]" />
          <div className="absolute -bottom-10 -right-10 h-56 w-56 rounded-full bg-indigo-600/20 blur-[60px]" />
          <div className="relative">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500 text-white">
                <CalendarCheck size={24} />
              </div>
              <span className="text-xl font-bold text-white">Meeting Hub</span>
            </div>
            <h2 className="mb-4 text-3xl font-bold text-white">
              Your team deserves<br />better meetings.
            </h2>
            <p className="text-lg text-slate-400">
              Create an account, get assigned to your department, and start scheduling in minutes.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center lg:items-start">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500 text-white shadow-lg shadow-brand-500/30 lg:hidden">
              <CalendarCheck size={22} />
            </div>
            <h1 className="text-2xl font-bold text-white">Create your account</h1>
            <p className="mt-1 text-sm text-slate-400">
              Get started with Meeting Hub
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">Full name</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                  placeholder="Jane Doe"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                  placeholder="you@gmail.com"
                />
              </div>
            </div>

            {mode === 'password' && (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-300">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30"
                    placeholder="At least 6 characters"
                  />
                </div>
              </div>
            )}

            <div className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2.5 text-xs text-slate-400">
              After registering, an admin will assign you to your department and role.
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:opacity-50"
            >
              {loading
                ? mode === 'password'
                  ? 'Creating account...'
                  : 'Sending code...'
                : mode === 'password'
                  ? 'Create account'
                  : 'Create account & send code'}
              {!loading && <ArrowRight size={16} />}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode(mode === 'password' ? 'otp' : 'password')
                setError('')
              }}
              className="w-full text-center text-sm font-medium text-brand-400 hover:text-brand-300"
            >
              {mode === 'password'
                ? 'Prefer email code? Register with OTP'
                : 'Use password instead'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-brand-400 hover:text-brand-300"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

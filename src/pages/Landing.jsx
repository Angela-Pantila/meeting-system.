import { Link, Navigate } from 'react-router-dom'
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Clock,
  DoorOpen,
  FileText,
  Shield,
  Users,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Loading from '../components/Loading'

const features = [
  {
    icon: CalendarCheck,
    title: 'Smart Scheduling',
    desc: 'Create and manage meetings with venue booking, time tracking, and calendar exports.',
    color: 'bg-brand-500/20 text-brand-300',
  },
  {
    icon: Users,
    title: 'Department Scoped',
    desc: 'Each department sees only their meetings. Heads manage their team, admins see everything.',
    color: 'bg-emerald-500/20 text-emerald-300',
  },
  {
    icon: CheckCircle2,
    title: 'Track Decisions',
    desc: 'Record minutes, log decisions, and assign action items with due dates and ownership.',
    color: 'bg-amber-500/20 text-amber-300',
  },
  {
    icon: DoorOpen,
    title: 'Venue Management',
    desc: 'Organize meeting venues by department with capacity, location, and facility details.',
    color: 'bg-violet-500/20 text-violet-300',
  },
  {
    icon: FileText,
    title: 'Document Sharing',
    desc: 'Attach agendas, reports, and minutes directly to meetings for easy access.',
    color: 'bg-rose-500/20 text-rose-300',
  },
  {
    icon: Shield,
    title: 'Role-Based Access',
    desc: 'Staff, department heads, and admins each get exactly the access they need.',
    color: 'bg-cyan-500/20 text-cyan-300',
  },
]

export default function Landing() {
  const { user, loading } = useAuth()
  if (loading) return <Loading />
  if (user) return <Navigate to="/dashboard" replace />

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500">
            <CalendarCheck size={18} />
          </div>
          <span className="text-lg font-bold tracking-tight">Meeting Hub</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition hover:text-white"
          >
            Sign in
          </Link>
          <Link
            to="/register"
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-400"
          >
            Get started
          </Link>
        </div>
      </nav>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-brand-600/30 blur-[120px]" />
          <div className="absolute bottom-0 right-0 h-[400px] w-[500px] translate-x-1/4 translate-y-1/4 rounded-full bg-indigo-600/20 blur-[100px]" />
        </div>

        <div className="mx-auto max-w-4xl px-6 pb-24 pt-20 text-center sm:pt-28">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Built for teams that take meetings seriously
          </div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Meeting management,{' '}
            <span className="bg-gradient-to-r from-brand-400 to-indigo-400 bg-clip-text text-transparent">
              simplified
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400 sm:text-xl">
            Schedule, track, and collaborate on meetings across your organization.
            From agendas to action items, everything in one place.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-400 hover:shadow-lg hover:shadow-brand-500/25"
            >
              Get started free
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/10"
            >
              Sign in to your account
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-white/5 bg-slate-900/50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-14 text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">Everything you need to run great meetings</h2>
            <p className="mt-3 text-slate-400">One platform, every department.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-white/5 bg-white/[0.03] p-6 transition hover:border-white/10 hover:bg-white/[0.06]"
              >
                <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${f.color}`}>
                  <f.icon size={20} />
                </div>
                <h3 className="mb-2 text-base font-semibold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Ready to streamline your meetings?
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Set up your team in minutes. No credit card required.
          </p>
          <Link
            to="/register"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-brand-500 px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-400 hover:shadow-lg hover:shadow-brand-500/25"
          >
            Get started free
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/5 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 text-sm text-slate-500">
          <span>&copy; {new Date().getFullYear()} Meeting Hub</span>
          <span>Built with care</span>
        </div>
      </footer>
    </div>
  )
}

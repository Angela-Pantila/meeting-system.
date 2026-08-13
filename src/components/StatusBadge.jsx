import { cn } from '../lib/utils'

const styles = {
  requested: 'bg-amber-100 text-amber-800',
  scheduled: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-violet-100 text-violet-800',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-slate-200 text-slate-600',
  pending: 'bg-slate-100 text-slate-600',
  accepted: 'bg-emerald-100 text-emerald-800',
  declined: 'bg-rose-100 text-rose-800',
  present: 'bg-emerald-100 text-emerald-800',
  absent: 'bg-slate-200 text-slate-600',
  open: 'bg-amber-100 text-amber-800',
  inprogress: 'bg-blue-100 text-blue-800',
  done: 'bg-emerald-100 text-emerald-800',
  overdue: 'bg-rose-100 text-rose-800',
}

export default function StatusBadge({ status, className }) {
  const key = String(status || '').toLowerCase().replace(/[\s_]/g, '')
  const label = String(status || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
  return (
    <span className={cn('status-pill', styles[key] || 'bg-slate-100 text-slate-700', className)}>
      {label}
    </span>
  )
}

export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

export function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function toLocalInputValue(value) {
  if (!value) return ''
  const d = new Date(value)
  const offset = d.getTimezoneOffset()
  const local = new Date(d.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}

export function isOverdue(item) {
  if (!item.due_date) return false
  if (item.status === 'completed') return false
  return new Date(item.due_date).getTime() < Date.now()
}

export function initials(name) {
  if (!name) return '?'
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

export const avatarColor = (name) => {
  const colors = [
    'bg-indigo-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-sky-500',
    'bg-violet-500',
    'bg-teal-500',
  ]
  let hash = 0
  const str = name || '?'
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

export function timeAgo(value) {
  if (!value) return ''
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(value)
}

export function durationLabel(start, end) {
  if (!start || !end) return '—'
  const diff = new Date(end).getTime() - new Date(start).getTime()
  const mins = Math.round(diff / 60000)
  if (mins <= 0) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

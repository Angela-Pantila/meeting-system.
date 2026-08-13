import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, CheckCheck, CalendarClock, Info, Megaphone } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { cn, timeAgo } from '../lib/utils'

const typeIcon = {
  reschedule: CalendarClock,
  reminder: Megaphone,
  info: Info,
  system: Info,
}

export default function NotificationBell() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)

  const load = async () => {
    if (!user) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setItems(data || [])
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 20000)
    return () => clearInterval(interval)
  }, [user])

  useEffect(() => {
    const onClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const unread = items.filter((n) => !n.read).length

  const markAllRead = async () => {
    if (!items.some((n) => !n.read)) return
    const ids = items.filter((n) => !n.read).map((n) => n.id)
    await supabase.from('notifications').update({ read: true }).in('id', ids)
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl sm:w-96">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            <button
              onClick={markAllRead}
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
            >
              <CheckCheck size={13} />
              Mark all read
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">No notifications yet.</p>
            ) : (
              items.map((n) => {
                const Icon = typeIcon[n.type] || Info
                const body = (
                  <div className={cn('flex gap-3 px-4 py-3', !n.read && 'bg-brand-50/50')}>
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                      <Icon size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800">{n.title}</p>
                      {n.message && <p className="mt-0.5 text-xs text-slate-500">{n.message}</p>}
                      <p className="mt-1 text-[11px] text-slate-400">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600" />}
                  </div>
                )
                return n.related_meeting_id ? (
                  <Link
                    key={n.id}
                    to={`/meetings/${n.related_meeting_id}`}
                    onClick={() => setOpen(false)}
                    className="block border-b border-slate-50 transition hover:bg-slate-50"
                  >
                    {body}
                  </Link>
                ) : (
                  <div key={n.id} className="border-b border-slate-50">
                    {body}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, CalendarCheck, CheckCircle2, ListChecks, Plus, Video } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import MeetingCard from '../components/MeetingCard'
import StatusBadge from '../components/StatusBadge'
import { Spinner, EmptyState } from '../components/ui'
import { formatDate, isOverdue } from '../lib/utils'

export default function Dashboard() {
  const { profile } = useAuth()
  const canCreate = profile?.role === 'admin' || profile?.role === 'head'
  const [meetings, setMeetings] = useState([])
  const [myActions, setMyActions] = useState([])
  const [decisions, setDecisions] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      let query = supabase
        .from('meetings')
        .select('*, room:meeting_rooms(*)')
        .order('start_time', { ascending: true })
      if (profile?.role !== 'admin' && profile?.department_id) {
        query = query.eq('department_id', profile.department_id)
      }
      const { data: m } = await query

      const ids = (m || []).map((x) => x.id)
      let participants = []
      if (ids.length) {
        const { data: p } = await supabase
          .from('meeting_participants')
          .select('id, meeting_id, profile:profiles(full_name)')
          .in('meeting_id', ids)
        participants = p || []
      }
      const countMap = {}
      participants.forEach((p) => {
        countMap[p.meeting_id] = (countMap[p.meeting_id] || 0) + 1
      })
      const meetingsWithCounts = (m || []).map((meeting) => ({
        ...meeting,
        participant_count: countMap[meeting.id] || 0,
      }))
      setMeetings(meetingsWithCounts)

      const { data: a } = await supabase
        .from('action_items')
        .select('*, meeting:meetings(title, id)')
        .neq('status', 'completed')
        .order('due_date', { ascending: true })
      setMyActions(a || [])

      const { count } = await supabase
        .from('decisions')
        .select('*', { count: 'exact', head: true })
      setDecisions(count || 0)
      setLoading(false)
    }
    load()
  }, [])

  const upcoming = meetings.filter((m) =>
    ['requested', 'scheduled', 'in_progress'].includes(m.status),
  )
  const completedCount = meetings.filter((m) => m.status === 'completed').length
  const openActions = myActions.length
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 p-6 text-white sm:p-8">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-[40px]" />
        <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/5 blur-[30px]" />
        <div className="relative">
          <p className="text-sm font-medium text-white/70">{today}</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
            {profile ? `Welcome back, ${profile.full_name.split(' ')[0]}` : 'Welcome back'}
          </h1>
          <p className="mt-1 text-sm text-white/70">
            {canCreate
              ? 'You have ' + upcoming.length + ' upcoming meeting' + (upcoming.length !== 1 ? 's' : '')
              : 'Stay on top of your meetings and action items.'}
          </p>
          {canCreate && (
            <Link
              to="/meetings/new"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/30"
            >
              <Plus size={16} />
              Schedule meeting
            </Link>
          )}
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <div className="card flex items-center gap-4 border-l-4 border-l-brand-500 p-4 sm:p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Calendar size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{upcoming.length}</p>
                <p className="text-xs text-slate-500">Upcoming</p>
              </div>
            </div>
            <div className="card flex items-center gap-4 border-l-4 border-l-amber-500 p-4 sm:p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <ListChecks size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{openActions}</p>
                <p className="text-xs text-slate-500">Open actions</p>
              </div>
            </div>
            <div className="card flex items-center gap-4 border-l-4 border-l-emerald-500 p-4 sm:p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{decisions}</p>
                <p className="text-xs text-slate-500">Decisions</p>
              </div>
            </div>
            <div className="card flex items-center gap-4 border-l-4 border-l-violet-500 p-4 sm:p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <CalendarCheck size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{completedCount}</p>
                <p className="text-xs text-slate-500">Completed</p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            <div className="space-y-3 lg:col-span-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Upcoming meetings</h2>
                <Link to="/meetings" className="text-sm font-medium text-brand-600 hover:underline">
                  View all
                </Link>
              </div>
              {upcoming.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="No upcoming meetings"
                  message={
                    canCreate
                      ? 'Schedule your first meeting to get started.'
                      : 'No upcoming meetings yet. Check back later.'
                  }
                  action={
                    canCreate ? (
                      <Link to="/meetings/new" className="btn-primary">
                        <Plus size={16} />
                        New meeting
                      </Link>
                    ) : null
                  }
                />
              ) : (
                upcoming.slice(0, 5).map((m) => <MeetingCard key={m.id} meeting={m} />)
              )}
            </div>

            <div className="space-y-3 lg:col-span-2">
              <h2 className="text-lg font-semibold text-slate-900">My action items</h2>
              {myActions.length === 0 ? (
                <EmptyState
                  icon={ListChecks}
                  title="No open action items"
                  message="You're all caught up."
                />
              ) : (
                <div className="space-y-2">
                  {myActions.slice(0, 6).map((item) => {
                    const overdue = isOverdue(item)
                    return (
                      <Link
                        key={item.id}
                        to={`/meetings/${item.meeting_id}`}
                        className="card block p-3 transition hover:border-brand-300 hover:shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-slate-800">{item.title}</p>
                          <StatusBadge
                            status={overdue ? 'overdue' : item.status === 'in_progress' ? 'in progress' : item.status}
                          />
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                          <Video size={12} />
                          <span className="truncate">{item.meeting?.title || 'Meeting'}</span>
                        </div>
                        {item.due_date && (
                          <p className={`mt-1 text-xs ${overdue ? 'font-semibold text-rose-600' : 'text-slate-500'}`}>
                            Due {formatDate(item.due_date)}
                          </p>
                        )}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

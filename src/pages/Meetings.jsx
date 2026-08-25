import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Plus, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import MeetingCard from '../components/MeetingCard'
import { Spinner, EmptyState } from '../components/ui'
import { cn } from '../lib/utils'

const filters = ['all', 'requested', 'scheduled', 'in_progress', 'completed', 'cancelled']

export default function Meetings() {
  const { profile } = useAuth()
  const canCreate = profile?.role === 'admin' || profile?.role === 'head'
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('all')
  const [query, setQuery] = useState('')

  useEffect(() => {
    const load = async () => {
      let q = supabase
        .from('meetings')
        .select('*, room:meeting_rooms(*)')
        .order('start_time', { ascending: false })
      if (profile?.role !== 'admin' && profile?.department_id) {
        q = q.eq('department_id', profile.department_id)
      }
      const { data: m } = await q
      const ids = (m || []).map((x) => x.id)
      let participants = []
      if (ids.length) {
        const { data: p } = await supabase
          .from('meeting_participants')
          .select('id, user_id, meeting_id, profile:profiles(full_name)')
          .in('meeting_id', ids)
        participants = p || []
      }
      const countMap = {}
      const byMeeting = {}
      participants.forEach((p) => {
        countMap[p.meeting_id] = (countMap[p.meeting_id] || 0) + 1
        byMeeting[p.meeting_id] = byMeeting[p.meeting_id] || []
        byMeeting[p.meeting_id].push(p)
      })
      setMeetings(
        (m || []).map((meeting) => ({
          ...meeting,
          participant_count: countMap[meeting.id] || 0,
          participants: byMeeting[meeting.id] || [],
        })),
      )
      setLoading(false)
    }
    load()
  }, [])

  const filtered = meetings.filter((m) => {
    const matchStatus = status === 'all' || m.status === status
    const matchQuery =
      !query ||
      m.title.toLowerCase().includes(query.toLowerCase()) ||
      (m.room?.name || '').toLowerCase().includes(query.toLowerCase())
    return matchStatus && matchQuery
  })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Meetings</h1>
          <p className="text-sm text-slate-500">Requests, schedules and past meetings</p>
        </div>
        {canCreate && (
          <Link to="/meetings/new" className="btn-primary">
            <Plus size={16} />
            New meeting
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input pl-9"
            placeholder="Search meetings…"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setStatus(f)}
              className={cn(
                'whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition',
                status === f
                  ? 'bg-brand-600 text-white'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50',
              )}
            >
              {f === 'in_progress' ? 'In Progress' : f.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No meetings found"
          message={
            meetings.length === 0
              ? canCreate
                ? 'Create your first meeting to start planning.'
                : 'No meetings yet. Your department head will schedule them.'
              : 'Try adjusting your filters or search.'
          }
          action={
            meetings.length === 0 && canCreate ? (
              <Link to="/meetings/new" className="btn-primary">
                <Plus size={16} />
                New meeting
              </Link>
            ) : null
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <MeetingCard key={m.id} meeting={m} />
          ))}
        </div>
      )}
    </div>
  )
}

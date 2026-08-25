import { useEffect, useState } from 'react'
import { Calendar, Search, User as UserIcon, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import MeetingCard from '../components/MeetingCard'
import { EmptyState, Spinner } from '../components/ui'
import { avatarColor, initials } from '../lib/utils'
import { cn } from '../lib/utils'

export default function Schedule() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [meetings, setMeetings] = useState([])
  const [loadingMeetings, setLoadingMeetings] = useState(false)

  useEffect(() => {
    if (!selectedUser) return
    const load = async () => {
      setLoadingMeetings(true)
      const { data } = await supabase
        .from('meeting_participants')
        .select('meeting:meetings(*, room:meeting_rooms(*))')
        .eq('user_id', selectedUser.id)
      const m = (data || []).map((x) => x.meeting).filter(Boolean)
      m.sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
      setMeetings(m)
      setLoadingMeetings(false)
    }
    load()
  }, [selectedUser])

  const runSearch = async (e) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    setSearching(true)
    setSearched(true)
    let qb = supabase
      .from('profiles')
      .select('id, full_name, email, role, department_id, department:departments(name)')
      .or(`email.ilike.%${q}%,full_name.ilike.%${q}%`)
      .limit(20)
    if (!isAdmin && profile?.department_id) {
      qb = qb.eq('department_id', profile.department_id)
    }
    const { data } = await qb
    setResults(data || [])
    setSearching(false)
  }

  const now = new Date()
  const upcoming = meetings.filter((m) => new Date(m.end_time) > now)
  const past = meetings.filter((m) => new Date(m.end_time) <= now)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Schedule</h1>
        <p className="text-sm text-slate-500">
          {isAdmin
            ? 'Search any staff by email or name to check their meeting schedule.'
            : 'Search your department staff by email or name to check their schedule.'}
        </p>
      </div>

      <form onSubmit={runSearch} className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1 sm:max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search email or name… e.g. juan@gmail.com"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button type="submit" disabled={searching} className="btn-primary sm:w-auto">
          {searching ? 'Searching…' : 'Search'}
        </button>
      </form>

      {searched && results.length === 0 && !searching && (
        <EmptyState
          icon={UserIcon}
          title="No users found"
          message={isAdmin ? 'Try a different email or name.' : 'No matching staff in your department.'}
        />
      )}

      {results.length > 0 && !selectedUser && (
        <div className="card divide-y divide-slate-100">
          {results.map((u) => (
            <button
              key={u.id}
              onClick={() => setSelectedUser(u)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
            >
              <div
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white',
                  avatarColor(u.full_name),
                )}
              >
                {initials(u.full_name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{u.full_name}</p>
                <p className="truncate text-xs text-slate-500">{u.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {u.department && (
                  <span className="hidden rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 sm:inline">
                    {u.department.name}
                  </span>
                )}
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-600">
                  {u.role}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedUser && (
        <div className="space-y-4">
          <div className="card flex flex-wrap items-center gap-3 p-4">
            <div
              className={cn(
                'flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold text-white',
                avatarColor(selectedUser.full_name),
              )}
            >
              {initials(selectedUser.full_name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900">{selectedUser.full_name}</p>
              <p className="text-sm text-slate-500">{selectedUser.email}</p>
            </div>
            <div className="flex items-center gap-2">
              {selectedUser.department && (
                <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                  {selectedUser.department.name}
                </span>
              )}
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs capitalize text-slate-600">
                {selectedUser.role}
              </span>
              <button
                onClick={() => {
                  setSelectedUser(null)
                  setMeetings([])
                }}
                className="ml-2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Clear selection"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {loadingMeetings ? (
            <Spinner />
          ) : (
            <>
              <div>
                <h2 className="mb-3 text-lg font-semibold text-slate-900">
                  Upcoming ({upcoming.length})
                </h2>
                {upcoming.length === 0 ? (
                  <EmptyState icon={Calendar} title="No upcoming meetings" message="This staff member has no upcoming meetings." />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {upcoming.map((m) => (
                      <MeetingCard key={m.id} meeting={m} />
                    ))}
                  </div>
                )}
              </div>
              {past.length > 0 && (
                <div>
                  <h2 className="mb-3 text-lg font-semibold text-slate-900">Past ({past.length})</h2>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {past.slice(-6).reverse().map((m) => (
                      <MeetingCard key={m.id} meeting={m} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

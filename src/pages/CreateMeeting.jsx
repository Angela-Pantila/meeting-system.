import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Alert } from '../components/ui'
import { avatarColor, initials } from '../lib/utils'
import { cn } from '../lib/utils'

const emptyAgenda = { title: '', duration_minutes: 30, presenter_id: '' }

export default function CreateMeeting() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const [form, setForm] = useState({
    title: '',
    description: '',
    meeting_type: 'in_person',
    start_time: '',
    end_time: '',
    room_id: '',
    online_link: '',
    status: 'scheduled',
    department_id: profile?.department_id || '',
  })
  const [participantIds, setParticipantIds] = useState([])
  const [agenda, setAgenda] = useState([{ ...emptyAgenda }])
  const [rooms, setRooms] = useState([])
  const [profiles, setProfiles] = useState([])
  const [departments, setDepartments] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      const [{ data: r }, { data: d }, { data: p }] = await Promise.all([
        supabase.from('meeting_rooms').select('*').order('name'),
        supabase.from('departments').select('id, name').order('name'),
        supabase
          .from('profiles')
          .select('id, full_name, role, department_id')
          .order('full_name'),
      ])
      setRooms(r || [])
      setDepartments(d || [])
      const scoped = isAdmin
        ? (p || [])
        : (p || []).filter((x) => x.department_id === profile?.department_id)
      setProfiles(scoped)
    }
    load()
  }, [isAdmin, profile?.department_id])

  const roomsForDept = form.department_id
    ? rooms.filter((r) => r.department_id === form.department_id)
    : rooms

  const now = useMemo(() => {
    const d = new Date()
    d.setSeconds(d.getSeconds() + 1)
    return d.toISOString().slice(0, 16)
  }, [])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const toggleParticipant = (id) => {
    setParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const setAgendaItem = (index, key, value) => {
    setAgenda((prev) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.title || !form.start_time || !form.end_time) {
      setError('Title, start time and end time are required.')
      return
    }
    if (new Date(form.end_time) <= new Date(form.start_time)) {
      setError('End time must be after the start time.')
      return
    }
    if (new Date(form.start_time) < new Date()) {
      setError('Start time cannot be in the past.')
      return
    }
    if (!form.department_id) {
      setError('You must belong to a department to schedule a meeting.')
      return
    }

    setSaving(true)
    const meetingPayload = {
      department_id: form.department_id,
      title: form.title,
      description: form.description,
      meeting_type: form.meeting_type,
      status: form.status,
      start_time: new Date(form.start_time).toISOString(),
      end_time: new Date(form.end_time).toISOString(),
      room_id: form.room_id || null,
      online_link: form.online_link,
      created_by: user.id,
    }

    const { data: meeting, error: mErr } = await supabase
      .from('meetings')
      .insert(meetingPayload)
      .select()
      .single()

    if (mErr) {
      setError(mErr.message)
      setSaving(false)
      return
    }

    const participantRows = [user.id, ...participantIds.filter((id) => id !== user.id)].map(
      (uid, i) => ({
        meeting_id: meeting.id,
        user_id: uid,
        participant_role: i === 0 ? 'organizer' : 'member',
      }),
    )

    const agendaRows = agenda
      .filter((a) => a.title.trim())
      .map((a, i) => ({
        meeting_id: meeting.id,
        position: i + 1,
        title: a.title.trim(),
        duration_minutes: Number(a.duration_minutes) || 0,
        presenter_id: a.presenter_id || null,
      }))

    const results = await Promise.all([
      participantRows.length
        ? supabase.from('meeting_participants').insert(participantRows)
        : Promise.resolve({ error: null }),
      agendaRows.length ? supabase.from('agenda_items').insert(agendaRows) : Promise.resolve({ error: null }),
    ])
    const failed = results.find((r) => r.error)
    if (failed) {
      setError(failed.error.message)
      setSaving(false)
      return
    }

    navigate(`/meetings/${meeting.id}`)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link
          to="/meetings"
          className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft size={16} />
          Back to meetings
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Schedule a meeting</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <Alert>{error}</Alert>}

        <div className="card space-y-4 p-5">
          <h2 className="text-base font-semibold text-slate-900">Details</h2>
          {isAdmin ? (
            <div>
              <label className="label">Department *</label>
              <select className="input" value={form.department_id} onChange={set('department_id')}>
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="label">Department</label>
              <input
                className="input"
                value={departments.find((d) => d.id === profile?.department_id)?.name || ''}
                disabled
              />
            </div>
          )}
          <div>
            <label className="label">Title *</label>
            <input
              className="input"
              value={form.title}
              onChange={set('title')}
              placeholder="Weekly governance review"
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input min-h-[80px]"
              value={form.description}
              onChange={set('description')}
              placeholder="Purpose of the meeting…"
            />
          </div>
          <div>
            <label className="label">Meeting format</label>
            <div className="grid grid-cols-3 gap-2">
              {['in_person', 'online', 'hybrid'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, meeting_type: type }))}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm font-medium capitalize transition',
                    form.meeting_type === type
                      ? 'border-brand-600 bg-brand-50 text-brand-700 ring-1 ring-brand-600'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                  )}
                >
                  {type.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={set('status')}>
              <option value="requested">Requested</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </div>
        </div>

        <div className="card space-y-4 p-5">
          <h2 className="text-base font-semibold text-slate-900">Schedule</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Start *</label>
              <input
                type="datetime-local"
                className="input"
                value={form.start_time}
                min={now}
                onChange={set('start_time')}
              />
            </div>
            <div>
              <label className="label">End *</label>
              <input
                type="datetime-local"
                className="input"
                value={form.end_time}
                min={form.start_time || now}
                onChange={set('end_time')}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Venue</label>
              <select className="input" value={form.room_id} onChange={set('room_id')}>
                <option value="">No venue</option>
                {roomsForDept.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                    {r.location ? ` — ${r.location}` : ''}
                  </option>
                ))}
              </select>
              {roomsForDept.length === 0 && (
                <p className="mt-1 text-xs text-slate-500">
                  No venues for this department yet. Ask the admin to add one.
                </p>
              )}
            </div>
            <div>
              <label className="label">Online meeting link</label>
              <input
                className="input"
                value={form.online_link}
                onChange={set('online_link')}
                placeholder="https://meet.example.com/…"
              />
            </div>
          </div>
        </div>

        <div className="card space-y-4 p-5">
          <h2 className="text-base font-semibold text-slate-900">Participants</h2>
          {!isAdmin && (
            <p className="text-xs text-slate-500">
              Showing staff from {departments.find((d) => d.id === profile?.department_id)?.name || 'your department'}.
            </p>
          )}
          {profiles.length === 0 ? (
            <p className="text-sm text-slate-500">
              No staff assigned to this department yet. Ask an admin to assign users.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {profiles
                .filter((p) => p.id !== user.id)
                .map((p) => {
                  const selected = participantIds.includes(p.id)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleParticipant(p.id)}
                      className={cn(
                        'flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition',
                        selected
                          ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600'
                          : 'border-slate-200 hover:bg-slate-50',
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white',
                          avatarColor(p.full_name),
                        )}
                      >
                        {initials(p.full_name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">{p.full_name}</p>
                        <p className="text-xs capitalize text-slate-500">{p.role}</p>
                      </div>
                    </button>
                  )
                })}
            </div>
          )}
        </div>

        <div className="card space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Agenda</h2>
            <button
              type="button"
              className="btn-secondary px-3 py-1.5 text-xs"
              onClick={() => setAgenda((prev) => [...prev, { ...emptyAgenda }])}
            >
              <Plus size={14} />
              Add item
            </button>
          </div>
          {agenda.map((item, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-lg bg-slate-50 p-3 sm:flex-row">
              <input
                className="input flex-1"
                placeholder="Agenda topic"
                value={item.title}
                onChange={(e) => setAgendaItem(i, 'title', e.target.value)}
              />
              <input
                type="number"
                min="0"
                className="input w-full sm:w-24"
                placeholder="Mins"
                value={item.duration_minutes}
                onChange={(e) => setAgendaItem(i, 'duration_minutes', e.target.value)}
              />
              <select
                className="input w-full sm:w-44"
                value={item.presenter_id}
                onChange={(e) => setAgendaItem(i, 'presenter_id', e.target.value)}
              >
                <option value="">Presenter</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
              {agenda.length > 1 && (
                <button
                  type="button"
                  onClick={() => setAgenda((prev) => prev.filter((_, j) => j !== i))}
                  className="btn-ghost px-2 text-rose-600"
                  aria-label="Remove"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary flex-1 sm:flex-none sm:px-8">
            {saving ? 'Saving…' : 'Create meeting'}
          </button>
          <Link to="/meetings" className="btn-secondary sm:flex-none">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}

import { useState } from 'react'
import { MapPin, Megaphone, CalendarClock, Video } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Alert } from '../../components/ui'
import { avatarColor, initials, formatDateTime, durationLabel, timeAgo } from '../../lib/utils'
import { cn } from '../../lib/utils'

export default function OverviewTab({
  meeting,
  participants,
  myParticipation,
  refresh,
  reminders = [],
  scheduleChanges = [],
}) {
  const { user } = useAuth()
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const rsvp = async (status) => {
    setSaving(true)
    setError('')
    if (myParticipation) {
      const { error } = await supabase
        .from('meeting_participants')
        .update({ rsvp_status: status })
        .eq('id', myParticipation.id)
      if (error) setError(error.message)
    } else {
      const { error } = await supabase.from('meeting_participants').insert({
        meeting_id: meeting.id,
        user_id: user.id,
        participant_role: 'member',
        rsvp_status: status,
      })
      if (error) setError(error.message)
    }
    setSaving(false)
    refresh()
  }

  const attending = participants.filter((p) => p.attended).length
  const rsvpCount = participants.length

  return (
    <div className="space-y-5">
      {error && <Alert>{error}</Alert>}

      {meeting.description && (
        <div className="card p-5">
          <h3 className="mb-2 text-base font-semibold text-slate-900">Description</h3>
          <p className="whitespace-pre-line text-sm text-slate-600">{meeting.description}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-3 text-base font-semibold text-slate-900">Schedule</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Starts</dt>
              <dd className="font-medium text-slate-800">{formatDateTime(meeting.start_time)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Ends</dt>
              <dd className="font-medium text-slate-800">{formatDateTime(meeting.end_time)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Duration</dt>
              <dd className="font-medium text-slate-800">
                {durationLabel(meeting.start_time, meeting.end_time)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Format</dt>
              <dd className="font-medium capitalize text-slate-800">{meeting.meeting_type.replace('_', ' ')}</dd>
            </div>
          </dl>
        </div>

        <div className="card p-5">
          <h3 className="mb-3 text-base font-semibold text-slate-900">Location</h3>
          {meeting.room ? (
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <MapPin size={18} />
              </div>
              <div>
                <p className="font-medium text-slate-800">{meeting.room.name}</p>
                <p className="text-sm text-slate-500">
                  {meeting.room.location || 'No location'}
                  {meeting.room.capacity ? ` · ${meeting.room.capacity} seats` : ''}
                </p>
                {meeting.room.facilities?.length > 0 && (
                  <p className="mt-1 text-xs text-slate-500">
                    {meeting.room.facilities.join(', ')}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No room assigned</p>
          )}
          {(meeting.meeting_type === 'online' || meeting.meeting_type === 'hybrid') && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              {meeting.online_link ? (
                <a
                  href={meeting.online_link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100"
                >
                  <Video size={16} />
                  Join online meeting
                </a>
              ) : (
                <p className="flex items-center gap-2 text-sm text-slate-500">
                  <Video size={16} />
                  No online link provided
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="mb-3 text-base font-semibold text-slate-900">Attendance</h3>
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xl font-bold text-slate-900">{rsvpCount}</p>
            <p className="text-xs text-slate-500">Invited</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xl font-bold text-emerald-600">{attending}</p>
            <p className="text-xs text-slate-500">Attended</p>
          </div>
        </div>

        {myParticipation && meeting.status !== 'completed' && meeting.status !== 'cancelled' && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-600">My RSVP:</span>
            <button
              disabled={saving}
              onClick={() => rsvp('accepted')}
              className={cn(
                'btn px-3 py-1.5 text-xs',
                myParticipation.rsvp_status === 'accepted'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200',
              )}
            >
              Attending
            </button>
            <button
              disabled={saving}
              onClick={() => rsvp('declined')}
              className={cn(
                'btn px-3 py-1.5 text-xs',
                myParticipation.rsvp_status === 'declined'
                  ? 'bg-rose-600 text-white'
                  : 'bg-white text-slate-600 ring-1 ring-slate-200',
              )}
            >
              Declining
            </button>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {participants.map((p) => (
            <div key={p.id} className="flex items-center gap-2 rounded-full bg-slate-50 py-1 pl-1 pr-3">
              <div
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white',
                  avatarColor(p.profile?.full_name),
                )}
              >
                {initials(p.profile?.full_name)}
              </div>
              <span className="text-xs text-slate-700">{p.profile?.full_name}</span>
              {p.attended && <span className="text-[10px] font-semibold text-emerald-600">●</span>}
            </div>
          ))}
        </div>
      </div>

      {(reminders.length > 0 || scheduleChanges.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {reminders.length > 0 && (
            <div className="card p-5">
              <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
                <Megaphone size={16} className="text-slate-400" />
                Reminders
              </h3>
              <div className="space-y-3">
                {reminders.map((r) => (
                  <div key={r.id} className="border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                    <p className="text-sm text-slate-700">{r.message}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>
                        {r.channel === 'email' ? 'Email' : 'In-app'} · {r.status}
                      </span>
                      <span>
                        by {r.sender?.full_name} · {timeAgo(r.created_at)}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {scheduleChanges.length > 0 && (
            <div className="card p-5">
              <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
                <CalendarClock size={16} className="text-slate-400" />
                Schedule changes
              </h3>
              <div className="space-y-3">
                {scheduleChanges.map((s) => (
                  <div key={s.id} className="border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                    <p className="text-sm text-slate-700">{s.reason}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDateTime(s.old_start)} → {formatDateTime(s.new_start)}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      by {s.changer?.full_name} · {timeAgo(s.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

import { Link } from 'react-router-dom'
import { Calendar, Clock, MapPin, Video, Users } from 'lucide-react'
import StatusBadge from './StatusBadge'
import { formatDateTime, durationLabel } from '../lib/utils'

export default function MeetingCard({ meeting }) {
  const isOnline = meeting.meeting_type === 'online'
  const isHybrid = meeting.meeting_type === 'hybrid'

  return (
    <Link
      to={`/meetings/${meeting.id}`}
      className="card block p-4 transition hover:border-brand-300 hover:shadow-md sm:p-5"
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-slate-900">{meeting.title}</h3>
        <StatusBadge status={meeting.status} />
      </div>

      <div className="space-y-2 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <Calendar size={15} className="shrink-0 text-slate-400" />
          <span>{formatDateTime(meeting.start_time)}</span>
          <span className="text-slate-400">·</span>
          <span className="flex items-center gap-1">
            <Clock size={14} className="text-slate-400" />
            {durationLabel(meeting.start_time, meeting.end_time)}
          </span>
        </div>
        {meeting.room && (
          <div className="flex items-center gap-2">
            <MapPin size={15} className="shrink-0 text-slate-400" />
            <span>{meeting.room.name}</span>
            {meeting.room.location && (
              <span className="text-slate-400">({meeting.room.location})</span>
            )}
          </div>
        )}
        {isOnline && (
          <div className="flex items-center gap-2">
            <Video size={15} className="shrink-0 text-slate-400" />
            <span className="truncate">{meeting.online_link || 'Online meeting'}</span>
          </div>
        )}
        {isHybrid && (
          <div className="flex items-center gap-2">
            <Video size={15} className="shrink-0 text-slate-400" />
            <span className="truncate">Hybrid · {meeting.online_link || 'Online link'}</span>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <div className="flex -space-x-2">
          {(meeting.participants || []).slice(0, 4).map((p, i) => (
            <div
              key={p.id || i}
              className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white"
              style={{ backgroundColor: `hsl(${(p.user_id || '').length * 37 + i * 60 % 360}, 60%, 55%)` }}
            >
              {(p.profile?.full_name || '?')[0]?.toUpperCase()}
            </div>
          ))}
          {(meeting.participant_count || 0) > 4 && (
            <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-[10px] font-semibold text-slate-600">
              +{meeting.participant_count - 4}
            </div>
          )}
        </div>
        <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
          <Users size={14} />
          {meeting.participant_count || 0}
        </span>
      </div>
    </Link>
  )
}

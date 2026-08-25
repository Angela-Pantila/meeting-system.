import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  CalendarClock,
  CalendarPlus,
  CheckSquare,
  ClipboardList,
  DoorOpen,
  FileText,
  MapPin,
  Megaphone,
  MessageSquare,
  Video,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import StatusBadge from '../components/StatusBadge'
import { Spinner, Alert } from '../components/ui'
import Modal from '../components/Modal'
import { cn, formatDateTime, durationLabel, toLocalInputValue } from '../lib/utils'
import { downloadIcs } from '../lib/ics'
import OverviewTab from './meeting/OverviewTab'
import AgendaTab from './meeting/AgendaTab'
import ParticipantsTab from './meeting/ParticipantsTab'
import MinutesTab from './meeting/MinutesTab'
import ActionItemsTab from './meeting/ActionItemsTab'
import DocumentsTab from './meeting/DocumentsTab'

const tabs = [
  { key: 'overview', label: 'Overview', icon: ClipboardList },
  { key: 'agenda', label: 'Agenda', icon: Calendar },
  { key: 'participants', label: 'Participants', icon: DoorOpen },
  { key: 'minutes', label: 'Minutes & Decisions', icon: MessageSquare },
  { key: 'actions', label: 'Action Items', icon: CheckSquare },
  { key: 'documents', label: 'Documents', icon: FileText },
]

export default function MeetingDetail() {
  const { id } = useParams()
  const { user, profile } = useAuth()
  const [meeting, setMeeting] = useState(null)
  const [participants, setParticipants] = useState([])
  const [agenda, setAgenda] = useState([])
  const [minutes, setMinutes] = useState([])
  const [decisions, setDecisions] = useState([])
  const [actions, setActions] = useState([])
  const [followUps, setFollowUps] = useState([])
  const [documents, setDocuments] = useState([])
  const [reminders, setReminders] = useState([])
  const [scheduleChanges, setScheduleChanges] = useState([])
  const [allProfiles, setAllProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('overview')

  const [scheduleModal, setScheduleModal] = useState(false)
  const [schedForm, setSchedForm] = useState({ start_time: '', end_time: '', reason: '' })
  const [reminderModal, setReminderModal] = useState(false)
  const [reminderForm, setReminderForm] = useState({ message: '', channel: 'app' })
  const [saving, setSaving] = useState(false)

  const loadAll = async () => {
    const [
      { data: p },
      { data: a },
      { data: mi },
      { data: d },
      { data: ac },
      { data: f },
      { data: doc },
      { data: rem },
      { data: sc },
    ] = await Promise.all([
      supabase
        .from('meeting_participants')
        .select('*, profile:profiles(full_name, role, email)')
        .eq('meeting_id', id),
      supabase
        .from('agenda_items')
        .select('*, presenter:profiles(full_name)')
        .eq('meeting_id', id)
        .order('position'),
      supabase.from('minutes').select('*, author:profiles(full_name)').eq('meeting_id', id),
      supabase.from('decisions').select('*, author:profiles(full_name)').eq('meeting_id', id),
      supabase
        .from('action_items')
        .select('*, assignee:profiles(full_name)')
        .eq('meeting_id', id),
      supabase
        .from('follow_ups')
        .select('*, assignee:profiles(full_name)')
        .eq('meeting_id', id),
      supabase
        .from('meeting_documents')
        .select('*, uploader:profiles(full_name)')
        .eq('meeting_id', id),
      supabase
        .from('meeting_reminders')
        .select('*, sender:profiles(full_name)')
        .eq('meeting_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('meeting_schedule_changes')
        .select('*, changer:profiles(full_name)')
        .eq('meeting_id', id)
        .order('created_at', { ascending: false }),
    ])

    setParticipants(p || [])
    setAgenda(a || [])
    setMinutes(mi || [])
    setDecisions(d || [])
    setActions(ac || [])
    setFollowUps(f || [])
    setDocuments(doc || [])
    setReminders(rem || [])
    setScheduleChanges(sc || [])
  }

  useEffect(() => {
    const load = async () => {
      const { data: m, error: mErr } = await supabase
        .from('meetings')
        .select('*, room:meeting_rooms(*), department:departments(name)')
        .eq('id', id)
        .maybeSingle()
      if (mErr || !m) {
        setError(mErr?.message || 'Meeting not found.')
        setLoading(false)
        return
      }
      setMeeting(m)

      const { data: allP } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .order('full_name')
      setAllProfiles(allP || [])

      await loadAll()
      setLoading(false)
    }
    load()
  }, [id])

  const refresh = loadAll

  const updateStatus = async (status) => {
    const { error } = await supabase.from('meetings').update({ status }).eq('id', id)
    if (!error) setMeeting((m) => ({ ...m, status }))
    else setError(error.message)
  }

  const openScheduleModal = () => {
    setSchedForm({
      start_time: toLocalInputValue(meeting.start_time),
      end_time: toLocalInputValue(meeting.end_time),
      reason: '',
    })
    setError('')
    setScheduleModal(true)
  }

  const saveSchedule = async (e) => {
    e.preventDefault()
    if (!schedForm.start_time || !schedForm.end_time) {
      setError('Start and end time are required.')
      return
    }
    if (new Date(schedForm.end_time) <= new Date(schedForm.start_time)) {
      setError('End time must be after the start time.')
      return
    }
    if (!schedForm.reason.trim()) {
      setError('A reason for the schedule change is required.')
      return
    }
    setSaving(true)
    setError('')

    const oldStart = meeting.start_time
    const oldEnd = meeting.end_time
    const newStart = new Date(schedForm.start_time).toISOString()
    const newEnd = new Date(schedForm.end_time).toISOString()

    const { error: upErr } = await supabase
      .from('meetings')
      .update({ start_time: newStart, end_time: newEnd })
      .eq('id', id)
    if (upErr) {
      setError(upErr.message)
      setSaving(false)
      return
    }

    await supabase.from('meeting_schedule_changes').insert({
      meeting_id: id,
      reason: schedForm.reason.trim(),
      changed_by: user.id,
      old_start: oldStart,
      new_start: newStart,
      old_end: oldEnd,
      new_end: newEnd,
    })

    await supabase.rpc('notify_all_admins', {
      p_meeting_id: id,
      p_title: 'Meeting rescheduled',
      p_message: `"${meeting.title}" — ${schedForm.reason.trim()}`,
    })

    setMeeting((m) => ({ ...m, start_time: newStart, end_time: newEnd }))
    setScheduleModal(false)
    setSaving(false)
    await loadAll()
  }

  const openReminderModal = () => {
    setReminderForm({ message: '', channel: 'app' })
    setError('')
    setReminderModal(true)
  }

  const sendReminder = async (e) => {
    e.preventDefault()
    if (!reminderForm.message.trim()) {
      setError('Reminder message is required.')
      return
    }
    setSaving(true)
    setError('')

    let status = 'sent'
    if (reminderForm.channel === 'email') {
      const { error: fnErr } = await supabase.functions.invoke('send-reminder', {
        body: { meetingId: id, message: reminderForm.message.trim() },
      })
      status = fnErr ? 'failed' : 'sent'
    }

    const { data: reminder, error: remErr } = await supabase
      .from('meeting_reminders')
      .insert({
        meeting_id: id,
        message: reminderForm.message.trim(),
        channel: reminderForm.channel,
        status,
        sent_by: user.id,
      })
      .select('*, sender:profiles(full_name)')
      .single()

    if (remErr) {
      setError(remErr.message)
      setSaving(false)
      return
    }
    setReminders((prev) => [reminder, ...prev])

    const recipientRows = participants
      .filter((p) => p.user_id !== user.id)
      .map((p) => ({
        user_id: p.user_id,
        type: 'reminder',
        title: `Reminder: ${meeting.title}`,
        message: reminderForm.message.trim(),
        related_meeting_id: id,
      }))
    if (recipientRows.length) {
      await supabase.from('notifications').insert(recipientRows)
    }

    setReminderModal(false)
    setSaving(false)
  }

  if (loading) return <Spinner />
  if (error)
    return (
      <div className="mx-auto max-w-2xl">
        <Alert>{error}</Alert>
        <Link to="/meetings" className="btn-secondary mt-4">
          Back to meetings
        </Link>
      </div>
    )

  const myParticipation = participants.find((p) => p.user_id === user.id)
  const isOnline = meeting.meeting_type === 'online'
  const isHybrid = meeting.meeting_type === 'hybrid'
  const isManager = profile?.role === 'admin' || profile?.role === 'head'

  const statusActions = [
    { label: 'Mark in progress', value: 'in_progress', hidden: meeting.status === 'in_progress' },
    { label: 'Mark completed', value: 'completed', hidden: meeting.status === 'completed' },
    { label: 'Cancel meeting', value: 'cancelled', hidden: meeting.status === 'cancelled' },
  ].filter((a) => !a.hidden)

  return (
    <div className="space-y-5">
      <div>
        <Link
          to="/meetings"
          className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft size={16} />
          Back to meetings
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{meeting.title}</h1>
              <StatusBadge status={meeting.status} />
              {meeting.department && (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                  <ClipboardList size={12} />
                  {meeting.department.name}
                </span>
              )}
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <Calendar size={15} className="text-slate-400" />
                {formatDateTime(meeting.start_time)}
              </span>
              <span>{durationLabel(meeting.start_time, meeting.end_time)}</span>
              {meeting.room && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={15} className="text-slate-400" />
                  {meeting.room.name}
                </span>
              )}
              {(isOnline || isHybrid) && meeting.online_link && (
                <a
                  href={meeting.online_link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 font-medium text-brand-600 hover:underline"
                >
                  <Video size={15} />
                  Join online
                </a>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => downloadIcs(meeting)}
              className="btn-secondary px-3 py-1.5 text-xs"
              title="Add to Google Calendar"
            >
              <CalendarPlus size={14} />
              Add to calendar
            </button>
            {isManager && (
              <>
                <button
                  onClick={openScheduleModal}
                  className="btn-secondary px-3 py-1.5 text-xs"
                  title="Change meeting schedule"
                >
                  <CalendarClock size={14} />
                  Edit schedule
                </button>
                <button
                  onClick={openReminderModal}
                  className="btn-secondary px-3 py-1.5 text-xs"
                  title="Send a reminder to participants"
                >
                  <Megaphone size={14} />
                  Send reminder
                </button>
                {statusActions.map((a) => (
                  <button key={a.value} onClick={() => updateStatus(a.value)} className="btn-secondary px-3 py-1.5 text-xs">
                    {a.label}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn('tab flex items-center gap-1.5', tab === t.key ? 'tab-active' : 'tab-inactive')}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <OverviewTab
          meeting={meeting}
          participants={participants}
          myParticipation={myParticipation}
          refresh={refresh}
          reminders={reminders}
          scheduleChanges={scheduleChanges}
          canManage={isManager}
        />
      )}
      {tab === 'agenda' && (
        <AgendaTab meetingId={id} agenda={agenda} setAgenda={setAgenda} profiles={allProfiles} canManage={isManager} />
      )}
      {tab === 'participants' && (
        <ParticipantsTab
          meetingId={id}
          participants={participants}
          setParticipants={setParticipants}
          profiles={allProfiles}
          canManage={isManager}
        />
      )}
      {tab === 'minutes' && (
        <MinutesTab meetingId={id} minutes={minutes} setMinutes={setMinutes} decisions={decisions} setDecisions={setDecisions} canManage={isManager} />
      )}
      {tab === 'actions' && (
        <ActionItemsTab meetingId={id} actions={actions} setActions={setActions} followUps={followUps} setFollowUps={setFollowUps} canManage={isManager} />
      )}
      {tab === 'documents' && <DocumentsTab meetingId={id} documents={documents} setDocuments={setDocuments} canManage={isManager} />}

      <Modal open={scheduleModal} onClose={() => setScheduleModal(false)} title="Change schedule">
        <form onSubmit={saveSchedule} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">New start *</label>
              <input
                type="datetime-local"
                className="input"
                value={schedForm.start_time}
                onChange={(e) => setSchedForm((f) => ({ ...f, start_time: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">New end *</label>
              <input
                type="datetime-local"
                className="input"
                value={schedForm.end_time}
                onChange={(e) => setSchedForm((f) => ({ ...f, end_time: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="label">Reason for change *</label>
            <textarea
              className="input min-h-[80px]"
              value={schedForm.reason}
              onChange={(e) => setSchedForm((f) => ({ ...f, reason: e.target.value }))}
              placeholder="e.g. Room not available, conflict with another meeting…"
            />
            <p className="mt-1 text-xs text-slate-500">
              This reason is logged and sent to the admin.
            </p>
          </div>
          {error && <Alert>{error}</Alert>}
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? 'Saving…' : 'Save new schedule'}
          </button>
        </form>
      </Modal>

      <Modal open={reminderModal} onClose={() => setReminderModal(false)} title="Send reminder">
        <form onSubmit={sendReminder} className="space-y-3">
          <div>
            <label className="label">Message *</label>
            <textarea
              className="input min-h-[80px]"
              value={reminderForm.message}
              onChange={(e) => setReminderForm((f) => ({ ...f, message: e.target.value }))}
              placeholder="e.g. This is a reminder for the meeting tomorrow at 10:00 AM…"
            />
          </div>
          <div>
            <label className="label">Channel</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setReminderForm((f) => ({ ...f, channel: 'app' }))}
                className={cn(
                  'rounded-lg border px-3 py-2 text-sm font-medium transition',
                  reminderForm.channel === 'app'
                    ? 'border-brand-600 bg-brand-50 text-brand-700 ring-1 ring-brand-600'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                )}
              >
                In-app bell
              </button>
              <button
                type="button"
                onClick={() => setReminderForm((f) => ({ ...f, channel: 'email' }))}
                className={cn(
                  'rounded-lg border px-3 py-2 text-sm font-medium transition',
                  reminderForm.channel === 'email'
                    ? 'border-brand-600 bg-brand-50 text-brand-700 ring-1 ring-brand-600'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                )}
              >
                Email (Gmail)
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Email reminders are sent to participants' Gmail accounts via the send-reminder Edge
              Function (Resend).
            </p>
          </div>
          {error && <Alert>{error}</Alert>}
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? 'Sending…' : 'Send reminder'}
          </button>
        </form>
      </Modal>
    </div>
  )
}

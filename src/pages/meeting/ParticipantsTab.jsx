import { useState } from 'react'
import { Plus, Trash2, UserCheck, UserX } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import StatusBadge from '../../components/StatusBadge'
import { Alert, EmptyState } from '../../components/ui'
import Modal from '../../components/Modal'
import { avatarColor, initials } from '../../lib/utils'
import { cn } from '../../lib/utils'

export default function ParticipantsTab({ meetingId, participants, setParticipants, profiles, canManage }) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const addParticipants = async () => {
    const existingIds = new Set(participants.map((p) => p.user_id))
    const toAdd = selected.filter((id) => !existingIds.has(id))
    if (!toAdd.length) {
      setOpen(false)
      return
    }
    setSaving(true)
    setError('')
    const rows = toAdd.map((uid) => ({
      meeting_id: meetingId,
      user_id: uid,
      participant_role: 'member',
      rsvp_status: 'pending',
    }))
    const { data, error } = await supabase
      .from('meeting_participants')
      .insert(rows)
      .select('*, profile:profiles(full_name, role)')
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setParticipants((prev) => [...prev, ...(data || [])])
    setSelected([])
    setOpen(false)
  }

  const toggleAttended = async (p) => {
    const { error } = await supabase
      .from('meeting_participants')
      .update({ attended: !p.attended })
      .eq('id', p.id)
    if (error) {
      setError(error.message)
      return
    }
    setParticipants((prev) => prev.map((x) => (x.id === p.id ? { ...x, attended: !x.attended } : x)))
  }

  const changeRole = async (p, role) => {
    const { error } = await supabase
      .from('meeting_participants')
      .update({ participant_role: role })
      .eq('id', p.id)
    if (error) {
      setError(error.message)
      return
    }
    setParticipants((prev) => prev.map((x) => (x.id === p.id ? { ...x, participant_role: role } : x)))
  }

  const remove = async (p) => {
    if (p.user_id === user.id) return
    const { error } = await supabase.from('meeting_participants').delete().eq('id', p.id)
    if (error) {
      setError(error.message)
      return
    }
    setParticipants((prev) => prev.filter((x) => x.id !== p.id))
  }

  const toggleSelect = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  return (
    <div className="card space-y-4 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">
          Participants ({participants.length})
        </h3>
        {canManage && (
          <button onClick={() => setOpen(true)} className="btn-primary px-3 py-1.5 text-xs">
            <Plus size={14} />
            Add people
          </button>
        )}
      </div>

      {error && <Alert>{error}</Alert>}

      {participants.length === 0 ? (
        <EmptyState
          icon={UserX}
          title="No participants yet"
          message="Add people to invite them to this meeting."
        />
      ) : (
        <div className="space-y-2">
          {participants.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-100 p-3">
              <div
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white',
                  avatarColor(p.profile?.full_name),
                )}
              >
                {initials(p.profile?.full_name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">
                  {p.profile?.full_name}
                  {p.user_id === user.id && <span className="text-slate-400"> (you)</span>}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                  {canManage ? (
                    <select
                      value={p.participant_role}
                      onChange={(e) => changeRole(p, e.target.value)}
                      className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-600"
                    >
                      {['organizer', 'chair', 'secretary', 'member', 'guest'].map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs capitalize text-slate-600">
                      {p.participant_role}
                    </span>
                  )}
                  <StatusBadge status={p.rsvp_status} />
                </div>
              </div>
              <div className="flex items-center gap-1">
                {(canManage || p.user_id === user.id) && (
                  <button
                    onClick={() => toggleAttended(p)}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition',
                      p.attended
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
                    )}
                  >
                    {p.attended ? <UserCheck size={14} /> : <UserX size={14} />}
                    {p.attended ? 'Present' : 'Mark present'}
                  </button>
                )}
                {canManage && p.user_id !== user.id && (
                  <button
                    onClick={() => remove(p)}
                    className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600"
                    aria-label="Remove"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add participants">
        <div className="space-y-3">
          {profiles.filter((p) => !participants.some((x) => x.user_id === p.id)).length === 0 ? (
            <p className="text-sm text-slate-500">Everyone is already invited.</p>
          ) : (
            profiles
              .filter((p) => !participants.some((x) => x.user_id === p.id))
              .map((p) => {
                const isSelected = selected.includes(p.id)
                return (
                  <button
                    key={p.id}
                    onClick={() => toggleSelect(p.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition',
                      isSelected ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-slate-200',
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
              })
          )}
          <button
            onClick={addParticipants}
            disabled={saving || selected.length === 0}
            className="btn-primary w-full"
          >
            {saving ? 'Adding…' : `Add selected (${selected.length})`}
          </button>
        </div>
      </Modal>
    </div>
  )
}

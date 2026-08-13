import { useEffect, useState } from 'react'
import { CheckCircle2, ListChecks, Plus, RefreshCcw, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import StatusBadge from '../../components/StatusBadge'
import { Alert, EmptyState } from '../../components/ui'
import Modal from '../../components/Modal'
import { formatDate, isOverdue, avatarColor, initials } from '../../lib/utils'
import { cn } from '../../lib/utils'

function AssigneeChip({ assignee }) {
  if (!assignee) return <span className="text-xs text-slate-400">Unassigned</span>
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          'flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white',
          avatarColor(assignee.full_name),
        )}
      >
        {initials(assignee.full_name)}
      </span>
      <span className="text-xs text-slate-600">{assignee.full_name}</span>
    </span>
  )
}

function ItemCard({ item, kind, canManage, onToggle, onDelete }) {
  const overdue = isOverdue(item)
  const done = item.status === 'completed'
  return (
    <div className={cn('rounded-lg border p-3', done ? 'border-slate-100 bg-slate-50' : 'border-slate-200')}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          {canManage && (
            <button
              onClick={() => onToggle(item)}
              className={cn(
                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition',
                done
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : 'border-slate-300 hover:border-emerald-500',
              )}
              aria-label="Toggle done"
            >
              {done && <CheckCircle2 size={13} />}
            </button>
          )}
          <div className="min-w-0">
            <p className={cn('text-sm font-medium text-slate-800', done && 'text-slate-400 line-through')}>
              {item.title}
            </p>
            {item.description && (
              <p className="mt-0.5 text-xs text-slate-500">{item.description}</p>
            )}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <AssigneeChip assignee={item.assignee} />
              {item.due_date && (
                <span className={cn('text-xs', overdue ? 'font-semibold text-rose-600' : 'text-slate-500')}>
                  Due {formatDate(item.due_date)}
                </span>
              )}
              {item.status === 'in_progress' && <StatusBadge status="in progress" />}
              {kind === 'followup' && item.action_item && (
                <span className="text-xs text-slate-400">Follows: {item.action_item.title}</span>
              )}
            </div>
          </div>
        </div>
        {canManage && (
          <button onClick={() => onDelete(item.id)} className="text-slate-400 hover:text-rose-600" aria-label="Delete">
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

export default function ActionItemsTab({ meetingId, actions, setActions, followUps, setFollowUps, canManage }) {
  const { user } = useAuth()
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ title: '', description: '', assignee_id: '', due_date: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [allProfiles, setAllProfiles] = useState([])

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('profiles').select('id, full_name').order('full_name')
      setAllProfiles(data || [])
    }
    load()
  }, [])

  const openModal = (kind) => {
    setModal(kind)
    setForm({ title: '', description: '', assignee_id: '', due_date: '', action_item_id: '' })
    setError('')
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    setError('')
    const isAction = modal === 'action'
    const table = isAction ? 'action_items' : 'follow_ups'
    const payload = {
      meeting_id: meetingId,
      title: form.title.trim(),
      description: form.description,
      assignee_id: form.assignee_id || null,
      due_date: form.due_date || null,
    }
    if (!isAction) payload.action_item_id = form.action_item_id || null

    const { data, error } = await supabase
      .from(table)
      .insert({ ...payload, created_by: user.id })
      .select(
        isAction
          ? '*, assignee:profiles(full_name)'
          : '*, assignee:profiles(full_name), action_item:action_items(title)',
      )
      .single()
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    if (isAction) setActions((prev) => [...prev, data])
    else setFollowUps((prev) => [...prev, data])
    setModal(null)
  }

  const toggle = async (item, kind) => {
    const table = kind === 'action' ? 'action_items' : 'follow_ups'
    const completed = item.status === 'completed'
    const update = completed
      ? { status: 'open', completed_at: null }
      : { status: 'completed', completed_at: new Date().toISOString() }
    const { error } = await supabase.from(table).update(update).eq('id', item.id)
    if (error) {
      setError(error.message)
      return
    }
    if (kind === 'action') {
      setActions((prev) => prev.map((x) => (x.id === item.id ? { ...x, ...update } : x)))
    } else {
      setFollowUps((prev) => prev.map((x) => (x.id === item.id ? { ...x, ...update } : x)))
    }
  }

  const deleteItem = async (id, kind) => {
    const table = kind === 'action' ? 'action_items' : 'follow_ups'
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) {
      setError(error.message)
      return
    }
    if (kind === 'action') setActions((prev) => prev.filter((x) => x.id !== id))
    else setFollowUps((prev) => prev.filter((x) => x.id !== id))
  }

  return (
    <div className="space-y-5">
      {error && <Alert>{error}</Alert>}

      <div className="card space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <ListChecks size={18} className="text-brand-600" />
            Action items ({actions.length})
          </h3>
          {canManage && (
            <button onClick={() => openModal('action')} className="btn-primary px-3 py-1.5 text-xs">
              <Plus size={14} />
              Add
            </button>
          )}
        </div>
        {actions.length === 0 ? (
          <EmptyState icon={ListChecks} title="No action items" message="Assign follow-up tasks with owners and deadlines." />
        ) : (
          <div className="space-y-2">
            {actions.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                kind="action"
                canManage={canManage}
                onToggle={(i) => toggle(i, 'action')}
                onDelete={(id) => deleteItem(id, 'action')}
              />
            ))}
          </div>
        )}
      </div>

      <div className="card space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <RefreshCcw size={18} className="text-brand-600" />
            Follow-ups ({followUps.length})
          </h3>
          {canManage && (
            <button onClick={() => openModal('followup')} className="btn-primary px-3 py-1.5 text-xs">
              <Plus size={14} />
              Add
            </button>
          )}
        </div>
        {followUps.length === 0 ? (
          <EmptyState icon={RefreshCcw} title="No follow-ups" message="Schedule check-ins to keep decisions moving." />
        ) : (
          <div className="space-y-2">
            {followUps.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                kind="followup"
                canManage={canManage}
                onToggle={(i) => toggle(i, 'followup')}
                onDelete={(id) => deleteItem(id, 'followup')}
              />
            ))}
          </div>
        )}
      </div>

      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal === 'action' ? 'Add action item' : 'Add follow-up'}
      >
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="label">Title *</label>
            <input
              className="input"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder={modal === 'action' ? 'Prepare the quarterly report' : 'Check in on decision status'}
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input min-h-[60px]"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          {modal === 'followup' && actions.length > 0 && (
            <div>
              <label className="label">Related action item</label>
              <select
                className="input"
                value={form.action_item_id}
                onChange={(e) => setForm((f) => ({ ...f, action_item_id: e.target.value }))}
              >
                <option value="">None</option>
                {actions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Assignee</label>
              <select
                className="input"
                value={form.assignee_id}
                onChange={(e) => setForm((f) => ({ ...f, assignee_id: e.target.value }))}
              >
                <option value="">Unassigned</option>
                {allProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Due date</label>
              <input
                type="date"
                className="input"
                value={form.due_date}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
              />
            </div>
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? 'Saving…' : 'Add'}
          </button>
        </form>
      </Modal>
    </div>
  )
}

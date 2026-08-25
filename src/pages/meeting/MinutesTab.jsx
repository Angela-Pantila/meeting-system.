import { useState } from 'react'
import { FileText, Gavel, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Alert, EmptyState } from '../../components/ui'
import { formatDateTime } from '../../lib/utils'

export default function MinutesTab({ meetingId, minutes, setMinutes, decisions, setDecisions, canManage }) {
  const { user } = useAuth()
  const [minForm, setMinForm] = useState({ section: 'General', content: '' })
  const [decForm, setDecForm] = useState({ title: '', description: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const addMinute = async (e) => {
    e.preventDefault()
    if (!minForm.content.trim()) return
    setSaving(true)
    setError('')
    const { data, error } = await supabase
      .from('minutes')
      .insert({
        meeting_id: meetingId,
        section: minForm.section || 'General',
        content: minForm.content.trim(),
        created_by: user.id,
      })
      .select('*, author:profiles(full_name)')
      .single()
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setMinutes((prev) => [...prev, data])
    setMinForm({ section: 'General', content: '' })
  }

  const removeMinute = async (id) => {
    const { error } = await supabase.from('minutes').delete().eq('id', id)
    if (!error) setMinutes((prev) => prev.filter((m) => m.id !== id))
    else setError(error.message)
  }

  const addDecision = async (e) => {
    e.preventDefault()
    if (!decForm.title.trim()) return
    setSaving(true)
    setError('')
    const { data, error } = await supabase
      .from('decisions')
      .insert({
        meeting_id: meetingId,
        title: decForm.title.trim(),
        description: decForm.description,
        created_by: user.id,
      })
      .select('*, author:profiles(full_name)')
      .single()
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setDecisions((prev) => [...prev, data])
    setDecForm({ title: '', description: '' })
  }

  const removeDecision = async (id) => {
    const { error } = await supabase.from('decisions').delete().eq('id', id)
    if (!error) setDecisions((prev) => prev.filter((d) => d.id !== id))
    else setError(error.message)
  }

  return (
    <div className="space-y-5">
      {error && <Alert>{error}</Alert>}

      <div className="card space-y-4 p-5">
        <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <FileText size={18} className="text-brand-600" />
          Minutes
        </h3>
        {minutes.length === 0 ? (
          <EmptyState icon={FileText} title="No minutes recorded yet" message="Capture the discussion as it happens." />
        ) : (
          <div className="space-y-3">
            {minutes.map((m) => (
              <div key={m.id} className="rounded-lg border border-slate-100 p-3">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
                      {m.section}
                    </span>
                    <span className="text-xs text-slate-400">
                      {m.author?.full_name || 'Unknown'} · {formatDateTime(m.created_at)}
                    </span>
                  </div>
                  {canManage && (
                    <button onClick={() => removeMinute(m.id)} className="text-slate-400 hover:text-rose-600" aria-label="Delete">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <p className="whitespace-pre-line text-sm text-slate-700">{m.content}</p>
              </div>
            ))}
          </div>
        )}

        {canManage && (
          <form onSubmit={addMinute} className="space-y-3 rounded-lg bg-slate-50 p-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <label className="label">Section</label>
                <input
                  className="input"
                  value={minForm.section}
                  onChange={(e) => setMinForm((f) => ({ ...f, section: e.target.value }))}
                  placeholder="General"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Minutes note</label>
                <textarea
                  className="input min-h-[60px]"
                  value={minForm.content}
                  onChange={(e) => setMinForm((f) => ({ ...f, content: e.target.value }))}
                  placeholder="What was discussed / concluded…"
                />
              </div>
            </div>
            <button type="submit" disabled={saving} className="btn-secondary text-sm">
              <Plus size={15} />
              {saving ? 'Adding…' : 'Add minute'}
            </button>
          </form>
        )}
      </div>

      <div className="card space-y-4 p-5">
        <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <Gavel size={18} className="text-brand-600" />
          Decisions ({decisions.length})
        </h3>
        {decisions.length === 0 ? (
          <EmptyState icon={Gavel} title="No decisions yet" message="Record formal decisions made in this meeting." />
        ) : (
          <div className="space-y-2">
            {decisions.map((d) => (
              <div key={d.id} className="rounded-lg border border-slate-100 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-slate-800">{d.title}</p>
                  {canManage && (
                    <button onClick={() => removeDecision(d.id)} className="text-slate-400 hover:text-rose-600" aria-label="Delete">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                {d.description && <p className="mt-1 text-sm text-slate-600">{d.description}</p>}
                <p className="mt-1 text-xs text-slate-400">
                  {d.author?.full_name || 'Unknown'} · {formatDateTime(d.created_at)}
                </p>
              </div>
            ))}
          </div>
        )}

        {canManage && (
          <form onSubmit={addDecision} className="space-y-3 rounded-lg bg-slate-50 p-3">
            <div>
              <label className="label">Decision title</label>
              <input
                className="input"
                value={decForm.title}
                onChange={(e) => setDecForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Approve FY26 budget"
              />
            </div>
            <div>
              <label className="label">Details</label>
              <textarea
                className="input min-h-[60px]"
                value={decForm.description}
                onChange={(e) => setDecForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Context and outcome…"
              />
            </div>
            <button type="submit" disabled={saving} className="btn-secondary text-sm">
              <Plus size={15} />
              {saving ? 'Adding…' : 'Record decision'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

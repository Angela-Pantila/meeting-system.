import { useState } from 'react'
import { Clock, Plus, Trash2, User } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Alert, EmptyState } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'

export default function AgendaTab({ meetingId, agenda, setAgenda, profiles, canManage }) {
  const { user } = useAuth()
  const [form, setForm] = useState({ title: '', description: '', duration_minutes: 15, presenter_id: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const addItem = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    setError('')
    const { data, error } = await supabase
      .from('agenda_items')
      .insert({
        meeting_id: meetingId,
        position: agenda.length + 1,
        title: form.title.trim(),
        description: form.description,
        duration_minutes: Number(form.duration_minutes) || 0,
        presenter_id: form.presenter_id || null,
      })
      .select('*, presenter:profiles(full_name)')
      .single()
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setAgenda((prev) => [...prev, data])
    setForm({ title: '', description: '', duration_minutes: 15, presenter_id: '' })
  }

  const removeItem = async (id) => {
    const { error } = await supabase.from('agenda_items').delete().eq('id', id)
    if (!error) setAgenda((prev) => prev.filter((a) => a.id !== id))
    else setError(error.message)
  }

  return (
    <div className="card space-y-4 p-5">
      <h3 className="text-base font-semibold text-slate-900">Agenda</h3>

      {agenda.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No agenda items yet"
          message="Add topics to structure the meeting."
        />
      ) : (
        <ol className="space-y-2">
          {agenda.map((item, i) => (
            <li key={item.id} className="flex items-start gap-3 rounded-lg border border-slate-100 p-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                {i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-slate-800">{item.title}</p>
                  {canManage && (
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-slate-400 hover:text-rose-600"
                      aria-label="Remove"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
                {item.description && (
                  <p className="mt-0.5 text-sm text-slate-500">{item.description}</p>
                )}
                <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-slate-500">
                  {item.duration_minutes > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Clock size={12} />
                      {item.duration_minutes} min
                    </span>
                  )}
                  {item.presenter && (
                    <span className="inline-flex items-center gap-1">
                      <User size={12} />
                      {item.presenter.full_name}
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}

      {canManage && (
        <form onSubmit={addItem} className="space-y-3 rounded-lg bg-slate-50 p-3">
          <div>
            <label className="label">Add agenda item</label>
            <input
              className="input"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Topic title"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Description</label>
              <input
                className="input"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What will be discussed"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Minutes</label>
                <input
                  type="number"
                  min="0"
                  className="input"
                  value={form.duration_minutes}
                  onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Presenter</label>
                <select
                  className="input"
                  value={form.presenter_id}
                  onChange={(e) => setForm((f) => ({ ...f, presenter_id: e.target.value }))}
                >
                  <option value="">None</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <button type="submit" disabled={saving} className="btn-secondary text-sm">
            <Plus size={15} />
            {saving ? 'Adding…' : 'Add to agenda'}
          </button>
          {error && <Alert>{error}</Alert>}
        </form>
      )}
    </div>
  )
}

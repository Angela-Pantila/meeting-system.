import { useEffect, useState } from 'react'
import { Building2, Plus, Trash2, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Alert, EmptyState, Spinner } from '../components/ui'
import Modal from '../components/Modal'

const emptyForm = { name: '', code: '', description: '' }

export default function Departments() {
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: d } = await supabase.from('departments').select('id, name, code, description')
      const ids = (d || []).map((x) => x.id)
      let counts = {}
      if (ids.length) {
        const { data: p } = await supabase
          .from('profiles')
          .select('department_id')
          .in('department_id', ids)
        counts = {}
        ;(p || []).forEach((x) => {
          counts[x.department_id] = (counts[x.department_id] || 0) + 1
        })
      }
      setDepartments(
        (d || []).map((dept) => ({ ...dept, member_count: counts[dept.id] || 0 })),
      )
      setLoading(false)
    }
    load()
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    setError('')
    const { data, error } = await supabase
      .from('departments')
      .insert({
        name: form.name.trim(),
        code: form.code.trim() || null,
        description: form.description,
      })
      .select()
      .single()
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setDepartments((prev) => [...prev, { ...data, member_count: 0 }])
    setForm(emptyForm)
    setOpen(false)
  }

  const remove = async (dept) => {
    const { error } = await supabase.from('departments').delete().eq('id', dept.id)
    if (error) {
      setError(error.message)
      return
    }
    setDepartments((prev) => prev.filter((d) => d.id !== dept.id))
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Departments</h1>
          <p className="text-sm text-slate-500">Create the departments that group your staff</p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary px-3 py-2 text-sm">
          <Plus size={16} />
          Add department
        </button>
      </div>

      {error && <Alert>{error}</Alert>}

      {loading ? (
        <Spinner />
      ) : departments.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No departments yet"
          message="Create your first department, then assign staff in the Users page."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((dept) => (
            <div key={dept.id} className="card p-4 sm:p-5">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                  <Building2 size={18} />
                </div>
                <button onClick={() => remove(dept)} className="text-slate-400 hover:text-rose-600" aria-label="Delete">
                  <Trash2 size={16} />
                </button>
              </div>
              <h3 className="font-semibold text-slate-900">{dept.name}</h3>
              {dept.code && (
                <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                  {dept.code}
                </p>
              )}
              {dept.description && (
                <p className="mt-1 text-sm text-slate-500">{dept.description}</p>
              )}
              <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-500">
                <Users size={14} className="text-slate-400" />
                {dept.member_count} member{dept.member_count === 1 ? '' : 's'}
              </p>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add department">
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="label">Name *</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="IT Department"
            />
          </div>
          <div>
            <label className="label">Code</label>
            <input
              className="input"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              placeholder="IT"
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input min-h-[60px]"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="What this department does…"
            />
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? 'Adding…' : 'Add department'}
          </button>
        </form>
      </Modal>
    </div>
  )
}

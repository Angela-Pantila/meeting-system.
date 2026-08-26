import { useEffect, useState } from 'react'
import { Building2, Users as UsersIcon, Shield, User, Phone } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Alert, EmptyState, Spinner } from '../components/ui'
import StatusBadge from '../components/StatusBadge'
import { avatarColor, initials } from '../lib/utils'
import { cn } from '../lib/utils'

export default function Users() {
  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [editForm, setEditForm] = useState({})

  useEffect(() => {
    const load = async () => {
      const [{ data: u }, { data: d }] = await Promise.all([
        supabase
          .from('profiles')
          .select('*, department:departments(name)')
          .order('full_name'),
        supabase.from('departments').select('id, name').order('name'),
      ])
      setUsers(u || [])
      setDepartments(d || [])
      setLoading(false)
    }
    load()
  }, [])

  const update = async (user, patch) => {
    setSavingId(user.id)
    setError('')
    const { error } = await supabase.from('profiles').update(patch).eq('id', user.id)
    setSavingId(null)
    if (error) {
      setError(error.message)
      return
    }
    setUsers((prev) =>
      prev.map((u) =>
        u.id === user.id
          ? {
              ...u,
              ...patch,
              department: patch.department_id
                ? departments.find((d) => d.id === patch.department_id) || u.department
                : patch.department_id === null
                  ? null
                  : u.department,
            }
          : u,
      ),
    )
  }

  const openEdit = (u) => {
    setExpandedId(u.id)
    setEditForm({ full_name: u.full_name || '', contact_number: u.contact_number || '' })
  }

  const saveEdit = async (u) => {
    await update(u, {
      full_name: editForm.full_name,
      contact_number: editForm.contact_number,
    })
    setExpandedId(null)
  }

  const roleOptions = ['staff', 'head', 'admin']

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Users</h1>
        <p className="text-sm text-slate-500">
          Assign registered users to their department and role.
        </p>
      </div>

      {error && <Alert>{error}</Alert>}

      {loading ? (
        <Spinner />
      ) : users.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title="No users yet"
          message="Registered users will appear here for you to assign."
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:grid sm:grid-cols-[1fr_1fr_160px_160px]">
            <span>User</span>
            <span>Department</span>
            <span>Role</span>
            <span className="text-right">Actions</span>
          </div>
          <div className="divide-y divide-slate-100">
            {users.map((u) => (
              <div key={u.id}>
                <div className="grid grid-cols-1 gap-2 px-4 py-3 sm:grid-cols-[1fr_1fr_160px_160px] sm:items-center">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white',
                        avatarColor(u.full_name),
                      )}
                    >
                      {initials(u.full_name)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {u.full_name || 'Unnamed'}
                      </p>
                      <p className="truncate text-xs text-slate-500">{u.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:block">
                    <span className="sm:hidden">
                      <Shield size={13} className="inline text-slate-400" /> Department:
                    </span>
                    <select
                      value={u.department_id || ''}
                      disabled={savingId === u.id}
                      onChange={(e) =>
                        update(u, { department_id: e.target.value || null })
                      }
                      className="input max-w-xs py-1.5 text-sm sm:w-full"
                    >
                      <option value="">Unassigned</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 sm:block">
                    <span className="sm:hidden">
                      <Shield size={13} className="inline text-slate-400" /> Role:
                    </span>
                    <select
                      value={u.role}
                      disabled={savingId === u.id}
                      onChange={(e) => update(u, { role: e.target.value })}
                      className="input max-w-xs py-1.5 text-sm sm:w-full"
                    >
                      {roleOptions.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => expandedId === u.id ? setExpandedId(null) : openEdit(u)}
                      className="text-sm font-medium text-brand-600 hover:text-brand-700"
                    >
                      {expandedId === u.id ? 'Close' : 'Edit'}
                    </button>
                  </div>
                </div>

                {expandedId === u.id && (
                  <div className="border-t border-slate-100 bg-slate-50 px-4 py-4 sm:ml-12">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500">Full name</label>
                        <div className="relative">
                          <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            className="input py-1.5 pl-8 text-sm"
                            value={editForm.full_name}
                            onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500">Contact number</label>
                        <div className="relative">
                          <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            className="input py-1.5 pl-8 text-sm"
                            value={editForm.contact_number}
                            onChange={(e) => setEditForm((f) => ({ ...f, contact_number: e.target.value }))}
                            placeholder="09XXXXXXXXX"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => saveEdit(u)}
                        disabled={savingId === u.id}
                        className="btn-primary px-3 py-1.5 text-sm"
                      >
                        {savingId === u.id ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

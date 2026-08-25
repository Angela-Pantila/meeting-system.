import { useEffect, useState } from 'react'
import { Building2, Users as UsersIcon, Shield } from 'lucide-react'
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
                : null,
            }
          : u,
      ),
    )
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
            <span className="text-right">Status</span>
          </div>
          <div className="divide-y divide-slate-100">
            {users.map((u) => (
              <div
                key={u.id}
                className="grid grid-cols-1 gap-2 px-4 py-3 sm:grid-cols-[1fr_1fr_160px_160px] sm:items-center"
              >
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
                  {u.department ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                      <Building2 size={12} />
                      {u.department.name}
                    </span>
                  ) : (
                    <StatusBadge status="pending" className="!bg-amber-100 !text-amber-800" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

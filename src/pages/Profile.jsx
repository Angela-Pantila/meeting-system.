import { useEffect, useState } from 'react'
import { Building2, Mail, Phone, User } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import StatusBadge from '../components/StatusBadge'
import { avatarColor, initials } from '../lib/utils'
import { cn } from '../lib/utils'

export default function Profile() {
  const { profile, user } = useAuth()
  const [department, setDepartment] = useState(null)

  useEffect(() => {
    if (profile?.department_id) {
      supabase
        .from('departments')
        .select('name')
        .eq('id', profile.department_id)
        .maybeSingle()
        .then(({ data }) => setDepartment(data))
    } else {
      setDepartment(null)
    }
  }, [profile])

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">Profile</h1>

      <div className="card p-6">
        <div className="mb-5 flex items-center gap-4">
          <div
            className={cn(
              'flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold text-white',
              avatarColor(profile?.full_name),
            )}
          >
            {initials(profile?.full_name)}
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-900">{profile?.full_name || 'User'}</p>
            <p className="text-sm text-slate-500">{user?.email}</p>
            <div className="mt-1 flex items-center gap-2">
              <StatusBadge status={profile?.role || 'staff'} />
              {department ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                  <Building2 size={12} />
                  {department.name}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                  No department assigned
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Full name</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9" value={profile?.full_name || ''} disabled />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9" value={user?.email || ''} disabled />
            </div>
          </div>
          <div>
            <label className="label">Contact number</label>
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9" value={profile?.contact_number || ''} disabled />
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Contact an administrator to update your profile information.
          </p>
        </div>
      </div>
    </div>
  )
}

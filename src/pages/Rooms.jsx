import { useEffect, useState } from 'react'
import { DoorOpen, MapPin, Plus, Trash2, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Alert, EmptyState, Spinner } from '../components/ui'
import Modal from '../components/Modal'
import { cn } from '../lib/utils'

const emptyRoom = { name: '', location: '', capacity: '', facilities: '', department_id: '' }

export default function Rooms() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [rooms, setRooms] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyRoom)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: r } = await supabase
        .from('meeting_rooms')
        .select('*, department:departments(name)')
        .order('name')
      setRooms(r || [])
      if (isAdmin) {
        const { data: d } = await supabase.from('departments').select('id, name').order('name')
        setDepartments(d || [])
      }
      setLoading(false)
    }
    load()
  }, [isAdmin])

  const openModal = () => {
    setForm({ ...emptyRoom, department_id: isAdmin ? '' : profile?.department_id || '' })
    setError('')
    setOpen(true)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Room name is required.')
      return
    }
    if (!isAdmin && !profile?.department_id) {
      setError('You must belong to a department to add a room.')
      return
    }
    if (isAdmin && !form.department_id) {
      setError('Choose the department this room belongs to.')
      return
    }
    setSaving(true)
    setError('')
    const { data, error } = await supabase
      .from('meeting_rooms')
      .insert({
        name: form.name.trim(),
        department_id: isAdmin ? form.department_id : profile.department_id,
        location: form.location,
        capacity: Number(form.capacity) || 0,
        facilities: form.facilities
          ? form.facilities.split(',').map((f) => f.trim()).filter(Boolean)
          : [],
      })
      .select('*, department:departments(name)')
      .single()
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setRooms((prev) => [...prev, data])
    setForm(emptyRoom)
    setOpen(false)
  }

  const remove = async (room) => {
    const { error } = await supabase.from('meeting_rooms').delete().eq('id', room.id)
    if (error) {
      setError(error.message)
      return
    }
    setRooms((prev) => prev.filter((r) => r.id !== room.id))
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Venues</h1>
          <p className="text-sm text-slate-500">
            {isAdmin
              ? 'Manage venues for every department'
              : `Venues for ${departments.find((d) => d.id === profile?.department_id)?.name || 'your department'}`}
          </p>
        </div>
        <button onClick={openModal} className="btn-primary px-3 py-2 text-sm">
          <Plus size={16} />
          Add venue
        </button>
      </div>

      {error && <Alert>{error}</Alert>}

      {loading ? (
        <Spinner />
      ) : rooms.length === 0 ? (
        <EmptyState
          icon={DoorOpen}
          title="No venues yet"
          message="Add your meeting venues so they can be selected when scheduling."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <div key={room.id} className="card p-4 sm:p-5">
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                  <DoorOpen size={18} />
                </div>
                <button onClick={() => remove(room)} className="text-slate-400 hover:text-rose-600" aria-label="Delete">
                  <Trash2 size={16} />
                </button>
              </div>
              <h3 className="font-semibold text-slate-900">{room.name}</h3>
              {room.department && (
                <span className="mt-1 inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                  {room.department.name}
                </span>
              )}
              {room.location && (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
                  <MapPin size={14} className="text-slate-400" />
                  {room.location}
                </p>
              )}
              <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                <Users size={14} className="text-slate-400" />
                {room.capacity ? `${room.capacity} seats` : 'No capacity set'}
              </p>
              {room.facilities?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {room.facilities.map((f) => (
                    <span key={f} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add venue">
        <form onSubmit={submit} className="space-y-3">
          {isAdmin && (
            <div>
              <label className="label">Department *</label>
              <select
                className="input"
                value={form.department_id}
                onChange={(e) => setForm((f) => ({ ...f, department_id: e.target.value }))}
              >
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="label">Venue name *</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Boardroom A"
            />
          </div>
          <div>
            <label className="label">Location</label>
            <input
              className="input"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              placeholder="3rd Floor, East Wing"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Capacity</label>
              <input
                type="number"
                min="0"
                className="input"
                value={form.capacity}
                onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                placeholder="12"
              />
            </div>
            <div>
              <label className="label">Facilities</label>
              <input
                className="input"
                value={form.facilities}
                onChange={(e) => setForm((f) => ({ ...f, facilities: e.target.value }))}
                placeholder="Projector, TV"
              />
            </div>
          </div>
          <button type="submit" disabled={saving} className={cn('btn-primary w-full')}>
            {saving ? 'Adding…' : 'Add venue'}
          </button>
        </form>
      </Modal>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { DoorOpen, MapPin, Plus, Trash2, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Alert, EmptyState, Spinner } from '../components/ui'
import Modal from '../components/Modal'
import { cn } from '../lib/utils'

const emptyRoom = { name: '', location: '', capacity: '', facilities: '' }

export default function Rooms() {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(emptyRoom)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('meeting_rooms').select('*').order('name')
      setRooms(data || [])
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
      .from('meeting_rooms')
      .insert({
        name: form.name.trim(),
        location: form.location,
        capacity: Number(form.capacity) || 0,
        facilities: form.facilities
          ? form.facilities.split(',').map((f) => f.trim()).filter(Boolean)
          : [],
      })
      .select()
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
          <h1 className="text-2xl font-bold text-slate-900">Meeting rooms</h1>
          <p className="text-sm text-slate-500">Manage physical rooms available for scheduling</p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary px-3 py-2 text-sm">
          <Plus size={16} />
          Add room
        </button>
      </div>

      {error && <Alert>{error}</Alert>}

      {loading ? (
        <Spinner />
      ) : rooms.length === 0 ? (
        <EmptyState
          icon={DoorOpen}
          title="No rooms yet"
          message="Add your meeting rooms so they can be selected when scheduling."
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
              {room.location && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
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

      <Modal open={open} onClose={() => setOpen(false)} title="Add meeting room">
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="label">Room name *</label>
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
            {saving ? 'Adding…' : 'Add room'}
          </button>
        </form>
      </Modal>
    </div>
  )
}

import { useState } from 'react'
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Calendar,
  CalendarSearch,
  DoorOpen,
  LogOut,
  Menu,
  X,
  Plus,
  User,
  Building2,
  Users as UsersIcon,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { avatarColor, initials } from '../lib/utils'
import { cn } from '../lib/utils'
import NotificationBell from './NotificationBell'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/meetings', label: 'Meetings', icon: Calendar, end: false },
]

function SidebarContent({ onNavigate }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const canCreate = profile?.role === 'admin' || profile?.role === 'head'
  const isAdmin = profile?.role === 'admin'
  const canViewSchedule = profile?.role === 'admin' || profile?.role === 'head'
  const canViewRooms = canViewSchedule

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
          <Calendar size={20} />
        </div>
        <div>
          <p className="text-sm font-bold text-white">Meeting Hub</p>
          <p className="text-xs text-slate-400">Governance Suite</p>
        </div>
      </div>

      <nav className="mt-2 flex-1 space-y-1 px-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                isActive
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white',
              )
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
        {canViewSchedule && (
          <NavLink
            to="/schedule"
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                isActive ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white',
              )
            }
          >
            <CalendarSearch size={18} />
            Schedule
          </NavLink>
        )}
        {canViewRooms && (
          <NavLink
            to="/rooms"
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                isActive ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white',
              )
            }
          >
            <DoorOpen size={18} />
            Venues
          </NavLink>
        )}
        {isAdmin && (
          <>
            <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Administration
            </p>
            <NavLink
              to="/departments"
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                  isActive ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                )
              }
            >
              <Building2 size={18} />
              Departments
            </NavLink>
            <NavLink
              to="/users"
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                  isActive ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                )
              }
            >
              <UsersIcon size={18} />
              Users
            </NavLink>
          </>
        )}
        {canCreate && (
          <NavLink
            to="/meetings/new"
            onClick={onNavigate}
            className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-600 px-3 py-2.5 text-sm font-medium text-slate-300 hover:border-brand-400 hover:text-white"
          >
            <Plus size={18} />
            New Meeting
          </NavLink>
        )}
      </nav>

      <div className="border-t border-slate-800 p-3">
        <NavLink
          to="/profile"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-800"
        >
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white',
              avatarColor(profile?.full_name),
            )}
          >
            {initials(profile?.full_name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {profile?.full_name || 'User'}
            </p>
            <p className="truncate text-xs capitalize text-slate-400">
              {profile?.role || 'member'}
            </p>
          </div>
        </NavLink>
        <button
          onClick={handleSignOut}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </div>
  )
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { profile } = useAuth()
  const canCreate = profile?.role === 'admin' || profile?.role === 'head'

  return (
    <div className="min-h-screen bg-slate-100">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-slate-900 lg:block">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 bg-slate-900 shadow-2xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <Link to="/dashboard" className="flex items-center gap-2 lg:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
                <Calendar size={16} />
              </div>
              <span className="font-bold text-slate-900">Meeting Hub</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            {canCreate && (
              <Link
                to="/meetings/new"
                className="btn-primary hidden px-3 py-2 sm:inline-flex"
              >
                <Plus size={16} />
                New Meeting
              </Link>
            )}
            <NotificationBell />
            <Link
              to="/profile"
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white',
                avatarColor(profile?.full_name),
              )}
            >
              {profile ? initials(profile.full_name) : <User size={16} />}
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 pb-20 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

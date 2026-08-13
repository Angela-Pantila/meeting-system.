import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Meetings from './pages/Meetings'
import CreateMeeting from './pages/CreateMeeting'
import MeetingDetail from './pages/MeetingDetail'
import Rooms from './pages/Rooms'
import Departments from './pages/Departments'
import Users from './pages/Users'
import Profile from './pages/Profile'
import Schedule from './pages/Schedule'
import Loading from './components/Loading'

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Loading />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Loading />
  if (user) return <Navigate to="/" replace />
  return children
}

function AdminOnly({ children }) {
  const { profile, loading } = useAuth()
  if (loading) return <Loading />
  if (profile?.role !== 'admin') return <Navigate to="/" replace />
  return children
}

function CanCreateMeeting({ children }) {
  const { profile, loading } = useAuth()
  if (loading) return <Loading />
  if (profile?.role !== 'admin' && profile?.role !== 'head') return <Navigate to="/meetings" replace />
  return children
}

function CanViewSchedule({ children }) {
  const { profile, loading } = useAuth()
  if (loading) return <Loading />
  if (profile?.role !== 'admin' && profile?.role !== 'head') return <Navigate to="/meetings" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnly>
            <Login />
          </PublicOnly>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnly>
            <Register />
          </PublicOnly>
        }
      />
      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/meetings" element={<Meetings />} />
        <Route
          path="/meetings/new"
          element={
            <CanCreateMeeting>
              <CreateMeeting />
            </CanCreateMeeting>
          }
        />
        <Route path="/meetings/:id" element={<MeetingDetail />} />
        <Route path="/rooms" element={<Rooms />} />
        <Route
          path="/schedule"
          element={
            <CanViewSchedule>
              <Schedule />
            </CanViewSchedule>
          }
        />
        <Route
          path="/departments"
          element={
            <AdminOnly>
              <Departments />
            </AdminOnly>
          }
        />
        <Route
          path="/users"
          element={
            <AdminOnly>
              <Users />
            </AdminOnly>
          }
        />
        <Route path="/profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

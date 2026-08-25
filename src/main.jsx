import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { hasSupabaseConfig } from './lib/supabase'
import './index.css'

function MissingConfig() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        <h1 className="text-lg font-bold text-slate-900">Supabase is not configured</h1>
        <p className="mt-2 text-sm text-slate-600">
          This build was created without the environment variables{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">VITE_SUPABASE_URL</code>{' '}
          and{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">VITE_SUPABASE_ANON_KEY</code>.
        </p>
        <ol className="mt-4 space-y-2 text-left text-sm text-slate-600">
          <li>
            1. In your Vercel project: <b>Settings → Environment Variables</b>
          </li>
          <li>
            2. Add both variables (see Supabase <b>Project Settings → API</b>)
          </li>
          <li>
            3. Open <b>Deployments</b>, click <b>⋮ → Redeploy</b>
          </li>
        </ol>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {hasSupabaseConfig ? (
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    ) : (
      <MissingConfig />
    )}
  </React.StrictMode>,
)

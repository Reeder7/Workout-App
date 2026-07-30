import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { setMemberSource } from './lib/members'
import { supabaseMembers } from './lib/supabaseMembers'
import { isConfigured } from './lib/supabase'
import { initAuth } from './lib/auth'
import './index.css'

// Point the social layer at the backend before the first render, so screens
// don't briefly show their "not connected" state.
if (isConfigured) {
  setMemberSource(supabaseMembers)
  // Restores the session and starts following sign-in/out. Fire and forget: the
  // UI renders a loading state off useAuth() until it settles.
  void initAuth()
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <App />
      </HashRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)

// When the service worker installs a new version and takes control, reload once
// so the latest app (new plans, exercises, fixes) shows without a manual refresh.
// The guard prevents a reload loop on the very first install.
if ('serviceWorker' in navigator) {
  let reloading = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return
    reloading = true
    window.location.reload()
  })
}

import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { setMemberSource } from './lib/members'
import { supabaseMembers } from './lib/supabaseMembers'
import { isConfigured } from './lib/supabase'
import { initAuth } from './lib/auth'
import { takeAuthCallback } from './lib/authCallback'
import './index.css'

// Point the social layer at the backend before the first render, so screens
// don't briefly show their "not connected" state.
/*
 * Must run before the router mounts: it clears an auth fragment out of the URL
 * that HashRouter would otherwise read as a route and render nothing.
 */
const authCallback = takeAuthCallback()

if (isConfigured) {
  setMemberSource(supabaseMembers)
  // Restores the session and starts following sign-in/out. Fire and forget: the
  // UI renders a loading state off useAuth() until it settles.
  void initAuth(authCallback)
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

// When the service worker installs a NEW version and takes control, reload once so
// the latest app shows without a manual refresh.
if ('serviceWorker' in navigator) {
  /*
   * Only reload on an actual update. On a first-ever visit there is no previous
   * controller, and skipWaiting + clientsClaim make the new worker take control
   * immediately — which fired controllerchange and reloaded every first load.
   * That reload discarded the auth callback held in memory, so an emailed
   * sign-in link produced a page with no session and no error message.
   */
  const hadController = !!navigator.serviceWorker.controller
  let reloading = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return
    // Never interrupt a sign-in mid-exchange.
    if (authCallback.kind !== 'none') return
    reloading = true
    window.location.reload()
  })
}

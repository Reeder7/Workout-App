import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import './index.css'

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

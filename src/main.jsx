import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ui/ErrorBoundary.jsx'

// Handle Firebase Auth Action Redirect for HashRouter
// Firebase sends clean URLs (e.g. /auth/action), but we use HashRouter (#/auth/action)
if (window.location.pathname === '/auth/action') {
  window.location.replace(`/#/auth/action${window.location.search}`);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <App />
      </HashRouter>
    </ErrorBoundary>
  </StrictMode>,
)

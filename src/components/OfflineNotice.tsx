import { useCallback, useEffect, useState } from 'react'
import { Button } from 'react-bootstrap'
import { BRAND } from '../lib/brand'

function getOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

/**
 * Global offline UX: top banner when connection drops,
 * full overlay if still offline after a short delay or on failed navigation feel.
 */
export default function OfflineNotice() {
  const [online, setOnline] = useState(true)
  const [showOverlay, setShowOverlay] = useState(false)
  const [checking, setChecking] = useState(false)

  const sync = useCallback(() => {
    const on = getOnline()
    setOnline(on)
    if (on) setShowOverlay(false)
  }, [])

  useEffect(() => {
    sync()
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [sync])

  // If offline persists, escalate to full-screen panel
  useEffect(() => {
    if (online) {
      setShowOverlay(false)
      document.body.classList.remove('offline-lock')
      return
    }
    const t = window.setTimeout(() => setShowOverlay(true), 1200)
    return () => window.clearTimeout(t)
  }, [online])

  useEffect(() => {
    if (showOverlay) document.body.classList.add('offline-lock')
    else document.body.classList.remove('offline-lock')
    return () => document.body.classList.remove('offline-lock')
  }, [showOverlay])

  const retry = async () => {
    setChecking(true)
    try {
      // Lightweight connectivity probe (no-cors so opaque response still means network works)
      await fetch('https://www.google.com/generate_204', {
        method: 'GET',
        mode: 'no-cors',
        cache: 'no-store',
      })
      // If fetch throws we're offline; if it resolves, treat as online
      setOnline(true)
      setShowOverlay(false)
      // Soft refresh data-heavy views
      window.dispatchEvent(new Event('online'))
    } catch {
      setOnline(false)
      setShowOverlay(true)
    } finally {
      setChecking(false)
      // Align with browser flag
      if (getOnline()) {
        setOnline(true)
        setShowOverlay(false)
      }
    }
  }

  if (online) return null

  return (
    <>
      <div className="offline-banner" role="status" aria-live="polite">
        <div className="offline-banner-inner">
          <span className="offline-banner-dot" />
          <span className="offline-banner-text">
            <strong>No internet connection</strong>
            <span className="d-none d-sm-inline"> — {BRAND} needs a network to load data</span>
          </span>
          <Button size="sm" variant="light" className="offline-banner-btn" disabled={checking} onClick={() => void retry()}>
            {checking ? 'Checking…' : 'Retry'}
          </Button>
        </div>
      </div>

      {showOverlay && (
        <div className="offline-overlay" role="alertdialog" aria-modal="true" aria-labelledby="offline-title">
          <div className="offline-card">
            <div className="offline-icon" aria-hidden>
              <i className="bi bi-wifi-off" />
            </div>
            <h2 id="offline-title" className="fw-bold mb-2">
              You’re offline
            </h2>
            <p className="text-muted mb-4">
              {BRAND} can’t reach the server. Check your Wi‑Fi or mobile data, then try again.
            </p>
            <ul className="offline-tips text-muted small text-start mb-4">
              <li>Turn airplane mode off</li>
              <li>Switch between Wi‑Fi and mobile data</li>
              <li>Payments and earn proofs need a connection</li>
            </ul>
            <Button className="w-100" size="lg" disabled={checking} onClick={() => void retry()}>
              {checking ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Reconnecting…
                </>
              ) : (
                <>
                  <i className="bi bi-arrow-clockwise me-2" />
                  Try again
                </>
              )}
            </Button>
            <p className="small text-muted mt-3 mb-0">We’ll reconnect automatically when you’re back online.</p>
          </div>
        </div>
      )}
    </>
  )
}

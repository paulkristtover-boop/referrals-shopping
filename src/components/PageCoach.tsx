import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Button } from 'react-bootstrap'
import { clearGuideSeen, guideFor, markGuideSeen, shouldShowGuide } from '../lib/pageGuides'

export default function PageCoach() {
  const loc = useLocation()
  const guide = guideFor(loc.pathname)
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    setStep(0)
    setOpen(shouldShowGuide(loc.pathname))
  }, [loc.pathname])

  useEffect(() => {
    const reopen = () => {
      clearGuideSeen(loc.pathname)
      setStep(0)
      setOpen(true)
    }
    window.addEventListener('rs-replay-guide', reopen)
    return () => window.removeEventListener('rs-replay-guide', reopen)
  }, [loc.pathname])

  const close = (remember: boolean) => {
    if (remember) markGuideSeen(loc.pathname)
    setOpen(false)
  }

  const current = guide.steps[Math.min(step, guide.steps.length - 1)]

  return (
    <>
      <button
        type="button"
        className="page-coach-fab"
        aria-label="Page guide"
        onClick={() => {
          setStep(0)
          setOpen(true)
        }}
      >
        <i className="bi bi-question-lg" />
      </button>
      {open && (
        <div className="page-coach-layer" role="dialog" aria-modal="true" aria-labelledby="page-coach-title">
          <button type="button" className="page-coach-backdrop" aria-label="Skip guide" onClick={() => close(true)} />
          <div className="page-coach-card">
            <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
              <div>
                <div className="small text-uppercase fw-semibold text-primary">How this page works</div>
                <h2 id="page-coach-title" className="h5 fw-bold mb-0">{guide.title}</h2>
              </div>
              <button type="button" className="btn btn-sm btn-link text-muted" onClick={() => close(true)}>
                Skip
              </button>
            </div>
            <p className="mb-1 fw-semibold">{current.title}</p>
            <p className="text-muted small mb-3">{current.body}</p>
            <div className="d-flex justify-content-between align-items-center gap-2">
              <span className="small text-muted">
                {step + 1} / {guide.steps.length}
              </span>
              <div className="d-flex gap-2">
                {step > 0 && (
                  <Button size="sm" variant="outline-secondary" onClick={() => setStep((s) => s - 1)}>
                    Back
                  </Button>
                )}
                {step < guide.steps.length - 1 ? (
                  <Button size="sm" onClick={() => setStep((s) => s + 1)}>
                    Next
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => close(true)}>
                    Got it
                  </Button>
                )}
              </div>
            </div>
            <p className="small text-muted mt-2 mb-0">Skipped guides stay quiet for 14 days, then show again.</p>
          </div>
        </div>
      )}
    </>
  )
}

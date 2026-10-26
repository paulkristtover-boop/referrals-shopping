import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Button, Card, Col, Row } from 'react-bootstrap'

const KEY = 'rs_first_session'
const INTENT_KEY = 'rs_intent'

export function shouldShowFirstSession() {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function dismissFirstSession() {
  try {
    localStorage.removeItem(KEY)
    localStorage.removeItem(INTENT_KEY)
  } catch {
    /* ignore */
  }
}

export default function FirstSessionGuide() {
  const [visible, setVisible] = useState(() => shouldShowFirstSession())
  const [intent] = useState(() => {
    try {
      return localStorage.getItem(INTENT_KEY)
    } catch {
      return null
    }
  })

  if (!visible) return null

  const dismiss = () => {
    dismissFirstSession()
    setVisible(false)
  }

  return (
    <Card className="rs-card border-primary mb-4">
      <Card.Body className="p-3 p-md-4">
        <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
          <div>
            <h2 className="h5 fw-bold mb-1">
              <i className="bi bi-stars text-primary me-2" />
              Welcome — quick start
            </h2>
            <p className="text-muted small mb-0">Three steps. You can dismiss this anytime.</p>
          </div>
          <Button size="sm" variant="outline-secondary" onClick={dismiss} aria-label="Dismiss">
            <i className="bi bi-x-lg" />
          </Button>
        </div>

        {intent === 'promote' && (
          <Alert variant="primary" className="py-2 small">
            You chose <strong>Promote</strong> — start by ordering a package for your link.
          </Alert>
        )}
        {intent === 'earn' && (
          <Alert variant="success" className="py-2 small">
            You chose <strong>Earn</strong> — open tasks, wait the timer, submit a screenshot.
          </Alert>
        )}

        <Row className="g-2 mb-3">
          <Col md={4}>
            <div className="border rounded p-3 h-100">
              <div className="fw-bold small mb-1">1. Promote</div>
              <p className="small text-muted mb-2">Buy clicks for your link with crypto.</p>
              <Link to="/promote" className="btn btn-sm btn-primary" onClick={dismiss}>
                Open Promote
              </Link>
            </div>
          </Col>
          <Col md={4}>
            <div className="border rounded p-3 h-100">
              <div className="fw-bold small mb-1">2. Earn</div>
              <p className="small text-muted mb-2">Complete tasks and build balance.</p>
              <Link to="/earn" className="btn btn-sm btn-success" onClick={dismiss}>
                Open Earn
              </Link>
            </div>
          </Col>
          <Col md={4}>
            <div className="border rounded p-3 h-100">
              <div className="fw-bold small mb-1">3. Secure</div>
              <p className="small text-muted mb-2">Optional 2FA (no email confirm).</p>
              <Link to="/security" className="btn btn-sm btn-outline-primary" onClick={dismiss}>
                Set up 2FA
              </Link>
            </div>
          </Col>
        </Row>

        <div className="d-flex flex-wrap gap-2">
          <Button size="sm" variant="link" className="px-0" onClick={dismiss}>
            Don’t show again
          </Button>
          <Link to="/guide" className="btn btn-sm btn-link" onClick={dismiss}>
            Full guide
          </Link>
        </div>
      </Card.Body>
    </Card>
  )
}

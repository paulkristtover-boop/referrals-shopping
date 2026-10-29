import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Button, Card, Col, Row } from 'react-bootstrap'
import { BRAND } from '../lib/brand'

const KEY = 'rs_first_session'
const INTENT_KEY = 'rs_intent'

export function dismissFirstSession() {
  try {
    localStorage.removeItem(KEY)
    localStorage.removeItem(INTENT_KEY)
  } catch {
    /* ignore */
  }
}

export default function FirstSessionGuide() {
  const [visible, setVisible] = useState(() => {
    try {
      return localStorage.getItem(KEY) === '1'
    } catch {
      return false
    }
  })
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
            <h2 className="h5 fw-bold mb-1">Welcome to {BRAND}</h2>
            <p className="text-muted small mb-0">Pick a path to get started.</p>
          </div>
          <Button size="sm" variant="outline-secondary" onClick={dismiss} aria-label="Dismiss">
            <i className="bi bi-x-lg" />
          </Button>
        </div>
        {intent === 'promote' && (
          <Alert variant="primary" className="py-2 small">You chose to shop referrals — open Promote to order a package.</Alert>
        )}
        {intent === 'earn' && (
          <Alert variant="success" className="py-2 small">You chose earn — open tasks, wait, submit a screenshot.</Alert>
        )}
        <Row className="g-2">
          <Col md={6}>
            <div className="border rounded p-3 h-100">
              <div className="fw-bold small mb-1">Shop referrals</div>
              <p className="small text-muted mb-2">Order packages for your link.</p>
              <Link to="/promote" className="btn btn-sm btn-primary" onClick={dismiss}>
                Promote
              </Link>
            </div>
          </Col>
          <Col md={6}>
            <div className="border rounded p-3 h-100">
              <div className="fw-bold small mb-1">Earn</div>
              <p className="small text-muted mb-2">Complete tasks and build balance.</p>
              <Link to="/earn" className="btn btn-sm btn-success" onClick={dismiss}>
                Earn
              </Link>
            </div>
          </Col>
        </Row>
        <Button size="sm" variant="link" className="px-0 mt-2" onClick={dismiss}>
          Dismiss
        </Button>
      </Card.Body>
    </Card>
  )
}

import { Link } from 'react-router-dom'
import { Alert, Card } from 'react-bootstrap'
import { BRAND } from '../lib/brand'

export default function Refunds() {
  return (
    <div className="page-enter legal-page">
      <h1 className="fw-bold mb-1">Refund policy</h1>
      <p className="text-muted small mb-4">{BRAND} — transparent rules for paid Promote packages.</p>

      <Alert variant="warning" className="small">
        Digital marketing and referral delivery depend on human Earn activity. Results vary. This is not a financial return
        guarantee on investment products you promote.
      </Alert>

      <Card className="rs-card rs-card-static mb-3">
        <Card.Body>
          <h5 className="fw-bold">When you may request a review</h5>
          <ul className="text-muted mb-0">
            <li>Payment taken but order never moved past pending after a reasonable time and Support confirms a platform fault</li>
            <li>Clear shortfall versus the active-referral target described at purchase, with evidence you provide</li>
            <li>Duplicate successful charges for the same order caused by a payment-provider error</li>
          </ul>
        </Card.Body>
      </Card>

      <Card className="rs-card rs-card-static mb-3">
        <Card.Body>
          <h5 className="fw-bold">Usually not refundable</h5>
          <ul className="text-muted mb-0">
            <li>Change of mind after delivery has started</li>
            <li>Poor performance of your third-party product (conversion, payouts, site downtime)</li>
            <li>Rejected Earn proofs that did not meet task rules</li>
            <li>Free Starter allocation</li>
            <li>Crypto sent with wrong amount/network after your unique window instructions</li>
          </ul>
        </Card.Body>
      </Card>

      <Card className="rs-card rs-card-static mb-3">
        <Card.Body>
          <h5 className="fw-bold">How to request</h5>
          <p className="text-muted mb-0">
            Open <Link to="/support">Support</Link> with order ID / invoice, payment reference, and evidence. Reviews are
            case-by-case. Approved refunds may be partial and issued via the original method or balance credit where practical.
          </p>
        </Card.Body>
      </Card>

      <p className="small text-muted">
        <Link to="/terms">Terms</Link> · <Link to="/receipts">Receipts</Link>
      </p>
    </div>
  )
}

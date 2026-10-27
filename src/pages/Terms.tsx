import { Card } from 'react-bootstrap'
import { BRAND } from '../lib/brand'

export default function Terms() {
  return (
    <div className="page-enter">
      <h1 className="fw-bold mb-3">{BRAND} — Terms</h1>
      <Card className="rs-card rs-card-static mb-3">
        <Card.Body>
          <h5 className="fw-bold">Service</h5>
          <p className="mb-0 text-muted">
            {BRAND} is a referrals marketplace: you purchase packages and we promote your referral links until the ordered count is reached.
            Delivery times are estimates (typically 3–12 days) and vary by niche and package size.
          </p>
        </Card.Body>
      </Card>
      <Card className="rs-card rs-card-static mb-3">
        <Card.Body>
          <h5 className="fw-bold">What counts as a referral</h5>
          <ul className="mb-0 text-muted">
            <li>
              <strong>Regular packages:</strong> a person uses your referral link and <strong>creates an account</strong>. No deposit required.
            </li>
            <li>
              <strong>Investment / gambling packages:</strong> they must <strong>create an account and make a deposit</strong>.
            </li>
          </ul>
        </Card.Body>
      </Card>
      <Card className="rs-card rs-card-static mb-3">
        <Card.Body>
          <h5 className="fw-bold">Free Starter</h5>
          <p className="mb-0 text-muted">
            One Free Starter (50 regular / signup-only referrals) per account. Abuse or multi-accounting may lead to suspension.
          </p>
        </Card.Body>
      </Card>
      <Card className="rs-card rs-card-static mb-3">
        <Card.Body>
          <h5 className="fw-bold">Payments & guarantee</h5>
          <p className="mb-0 text-muted">
            Paid orders use crypto (TRX, SOL, or TON). We aim for at least 70% active referrals for about a month. Contact Support if results fall clearly short.
          </p>
        </Card.Body>
      </Card>
      <Card className="rs-card rs-card-static">
        <Card.Body>
          <h5 className="fw-bold">Earn tasks</h5>
          <p className="mb-0 text-muted">
            Earners complete tasks for {BRAND} advertisers. Rewards credit after approval. Fraudulent proofs may be rejected.
          </p>
        </Card.Body>
      </Card>
    </div>
  )
}

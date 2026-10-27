import { Card } from 'react-bootstrap'

export default function Terms() {
  return (
    <div className="page-enter">
      <h1 className="fw-bold mb-3">Terms of service</h1>
      <Card className="rs-card rs-card-static mb-3">
        <Card.Body>
          <h5 className="fw-bold">Service</h5>
          <p className="mb-0 text-muted">
            Referral Shopping promotes your referral links according to the package you purchase. Delivery times are estimates (typically 3–12 days) and can vary by niche and package size.
          </p>
        </Card.Body>
      </Card>
      <Card className="rs-card rs-card-static mb-3">
        <Card.Body>
          <h5 className="fw-bold">What counts as a referral</h5>
          <ul className="mb-0 text-muted">
            <li>
              <strong>Regular packages:</strong> a person uses your referral link and <strong>creates an account</strong>. No deposit is required for the referral to count.
            </li>
            <li>
              <strong>Investment / gambling packages:</strong> the person must <strong>create an account and make a deposit</strong> for the referral to count.
            </li>
          </ul>
        </Card.Body>
      </Card>
      <Card className="rs-card rs-card-static mb-3">
        <Card.Body>
          <h5 className="fw-bold">Free Starter</h5>
          <p className="mb-0 text-muted">
            Eligible accounts may claim one Free Starter (50 regular / signup-only referrals). Abuse, multi-accounting, or resale of free quota may lead to suspension.
          </p>
        </Card.Body>
      </Card>
      <Card className="rs-card rs-card-static mb-3">
        <Card.Body>
          <h5 className="fw-bold">Payments & guarantee</h5>
          <p className="mb-0 text-muted">
            Paid orders are paid in crypto (TRX, SOL, or TON). We aim for at least 70% active referrals for about a month. Contact Support with the details we request if results fall clearly short; reviews are case-by-case.
          </p>
        </Card.Body>
      </Card>
      <Card className="rs-card rs-card-static">
        <Card.Body>
          <h5 className="fw-bold">Earn tasks</h5>
          <p className="mb-0 text-muted">
            Earners complete tasks (open link, wait, submit proof). Rewards are credited after approval. Fraudulent proofs may be rejected and accounts restricted.
          </p>
        </Card.Body>
      </Card>
    </div>
  )
}

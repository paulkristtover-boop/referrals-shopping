import { Link } from 'react-router-dom'
import { Card } from 'react-bootstrap'
import { BRAND } from '../lib/brand'

const UPDATED = '14 November 2026'

export default function Privacy() {
  return (
    <div className="page-enter legal-page">
      <h1 className="fw-bold mb-1">Privacy Policy</h1>
      <p className="text-muted small mb-4">Last updated: {UPDATED}. How {BRAND} handles personal data.</p>

      <Card className="rs-card rs-card-static mb-3">
        <Card.Body>
          <h5 className="fw-bold">Data we process</h5>
          <ul className="text-muted mb-0">
            <li>Account: email, name, password hashes (via auth provider), account ID</li>
            <li>Optional: tax/billing fields you enter</li>
            <li>Orders: links, packages, payment references, amounts</li>
            <li>Earn: task sessions, screenshots you upload for proof</li>
            <li>Security: 2FA status, session metadata where enabled</li>
            <li>Technical: basic device/browser data needed to run the site</li>
          </ul>
        </Card.Body>
      </Card>

      <Card className="rs-card rs-card-static mb-3">
        <Card.Body>
          <h5 className="fw-bold">Why we process it</h5>
          <ul className="text-muted mb-0">
            <li>Provide Promote / Earn marketplace features</li>
            <li>Process payments and withdrawals</li>
            <li>Prevent fraud and abuse</li>
            <li>Support, invoices, and legal obligations</li>
          </ul>
        </Card.Body>
      </Card>

      <Card className="rs-card rs-card-static mb-3">
        <Card.Body>
          <h5 className="fw-bold">Processors & sharing</h5>
          <p className="text-muted mb-0">
            We use infrastructure and payment providers (for example hosting, database/auth, Flutterwave, and blockchain
            networks for crypto). They process data under their terms. We do not sell your personal data. Screenshots and links
            you submit are visible to reviewers (poster/admin) as needed to run the service.
          </p>
        </Card.Body>
      </Card>

      <Card className="rs-card rs-card-static mb-3">
        <Card.Body>
          <h5 className="fw-bold">Retention & security</h5>
          <p className="text-muted mb-0">
            We keep data as long as your account is active and as required for disputes, taxes, and law. Use a strong password
            and 2FA. No method of transmission is 100% secure.
          </p>
        </Card.Body>
      </Card>

      <Card className="rs-card rs-card-static mb-3">
        <Card.Body>
          <h5 className="fw-bold">Your choices</h5>
          <p className="text-muted mb-0">
            Update profile/billing in Account. Request support for access or deletion where applicable law allows (we may retain
            records required for legal or fraud prevention). Contact via <Link to="/support">Support</Link>.
          </p>
        </Card.Body>
      </Card>

      <p className="small text-muted">
        <Link to="/terms">Terms</Link> · <Link to="/refunds">Refunds</Link>
      </p>
    </div>
  )
}

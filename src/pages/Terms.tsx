import { Link } from 'react-router-dom'
import { Alert, Card } from 'react-bootstrap'
import { BRAND } from '../lib/brand'

const UPDATED = '14 November 2026'

export default function Terms() {
  return (
    <div className="page-enter legal-page">
      <h1 className="fw-bold mb-1">{BRAND} — Terms of Service</h1>
      <p className="text-muted small mb-4">Last updated: {UPDATED}. By using {BRAND} you agree to these terms.</p>

      <Alert variant="light" className="border small">
        {BRAND} is a <strong>two-sided marketplace</strong>: promoters buy referral volume; earners complete verified tasks.
        We are an intermediary platform, not the owner of third-party offers you promote.
      </Alert>

      <Card className="rs-card rs-card-static mb-3">
        <Card.Body>
          <h5 className="fw-bold">1. Eligibility</h5>
          <ul className="mb-0 text-muted">
            <li>You must be at least <strong>18 years old</strong> and able to form a binding contract.</li>
            <li>You must provide accurate registration information.</li>
            <li>One natural person should not operate multiple accounts to abuse Free Starter, rewards, or refunds.</li>
          </ul>
        </Card.Body>
      </Card>

      <Card className="rs-card rs-card-static mb-3">
        <Card.Body>
          <h5 className="fw-bold">2. Business model</h5>
          <p className="text-muted">
            <strong>Promote:</strong> you pay for a package (or claim Free Starter once). After payment confirmation and admin
            approval of your link, your offer may appear as Earn tasks. Delivery depends on real earner activity and is not
            instantaneous or guaranteed by a fixed calendar day.
          </p>
          <p className="text-muted mb-0">
            <strong>Earn:</strong> you complete tasks (open link, wait, submit proof). Rewards are credited after review.
            You may not complete tasks on your own promotions.
          </p>
        </Card.Body>
      </Card>

      <Card className="rs-card rs-card-static mb-3">
        <Card.Body>
          <h5 className="fw-bold">3. What counts as a referral</h5>
          <ul className="text-muted mb-0">
            <li>
              <strong>Regular:</strong> signup via your link only (no deposit required for the count definition on our side).
            </li>
            <li>
              <strong>Investment / deposit:</strong> signup plus a deposit on <em>your</em> third-party offer, as you define it.
            </li>
          </ul>
          <p className="small text-muted mt-2 mb-0">
            You are solely responsible for the legality of your landing pages, apps, investment products, or gambling offers in
            every country you target. We do not endorse illegal schemes.
          </p>
        </Card.Body>
      </Card>

      <Card className="rs-card rs-card-static mb-3">
        <Card.Body>
          <h5 className="fw-bold">4. Pricing & payments</h5>
          <ul className="text-muted mb-0">
            <li>Package prices are shown in <strong>Nigerian Naira (₦)</strong> before you pay.</li>
            <li>Minimum paid order applies as displayed at checkout.</li>
            <li>Payment methods may include Flutterwave (NGN) and supported crypto. Unpaid or expired crypto windows may require a new order.</li>
            <li>Taxes may be shown on receipts where configured; see our tax invoice pages. Tax registration remains your obligation where the law requires it of you.</li>
          </ul>
        </Card.Body>
      </Card>

      <Card className="rs-card rs-card-static mb-3">
        <Card.Body>
          <h5 className="fw-bold">5. Delivery, quality & refunds</h5>
          <p className="text-muted">
            Typical delivery windows are estimates (often about 3–12 days) and depend on package size, category, and Earn supply.
            We aim for a substantial share of referrals to remain active where measurable (target language may refer to about 70%
            over about a month). Outcomes are not guaranteed.
          </p>
          <p className="text-muted mb-0">
            Refund or partial credit requests are handled case-by-case via Support with evidence. Chargebacks or payment disputes
            opened in bad faith may lead to account suspension. Full policy:{' '}
            <Link to="/refunds">Refund policy</Link>.
          </p>
        </Card.Body>
      </Card>

      <Card className="rs-card rs-card-static mb-3">
        <Card.Body>
          <h5 className="fw-bold">6. Acceptable use</h5>
          <ul className="text-muted mb-0">
            <li>No fake proofs, bots used to defraud the platform, stolen cards, or money-laundering activity.</li>
            <li>No content that is illegal, exploits minors, or promotes violent crime.</li>
            <li>No scraping, attacking, or bypassing security or 2FA.</li>
            <li>Earn and Promote activity must match the stated task rules.</li>
          </ul>
        </Card.Body>
      </Card>

      <Card className="rs-card rs-card-static mb-3">
        <Card.Body>
          <h5 className="fw-bold">7. Platform role & liability</h5>
          <p className="text-muted mb-0">
            {BRAND} provides software and matching services. We are not a party to contracts between you and third-party sites
            you promote. To the maximum extent permitted by law, the service is provided “as is”, and we are not liable for
            indirect or consequential losses, lost profits, or third-party offer performance. Our aggregate liability related to
            a paid order is limited to the amount you paid for that order.
          </p>
        </Card.Body>
      </Card>

      <Card className="rs-card rs-card-static mb-3">
        <Card.Body>
          <h5 className="fw-bold">8. Privacy & security</h5>
          <p className="text-muted mb-0">
            See the <Link to="/privacy">Privacy Policy</Link>. Enable 2FA where available. You are responsible for your password
            and devices.
          </p>
        </Card.Body>
      </Card>

      <Card className="rs-card rs-card-static mb-3">
        <Card.Body>
          <h5 className="fw-bold">9. Suspension</h5>
          <p className="text-muted mb-0">
            We may suspend or terminate accounts for abuse, fraud risk, legal risk, or non-payment. Pending legitimate balances
            may be handled according to our review process.
          </p>
        </Card.Body>
      </Card>

      <Card className="rs-card rs-card-static mb-3">
        <Card.Body>
          <h5 className="fw-bold">10. Governing law</h5>
          <p className="text-muted mb-0">
            These terms are governed by the laws of the Federal Republic of Nigeria, without prejudice to mandatory consumer
            protections that may apply in your place of residence. Disputes should first go through Support.
          </p>
        </Card.Body>
      </Card>

      <p className="small text-muted">
        Related: <Link to="/privacy">Privacy</Link> · <Link to="/refunds">Refunds</Link> · <Link to="/faq">FAQ</Link> ·{' '}
        <Link to="/support">Support</Link>
      </p>
    </div>
  )
}

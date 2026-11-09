import { Link } from 'react-router-dom'
import { Row, Col, Card, Alert } from 'react-bootstrap'
import { BRAND, TG, IG, IG_HANDLE } from '../lib/brand'

export default function Guide() {
  return (
    <div className="page-enter">
      <h1 className="fw-bold mb-2">How {BRAND} works</h1>
      <p className="text-muted mb-4">
        {BRAND} is a <strong>two-sided marketplace</strong>: promoters buy referral volume; earners complete verified tasks on those
        links. Delivery comes from people on this platform (and optional partners/channels)—not from empty promises.
      </p>

      <Alert variant="primary" className="mb-4">
        <strong>Where do referrals come from?</strong> Earn users take tasks from paid Promote orders (open your link → wait →
        screenshot proof). Admins approve links; you can confirm proofs; disputes go to admin. Optional push via Telegram / Instagram
        when available.
      </Alert>

      <Card className="rs-card rs-card-static mb-4">
        <Card.Body>
          <h5 className="fw-bold">What counts as a referral</h5>
          <p className="mb-2">
            <strong>Regular packages:</strong> someone <strong>creates an account</strong> using your link. No deposit required.
          </p>
          <p className="mb-2">
            <strong>Investment / deposit packages:</strong> account <strong>plus a deposit</strong> on your offer. Higher price
            because the action is harder.
          </p>
          <p className="mb-0 text-muted">
            We target roughly <strong>70% active</strong> over about a month where measurable. Below that, open Support with order
            details for review.
          </p>
        </Card.Body>
      </Card>

      <Row className="g-3 mb-4">
        <Col md={6}>
          <Card className="border-primary h-100 rs-card">
            <Card.Header className="bg-primary text-white">Promote (buy volume)</Card.Header>
            <Card.Body>
              <ol className="mb-0">
                <li>Register and accept terms</li>
                <li>
                  Open <strong>Promote</strong> — choose type + how many referrals
                </li>
                <li>Paste your referral / site link (optional sample screenshot)</li>
                <li>Pay with Flutterwave (₦) or crypto (TRX / SOL / TON)</li>
                <li>Admin approves your link → tasks open for Earn users</li>
                <li>Confirm proofs under <strong>Proofs</strong>; track delivery on Dashboard</li>
              </ol>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="border-success h-100 rs-card">
            <Card.Header className="bg-success text-white">Earn (supply the actions)</Card.Header>
            <Card.Body>
              <ol className="mb-0">
                <li>Register</li>
                <li>
                  Open <strong>Earn</strong> and pick a live task from a promoter’s order
                </li>
                <li>Open the link, wait the timer, upload a clear screenshot</li>
                <li>Poster or admin reviews proof → balance is credited</li>
                <li>
                  Withdraw from <strong>Wallet</strong> when you hit the minimum
                </li>
              </ol>
              <p className="small text-muted mt-2 mb-0">Without Earn activity, Promote orders cannot fill. Both sides matter.</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="rs-card rs-card-static mb-4">
        <Card.Body>
          <h5 className="fw-bold">Delivery timeline</h5>
          <p className="mb-2">
            Depends on package size, regular vs deposit, and how many earners are active. Often about <strong>3–12 days</strong>;
            large or deposit orders can take longer. Status stays visible on your order timeline.
          </p>
          <p className="mb-0 text-muted small">
            Channels ({IG_HANDLE}, Telegram) help announce tasks—they are optional support, not a substitute for the Earn network.
          </p>
        </Card.Body>
      </Card>

      <p className="mb-2">
        <Link to="/register" className="btn btn-primary me-2">
          Create account
        </Link>
        <Link to="/faq" className="btn btn-outline-secondary me-2">
          FAQ
        </Link>
        <a href={TG} className="btn btn-outline-primary me-2" target="_blank" rel="noreferrer">
          Telegram
        </a>
        <a href={IG} className="btn btn-outline-danger" target="_blank" rel="noreferrer">
          Instagram
        </a>
      </p>
    </div>
  )
}

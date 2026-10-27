import { Link } from 'react-router-dom'
import { Row, Col, Card } from 'react-bootstrap'
import { BRAND, TG, IG, IG_HANDLE } from '../lib/brand'

export default function Guide() {
  return (
    <div className="page-enter">
      <h1 className="fw-bold mb-2">How {BRAND} works</h1>
      <p className="text-muted mb-4">
        Welcome to {BRAND}. Buy referral packages for your links — promoted until your order is filled. Also on Telegram & Instagram.
      </p>

      <Card className="rs-card rs-card-static mb-4">
        <Card.Body>
          <p className="mb-2">
            You pay for a package, then we promote your referral link until the ordered count is reached.
          </p>
          <p className="mb-2">
            <strong>Regular packages:</strong> a referral counts when someone <strong>creates an account</strong> using your link.
            They do <strong>not</strong> need to deposit.
          </p>
          <p className="mb-2">
            <strong>Investment / gambling packages:</strong> a referral counts only when they <strong>create an account and make a deposit</strong>.
            That is why these packages cost more.
          </p>
          <p className="mb-0 text-muted">
            We target <strong>at least 70% active referrals</strong>. If the active rate is meaningfully lower, contact support with the details the admin requests.
          </p>
        </Card.Body>
      </Card>

      <Row className="g-3 mb-4">
        <Col md={6}>
          <Card className="border-primary h-100 rs-card">
            <Card.Header className="bg-primary text-white">Buy referrals (Promote)</Card.Header>
            <Card.Body>
              <ol className="mb-0">
                <li>Register and accept terms</li>
                <li>Open <strong>Promote</strong> and choose a package</li>
                <li>Paste your referral / site link</li>
                <li>Pay TRX / SOL / TON using your unique pay code</li>
                <li>Paste the transaction hash and submit</li>
                <li>Admin confirms payment → promotion starts</li>
              </ol>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="border-success h-100 rs-card">
            <Card.Header className="bg-success text-white">Earn</Card.Header>
            <Card.Body>
              <ol className="mb-0">
                <li>Register</li>
                <li>Open <strong>Earn</strong> and pick a task</li>
                <li>Open the link and wait the timer</li>
                <li>Upload a screenshot as proof</li>
                <li>After approval, balance increases</li>
                <li>Withdraw from <strong>Wallet</strong></li>
              </ol>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <div className="d-flex flex-wrap gap-2">
        <Link to="/register" className="btn btn-primary">Create account</Link>
        <Link to="/faq" className="btn btn-outline-secondary">FAQ</Link>
        <a href={TG} className="btn btn-outline-info" target="_blank" rel="noreferrer">
          <i className="bi bi-telegram me-1" />Telegram
        </a>
        <a href={IG} className="btn btn-outline-danger" target="_blank" rel="noreferrer">
          <i className="bi bi-instagram me-1" />{IG_HANDLE}
        </a>
      </div>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { Row, Col, Card } from 'react-bootstrap'

const TG = 'https://t.me/referralshopping'

export default function Guide() {
  return (
    <div className="page-enter">
      <h1 className="fw-bold mb-2">How Referral Shopping works</h1>
      <p className="text-muted mb-4">
        Welcome! If you want to buy referrals, here is the simple version — the same idea we used on Telegram, now on the website.
      </p>

      <Card className="rs-card rs-card-static mb-4">
        <Card.Body>
          <p className="mb-2">
            You pay for a package, then we promote your link until it reaches the number of referrals you ordered.
            Our promotional reach includes social channels (including Instagram pages with a large combined audience), and your link is shared as part of that promotion.
          </p>
          <p className="mb-0 text-muted">
            We target <strong>at least 70% active referrals</strong>. If the active rate is meaningfully lower, contact support with the information the admin requests for a review or refund path.
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
          <i className="bi bi-telegram me-1" />Telegram channel
        </a>
      </div>
    </div>
  )
}

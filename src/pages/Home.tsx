import { Link } from 'react-router-dom'
import { Row, Col, Card } from 'react-bootstrap'
import Logo from '../components/Logo'

const TG = 'https://t.me/referralshopping'

export default function Home() {
  return (
    <div className="page-enter">
      <div className="hero-section text-center">
        <div className="d-flex justify-content-center mb-3 position-relative" style={{ zIndex: 1 }}>
          <Logo size={56} showText={false} />
        </div>
        <h1 className="display-5 fw-bold mb-3 position-relative" style={{ zIndex: 1 }}>
          Referral Shopping
        </h1>
        <p className="lead mb-2 opacity-90 position-relative" style={{ zIndex: 1 }}>
          Buy real referrals for your links — or earn by completing simple tasks.
        </p>
        <p className="mb-4 opacity-75 small position-relative" style={{ zIndex: 1 }}>
          We promote your link until you reach the package you ordered. At least 70% active referrals guaranteed.
        </p>
        <div className="d-flex gap-2 justify-content-center flex-wrap position-relative" style={{ zIndex: 1 }}>
          <Link to="/promote" className="btn btn-light btn-lg fw-semibold">
            <i className="bi bi-megaphone me-2" />Order referrals
          </Link>
          <Link to="/earn" className="btn btn-outline-light btn-lg">
            <i className="bi bi-cash-coin me-2" />Earn money
          </Link>
          <a href={TG} target="_blank" rel="noreferrer" className="btn btn-outline-light btn-lg">
            <i className="bi bi-telegram me-2" />Telegram
          </a>
        </div>
      </div>

      <h2 className="text-center mb-4 fw-bold">How it works</h2>
      <Row className="g-3 mb-5">
        {[
          ['1', 'Choose a package', 'Pick regular or gambling pricing and paste the link you want promoted.'],
          ['2', 'Pay with crypto', 'Send TRX, SOL, or TON with your unique pay code. Submit the transaction hash.'],
          ['3', 'We promote', 'Our team pushes your link until the ordered referral count is reached (typically 3–12 days).'],
          ['4', 'Guarantee', 'At least 70% of referrals stay active for a month — or contact support for a review.'],
        ].map(([n, t, d]) => (
          <Col md={6} lg={3} key={n}>
            <Card className="rs-card h-100 text-center p-3">
              <div className="display-6 text-primary mb-2">
                <i className={`bi bi-${n}-circle-fill`} />
              </div>
              <h5 className="fw-bold">{t}</h5>
              <p className="text-muted small mb-0">{d}</p>
            </Card>
          </Col>
        ))}
      </Row>

      <h2 className="text-center mb-4 fw-bold">Packages</h2>
      <Row className="g-3 mb-4">
        <Col md={6}>
          <Card className="rs-card h-100">
            <Card.Header className="bg-primary text-white fw-semibold">Regular sites / channels</Card.Header>
            <ul className="list-group list-group-flush">
              <li className="list-group-item d-flex justify-content-between"><span>1,000 referrals</span><strong>$50</strong></li>
              <li className="list-group-item d-flex justify-content-between"><span>1,900 referrals</span><strong>$100</strong></li>
              <li className="list-group-item d-flex justify-content-between"><span>3,800 referrals</span><strong>$200</strong></li>
            </ul>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="rs-card h-100">
            <Card.Header className="bg-danger text-white fw-semibold">Investment / gambling</Card.Header>
            <ul className="list-group list-group-flush">
              <li className="list-group-item d-flex justify-content-between"><span>1,000 referrals</span><strong>$100</strong></li>
              <li className="list-group-item d-flex justify-content-between"><span>1,900 referrals</span><strong>$200</strong></li>
              <li className="list-group-item d-flex justify-content-between"><span>3,800 referrals</span><strong>$400</strong></li>
            </ul>
          </Card>
        </Col>
      </Row>

      <Card className="rs-card rs-card-static mb-4 border-0">
        <Card.Body className="text-center p-4">
          <h4 className="fw-bold"><i className="bi bi-shield-check text-success me-2" />Quality guarantee</h4>
          <p className="text-muted mb-0">
            We aim for at least <strong>70% active referrals</strong> for about a month. If your active rate is clearly lower, open a Support ticket with the details we request.
          </p>
        </Card.Body>
      </Card>

      <div className="text-center mb-3">
        <Link to="/faq" className="btn btn-outline-primary me-2">FAQ</Link>
        <Link to="/support" className="btn btn-outline-secondary me-2">Customer service</Link>
        <a href={TG} className="btn btn-info text-white" target="_blank" rel="noreferrer">
          <i className="bi bi-telegram me-1" /> t.me/referralshopping
        </a>
      </div>

      <a className="tg-float" href={TG} target="_blank" rel="noreferrer" title="Telegram channel" aria-label="Telegram">
        <i className="bi bi-telegram" />
      </a>
    </div>
  )
}

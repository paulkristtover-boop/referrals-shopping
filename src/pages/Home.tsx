import { Link } from 'react-router-dom'
import { Row, Col, Card } from 'react-bootstrap'

export default function Home() {
  return (
    <>
      <div className="hero-section text-center">
        <h1 className="display-5 fw-bold mb-3">Referral Shopping</h1>
        <p className="lead mb-4 opacity-90">
          Get real people to click your links — or earn by completing simple tasks.
        </p>
        <div className="d-flex gap-2 justify-content-center flex-wrap">
          <Link to="/promote" className="btn btn-light btn-lg fw-semibold">
            <i className="bi bi-megaphone me-2" />Promote
          </Link>
          <Link to="/earn" className="btn btn-outline-light btn-lg">
            <i className="bi bi-cash-coin me-2" />Earn
          </Link>
          <Link to="/guide" className="btn btn-outline-light btn-lg">
            <i className="bi bi-book me-2" />How it works
          </Link>
        </div>
      </div>

      <h2 className="text-center mb-4">How it works</h2>
      <Row className="g-3 mb-5">
        {[
          ['1', 'Promote', 'Buy a package, paste your link, pay with TRX / SOL / TON.'],
          ['2', 'Real clicks', 'Earners open your link, wait, and submit a screenshot.'],
          ['3', 'Earn or grow', 'Promoters get traffic. Earners get paid to their wallet.'],
        ].map(([n, t, d]) => (
          <Col md={4} key={n}>
            <Card className="h-100 border-0 shadow-sm text-center p-3">
              <div className="display-6 text-primary mb-2">
                <i className={`bi bi-${n}-circle-fill`} />
              </div>
              <h5>{t}</h5>
              <p className="text-muted small mb-0">{d}</p>
            </Card>
          </Col>
        ))}
      </Row>

      <h2 className="text-center mb-4">Packages</h2>
      <Row className="g-3 mb-4">
        <Col md={6}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-primary text-white fw-semibold">Regular sites</Card.Header>
            <ul className="list-group list-group-flush">
              <li className="list-group-item d-flex justify-content-between"><span>1,000 referrals</span><strong>$50</strong></li>
              <li className="list-group-item d-flex justify-content-between"><span>1,900 referrals</span><strong>$100</strong></li>
              <li className="list-group-item d-flex justify-content-between"><span>3,800 referrals</span><strong>$200</strong></li>
            </ul>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-danger text-white fw-semibold">Investment / gambling</Card.Header>
            <ul className="list-group list-group-flush">
              <li className="list-group-item d-flex justify-content-between"><span>1,000 referrals</span><strong>$100</strong></li>
              <li className="list-group-item d-flex justify-content-between"><span>1,900 referrals</span><strong>$200</strong></li>
              <li className="list-group-item d-flex justify-content-between"><span>3,800 referrals</span><strong>$400</strong></li>
            </ul>
          </Card>
        </Col>
      </Row>
      <p className="text-center text-muted">
        <i className="bi bi-shield-check text-success" /> 24-hour promotion guarantee — or refund.
      </p>
    </>
  )
}

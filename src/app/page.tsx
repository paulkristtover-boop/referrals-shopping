import Link from 'next/link'
import { Container, Row, Col, Button, Card } from 'react-bootstrap'

export default function HomePage() {
  return (
    <Container>
      {/* Hero */}
      <section className="hero-section text-center mb-5">
        <h1 className="display-4 fw-bold mb-3">Referrals Shopping</h1>
        <p className="lead mb-4 opacity-90">
          Your go-to solution for getting real referrals to your shopping platform or affiliate programs.
        </p>
        <div className="d-flex gap-3 justify-content-center flex-wrap">
          <Button as={Link as any} href="/promote" variant="light" size="lg" className="fw-semibold">
            <i className="bi bi-megaphone me-2"></i>Promote Your Link
          </Button>
          <Button as={Link as any} href="/earn" variant="outline-light" size="lg">
            <i className="bi bi-cash-coin me-2"></i>Earn from Tasks
          </Button>
        </div>
      </section>

      {/* How it works */}
      <section className="mb-5">
        <h2 className="text-center mb-4">How it works</h2>
        <Row className="g-4">
          <Col md={4}>
            <Card className="h-100 text-center stat-card border-0 shadow-sm">
              <Card.Body className="p-4">
                <div className="display-6 text-primary mb-3">
                  <i className="bi bi-1-circle-fill"></i>
                </div>
                <Card.Title>Choose & Promote</Card.Title>
                <Card.Text className="text-muted">
                  Select a package, provide your referral link, and pay with TRX, SOL or TON.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="h-100 text-center stat-card border-0 shadow-sm">
              <Card.Body className="p-4">
                <div className="display-6 text-success mb-3">
                  <i className="bi bi-2-circle-fill"></i>
                </div>
                <Card.Title>Real People Interact</Card.Title>
                <Card.Text className="text-muted">
                  We guarantee real users will interact with your link. Most become new customers.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="h-100 text-center stat-card border-0 shadow-sm">
              <Card.Body className="p-4">
                <div className="display-6 text-warning mb-3">
                  <i className="bi bi-3-circle-fill"></i>
                </div>
                <Card.Title>Earn or Grow</Card.Title>
                <Card.Text className="text-muted">
                  Promoters grow their base. Earners complete simple tasks and get paid.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </section>

      {/* Packages preview */}
      <section className="mb-5">
        <h2 className="text-center mb-4">Referral Packages</h2>
        <Row className="g-4">
          <Col md={6}>
            <Card className="h-100 border-0 shadow-sm">
              <Card.Header className="bg-primary text-white fw-semibold">Regular Sites / Channels</Card.Header>
              <Card.Body>
                <ul className="list-unstyled mb-0">
                  <li className="d-flex justify-content-between py-2 border-bottom">
                    <span>1,000 referrals</span>
                    <strong>$50</strong>
                  </li>
                  <li className="d-flex justify-content-between py-2 border-bottom">
                    <span>1,900 referrals</span>
                    <strong>$100</strong>
                  </li>
                  <li className="d-flex justify-content-between py-2">
                    <span>3,800 referrals</span>
                    <strong>$200</strong>
                  </li>
                </ul>
              </Card.Body>
            </Card>
          </Col>
          <Col md={6}>
            <Card className="h-100 border-0 shadow-sm">
              <Card.Header className="bg-danger text-white fw-semibold">Investment / Gambling</Card.Header>
              <Card.Body>
                <ul className="list-unstyled mb-0">
                  <li className="d-flex justify-content-between py-2 border-bottom">
                    <span>1,000 referrals</span>
                    <strong>$100</strong>
                  </li>
                  <li className="d-flex justify-content-between py-2 border-bottom">
                    <span>1,900 referrals</span>
                    <strong>$200</strong>
                  </li>
                  <li className="d-flex justify-content-between py-2">
                    <span>3,800 referrals</span>
                    <strong>$400</strong>
                  </li>
                </ul>
              </Card.Body>
            </Card>
          </Col>
        </Row>
        <div className="text-center mt-4">
          <Button as={Link as any} href="/promote" variant="primary" size="lg">
            Start Promoting
          </Button>
        </div>
      </section>

      {/* Guarantee */}
      <section className="text-center py-4">
        <Card className="border-0 bg-body-secondary">
          <Card.Body className="p-4">
            <h4 className="mb-2">
              <i className="bi bi-shield-check text-success me-2"></i>
              24-Hour Guarantee
            </h4>
            <p className="mb-0 text-muted">
              If we can&apos;t promote your link within 24 hours, you receive an automatic refund.
            </p>
          </Card.Body>
        </Card>
      </section>
    </Container>
  )
}

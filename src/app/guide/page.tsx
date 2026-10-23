import Link from 'next/link'
import { Container, Row, Col, Card, ListGroup, Badge } from 'react-bootstrap'

export default function GuidePage() {
  return (
    <Container className="py-4" style={{ maxWidth: 800 }}>
      <h1 className="mb-2">How this website works</h1>
      <p className="text-muted mb-4">
        Short guide so you can understand every part before using it.
      </p>

      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body>
          <h4>What is it?</h4>
          <p className="mb-0">
            A site where promoters pay for real people to click their links,
            and earners get paid for completing those click tasks (with a
            screenshot as proof). Payments use crypto: TRX, SOL, or TON.
          </p>
        </Card.Body>
      </Card>

      <h4 className="mb-3">Main buttons / pages</h4>
      <ListGroup className="mb-4 shadow-sm">
        <ListGroup.Item className="d-flex justify-content-between align-items-center">
          <span><strong>Home</strong> — intro + prices</span>
          <Link href="/">Open</Link>
        </ListGroup.Item>
        <ListGroup.Item className="d-flex justify-content-between align-items-center">
          <span><strong>Register / Login</strong> — create account</span>
          <span>
            <Link href="/register" className="me-2">Register</Link>
            <Link href="/login">Login</Link>
          </span>
        </ListGroup.Item>
        <ListGroup.Item className="d-flex justify-content-between align-items-center">
          <span><strong>Dashboard</strong> — your overview</span>
          <Link href="/dashboard">Open</Link>
        </ListGroup.Item>
        <ListGroup.Item className="d-flex justify-content-between align-items-center">
          <span><strong>Promote</strong> — buy clicks for your link</span>
          <Badge bg="primary">Promoter</Badge>
        </ListGroup.Item>
        <ListGroup.Item className="d-flex justify-content-between align-items-center">
          <span><strong>Earn</strong> — do tasks, upload screenshot</span>
          <Badge bg="success">Earner</Badge>
        </ListGroup.Item>
        <ListGroup.Item className="d-flex justify-content-between align-items-center">
          <span><strong>Wallet</strong> — balance & withdraw</span>
          <Link href="/wallet">Open</Link>
        </ListGroup.Item>
        <ListGroup.Item className="d-flex justify-content-between align-items-center">
          <span><strong>Admin</strong> — approve payments & proofs</span>
          <Badge bg="dark">Admin only</Badge>
        </ListGroup.Item>
      </ListGroup>

      <Row className="g-3 mb-4">
        <Col md={6}>
          <Card className="h-100 border-primary border-opacity-25">
            <Card.Header className="bg-primary text-white">Promote flow</Card.Header>
            <Card.Body>
              <ol className="mb-0 ps-3">
                <li>Register & accept terms</li>
                <li>Choose a package</li>
                <li>Paste your referral / site link</li>
                <li>Pay TRX / SOL / TON to the address shown</li>
                <li>Click &quot;I have paid&quot;</li>
                <li>Wait for admin approval</li>
              </ol>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="h-100 border-success border-opacity-25">
            <Card.Header className="bg-success text-white">Earn flow</Card.Header>
            <Card.Body>
              <ol className="mb-0 ps-3">
                <li>Register</li>
                <li>Open Earn → pick a task</li>
                <li>Open the link & wait the timer</li>
                <li>Upload a screenshot as proof</li>
                <li>Admin approves → balance increases</li>
                <li>Withdraw from Wallet</li>
              </ol>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="border-0 bg-body-secondary">
        <Card.Body>
          <h5>Packages (prices)</h5>
          <p className="small text-muted mb-2">Regular sites</p>
          <ul className="small">
            <li>1,000 referrals → $50</li>
            <li>1,900 referrals → $100</li>
            <li>3,800 referrals → $200</li>
          </ul>
          <p className="small text-muted mb-2">Investment / gambling</p>
          <ul className="small mb-0">
            <li>1,000 → $100 · 1,900 → $200 · 3,800 → $400</li>
          </ul>
        </Card.Body>
      </Card>

      <div className="text-center mt-4">
        <Link href="/register" className="btn btn-primary me-2">Create account</Link>
        <Link href="/" className="btn btn-outline-secondary">Back home</Link>
      </div>
    </Container>
  )
}

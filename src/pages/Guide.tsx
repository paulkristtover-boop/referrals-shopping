import { Link } from 'react-router-dom'
import { Row, Col, Card } from 'react-bootstrap'

export default function Guide() {
  return (
    <>
      <h1 className="mb-3">How this website works</h1>
      <p className="text-muted">Open in any browser — normal website, not a phone app.</p>
      <Row className="g-3">
        <Col md={6}>
          <Card className="border-primary h-100">
            <Card.Header className="bg-primary text-white">Promote</Card.Header>
            <Card.Body>
              <ol className="mb-0">
                <li>Register and accept terms</li>
                <li>Open Promote → choose package</li>
                <li>Paste your link</li>
                <li>Pay TRX / SOL / TON</li>
                <li>Click “I have paid”</li>
                <li>Admin approves → tasks go live</li>
              </ol>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="border-success h-100">
            <Card.Header className="bg-success text-white">Earn</Card.Header>
            <Card.Body>
              <ol className="mb-0">
                <li>Register</li>
                <li>Open Earn → pick a task</li>
                <li>Open link & wait the timer</li>
                <li>Upload screenshot</li>
                <li>Admin approves → balance up</li>
                <li>Withdraw from Wallet</li>
              </ol>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <div className="text-center mt-4">
        <Link to="/register" className="btn btn-primary">Create account</Link>
      </div>
    </>
  )
}

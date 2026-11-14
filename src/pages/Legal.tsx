import { Link } from 'react-router-dom'
import { Card, Row, Col } from 'react-bootstrap'
import { BRAND } from '../lib/brand'

const links = [
  { to: '/terms', title: 'Terms of Service', desc: 'Marketplace rules, payments, liability' },
  { to: '/privacy', title: 'Privacy Policy', desc: 'Data we process and why' },
  { to: '/refunds', title: 'Refund policy', desc: 'When reviews and refunds apply' },
  { to: '/guide', title: 'How it works', desc: 'Promote + Earn model' },
  { to: '/faq', title: 'FAQ', desc: 'Common questions' },
  { to: '/support', title: 'Support', desc: 'Contact the team' },
]

export default function Legal() {
  return (
    <div className="page-enter legal-page">
      <div className="legal-hero">
        <h1 className="fw-bold mb-1">Legal & compliance</h1>
        <p className="text-muted mb-0">
          {BRAND} operates as a transparent referral marketplace. Read these documents before paying or earning.
        </p>
      </div>
      <Row className="g-3">
        {links.map((l) => (
          <Col md={6} key={l.to}>
            <Card className="rs-card h-100">
              <Card.Body>
                <Link to={l.to} className="fw-bold text-decoration-none stretched-link">
                  {l.title}
                </Link>
                <p className="small text-muted mb-0 mt-1">{l.desc}</p>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
      <p className="small text-muted mt-4 mb-0">
        Prices are in ₦. Competitor claims elsewhere may differ; we publish package prices and delivery model on this site only.
      </p>
    </div>
  )
}

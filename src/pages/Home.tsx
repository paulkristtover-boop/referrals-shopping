import { Link } from 'react-router-dom'
import { Row, Col, Card } from 'react-bootstrap'
import Logo from '../components/Logo'
import { useAuth } from '../contexts/AuthContext'
import { BRAND, TG, IG, IG_HANDLE } from '../lib/brand'
import { formatMoney } from '../lib/money'

const REGULAR_PACKS = [
  { name: 'Free Starter', refs: 50, price: 0, free: true },
  { name: 'Starter', refs: 1000, price: 25000 },
  { name: 'Growth', refs: 1900, price: 50000 },
  { name: 'Scale', refs: 3800, price: 100000 },
]

const GAMBLING_PACKS = [
  { name: 'Deposit Starter', refs: 1000, price: 50000 },
  { name: 'Deposit Growth', refs: 1900, price: 100000 },
  { name: 'Deposit Scale', refs: 3800, price: 200000 },
]

const TRUST = [
  { icon: 'bi-person-plus', label: 'Regular = signup only' },
  { icon: 'bi-safe2', label: 'Gambling = + deposit' },
  { icon: 'bi-currency-bitcoin', label: 'TRX · SOL · TON' },
  { icon: 'bi-gift', label: 'Free Starter 50' },
  { icon: 'bi-shield-check', label: '70% active target' },
]

export default function Home() {
  const { user, profile } = useAuth()
  const loggedIn = !!user
  const isAdmin = profile?.role === 'admin'

  return (
    <div className="page-enter">
      <div className="hero-section text-center">
        <div className="d-flex justify-content-center mb-3">
          <Logo size={48} showText={false} />
        </div>
        <p className="text-uppercase small fw-semibold mb-2 opacity-75 letter-space">{BRAND}</p>
        <h1 className="display-5 fw-bold mb-2">Buy real referrals for your links</h1>
        <p className="lead mb-4 opacity-90">
          Order a package — we promote your referral link until it fills. Or earn by completing simple tasks.
        </p>
        <div className="d-flex gap-2 justify-content-center flex-wrap">
          {!loggedIn ? (
            <>
              <Link to="/register" className="btn btn-light btn-lg fw-semibold px-4">
                <i className="bi bi-person-plus me-2" />
                Create free account
              </Link>
              <Link to="/login" className="btn btn-outline-light btn-lg">
                Login
              </Link>
            </>
          ) : isAdmin ? (
            <Link to="/admin" className="btn btn-light btn-lg fw-semibold">
              Open Admin
            </Link>
          ) : (
            <>
              <Link to="/promote" className="btn btn-light btn-lg fw-semibold">
                Shop referrals
              </Link>
              <Link to="/earn" className="btn btn-outline-light btn-lg">
                Earn
              </Link>
            </>
          )}
        </div>
        <div className="hero-social trust-strip d-flex flex-wrap justify-content-center gap-2">
          {TRUST.map((i) => (
            <span key={i.label} className="trust-chip">
              <i className={`bi ${i.icon}`} /> {i.label}
            </span>
          ))}
        </div>
      </div>

      <h2 className="text-center mb-2 fw-bold">Two paths</h2>
      <p className="text-center text-muted mb-4">Same account — promote or earn.</p>
      <Row className="g-3 mb-5">
        <Col md={6}>
          <Card className="rs-card h-100 border-primary">
            <Card.Body className="p-4 d-flex flex-column">
              <div className="text-primary mb-2 fs-3">
                <i className="bi bi-shop" />
              </div>
              <h3 className="h5 fw-bold">Shop referrals</h3>
              <p className="text-muted small flex-grow-1">
                Pay for a package. We drive people to your link.
                <strong> Regular:</strong> account signup only.
                <strong> Gambling:</strong> signup + deposit.
              </p>
              <Link
                to={loggedIn && !isAdmin ? '/promote' : '/register?intent=promote'}
                className="btn btn-primary"
              >
                {loggedIn && !isAdmin ? 'Open Promote' : 'Start shopping'}
              </Link>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="rs-card h-100 border-success">
            <Card.Body className="p-4 d-flex flex-column">
              <div className="text-success mb-2 fs-3">
                <i className="bi bi-cash-coin" />
              </div>
              <h3 className="h5 fw-bold">Earn on tasks</h3>
              <p className="text-muted small flex-grow-1">
                Open task links, wait the timer, upload a screenshot. Get paid after approval.
              </p>
              <Link
                to={loggedIn && !isAdmin ? '/earn' : '/register?intent=earn'}
                className="btn btn-success"
              >
                {loggedIn && !isAdmin ? 'Open Earn' : 'Start earning'}
              </Link>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <h2 className="text-center fw-bold mb-1">{BRAND} packages</h2>
      <p className="text-center text-muted mb-4">Signup-only vs deposit packages — clear pricing</p>

      <h3 className="h6 text-uppercase text-muted fw-bold mb-3">Regular — signup only</h3>
      <Row className="g-3 mb-4">
        {REGULAR_PACKS.map((p) => (
          <Col xs={6} lg={3} key={p.name}>
            <Card className={`rs-card h-100 package-card ${p.free ? 'package-card-free' : ''}`}>
              <Card.Body className="text-center p-3 d-flex flex-column">
                {p.free && <span className="badge text-bg-success align-self-center mb-2">Free once</span>}
                <div className="package-refs">{p.refs.toLocaleString()}</div>
                <div className="small text-muted mb-2">referrals</div>
                <div className="fw-bold mb-1">{p.name}</div>
                <div className="package-price mb-2">{p.free ? <span className="text-success">$0</span> : formatMoney(p.price)}</div>
                <div className="small text-muted mt-auto">No deposit required</div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <h3 className="h6 text-uppercase text-muted fw-bold mb-3">Investment / gambling — deposit</h3>
      <Row className="g-3 mb-5">
        {GAMBLING_PACKS.map((p) => (
          <Col xs={6} md={4} key={p.name}>
            <Card className="rs-card h-100 package-card package-card-deposit">
              <Card.Body className="text-center p-3 d-flex flex-column">
                <div className="package-refs text-danger">{p.refs.toLocaleString()}</div>
                <div className="small text-muted mb-2">referrals</div>
                <div className="fw-bold mb-1">{p.name}</div>
                <div className="package-price mb-2">{formatMoney(p.price)}</div>
                <div className="small text-muted mt-auto">Must deposit</div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <div className="text-center mb-4">
        <Link
          to={loggedIn && !isAdmin ? '/promote' : '/register?intent=promote'}
          className="btn btn-primary btn-lg px-4"
        >
          Shop referrals
        </Link>
        <div className="mt-3 d-flex justify-content-center flex-wrap gap-3">
          <Link to="/guide" className="small">
            How it works
          </Link>
          <Link to="/faq" className="small">
            FAQ
          </Link>
          <a href={TG} className="small" target="_blank" rel="noreferrer">
            <i className="bi bi-telegram" /> Telegram
          </a>
          <a href={IG} className="small" target="_blank" rel="noreferrer">
            <i className="bi bi-instagram" /> {IG_HANDLE}
          </a>
        </div>
      </div>

      <div className="social-floats">
        <a className="tg-float" href={TG} target="_blank" rel="noreferrer" title="Telegram" aria-label="Telegram">
          <i className="bi bi-telegram" />
        </a>
        <a className="ig-float" href={IG} target="_blank" rel="noreferrer" title="Instagram" aria-label="Instagram">
          <i className="bi bi-instagram" />
        </a>
      </div>
    </div>
  )
}

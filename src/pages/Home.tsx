import { Link } from 'react-router-dom'
import { Row, Col, Card } from 'react-bootstrap'
import Logo from '../components/Logo'
import { useAuth } from '../contexts/AuthContext'
import { BRAND, BRAND_TAGLINE, BRAND_SUB, BRAND_AI, TG, IG, IG_HANDLE, CURRENCY_NOTE } from '../lib/brand'
import { formatMoney } from '../lib/money'
import { REGULAR_PACKAGES, INVESTMENT_PACKAGES, FREE_STARTER_REFS, perReferralNgn } from '../lib/pricing'
import { FloatBlobs, Reveal, Stagger } from '../components/Animated'

const REGULAR_PACKS = [
  { name: 'Free Starter', refs: FREE_STARTER_REFS, price: 0, free: true },
  ...REGULAR_PACKAGES.map((p) => ({
    name: p.name,
    refs: p.referrals,
    price: p.priceNgn,
    free: false,
  })),
]

const GAMBLING_PACKS = INVESTMENT_PACKAGES.map((p) => ({
  name: p.name,
  refs: p.referrals,
  price: p.priceNgn,
}))

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
      <div className="hero-section text-center position-relative">
        <FloatBlobs />
        <div className="ng-flag-bar" aria-hidden />
        <div className="hero-with-art">
          <div className="hero-copy">
        <div className="d-flex justify-content-center justify-content-lg-start mb-3">
          <Logo size={48} showText={false} />
        </div>
        <p className="text-uppercase small fw-semibold mb-2 opacity-75 letter-space">{BRAND}</p>
            <div className="d-flex flex-wrap gap-2 justify-content-center justify-content-lg-start mb-2">
              <span className="ng-ai-badge"><span className="dot" /> {BRAND_AI}</span>
              <span className="ng-ai-badge">₦ Naira · NG</span>
            </div>
            <p className="small opacity-90 mb-2">{BRAND_TAGLINE}</p>
        <h1 className="display-5 fw-bold mb-2">Promote links. Earners complete the tasks.</h1>
        <p className="lead mb-3 opacity-90">
          {BRAND_SUB} Pay and withdraw in ₦. Built for sites, channels, bots, and groups across Nigeria.
        </p>
        <div className="avatar-stack mb-3 justify-content-center justify-content-lg-start">
          <span className="av" title="Members">A</span>
          <span className="av a2">B</span>
          <span className="av a3">C</span>
          <span className="av a4">+</span>
          <span className="small ms-2 opacity-75">Promoters + earners on {BRAND}</span>
        </div>
        <div className="d-flex gap-2 justify-content-center flex-wrap hero-cta">
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
          <div className="hero-visual d-none d-md-block">
            <img
              className="hero-art"
              src="/illustrations/hero-people.svg"
              alt="People connecting through referral links"
              width={640}
              height={360}
            />
          </div>
        </div>
      </div>

      <p className="legal-note text-center small text-muted mb-3 px-2">
        Transparent ₦ pricing · Marketplace (Promote + Earn) · No guaranteed investment returns ·{' '}
        <Link to="/legal">Legal</Link>
      </p>
      <div className="ng-strip">
        <span><strong>NG</strong> · Built for Nigeria</span>
        <span>{CURRENCY_NOTE}</span>
        <span><i className="bi bi-cpu me-1" />{BRAND_AI}</span>
      </div>
      <Reveal><h2 className="text-center mb-2 fw-bold">Two paths</h2></Reveal>
      <p className="text-center text-muted mb-4">For sites, channels, bots, and groups — promote or earn.</p>
      <Stagger className="mb-5"><Row className="g-3">
        <Col md={6}>
          <Card className="rs-card h-100 border-primary graphic-top">
            <Card.Body className="p-4 d-flex flex-column">
              <img className="feature-art" src="/illustrations/hero-people.svg" alt="" width={400} height={160} />
              <h3 className="h5 fw-bold">Promote</h3>
              <p className="text-muted small flex-grow-1">
                Buy a package; your link becomes Earn tasks. <strong>Regular:</strong> signup only.
                <strong> Investment:</strong> signup + deposit. Delivery tracks completed proofs.
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
          <Card className="rs-card h-100 border-success graphic-top">
            <Card.Body className="p-4 d-flex flex-column">
              <img className="feature-art" src="/illustrations/earn-people.svg" alt="" width={400} height={160} />
              <h3 className="h5 fw-bold">Earn (fill the tasks)</h3>
              <p className="text-muted small flex-grow-1">Open live tasks from paid Promote orders. Wait the timer, upload proof, get credited after review. This is how referrals are delivered.</p>
              <Link
                to={loggedIn && !isAdmin ? '/earn' : '/register?intent=earn'}
                className="btn btn-success"
              >
                {loggedIn && !isAdmin ? 'Open Earn' : 'Start earning'}
              </Link>
            </Card.Body>
          </Card>
        </Col>
      </Row></Stagger>

      <Reveal>
        <h2 className="text-center fw-bold mb-1">{BRAND} packages</h2>
        <p className="text-center text-muted small mb-3">For sites, channels, bots, and groups</p>
      </Reveal>
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
                <div className="package-price mb-2">{p.free ? <span className="text-success">₦0</span> : formatMoney(p.price)}</div>
                <div className="small text-muted mb-2">{p.free ? 'Once per account' : `~${formatMoney(perReferralNgn(p.price, p.refs))} / referral`}</div>
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
                <div className="small text-muted mb-2">~{formatMoney(perReferralNgn(p.price, p.refs))} / referral</div>
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

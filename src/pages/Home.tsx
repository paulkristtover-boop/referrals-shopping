import { Link } from 'react-router-dom'
import { Row, Col, Card, Button } from 'react-bootstrap'
import Logo from '../components/Logo'
import { useAuth } from '../contexts/AuthContext'
import {
  OnlineBadge,
  TrustStrip,
  StatsRow,
  LiveTicker,
  JoinedTodayChip,
  usePublicSocialProof,
} from '../components/SocialProof'

const TG = 'https://t.me/referralshopping'

export default function Home() {
  const { user, profile } = useAuth()
  const loggedIn = !!user
  const isAdmin = profile?.role === 'admin'
  const { stats, live } = usePublicSocialProof()

  return (
    <div className="page-enter">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <OnlineBadge online={stats.online_estimate} />
        <JoinedTodayChip n={stats.joined_today} />
      </div>
      <div className="hero-section text-center">
        <div className="d-flex justify-content-center mb-3 position-relative" style={{ zIndex: 1 }}>
          <Logo size={48} showText={false} />
        </div>
        <h1 className="display-5 fw-bold mb-2 position-relative" style={{ zIndex: 1 }}>
          Get real referrals — or get paid to click
        </h1>
        <p className="lead mb-4 opacity-90 position-relative" style={{ zIndex: 1 }}>
          One account. Two paths. No app install — works in your browser.
        </p>
        <div className="d-flex gap-2 justify-content-center flex-wrap position-relative" style={{ zIndex: 1 }}>
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
              Open Admin CMS
            </Link>
          ) : (
            <>
              <Link to="/dashboard" className="btn btn-light btn-lg fw-semibold">
                Go to dashboard
              </Link>
              <Link to="/promote" className="btn btn-outline-light btn-lg">
                Promote
              </Link>
              <Link to="/earn" className="btn btn-outline-light btn-lg">
                Earn
              </Link>
            </>
          )}
        </div>
        <div className="hero-social">
          <TrustStrip />
        </div>
      </div>

      <LiveTicker items={live} />
      <StatsRow stats={stats} />

      <h2 className="text-center mb-2 fw-bold mt-4">Choose your path</h2>
      <p className="text-center text-muted mb-4">Pick one focus first — you can always use both later.</p>
      <Row className="g-3 mb-5">
        <Col md={6}>
          <Card className="rs-card h-100 border-primary">
            <Card.Body className="p-4 d-flex flex-column">
              <div className="text-primary mb-2 fs-3">
                <i className="bi bi-megaphone-fill" />
              </div>
              <h3 className="h5 fw-bold">I want more users</h3>
              <p className="text-muted small flex-grow-1">
                We drive people to your referral link. <strong>Regular</strong> = they create an account (no deposit).
                <strong> Investment/gambling</strong> = account + deposit. Delivery usually 3–12 days; 70% active target.
              </p>
              <Link
                to={loggedIn && !isAdmin ? '/promote' : '/register?intent=promote'}
                className="btn btn-primary"
              >
                {loggedIn && !isAdmin ? 'Open Promote' : 'Start — Promote'}
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
              <h3 className="h5 fw-bold">I want to earn</h3>
              <p className="text-muted small flex-grow-1">
                Open task links, wait the short timer, upload a screenshot. After approval, balance goes to your wallet
                for crypto withdrawal.
              </p>
              <Link
                to={loggedIn && !isAdmin ? '/earn' : '/register?intent=earn'}
                className="btn btn-success"
              >
                {loggedIn && !isAdmin ? 'Open Earn' : 'Start — Earn'}
              </Link>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <h2 className="text-center mb-4 fw-bold">How it works</h2>
      <Row className="g-3 mb-5">
        {[
          ['1', 'Sign up', 'Free account in under a minute. No email confirmation.'],
          ['2', 'Promote or earn', 'Order referrals with crypto, or complete tasks for rewards.'],
          ['3', 'Track & withdraw', 'Dashboard shows status. Earners cash out from Wallet.'],
        ].map(([n, t, d]) => (
          <Col md={4} key={n}>
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
            <Card.Header className="bg-primary text-white fw-semibold">Regular — signup only</Card.Header>
            <div className="px-3 pt-2 small text-muted">Each referral = new account via your link. No deposit required.</div>
            <ul className="list-group list-group-flush">
              <li className="list-group-item d-flex justify-content-between">
                <span>Free Starter (once)</span>
                <strong className="text-success">50 free</strong>
              </li>
              <li className="list-group-item d-flex justify-content-between">
                <span>1,000 referrals</span>
                <strong>$50</strong>
              </li>
              <li className="list-group-item d-flex justify-content-between">
                <span>1,900 referrals</span>
                <strong>$100</strong>
              </li>
              <li className="list-group-item d-flex justify-content-between">
                <span>3,800 referrals</span>
                <strong>$200</strong>
              </li>
            </ul>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="rs-card h-100">
            <Card.Header className="bg-danger text-white fw-semibold">Investment / gambling — deposit</Card.Header>
            <div className="px-3 pt-2 small text-muted">Each referral = account created <strong>and</strong> a deposit made.</div>
            <ul className="list-group list-group-flush">
              <li className="list-group-item d-flex justify-content-between">
                <span>1,000 referrals</span>
                <strong>$100</strong>
              </li>
              <li className="list-group-item d-flex justify-content-between">
                <span>1,900 referrals</span>
                <strong>$200</strong>
              </li>
              <li className="list-group-item d-flex justify-content-between">
                <span>3,800 referrals</span>
                <strong>$400</strong>
              </li>
            </ul>
          </Card>
        </Col>
      </Row>

      {!loggedIn && (
        <div className="text-center mb-4">
          <Link to="/register" className="btn btn-primary btn-lg px-4">
            Create free account
          </Link>
          <div className="mt-2">
            <Link to="/faq" className="small me-3">
              FAQ
            </Link>
            <a href={TG} className="small" target="_blank" rel="noreferrer">
              <i className="bi bi-telegram" /> Telegram
            </a>
          </div>
        </div>
      )}

      <a className="tg-float" href={TG} target="_blank" rel="noreferrer" title="Telegram" aria-label="Telegram">
        <i className="bi bi-telegram" />
      </a>
    </div>
  )
}

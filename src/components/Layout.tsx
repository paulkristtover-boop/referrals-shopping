import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Container, Nav, Navbar, Button } from 'react-bootstrap'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import Logo from './Logo'
import BottomTabBar from './BottomTabBar'
import OfflineNotice from './OfflineNotice'
import SlowConnection from './SlowConnection'
import PageCoach from './PageCoach'
import NotificationBell from './NotificationBell'

import { TG, IG, IG_HANDLE, BRAND, BRAND_AI, BRAND_TAGLINE, CURRENCY_NOTE } from '../lib/brand'

function NavItem({ to, icon, children, end }: { to: string; icon: string; children: ReactNode; end?: boolean }) {
  return (
    <Nav.Link as={NavLink} to={to} end={end} className="d-none d-lg-flex align-items-center">
      <i className={`bi ${icon} nav-icon`} />
      {children}
    </Nav.Link>
  )
}

export default function Layout() {
  const { user, profile, signOut } = useAuth()
  const { theme, toggle } = useTheme()
  const [scrolled, setScrolled] = useState(false)
  const loc = useLocation()
  const isAdminArea = loc.pathname.startsWith('/admin')
  const isAdmin = profile?.role === 'admin'
  const showBottom = !!user

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // —— Admin shell ——
  if (isAdminArea && isAdmin) {
    return (
      <>
        <OfflineNotice />
        <SlowConnection />
        
<Navbar expand="lg" className={`rs-navbar top-nav admin-nav ${scrolled ? 'scrolled' : ''}`}>
          <Container fluid className="px-3 px-lg-4">
            <Navbar.Brand as={Link} to="/admin" className="d-flex align-items-center gap-2 text-white">
              <Logo size={28} showText={false} />
              <span className="fw-bold">Admin</span>
            </Navbar.Brand>
            <div className="d-flex align-items-center gap-2 ms-auto">
              <NotificationBell variant="light" />
              <Button size="sm" variant="outline-light" onClick={toggle} className="d-none d-sm-inline-flex">
                <i className={`bi ${theme === 'dark' ? 'bi-sun' : 'bi-moon'}`} />
              </Button>
              <Link to="/" className="btn btn-sm btn-outline-light d-none d-md-inline-flex">
                <i className="bi bi-house me-1" />Site
              </Link>
              <Button size="sm" variant="danger" onClick={() => void signOut()}>
                <i className="bi bi-box-arrow-right" />
              </Button>
            </div>
          </Container>
        </Navbar>
        {/* Desktop admin secondary links */}
        <div className="admin-top-sub d-none d-lg-block">
          <Container fluid className="px-3 px-lg-4">
            <Nav className="gap-1 py-1">
              <Nav.Link as={NavLink} to="/admin" end>
                <i className="bi bi-grid-1x2 nav-icon" />CMS
              </Nav.Link>
              <Nav.Link as={NavLink} to="/admin/support">
                <i className="bi bi-headset nav-icon" />Support
              </Nav.Link>
            </Nav>
          </Container>
        </div>
        <main className={`flex-grow-1 py-3 py-md-4 rs-main admin-main ${showBottom ? 'has-bottom-nav' : ''}`}>
          <Container fluid className="px-3 px-lg-4 page-enter">
            <PageCoach />
            <Outlet />
          </Container>
        </main>
        <div className="legal-bar text-center small text-muted py-2 d-lg-none">
        <Link to="/legal">Legal</Link>
        {' · '}
        <Link to="/privacy">Privacy</Link>
        {' · '}
        <Link to="/terms">Terms</Link>
      </div>
      <BottomTabBar />
      </>
    )
  }

  // —— User / public top bar ——
  return (
    <>
      <OfflineNotice />
        <SlowConnection />
        
<Navbar expand="lg" className={`rs-navbar top-nav ${scrolled ? 'scrolled' : ''}`}>
        <Container>
          <Navbar.Brand as={Link} to="/" className="d-flex align-items-center">
            <Logo size={28} />
          </Navbar.Brand>

          {/* Mobile: compact top actions */}
          <div className="d-flex align-items-center gap-2 d-lg-none ms-auto me-1">
            {user && <NotificationBell />}
            <Button size="sm" variant="outline-secondary" onClick={toggle}>
              <i className={`bi ${theme === 'dark' ? 'bi-sun' : 'bi-moon'}`} />
            </Button>
            {!user && (
              <Link to="/login" className="btn btn-sm btn-primary">
                Login
              </Link>
            )}
          </div>

          <Navbar.Toggle aria-controls="nav" className="d-none d-lg-inline" />
          <Navbar.Collapse id="nav">
            <Nav className="me-auto align-items-lg-center">
              {user && !isAdmin && (
                <>
                  <NavItem to="/dashboard" icon="bi-speedometer2">
                    Dashboard
                  </NavItem>
                  <NavItem to="/promote" icon="bi-megaphone">
                    Promote
                  </NavItem>
                  <NavItem to="/earn" icon="bi-cash-coin">
                    Earn
                  </NavItem>
                  <NavItem to="/wallet" icon="bi-wallet2">
                    Wallet
                  </NavItem>
                </>
              )}
              {isAdmin && (
                <NavItem to="/admin" icon="bi-shield-lock">
                  Admin
                </NavItem>
              )}
              <NavItem to="/guide" icon="bi-info-circle">
                Guide
              </NavItem>
              <NavItem to="/faq" icon="bi-question-circle">
                FAQ
              </NavItem>
              <NavItem to="/codes" icon="bi-ticket-perforated">
                Codes
              </NavItem>
              {user && !isAdmin && (
                <>
                  <NavItem to="/support" icon="bi-headset">
                    Support
                  </NavItem>
                  <NavItem to="/account" icon="bi-person-circle">
                    Account
                  </NavItem>
                </>
              )}
              {!user && (
                <NavItem to="/support" icon="bi-headset">
                  Support
                </NavItem>
              )}
            </Nav>
            <div className="d-none d-lg-flex align-items-center gap-2">
              <a href={TG} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-primary" title="Telegram">
                <i className="bi bi-telegram" />
              </a>
              <a href={IG} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-danger" title="Instagram">
                <i className="bi bi-instagram" />
              </a>
              {user && <NotificationBell />}
              <Button size="sm" variant="outline-secondary" onClick={toggle}>
                <i className={`bi ${theme === 'dark' ? 'bi-sun' : 'bi-moon'}`} />
              </Button>
              {user ? (
                <>
                  <Link to="/account" className="small text-muted text-truncate text-decoration-none" style={{ maxWidth: 140 }}>
                    {user.email}
                  </Link>
                  <Link to="/account" className="btn btn-sm btn-outline-secondary" title="Account">
                    <i className="bi bi-person-circle" />
                  </Link>
                  <Button size="sm" variant="outline-danger" onClick={() => void signOut()} title="Logout">
                    <i className="bi bi-box-arrow-right" />
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn btn-sm btn-outline-primary">
                    Login
                  </Link>
                  <Link to="/register" className="btn btn-sm btn-primary">
                    Register
                  </Link>
                </>
              )}
            </div>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <main className={`flex-grow-1 py-3 py-md-4 rs-main ${showBottom ? 'has-bottom-nav' : ''}`}>
        <Container className="page-enter">
          <PageCoach />
          <Outlet />
        </Container>
      </main>

      <footer className={`rs-footer text-center text-muted d-none d-lg-block ${showBottom ? 'has-bottom-nav' : ''}`}>
        <Container>
          <div className="d-flex flex-wrap justify-content-center gap-3 mb-2">
            <Link to="/legal">Legal</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/refunds">Refunds</Link>
            <Link to="/guide">Guide</Link>
            <Link to="/faq">FAQ</Link>
            <Link to="/support">Support</Link>
            <a href={TG} target="_blank" rel="noreferrer">
              <i className="bi bi-telegram" /> Telegram
            </a>
            <a href={IG} target="_blank" rel="noreferrer">
              <i className="bi bi-instagram" /> {IG_HANDLE}
            </a>
          </div>
          <div className="d-flex justify-content-center align-items-center gap-2">
            <Logo size={20} showText={false} />
            <div className="d-flex flex-column align-items-center gap-1">
              <span>© {new Date().getFullYear()} {BRAND} · {BRAND_TAGLINE}</span>
              <span className="ai-line"><i className="bi bi-stars me-1" />{BRAND_AI}</span>
              <span className="small">{CURRENCY_NOTE}</span>
            </div>
          </div>
        </Container>
      </footer>

      <div className="legal-bar text-center small text-muted py-2 d-lg-none">
        <Link to="/legal">Legal</Link>
        {' · '}
        <Link to="/privacy">Privacy</Link>
        {' · '}
        <Link to="/terms">Terms</Link>
      </div>
      <BottomTabBar />
    </>
  )
}

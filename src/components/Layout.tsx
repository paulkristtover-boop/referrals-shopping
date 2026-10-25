import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Container, Nav, Navbar, Button } from 'react-bootstrap'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import Logo from './Logo'

const TG = 'https://t.me/referralshopping'

function NavItem({ to, icon, children, end }: { to: string; icon: string; children: ReactNode; end?: boolean }) {
  return (
    <Nav.Link as={NavLink} to={to} end={end}>
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (isAdminArea && isAdmin) {
    return (
      <>
        <Navbar expand="lg" className={`rs-navbar admin-nav ${scrolled ? 'scrolled' : ''}`}>
          <Container fluid className="px-3 px-lg-4">
            <Navbar.Brand as={Link} to="/admin" className="d-flex align-items-center gap-2 text-white">
              <Logo size={28} showText={false} />
              <span className="fw-bold">Admin</span>
            </Navbar.Brand>
            <Navbar.Toggle aria-controls="admin-nav" className="border-secondary" />
            <Navbar.Collapse id="admin-nav">
              <Nav className="me-auto">
                <Nav.Link as={NavLink} to="/admin" end className="text-white-50">
                  <i className="bi bi-grid-1x2 nav-icon" />CMS
                </Nav.Link>
                <Nav.Link as={NavLink} to="/admin/payments" className="text-white-50">
                  <i className="bi bi-currency-bitcoin nav-icon" />Payments
                </Nav.Link>
                <Nav.Link as={NavLink} to="/admin/support" className="text-white-50">
                  <i className="bi bi-headset nav-icon" />Support
                </Nav.Link>
              </Nav>
              <div className="d-flex align-items-center gap-2">
                <Button size="sm" variant="outline-light" onClick={toggle}>
                  <i className={`bi ${theme === 'dark' ? 'bi-sun' : 'bi-moon'}`} />
                </Button>
                <Link to="/" className="btn btn-sm btn-outline-light">
                  <i className="bi bi-house me-1" />Site
                </Link>
                <Button size="sm" variant="danger" onClick={() => void signOut()}>
                  <i className="bi bi-box-arrow-right me-1" />Logout
                </Button>
              </div>
            </Navbar.Collapse>
          </Container>
        </Navbar>
        <main className="flex-grow-1 py-4 admin-main">
          <Container fluid className="px-3 px-lg-4 page-enter">
            <Outlet />
          </Container>
        </main>
      </>
    )
  }

  return (
    <>
      <Navbar expand="lg" className={`rs-navbar ${scrolled ? 'scrolled' : ''}`}>
        <Container>
          <Navbar.Brand as={Link} to="/" className="d-flex align-items-center">
            <Logo size={28} />
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="nav" />
          <Navbar.Collapse id="nav">
            {/* Primary product links first */}
            <Nav className="me-auto align-items-lg-center">
              {user && !isAdmin && (
                <>
                  <NavItem to="/dashboard" icon="bi-speedometer2">Dashboard</NavItem>
                  <NavItem to="/promote" icon="bi-megaphone">Promote</NavItem>
                  <NavItem to="/earn" icon="bi-cash-coin">Earn</NavItem>
                  <NavItem to="/wallet" icon="bi-wallet2">Wallet</NavItem>
                </>
              )}
              {isAdmin && (
                <NavItem to="/admin" icon="bi-shield-lock">Admin</NavItem>
              )}
              {/* Info links */}
              <NavItem to="/guide" icon="bi-info-circle">Guide</NavItem>
              <NavItem to="/faq" icon="bi-question-circle">FAQ</NavItem>
              {user && !isAdmin && (
                <>
                  <NavItem to="/invite" icon="bi-people">Invite</NavItem>
                  <NavItem to="/support" icon="bi-headset">Support</NavItem>
                  <NavItem to="/security" icon="bi-shield-check">2FA</NavItem>
                </>
              )}
              {!user && (
                <>
                  <NavItem to="/support" icon="bi-headset">Support</NavItem>
                </>
              )}
            </Nav>
            <div className="d-flex align-items-center gap-2 py-2 py-lg-0 flex-wrap">
              <a href={TG} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-primary" title="Telegram">
                <i className="bi bi-telegram" />
              </a>
              <Button size="sm" variant="outline-secondary" onClick={toggle} aria-label="Theme">
                <i className={`bi ${theme === 'dark' ? 'bi-sun' : 'bi-moon'}`} />
              </Button>
              {user ? (
                <>
                  <span className="small text-muted d-none d-lg-inline text-truncate" style={{ maxWidth: 140 }}>
                    {user.email}
                  </span>
                  <Button size="sm" variant="outline-danger" onClick={() => void signOut()}>
                    <i className="bi bi-box-arrow-right" />
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn btn-sm btn-outline-primary">
                    <i className="bi bi-box-arrow-in-right me-1" />Login
                  </Link>
                  <Link to="/register" className="btn btn-sm btn-primary">
                    <i className="bi bi-person-plus me-1" />Register
                  </Link>
                </>
              )}
            </div>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <main className="flex-grow-1 py-4">
        <Container className="page-enter">
          <Outlet />
        </Container>
      </main>
      <footer className="rs-footer text-center text-muted">
        <Container>
          <div className="d-flex flex-wrap justify-content-center gap-3 mb-2">
            <Link to="/guide">Guide</Link>
            <Link to="/faq">FAQ</Link>
            <Link to="/support">Support</Link>
            <Link to="/terms">Terms</Link>
            <a href={TG} target="_blank" rel="noreferrer">
              <i className="bi bi-telegram" /> Telegram
            </a>
          </div>
          <div className="d-flex justify-content-center align-items-center gap-2">
            <Logo size={20} showText={false} />
            <span>© {new Date().getFullYear()} Referral Shopping</span>
          </div>
        </Container>
      </footer>
    </>
  )
}

import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Container, Nav, Navbar, Button } from 'react-bootstrap'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import Logo from './Logo'

const TG = 'https://t.me/referralshopping'

export default function Layout() {
  const { user, profile, signOut } = useAuth()
  const { theme, toggle } = useTheme()
  const [scrolled, setScrolled] = useState(false)
  const loc = useLocation()
  const isAdminArea = loc.pathname.startsWith('/admin')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Separate admin chrome
  if (isAdminArea && profile?.role === 'admin') {
    return (
      <>
        <Navbar expand="lg" className={`rs-navbar border-bottom admin-nav ${scrolled ? 'scrolled' : ''}`}>
          <Container fluid className="px-3 px-lg-4">
            <Navbar.Brand as={Link} to="/admin" className="d-flex align-items-center gap-2">
              <Logo size={28} showText={false} />
              <span className="fw-bold text-white">RS Admin</span>
            </Navbar.Brand>
            <Navbar.Toggle aria-controls="admin-nav" className="border-secondary" />
            <Navbar.Collapse id="admin-nav">
              <Nav className="me-auto">
                <Nav.Link as={NavLink} to="/admin" end className="text-white-50">CMS</Nav.Link>
                <Nav.Link as={NavLink} to="/admin/support" className="text-white-50">Support</Nav.Link>
                <Nav.Link as={NavLink} to="/admin/payments" className="text-white-50">Payments</Nav.Link>
              </Nav>
              <div className="d-flex align-items-center gap-2">
                <Button size="sm" variant="outline-light" onClick={toggle}>
                  <i className={`bi ${theme === 'dark' ? 'bi-sun-fill' : 'bi-moon-stars-fill'}`} />
                </Button>
                <Link to="/" className="btn btn-sm btn-outline-light">View site</Link>
                <Button size="sm" variant="danger" onClick={() => void signOut()}>Logout</Button>
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
      <Navbar expand="lg" className={`rs-navbar border-bottom ${scrolled ? 'scrolled' : ''}`}>
        <Container>
          <Navbar.Brand as={Link} to="/" className="d-flex align-items-center">
            <Logo size={30} />
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="nav" />
          <Navbar.Collapse id="nav">
            <Nav className="me-auto">
              <Nav.Link as={NavLink} to="/guide">How it works</Nav.Link>
              <Nav.Link as={NavLink} to="/faq">FAQ</Nav.Link>
              <Nav.Link as={NavLink} to="/support">Support</Nav.Link>
              {user && profile?.role !== 'admin' && (
                <>
                  <Nav.Link as={NavLink} to="/dashboard">Dashboard</Nav.Link>
                  <Nav.Link as={NavLink} to="/promote">Promote</Nav.Link>
                  <Nav.Link as={NavLink} to="/earn">Earn</Nav.Link>
                  <Nav.Link as={NavLink} to="/wallet">Wallet</Nav.Link>
                  <Nav.Link as={NavLink} to="/invite">Invite</Nav.Link>
                  <Nav.Link as={NavLink} to="/security">2FA</Nav.Link>
                </>
              )}
              {profile?.role === 'admin' && (
                <Nav.Link as={NavLink} to="/admin">Admin CMS</Nav.Link>
              )}
            </Nav>
            <div className="d-flex align-items-center gap-2 py-2 py-lg-0 flex-wrap">
              <a href={TG} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-info" title="Telegram">
                <i className="bi bi-telegram" /> <span className="d-none d-sm-inline">Channel</span>
              </a>
              <Button size="sm" variant="outline-secondary" onClick={toggle} aria-label="Toggle theme">
                <i className={`bi ${theme === 'dark' ? 'bi-sun-fill' : 'bi-moon-stars-fill'}`} />
              </Button>
              {user ? (
                <>
                  <span className="small text-muted d-none d-md-inline text-truncate" style={{ maxWidth: 140 }}>
                    {user.email}
                  </span>
                  <Button size="sm" variant="outline-danger" onClick={() => void signOut()}>Logout</Button>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn btn-sm btn-outline-primary">Login</Link>
                  <Link to="/register" className="btn btn-sm btn-primary">Register</Link>
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
            <Link to="/guide">How it works</Link>
            <Link to="/faq">FAQ</Link>
            <Link to="/support">Support</Link>
            <Link to="/terms">Terms</Link>
            <a href={TG} target="_blank" rel="noreferrer"><i className="bi bi-telegram" /> Telegram</a>
          </div>
          <div className="d-flex justify-content-center align-items-center gap-2">
            <Logo size={22} showText={false} />
            <span>© {new Date().getFullYear()} Referral Shopping</span>
          </div>
        </Container>
      </footer>
    </>
  )
}

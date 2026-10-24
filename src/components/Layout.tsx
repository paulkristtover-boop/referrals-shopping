import { Link, NavLink, Outlet } from 'react-router-dom'
import { Container, Nav, Navbar, Button } from 'react-bootstrap'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

export default function Layout() {
  const { user, profile, signOut } = useAuth()
  const { theme, toggle } = useTheme()

  return (
    <>
      <Navbar expand="lg" className="border-bottom bg-body">
        <Container>
          <Navbar.Brand as={Link} to="/" className="fw-bold">
            Referral Shopping
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="nav" />
          <Navbar.Collapse id="nav">
            <Nav className="me-auto">
              <Nav.Link as={NavLink} to="/guide">Guide</Nav.Link>
              {user && (
                <>
                  <Nav.Link as={NavLink} to="/dashboard">Dashboard</Nav.Link>
                  <Nav.Link as={NavLink} to="/promote">Promote</Nav.Link>
                  <Nav.Link as={NavLink} to="/earn">Earn</Nav.Link>
                  <Nav.Link as={NavLink} to="/wallet">Wallet</Nav.Link>
                  {profile?.role === 'admin' && (
                    <Nav.Link as={NavLink} to="/admin">Admin</Nav.Link>
                  )}
                </>
              )}
            </Nav>
            <div className="d-flex align-items-center gap-2">
              <Button size="sm" variant="outline-secondary" onClick={toggle}>
                <i className={`bi ${theme === 'dark' ? 'bi-sun' : 'bi-moon-stars'}`} />
              </Button>
              {user ? (
                <>
                  <span className="small text-muted d-none d-md-inline">{user.email}</span>
                  <Button size="sm" variant="outline-danger" onClick={() => void signOut()}>
                    Logout
                  </Button>
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
        <Container>
          <Outlet />
        </Container>
      </main>
      <footer className="border-top py-3 text-center text-muted small">
        © {new Date().getFullYear()} Referral Shopping · <Link to="/terms">Terms</Link> · <Link to="/guide">Guide</Link>
      </footer>
    </>
  )
}

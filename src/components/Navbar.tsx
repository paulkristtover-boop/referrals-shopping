'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Navbar as BSNavbar, Nav, Container, Button, NavDropdown } from 'react-bootstrap'
import { useTheme } from '@/contexts/ThemeContext'
import { createClient } from '@/lib/supabase/client'

export default function Navbar() {
  const { theme, toggleTheme } = useTheme()
  const pathname = usePathname()
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setEmail(user.email ?? null)
        supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
          .then(({ data }) => {
            if (data?.role === 'admin') setIsAdmin(true)
          })
      } else {
        setEmail(null)
        setIsAdmin(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setEmail(session.user.email ?? null)
      } else {
        setEmail(null)
        setIsAdmin(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/')

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <BSNavbar expand="lg" className="bg-body-tertiary sticky-top shadow-sm" data-bs-theme={theme}>
      <Container>
        <BSNavbar.Brand as={Link} href="/" className="fw-bold">
          <i className="bi bi-shop me-2"></i>
          Referrals Shopping
        </BSNavbar.Brand>
        <BSNavbar.Toggle aria-controls="main-nav" />
        <BSNavbar.Collapse id="main-nav">
          <Nav className="me-auto">
            {email && (
              <>
                <Nav.Link as={Link} href="/dashboard" active={isActive('/dashboard')}>
                  Dashboard
                </Nav.Link>
                <Nav.Link as={Link} href="/promote" active={isActive('/promote')}>
                  Promote
                </Nav.Link>
                <Nav.Link as={Link} href="/earn" active={isActive('/earn')}>
                  Earn
                </Nav.Link>
                <Nav.Link as={Link} href="/wallet" active={isActive('/wallet')}>
                  Wallet
                </Nav.Link>
              </>
            )}
          </Nav>
          <Nav className="align-items-center gap-2">
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={toggleTheme}
              title="Toggle theme"
              aria-label="Toggle light/dark theme"
            >
              {theme === 'light' ? (
                <i className="bi bi-moon-stars-fill"></i>
              ) : (
                <i className="bi bi-sun-fill"></i>
              )}
            </Button>
            {email ? (
              <NavDropdown title={email.split('@')[0]} id="account-dropdown" align="end">
                <NavDropdown.Item as={Link} href="/dashboard">
                  My Dashboard
                </NavDropdown.Item>
                <NavDropdown.Item as={Link} href="/wallet">
                  Wallet & Withdraw
                </NavDropdown.Item>
                {isAdmin && (
                  <>
                    <NavDropdown.Divider />
                    <NavDropdown.Item as={Link} href="/admin">
                      Admin Panel
                    </NavDropdown.Item>
                  </>
                )}
                <NavDropdown.Divider />
                <NavDropdown.Item onClick={handleLogout}>Logout</NavDropdown.Item>
              </NavDropdown>
            ) : (
              <>
                <Nav.Link as={Link} href="/login">Login</Nav.Link>
                <Button as={Link as any} href="/register" variant="primary" size="sm">
                  Register
                </Button>
              </>
            )}
          </Nav>
        </BSNavbar.Collapse>
      </Container>
    </BSNavbar>
  )
}

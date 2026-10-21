'use client'

import { Container } from 'react-bootstrap'

export default function Footer() {
  return (
    <footer className="footer py-4 mt-auto">
      <Container className="text-center text-muted small">
        <p className="mb-1">
          &copy; {new Date().getFullYear()} Referrals Shopping. All rights reserved.
        </p>
        <p className="mb-0">
          Real people. Real clicks. Real results.
        </p>
      </Container>
    </footer>
  )
}

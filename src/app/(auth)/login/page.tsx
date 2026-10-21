'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Container, Card, Form, Button, Alert, Spinner } from 'react-bootstrap'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/dashboard'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.push(redirect)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container className="py-5" style={{ maxWidth: 440 }}>
      <Card className="shadow-sm border-0">
        <Card.Body className="p-4">
          <h2 className="text-center mb-4">Sign in</h2>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </Form.Group>
            <Button type="submit" variant="primary" className="w-100" disabled={loading}>
              {loading ? <Spinner size="sm" /> : 'Sign in'}
            </Button>
          </Form>
          <p className="text-center mt-3 mb-0 small">
            Don&apos;t have an account? <Link href="/register">Register</Link>
          </p>
        </Card.Body>
      </Card>
    </Container>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<Container className="text-center py-5"><Spinner animation="border" /></Container>}>
      <LoginForm />
    </Suspense>
  )
}

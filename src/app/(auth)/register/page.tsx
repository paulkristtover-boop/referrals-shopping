'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Container, Card, Form, Button, Alert, Spinner } from 'react-bootstrap'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!agreeTerms) {
      setError('You must agree to the Terms and Conditions')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      })
      if (error) throw error

      // Mark terms accepted
      if (data.user) {
        await supabase
          .from('profiles')
          .update({ terms_accepted_at: new Date().toISOString() })
          .eq('id', data.user.id)
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container className="py-5" style={{ maxWidth: 440 }}>
      <Card className="shadow-sm border-0">
        <Card.Body className="p-4">
          <h2 className="text-center mb-4">Create account</h2>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Full name</Form.Label>
              <Form.Control
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="John Doe"
              />
            </Form.Group>
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
                minLength={6}
                placeholder="Min 6 characters"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                id="agree-terms"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                label={
                  <span>
                    I agree to the <Link href="/terms">Terms and Conditions</Link> and Cookies policy
                  </span>
                }
              />
            </Form.Group>
            <Button type="submit" variant="primary" className="w-100" disabled={loading || !agreeTerms}>
              {loading ? <Spinner size="sm" /> : 'Agree to the Terms & Register'}
            </Button>
          </Form>
          <p className="text-center mt-3 mb-0 small">
            Already have an account? <Link href="/login">Sign in</Link>
          </p>
        </Card.Body>
      </Card>
    </Container>
  )
}

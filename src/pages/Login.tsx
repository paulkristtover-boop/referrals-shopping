import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, Form, Button, Alert } from 'react-bootstrap'
import { supabase, supabaseConfigured } from '../lib/supabase'

export default function Login() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabaseConfigured) {
      setError('Supabase is not configured on Vercel.')
      return
    }
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) {
      const msg = err.message.toLowerCase().includes('confirm')
        ? 'Email not confirmed. Disable “Confirm email” in Supabase Auth settings, or confirm via email first.'
        : err.message
      setError(msg)
      return
    }
    nav('/dashboard')
  }

  return (
    <div className="row justify-content-center">
      <div className="col-md-5">
        <Card className="rs-card rs-card-static border-0">
          <Card.Body className="p-4">
            <h2 className="text-center mb-1 fw-bold">Sign in</h2>
            <p className="text-center text-muted small mb-4">Welcome back</p>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form onSubmit={onSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Password</Form.Label>
                <Form.Control type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </Form.Group>
              <Button type="submit" className="w-100" disabled={loading}>
                {loading ? 'Signing in…' : 'Login'}
              </Button>
            </Form>
            <p className="text-center mt-3 mb-0 small">
              No account? <Link to="/register">Register</Link>
            </p>
          </Card.Body>
        </Card>
      </div>
    </div>
  )
}

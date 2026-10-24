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
      setError('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY on Vercel.')
      return
    }
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) setError(err.message)
    else nav('/dashboard')
  }

  return (
    <div className="row justify-content-center">
      <div className="col-md-5">
        <Card className="shadow-sm border-0">
          <Card.Body className="p-4">
            <h2 className="text-center mb-4">Sign in</h2>
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

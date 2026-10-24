import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, Form, Button, Alert } from 'react-bootstrap'
import { supabase, supabaseConfigured } from '../lib/supabase'

export default function Register() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [terms, setTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!terms) {
      setError('Accept the terms to continue.')
      return
    }
    if (!supabaseConfigured) {
      setError('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY on Vercel, then redeploy.')
      return
    }
    setLoading(true)
    setError(null)
    // Email confirmation should be OFF in Supabase Auth settings so users sign in immediately
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    })
    if (err) {
      setLoading(false)
      setError(err.message)
      return
    }
    // If session exists, email confirm is disabled — go to dashboard
    if (data.session) {
      if (data.user) {
        await supabase
          .from('profiles')
          .update({ terms_accepted_at: new Date().toISOString(), full_name: fullName || null })
          .eq('id', data.user.id)
      }
      setLoading(false)
      nav('/dashboard')
      return
    }
    // Fallback: try immediate login (works when confirm email is off or auto-confirm)
    const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (loginErr) {
      setError(
        'Account created, but sign-in needs email confirmation. In Supabase: Authentication → Providers → Email → turn OFF “Confirm email”, then try Login.'
      )
      return
    }
    nav('/dashboard')
  }

  return (
    <div className="row justify-content-center">
      <div className="col-md-5">
        <Card className="rs-card rs-card-static shadow-sm border-0">
          <Card.Body className="p-4">
            <h2 className="text-center mb-1 fw-bold">Create account</h2>
            <p className="text-center text-muted small mb-4">Join to promote links or earn from tasks</p>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form onSubmit={onSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Full name</Form.Label>
                <Form.Control value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@email.com" />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Password</Form.Label>
                <Form.Control type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="Min 6 characters" />
              </Form.Group>
              <Form.Check
                className="mb-3"
                type="checkbox"
                label={<>I agree to the <Link to="/terms">terms</Link></>}
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
                required
              />
              <Button type="submit" className="w-100" disabled={loading}>
                {loading ? 'Creating…' : 'Register'}
              </Button>
            </Form>
            <p className="text-center mt-3 mb-0 small">
              Already have an account? <Link to="/login">Login</Link>
            </p>
          </Card.Body>
        </Card>
      </div>
    </div>
  )
}

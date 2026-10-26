import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, Form, Button, Alert } from 'react-bootstrap'
import { supabase, supabaseConfigured } from '../lib/supabase'

/**
 * Password login + optional TOTP 2FA.
 * Email confirmation is NOT used — disable it in Supabase Auth settings.
 */
export default function Login() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [factorId, setFactorId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'password' | 'mfa'>('password')

  const goAfterAuth = async () => {
    const { data: prof } = await supabase.from('profiles').select('role').maybeSingle()
    if (prof?.role === 'admin') nav('/admin', { replace: true })
    else nav('/dashboard', { replace: true })
  }

  const needsMfa = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      if (error) return false
      return data.currentLevel === 'aal1' && data.nextLevel === 'aal2'
    } catch {
      return false
    }
  }

  const onPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabaseConfigured) {
      setError('Supabase is not configured on Vercel.')
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      setLoading(false)
      const low = err.message.toLowerCase()
      if (low.includes('confirm') || low.includes('email not confirmed')) {
        setError(
          'Email confirmation is still enabled on the project. In Supabase: Authentication → Providers → Email → turn OFF “Confirm email”, then try again. We use 2FA instead of email verify.'
        )
      } else {
        setError(err.message)
      }
      return
    }

    // 2FA required?
    if (await needsMfa()) {
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const totp = factors?.totp?.find((f) => f.status === 'verified') || factors?.totp?.[0]
      if (totp) {
        setFactorId(totp.id)
        setStep('mfa')
        setLoading(false)
        return
      }
    }

    setLoading(false)
    if (data.session) await goAfterAuth()
    else setError('Login incomplete. Try again or set up 2FA from Account → Security after a successful session.')
  }

  const onMfa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!factorId) return
    setLoading(true)
    setError(null)
    const challenge = await supabase.auth.mfa.challenge({ factorId })
    if (challenge.error) {
      setLoading(false)
      setError(challenge.error.message)
      return
    }
    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.data.id,
      code: otp.trim(),
    })
    setLoading(false)
    if (vErr) {
      setError(vErr.message || 'Invalid authenticator code')
      return
    }
    await goAfterAuth()
  }

  return (
    <div className="row justify-content-center">
      <div className="col-md-5">
        <Card className="rs-card rs-card-static border-0">
          <Card.Body className="p-4">
            <h2 className="text-center mb-1 fw-bold">{step === 'password' ? 'Sign in' : 'Two-factor code'}</h2>
            <p className="text-center text-muted small mb-4">
              {step === 'password'
                ? 'No email confirmation — use password, then 2FA if enabled'
                : 'Enter the 6-digit code from your authenticator app'}
            </p>
            {error && <Alert variant="danger">{error}</Alert>}

            {step === 'password' ? (
              <Form onSubmit={onPassword}>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </Form.Group>
                <Button type="submit" className="w-100" disabled={loading}>
                  {loading ? 'Signing in…' : 'Continue'}
                </Button>
              </Form>
            ) : (
              <Form onSubmit={onMfa}>
                <Form.Group className="mb-3">
                  <Form.Label>Authenticator code</Form.Label>
                  <Form.Control
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    placeholder="000000"
                    required
                    autoFocus
                    autoComplete="one-time-code"
                  />
                </Form.Group>
                <Button type="submit" className="w-100" disabled={loading || otp.length !== 6}>
                  {loading ? 'Verifying…' : 'Verify & sign in'}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="w-100 mt-2"
                  onClick={() => {
                    setStep('password')
                    setOtp('')
                    setFactorId(null)
                    void supabase.auth.signOut()
                  }}
                >
                  Back
                </Button>
              </Form>
            )}

            <p className="text-center mt-3 mb-0 small">
              No account? <Link to="/register">Register</Link>
              {' · '}
              <Link to="/security">Set up 2FA</Link>
            </p>
          </Card.Body>
        </Card>
      </div>
    </div>
  )
}

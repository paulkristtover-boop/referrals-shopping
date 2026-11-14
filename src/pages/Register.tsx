import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Card, Form, Button, Alert } from 'react-bootstrap'
import { supabase, supabaseConfigured } from '../lib/supabase'

/**
 * Minimal register — email + password (+ optional name).
 * Intent from ?intent=promote|earn routes first session guide.
 * No email confirmation.
 */
export default function Register() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const intent = params.get('intent') === 'earn' ? 'earn' : params.get('intent') === 'promote' ? 'promote' : null
  const refCode = (params.get('ref') || '').toUpperCase()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [invite, setInvite] = useState(refCode)
  const [showInvite, setShowInvite] = useState(!!refCode)
  const [terms, setTerms] = useState(false)
  const [ageOk, setAgeOk] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const finishProfile = async (userId: string, referredBy: string | null) => {
    await supabase
      .from('profiles')
      .update({
        terms_accepted_at: new Date().toISOString(),
        full_name: fullName.trim() || null,
        referred_by: referredBy,
        email,
      })
      .eq('id', userId)
  }

  const afterAuth = () => {
    try {
      localStorage.setItem('rs_first_session', '1')
      if (intent) localStorage.setItem('rs_intent', intent)
    } catch {
      /* ignore */
    }
    nav('/dashboard', { replace: true })
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!terms) {
      setError('Please accept the Terms and Privacy Policy.')
      return
    }
    if (!ageOk) {
      setError('You must confirm you are 18 or older.')
      return
    }
    if (!supabaseConfigured) {
      setError('Supabase is not configured.')
      return
    }
    setLoading(true)
    setError(null)

    let referredBy: string | null = null
    if (invite.trim()) {
      const code = invite.trim()
      const { data: rid } = await supabase.rpc('resolve_invite_code', { p_code: code })
      if (rid) referredBy = rid as string
      else {
        // fallback before SQL migration
        const { data: inv } = await supabase
          .from('profiles')
          .select('id')
          .ilike('invite_code', code)
          .maybeSingle()
        if (inv) referredBy = inv.id
      }
    }

    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })

    if (err) {
      setLoading(false)
      setError(err.message)
      return
    }

    if (data.session && data.user) {
      await finishProfile(data.user.id, referredBy)
      setLoading(false)
      afterAuth()
      return
    }

    const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({ email, password })
    if (loginErr) {
      setLoading(false)
      setError(
        'Could not sign in after register. Turn OFF “Confirm email” in Supabase Authentication → Email (we use 2FA, not email verify).'
      )
      return
    }
    if (loginData.user) await finishProfile(loginData.user.id, referredBy)
    setLoading(false)
    afterAuth()
  }

  return (
    <div className="row justify-content-center">
      <div className="col-12 col-sm-10 col-md-6 col-lg-5">
        <Card className="rs-card rs-card-static border-0">
          <Card.Body className="p-4">
            <h2 className="text-center mb-1 fw-bold">Create account</h2>
            <p className="text-center text-muted small mb-3">
              {intent === 'earn'
                ? 'You’re signing up to earn from tasks'
                : intent === 'promote'
                  ? 'You’re signing up to promote a link'
                  : 'Free · instant · no email confirmation'}
            </p>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form onSubmit={onSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@email.com"
                  autoFocus
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
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>
                  Name <span className="text-muted fw-normal">(optional)</span>
                </Form.Label>
                <Form.Control value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
              </Form.Group>
              {!showInvite ? (
                <button type="button" className="btn btn-link btn-sm px-0 mb-3" onClick={() => setShowInvite(true)}>
                  Have an invite code?
                </button>
              ) : (
                <Form.Group className="mb-3">
                  <Form.Label>Invite code</Form.Label>
                  <Form.Control
                    value={invite}
                    onChange={(e) => setInvite(e.target.value.toUpperCase())}
                    placeholder="Optional"
                  />
                </Form.Group>
              )}
              <Form.Check
                className="mb-3"
                type="checkbox"
                label={
                  <>
                    I agree to the <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link>
                  </>
                }
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
                required
              />
              <Form.Check
                className="mb-2"
                type="checkbox"
                id="age-ok"
                label="I confirm I am 18 years of age or older"
                checked={ageOk}
                onChange={(e) => setAgeOk(e.target.checked)}
              />
              <Button type="submit" className="w-100 btn-lg" disabled={loading}>
                {loading ? 'Creating…' : 'Create account'}
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

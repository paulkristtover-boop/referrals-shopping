import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap'
import { supabase, supabaseConfigured } from '../lib/supabase'

/**
 * Authenticator 2FA (TOTP) — used instead of email confirmation.
 * Supabase: Authentication → Providers → Email → Confirm email OFF
 * Optional: Authentication → Multi-Factor → enable enrollment
 */
export default function Security() {
  const [params] = useSearchParams()
  const setupMode = params.get('setup') === '1'
  const [factorId, setFactorId] = useState<string | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [factors, setFactors] = useState<{ id: string; status: string; friendly_name?: string }[]>([])
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    if (!supabaseConfigured) {
      setLoading(false)
      return
    }
    const { data, error } = await supabase.auth.mfa.listFactors()
    if (error) setErr(error.message)
    else setFactors([...(data?.totp || [])].map((f) => ({ id: f.id, status: f.status, friendly_name: f.friendly_name })))
    setLoading(false)
  }

  useEffect(() => {
    void refresh()
  }, [])

  const enroll = async () => {
    setErr(null)
    setMsg(null)
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Authenticator' })
    if (error) {
      setErr(
        error.message +
          ' — In Supabase enable MFA under Authentication → Multi-Factor (or Factors) if enrollment is blocked.'
      )
      return
    }
    setFactorId(data.id)
    setQr(data.totp.qr_code)
    setSecret(data.totp.secret)
  }

  const verify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!factorId) return
    setErr(null)
    const challenge = await supabase.auth.mfa.challenge({ factorId })
    if (challenge.error) {
      setErr(challenge.error.message)
      return
    }
    const { error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.data.id,
      code: code.trim(),
    })
    if (error) setErr(error.message)
    else {
      setMsg('2FA enabled. Next login will ask for this app code.')
      setQr(null)
      setSecret(null)
      setCode('')
      setFactorId(null)
      void refresh()
    }
  }

  const unenroll = async (id: string) => {
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id })
    if (error) setErr(error.message)
    else {
      setMsg('2FA factor removed.')
      void refresh()
    }
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner />
      </div>
    )
  }

  const verified = factors.filter((f) => f.status === 'verified')

  return (
    <div className="page-enter">
      <h1 className="fw-bold mb-2">Security · 2FA</h1>
      <p className="text-muted mb-3">
        We do <strong>not</strong> use email confirmation. Protect your account with an authenticator app (Google
        Authenticator, Authy, etc.).
      </p>

      {setupMode && (
        <Alert variant="info">
          Account created. You can enable 2FA now, or{' '}
          <Link to="/dashboard">skip and go to dashboard</Link>.
        </Alert>
      )}

      {err && <Alert variant="danger">{err}</Alert>}
      {msg && <Alert variant="success">{msg}</Alert>}

      <Card className="rs-card rs-card-static mb-4">
        <Card.Body>
          <h5 className="fw-bold">Status</h5>
          {verified.length > 0 ? (
            <Alert variant="success" className="mb-3">
              Two-factor authentication is <strong>ON</strong>. Login will require a code from your app.
            </Alert>
          ) : (
            <Alert variant="warning" className="mb-3">
              Two-factor authentication is <strong>OFF</strong>. Recommended after register.
            </Alert>
          )}
          <ul className="mb-3">
            {factors.map((f) => (
              <li key={f.id} className="d-flex justify-content-between align-items-center gap-2 flex-wrap mb-2">
                <span>
                  {f.friendly_name || 'TOTP'} — {f.status}
                </span>
                <Button size="sm" variant="outline-danger" onClick={() => void unenroll(f.id)}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
          {!qr && verified.length === 0 && (
            <Button onClick={() => void enroll()}>
              <i className="bi bi-shield-plus me-1" />
              Set up authenticator
            </Button>
          )}
          {!qr && verified.length > 0 && (
            <Button variant="outline-primary" onClick={() => void enroll()}>
              Add another factor
            </Button>
          )}
        </Card.Body>
      </Card>

      {qr && (
        <Card className="rs-card rs-card-static mb-3">
          <Card.Body>
            <h5 className="fw-bold">Scan QR code</h5>
            <p className="small text-muted">Open your authenticator app and scan this code.</p>
            {qr.startsWith('data:') && (
              <img src={qr} alt="QR" style={{ maxWidth: 200 }} className="mb-3 border rounded bg-white p-2" />
            )}
            {qr.startsWith('<') && <div className="mb-3" dangerouslySetInnerHTML={{ __html: qr }} />}
            {secret && (
              <p className="small">
                Manual secret: <code className="user-select-all">{secret}</code>
              </p>
            )}
            <Form onSubmit={verify}>
              <Form.Group className="mb-3">
                <Form.Label>Enter 6-digit code</Form.Label>
                <Form.Control
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  pattern="[0-9]{6}"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </Form.Group>
              <Button type="submit" disabled={code.length !== 6}>
                Verify & enable 2FA
              </Button>
            </Form>
          </Card.Body>
        </Card>
      )}

      {setupMode && (
        <div className="d-flex gap-2 flex-wrap">
          <Link to="/dashboard" className="btn btn-outline-secondary">
            Skip for now
          </Link>
          <Link to="/account" className="btn btn-outline-primary">
            Account settings
          </Link>
        </div>
      )}
    </div>
  )
}

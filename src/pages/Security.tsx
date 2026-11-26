import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap'
import { supabase, supabaseConfigured } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import PageHeader from '../components/PageHeader'
import { BRAND } from '../lib/brand'

type AppSession = {
  id: string
  device_label: string | null
  user_agent: string | null
  last_seen_at: string
  created_at: string
  is_current: boolean | null
  revoked_at: string | null
}

/**
 * Sessions + Authenticator 2FA (TOTP)
 */
export default function Security() {
  const [params] = useSearchParams()
  const setupMode = params.get('setup') === '1'
  const { session, signOut, signOutEverywhere, signOutOthers, touchSession } = useAuth()

  const [factorId, setFactorId] = useState<string | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [factors, setFactors] = useState<{ id: string; status: string; friendly_name?: string }[]>([])
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState<AppSession[]>([])
  const [sessMsg, setSessMsg] = useState<string | null>(null)
  const [sessErr, setSessErr] = useState<string | null>(null)

  const loadSessions = async () => {
    if (!supabaseConfigured) return
    const { data, error } = await supabase
      .from('app_sessions')
      .select('*')
      .is('revoked_at', null)
      .order('last_seen_at', { ascending: false })
      .limit(30)
    if (error) setSessErr(error.message + ' — run supabase/sessions.sql')
    else {
      setSessErr(null)
      setSessions((data as AppSession[]) || [])
    }
  }

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
    void loadSessions()
    void touchSession()
  }, [])

  const enroll = async () => {
    setErr(null)
    setMsg(null)
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Authenticator' })
    if (error) {
      setErr(
        error.message +
          ' — In Supabase enable MFA under Authentication → Multi-Factor if enrollment is blocked.'
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
      setMsg('Factor removed')
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
      <PageHeader
        title="Security"
        lead="Authenticator 2FA, device sessions, and how we keep account takeover harder."
      />

      <Alert variant="warning" className="mb-3">
        <div className="fw-semibold mb-1">
          <i className="bi bi-exclamation-triangle me-1" />
          Watch for phishing
        </div>
        <p className="small mb-2">
          When emails and names leak from other services, attackers send fake “reset password” or “verify account”
          messages. <strong>{BRAND}</strong> will never ask for your password, 2FA codes, recovery phrases, or
          bank details by email, WhatsApp, or Telegram.
        </p>
        <ul className="small mb-0 ps-3">
          <li>Enable authenticator 2FA below (stronger than email alone).</li>
          <li>Sign out unknown devices in Sessions.</li>
          <li>Only log in and pay on this official site.</li>
        </ul>
      </Alert>

      {err && (
        <Alert variant="danger" dismissible onClose={() => setErr(null)}>
          {err}
        </Alert>
      )}
      {msg && (
        <Alert variant="success" dismissible onClose={() => setMsg(null)}>
          {msg}
        </Alert>
      )}

      <Card className="rs-card rs-card-static mb-4">
        <Card.Body>
          <h5 className="fw-bold">Sessions</h5>
          <p className="small text-muted">Devices signed in to your account. Revoke anything you do not recognise.</p>
          {sessErr && <Alert variant="warning" className="py-2 small">{sessErr}</Alert>}
          {sessMsg && <Alert variant="success" className="py-2 small">{sessMsg}</Alert>}
          {session && (
            <p className="small mb-2">
              Current access expires:{' '}
              <strong>{session.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : '—'}</strong>
            </p>
          )}
          <ul className="list-unstyled mb-3">
            {sessions.length === 0 && (
              <li className="text-muted small">No tracked sessions yet (run supabase/sessions.sql after deploy).</li>
            )}
            {sessions.map((s) => (
              <li key={s.id} className="d-flex justify-content-between align-items-start gap-2 border-bottom py-2">
                <div>
                  <div className="fw-semibold">
                    <i
                      className={`bi ${/Mobile|iPhone|Android/i.test(s.user_agent || '') ? 'bi-phone' : 'bi-laptop'} me-1`}
                    />
                    {s.device_label || 'Device'}
                    {s.is_current ? <span className="badge bg-success ms-2">This device</span> : null}
                  </div>
                  <div className="small text-muted">Last active {new Date(s.last_seen_at).toLocaleString()}</div>
                </div>
                {!s.is_current && (
                  <Button
                    size="sm"
                    variant="outline-danger"
                    onClick={async () => {
                      const { error } = await supabase.rpc('revoke_app_session', { p_session_id: s.id })
                      if (error) setSessErr(error.message)
                      else {
                        setSessMsg('Session revoked')
                        void loadSessions()
                      }
                    }}
                  >
                    Revoke
                  </Button>
                )}
              </li>
            ))}
          </ul>
          <div className="d-flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline-warning"
              onClick={async () => {
                await signOutOthers()
                setSessMsg('Signed out other sessions')
                void loadSessions()
              }}
            >
              Sign out other devices
            </Button>
            <Button size="sm" variant="outline-secondary" onClick={() => void signOut()}>
              Sign out this device
            </Button>
            <Button
              size="sm"
              variant="outline-danger"
              onClick={async () => {
                if (!confirm('Sign out on every device?')) return
                await signOutEverywhere()
              }}
            >
              Sign out everywhere
            </Button>
          </div>
        </Card.Body>
      </Card>

      <h5 className="fw-bold mb-2">Two-factor authentication</h5>
      <p className="text-muted small mb-3">
        Use an authenticator app instead of email confirmation. Enable MFA in Supabase if enrollment fails.
      </p>

      {setupMode && (
        <Alert variant="info">Finish setup for stronger account protection, or skip for now.</Alert>
      )}

      <Card className="rs-card rs-card-static mb-3">
        <Card.Body>
          {verified.length > 0 ? (
            <Alert variant="success" className="mb-3">
              2FA is active ({verified.length} factor{verified.length > 1 ? 's' : ''}).
            </Alert>
          ) : (
            <Alert variant="warning" className="mb-3">
              2FA is not enabled yet.
            </Alert>
          )}
          <ul className="list-unstyled">
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

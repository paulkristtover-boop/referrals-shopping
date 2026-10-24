import { useEffect, useState } from 'react'
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap'
import { supabase, supabaseConfigured } from '../lib/supabase'

/**
 * 2FA via Supabase Auth MFA (TOTP authenticator apps).
 * Enable MFA in Supabase Dashboard → Authentication → Multi-Factor if required.
 */
export default function Security() {
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
      setErr(error.message + ' — Enable MFA under Supabase Authentication settings if needed.')
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
      code,
    })
    if (error) setErr(error.message)
    else {
      setMsg('2FA enabled successfully.')
      setQr(null)
      setCode('')
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

  if (loading) return <div className="text-center py-5"><Spinner /></div>

  return (
    <div className="page-enter">
      <h1 className="fw-bold mb-2">Security · 2FA</h1>
      <p className="text-muted mb-4">
        Protect your account with an authenticator app (Google Authenticator, Authy, etc.).
      </p>
      {err && <Alert variant="danger">{err}</Alert>}
      {msg && <Alert variant="success">{msg}</Alert>}

      <Card className="rs-card rs-card-static mb-4">
        <Card.Body>
          <h5 className="fw-bold">Status</h5>
          {factors.filter((f) => f.status === 'verified').length > 0 ? (
            <Alert variant="success" className="mb-3">Two-factor authentication is ON.</Alert>
          ) : (
            <Alert variant="warning" className="mb-3">Two-factor authentication is OFF.</Alert>
          )}
          <ul className="mb-3">
            {factors.map((f) => (
              <li key={f.id} className="d-flex justify-content-between align-items-center gap-2 flex-wrap mb-2">
                <span>{f.friendly_name || 'TOTP'} — {f.status}</span>
                <Button size="sm" variant="outline-danger" onClick={() => void unenroll(f.id)}>Remove</Button>
              </li>
            ))}
          </ul>
          {!qr && (
            <Button onClick={() => void enroll()}>Set up authenticator</Button>
          )}
        </Card.Body>
      </Card>

      {qr && (
        <Card className="rs-card rs-card-static">
          <Card.Body>
            <h5 className="fw-bold">Scan QR code</h5>
            <div className="mb-3" dangerouslySetInnerHTML={{ __html: qr.startsWith('<') ? qr : '' }} />
            {!qr.startsWith('<') && (
              <p className="small">Secret: <code>{secret}</code></p>
            )}
            {qr.startsWith('data:') && <img src={qr} alt="QR" style={{ maxWidth: 200 }} className="mb-3" />}
            <Form onSubmit={verify}>
              <Form.Group className="mb-3">
                <Form.Label>Enter 6-digit code</Form.Label>
                <Form.Control value={code} onChange={(e) => setCode(e.target.value)} required pattern="[0-9]{6}" />
              </Form.Group>
              <Button type="submit">Verify & enable</Button>
            </Form>
          </Card.Body>
        </Card>
      )}
    </div>
  )
}

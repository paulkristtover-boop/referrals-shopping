import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Form, ListGroup, Spinner } from 'react-bootstrap'
import { useAuth } from '../contexts/AuthContext'
import { supabase, supabaseConfigured } from '../lib/supabase'

export default function Account() {
  const { user, profile, refreshProfile, signOut } = useAuth()
  const nav = useNavigate()
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [pw, setPw] = useState({ next: '', confirm: '' })
  const [pwLoading, setPwLoading] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    setFullName(profile?.full_name || '')
  }, [profile?.full_name])

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !supabaseConfigured) return
    setSaving(true)
    setErr(null)
    setMsg(null)
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim() || null })
      .eq('id', user.id)
    setSaving(false)
    if (error) setErr(error.message)
    else {
      setMsg('Profile saved.')
      await refreshProfile()
    }
  }

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    if (pw.next.length < 6) {
      setErr('Password must be at least 6 characters.')
      return
    }
    if (pw.next !== pw.confirm) {
      setErr('Passwords do not match.')
      return
    }
    setPwLoading(true)
    const { error } = await supabase.auth.updateUser({ password: pw.next })
    setPwLoading(false)
    if (error) setErr(error.message)
    else {
      setMsg('Password updated.')
      setPw({ next: '', confirm: '' })
    }
  }

  const logout = async () => {
    setLoggingOut(true)
    await signOut()
    nav('/login', { replace: true })
  }

  if (!user) {
    return (
      <Alert variant="info">
        Please <Link to="/login">login</Link> to manage your account.
      </Alert>
    )
  }

  return (
    <div className="page-enter">
      <h1 className="fw-bold mb-1">Account</h1>
      <p className="text-muted mb-4">Settings, security, and logout</p>

      {err && <Alert variant="danger" onClose={() => setErr(null)} dismissible>{err}</Alert>}
      {msg && <Alert variant="success" onClose={() => setMsg(null)} dismissible>{msg}</Alert>}

      <Card className="rs-card rs-card-static mb-3">
        <Card.Body>
          <div className="d-flex align-items-center gap-3 mb-3">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
              style={{ width: 56, height: 56, background: 'var(--rs-primary)', fontSize: '1.25rem' }}
            >
              {(fullName || user.email || '?').slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="fw-semibold text-truncate">{fullName || 'No name set'}</div>
              <div className="small text-muted text-truncate">{user.email}</div>
              <div className="small">
                <span className="badge text-bg-secondary">{profile?.role || 'user'}</span>
                {profile?.invite_code && (
                  <span className="ms-2 text-muted">Invite: {profile.invite_code}</span>
                )}
              </div>
            </div>
          </div>

          <Form onSubmit={saveProfile}>
            <Form.Group className="mb-3">
              <Form.Label>Full name</Form.Label>
              <Form.Control value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control value={user.email || ''} disabled readOnly />
            </Form.Group>
            <Button type="submit" disabled={saving}>
              {saving ? <><Spinner size="sm" className="me-1" />Saving…</> : 'Save profile'}
            </Button>
          </Form>
        </Card.Body>
      </Card>

      <Card className="rs-card rs-card-static mb-3">
        <Card.Header className="fw-semibold bg-transparent">
          <i className="bi bi-key me-2" />Change password
        </Card.Header>
        <Card.Body>
          <Form onSubmit={changePassword}>
            <Form.Group className="mb-2">
              <Form.Label>New password</Form.Label>
              <Form.Control
                type="password"
                value={pw.next}
                onChange={(e) => setPw({ ...pw, next: e.target.value })}
                minLength={6}
                required
                autoComplete="new-password"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Confirm password</Form.Label>
              <Form.Control
                type="password"
                value={pw.confirm}
                onChange={(e) => setPw({ ...pw, confirm: e.target.value })}
                minLength={6}
                required
                autoComplete="new-password"
              />
            </Form.Group>
            <Button type="submit" variant="outline-primary" disabled={pwLoading}>
              {pwLoading ? 'Updating…' : 'Update password'}
            </Button>
          </Form>
        </Card.Body>
      </Card>

      <Card className="rs-card rs-card-static mb-3">
        <Card.Header className="fw-semibold bg-transparent">Shortcuts</Card.Header>
        <ListGroup variant="flush">
          <ListGroup.Item action as={Link} to="/security" className="d-flex justify-content-between align-items-center">
            <span><i className="bi bi-shield-check me-2 text-primary" />Two-factor authentication</span>
            <i className="bi bi-chevron-right text-muted" />
          </ListGroup.Item>
          <ListGroup.Item action as={Link} to="/notifications" className="d-flex justify-content-between align-items-center">
            <span><i className="bi bi-bell me-2 text-primary" />Notifications</span>
            <i className="bi bi-chevron-right text-muted" />
          </ListGroup.Item>
          {profile?.role !== 'admin' && (
            <>
              <ListGroup.Item action as={Link} to="/invite" className="d-flex justify-content-between align-items-center">
                <span><i className="bi bi-people me-2 text-primary" />Invite friends</span>
                <i className="bi bi-chevron-right text-muted" />
              </ListGroup.Item>
              <ListGroup.Item action as={Link} to="/wallet" className="d-flex justify-content-between align-items-center">
                <span><i className="bi bi-wallet2 me-2 text-primary" />Wallet</span>
                <i className="bi bi-chevron-right text-muted" />
              </ListGroup.Item>
              <ListGroup.Item action as={Link} to="/support" className="d-flex justify-content-between align-items-center">
                <span><i className="bi bi-headset me-2 text-primary" />Support</span>
                <i className="bi bi-chevron-right text-muted" />
              </ListGroup.Item>
            </>
          )}
          {profile?.role === 'admin' && (
            <ListGroup.Item action as={Link} to="/admin" className="d-flex justify-content-between align-items-center">
              <span><i className="bi bi-shield-lock me-2 text-primary" />Admin CMS</span>
              <i className="bi bi-chevron-right text-muted" />
            </ListGroup.Item>
          )}
        </ListGroup>
      </Card>

      <Card className="rs-card rs-card-static border-danger mb-4">
        <Card.Body>
          <h5 className="fw-bold text-danger mb-2">
            <i className="bi bi-box-arrow-right me-2" />Logout
          </h5>
          <p className="text-muted small mb-3">Sign out of Referral Shopping on this device.</p>
          <Button variant="danger" className="w-100 w-md-auto" disabled={loggingOut} onClick={() => void logout()}>
            {loggingOut ? (
              <><Spinner size="sm" className="me-1" />Signing out…</>
            ) : (
              <><i className="bi bi-box-arrow-right me-1" />Logout</>
            )}
          </Button>
        </Card.Body>
      </Card>
    </div>
  )
}

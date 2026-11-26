import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Col, Form, ListGroup, Row, Spinner } from 'react-bootstrap'
import { useAuth } from '../contexts/AuthContext'
import { supabase, supabaseConfigured } from '../lib/supabase'
import { formatMoney } from '../lib/money'
import { NAME_COOLDOWN_MS } from '../lib/pageGuides'
import { BRAND } from '../lib/brand'
import PageHeader from '../components/PageHeader'

const USERNAME_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000

function nameUnlockAt(profile: {
  role?: string
  name_verified?: boolean | null
  name_changed_at?: string | null
  created_at?: string | null
  full_name?: string | null
} | null) {
  if (!profile) return null
  if (profile.role === 'admin' || profile.name_verified) return null
  if (!profile.full_name) return null
  const anchor = new Date(profile.name_changed_at || profile.created_at || 0).getTime()
  if (!anchor) return null
  const until = anchor + NAME_COOLDOWN_MS
  return until > Date.now() ? new Date(until) : null
}

function usernameUnlockAt(profile: {
  role?: string
  username?: string | null
  username_changed_at?: string | null
  created_at?: string | null
} | null) {
  if (!profile) return null
  if (profile.role === 'admin') return null
  if (!profile.username) return null
  const anchor = new Date(profile.username_changed_at || profile.created_at || 0).getTime()
  if (!anchor) return null
  const until = anchor + USERNAME_COOLDOWN_MS
  return until > Date.now() ? new Date(until) : null
}

function sanitizeUsernameInput(raw: string) {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 24)
}

export default function Account() {
  const { user, profile, refreshProfile, signOut } = useAuth()
  const nav = useNavigate()

  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [username, setUsername] = useState(profile?.username || '')
  const [taxId, setTaxId] = useState(profile?.tax_id || '')
  const [billingName, setBillingName] = useState(profile?.billing_name || profile?.full_name || '')
  const [pw, setPw] = useState({ next: '', confirm: '' })

  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingBilling, setSavingBilling] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    setFullName(profile?.full_name || '')
    setUsername(profile?.username || '')
    setTaxId(profile?.tax_id || '')
    setBillingName(profile?.billing_name || profile?.full_name || '')
  }, [
    profile?.id,
    profile?.full_name,
    profile?.username,
    profile?.tax_id,
    profile?.billing_name,
  ])

  const lockedUntil = useMemo(() => nameUnlockAt(profile), [profile])
  const nameLocked = Boolean(lockedUntil)
  const userLockedUntil = useMemo(() => usernameUnlockAt(profile), [profile])
  const usernameLocked = Boolean(userLockedUntil)

  const flash = (ok: string) => {
    setErr(null)
    setMsg(ok)
  }

  const saveIdentity = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !supabaseConfigured) return
    setSavingProfile(true)
    setErr(null)
    setMsg(null)

    const nextName = fullName.trim()
    const nextUser = sanitizeUsernameInput(username)

    try {
      // Username first (public handle)
      if (nextUser && nextUser !== (profile?.username || '')) {
        if (usernameLocked) {
          throw new Error(
            `Username locked until ${userLockedUntil!.toLocaleDateString()}.`,
          )
        }
        const { error } = await supabase.rpc('update_username', { p_username: nextUser })
        if (error) {
          if (/function|schema cache/i.test(error.message)) {
            throw new Error('Run supabase/username.sql in the SQL Editor, then try again.')
          }
          throw new Error(error.message)
        }
      }

      // Display name
      if (nextName && nextName !== (profile?.full_name || '')) {
        if (nameLocked) {
          throw new Error(
            `Display name locked until ${lockedUntil!.toLocaleDateString()}. An admin can verify you for one early change.`,
          )
        }
        if (nextName.length < 2) throw new Error('Display name must be at least 2 characters.')
        const { error } = await supabase.rpc('update_display_name', { p_name: nextName })
        if (error) {
          if (/function|schema cache/i.test(error.message)) {
            throw new Error('Run supabase/name_lock.sql, then try again.')
          }
          throw new Error(error.message)
        }
      }

      if (!nextUser && !profile?.username) {
        throw new Error('Choose a username (3–24 characters: letters, numbers, _).')
      }

      await refreshProfile()
      flash('Profile saved.')
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Could not save profile')
    } finally {
      setSavingProfile(false)
    }
  }

  const saveBilling = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !supabaseConfigured) return
    setSavingBilling(true)
    setErr(null)
    setMsg(null)
    const { error } = await supabase
      .from('profiles')
      .update({
        tax_id: taxId.trim() || null,
        billing_name: billingName.trim() || null,
      })
      .eq('id', user.id)
    setSavingBilling(false)
    if (error) setErr(error.message)
    else {
      flash('Billing details saved.')
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
      flash('Password updated.')
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

  const handle = profile?.username ? `@${profile.username}` : null
  const initial = (profile?.full_name || profile?.username || user.email || '?').slice(0, 1).toUpperCase()

  return (
    <div className="page-enter account-page fx-account">
      <PageHeader
        title="Account"
        lead="Identity · wallet · security — your control center."
        actions={
          <Button size="sm" variant="outline-primary" className="fx-btn-ghost" onClick={() => window.dispatchEvent(new Event('rs-replay-guide'))}>
            <i className="bi bi-question-circle me-1" />
            Guide
          </Button>
        }
      />

      {err && (
        <Alert variant="danger" onClose={() => setErr(null)} dismissible>
          {err}
        </Alert>
      )}
      {msg && (
        <Alert variant="success" onClose={() => setMsg(null)} dismissible>
          {msg}
        </Alert>
      )}

      {/* Hero */}
      <div className="account-hero fx-panel fx-glow mb-3">
        <div className="account-avatar fx-avatar" aria-hidden>
          {initial}
        </div>
        <div className="min-w-0 flex-grow-1">
          <div className="fw-bold text-truncate fs-5">
            {profile?.full_name || 'Set your display name'}
          </div>
          <div className="d-flex flex-wrap gap-2 align-items-center small">
            {handle ? (
              <span className="account-handle">{handle}</span>
            ) : (
              <span className="text-warning">No username yet</span>
            )}
            <span className="text-muted text-truncate">{user.email}</span>
          </div>
          <div className="small mt-1 d-flex flex-wrap gap-2 align-items-center">
            <span className="badge text-bg-secondary text-uppercase">{profile?.role || 'user'}</span>
            <code className="account-id-chip">{profile?.account_id || '…'}</code>
            <span className="text-muted">Wallet {formatMoney(profile?.balance || 0)}</span>
            {profile?.name_verified && <span className="badge text-bg-success">Name verified</span>}
          </div>
        </div>
        <div className="d-flex flex-column gap-1">
          <Button
            size="sm"
            variant="outline-secondary"
            disabled={!profile?.account_id}
            onClick={() =>
              void navigator.clipboard.writeText(profile?.account_id || '').then(() => flash('Account ID copied'))
            }
          >
            Copy ID
          </Button>
          {handle && (
            <Button
              size="sm"
              variant="outline-secondary"
              onClick={() => void navigator.clipboard.writeText(handle).then(() => flash('Username copied'))}
            >
              Copy @
            </Button>
          )}
        </div>
      </div>

      {/* Wallet merged into Account */}
      <Card className="rs-card rs-card-static fx-panel fx-wallet mb-3">
        <Card.Body className="py-3">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div>
              <div className="text-muted small text-uppercase" style={{ letterSpacing: '0.04em' }}>
                Wallet balance
              </div>
              <div className="fs-3 fw-bold text-success lh-1">{formatMoney(profile?.balance || 0)}</div>
              <div className="small text-muted mt-1">Withdraw to Nigerian bank or crypto from here.</div>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <Button as={Link} to="/wallet" variant="primary" size="sm">
                <i className="bi bi-wallet2 me-1" />
                Open wallet
              </Button>
              <Button as={Link} to="/wallet" variant="outline-primary" size="sm">
                Withdraw
              </Button>
            </div>
          </div>
        </Card.Body>
      </Card>

      <Row className="g-3 mb-3">
        {/* Identity */}
        <Col lg={6}>
          <Card className="rs-card rs-card-static fx-panel h-100">
            <Card.Body>
              <h2 className="h5 fw-bold mb-1">
                <i className="bi bi-person-badge me-2 text-primary" />
                Profile
              </h2>
              <p className="small text-muted mb-3">
                <strong>Username</strong> is your public handle (proofs, invites).{' '}
                <strong>Display name</strong> is how we greet you.
              </p>
              <Form onSubmit={(e) => void saveIdentity(e)}>
                <Form.Group className="mb-3">
                  <Form.Label>Username</Form.Label>
                  <div className="input-group">
                    <span className="input-group-text">@</span>
                    <Form.Control
                      value={username}
                      onChange={(e) => setUsername(sanitizeUsernameInput(e.target.value))}
                      placeholder="your_handle"
                      disabled={usernameLocked}
                      minLength={3}
                      maxLength={24}
                      autoComplete="username"
                    />
                  </div>
                  <Form.Text muted>
                    {usernameLocked
                      ? `Locked until ${userLockedUntil!.toLocaleDateString()}.`
                      : profile?.username
                        ? '3–24 chars: a–z, 0–9, _. Change allowed every 30 days.'
                        : 'Pick a unique handle. First set is free.'}
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Display name</Form.Label>
                  <Form.Control
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your name"
                    disabled={nameLocked}
                    minLength={2}
                    maxLength={80}
                  />
                  <Form.Text muted>
                    {profile?.role === 'admin'
                      ? 'Admins can change any time.'
                      : profile?.name_verified
                        ? 'Verified — one free change, then 14-day lock.'
                        : nameLocked
                          ? `Locked until ${lockedUntil!.toLocaleDateString()}.`
                          : 'After save, next change waits 14 days.'}
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control value={user.email || ''} disabled readOnly />
                </Form.Group>

                <Button type="submit" disabled={savingProfile}>
                  {savingProfile ? (
                    <>
                      <Spinner size="sm" className="me-1" />
                      Saving…
                    </>
                  ) : (
                    'Save profile'
                  )}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        {/* Security */}
        <Col lg={6}>
          <Card className="rs-card rs-card-static fx-panel h-100 mb-3">
            <Card.Body>
              <h2 className="h5 fw-bold mb-1">
                <i className="bi bi-shield-lock me-2 text-primary" />
                Security
              </h2>
              <p className="small text-muted mb-3">Password and device sessions. Enable 2FA — we never ask for codes by email.</p>
              <Form onSubmit={(e) => void changePassword(e)} className="mb-3">
                <Form.Group className="mb-2">
                  <Form.Label>New password</Form.Label>
                  <Form.Control
                    type="password"
                    value={pw.next}
                    onChange={(e) => setPw((s) => ({ ...s, next: e.target.value }))}
                    minLength={6}
                    autoComplete="new-password"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Confirm password</Form.Label>
                  <Form.Control
                    type="password"
                    value={pw.confirm}
                    onChange={(e) => setPw((s) => ({ ...s, confirm: e.target.value }))}
                    minLength={6}
                    autoComplete="new-password"
                  />
                </Form.Group>
                <Button type="submit" variant="outline-primary" disabled={pwLoading}>
                  {pwLoading ? (
                    <>
                      <Spinner size="sm" className="me-1" />
                      Updating…
                    </>
                  ) : (
                    'Update password'
                  )}
                </Button>
              </Form>
              <Link to="/security" className="btn btn-sm btn-outline-secondary">
                <i className="bi bi-phone me-1" />
                Sessions & 2FA
              </Link>
            </Card.Body>
          </Card>

          <Card className="rs-card rs-card-static">
            <Card.Body>
              <h2 className="h5 fw-bold mb-1">
                <i className="bi bi-receipt me-2 text-primary" />
                Billing / tax
              </h2>
              <p className="small text-muted mb-3">Optional. Printed on tax invoices only — not public.</p>
              <Form onSubmit={(e) => void saveBilling(e)}>
                <Form.Group className="mb-2">
                  <Form.Label>Billing name</Form.Label>
                  <Form.Control
                    value={billingName}
                    onChange={(e) => setBillingName(e.target.value)}
                    placeholder="Name on invoice"
                    maxLength={120}
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Tax ID / TIN</Form.Label>
                  <Form.Control
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="Optional"
                    maxLength={64}
                  />
                </Form.Group>
                <Button type="submit" variant="outline-primary" disabled={savingBilling}>
                  {savingBilling ? (
                    <>
                      <Spinner size="sm" className="me-1" />
                      Saving…
                    </>
                  ) : (
                    'Save billing'
                  )}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Shortcuts */}
      <Card className="rs-card rs-card-static fx-panel mb-3">
        <Card.Header className="fw-semibold bg-transparent">Shortcuts</Card.Header>
        <ListGroup variant="flush">
          {profile?.role !== 'admin' && (
            <>
              <ListGroup.Item action as={Link} to="/proofs" className="d-flex justify-content-between align-items-center">
                <span>
                  <i className="bi bi-check2-square me-2 text-primary" />
                  Confirm proofs
                </span>
                <i className="bi bi-chevron-right text-muted" />
              </ListGroup.Item>
              <ListGroup.Item action as={Link} to="/receipts" className="d-flex justify-content-between align-items-center">
                <span>
                  <i className="bi bi-receipt me-2 text-primary" />
                  Receipts
                </span>
                <i className="bi bi-chevron-right text-muted" />
              </ListGroup.Item>
              <ListGroup.Item action as={Link} to="/history" className="d-flex justify-content-between align-items-center">
                <span>
                  <i className="bi bi-clock-history me-2 text-primary" />
                  Activity history
                </span>
                <i className="bi bi-chevron-right text-muted" />
              </ListGroup.Item>
              <ListGroup.Item action as={Link} to="/invite" className="d-flex justify-content-between align-items-center">
                <span>
                  <i className="bi bi-people me-2 text-primary" />
                  Invite friends
                </span>
                <i className="bi bi-chevron-right text-muted" />
              </ListGroup.Item>
              <ListGroup.Item action as={Link} to="/wallet" className="d-flex justify-content-between align-items-center">
                <span>
                  <i className="bi bi-wallet2 me-2 text-primary" />
                  Wallet · {formatMoney(profile?.balance || 0)}
                </span>
                <i className="bi bi-chevron-right text-muted" />
              </ListGroup.Item>
              <ListGroup.Item action as={Link} to="/support" className="d-flex justify-content-between align-items-center">
                <span>
                  <i className="bi bi-headset me-2 text-primary" />
                  Support
                </span>
                <i className="bi bi-chevron-right text-muted" />
              </ListGroup.Item>
            </>
          )}
          {profile?.role === 'admin' && (
            <ListGroup.Item action as={Link} to="/admin" className="d-flex justify-content-between align-items-center">
              <span>
                <i className="bi bi-shield-lock me-2 text-primary" />
                Admin CMS
              </span>
              <i className="bi bi-chevron-right text-muted" />
            </ListGroup.Item>
          )}
          <ListGroup.Item action as={Link} to="/guide" className="d-flex justify-content-between align-items-center">
            <span>
              <i className="bi bi-book me-2 text-primary" />
              How the site works
            </span>
            <i className="bi bi-chevron-right text-muted" />
          </ListGroup.Item>
          <ListGroup.Item action as={Link} to="/security" className="d-flex justify-content-between align-items-center">
            <span>
              <i className="bi bi-shield-check me-2 text-primary" />
              Two-factor & sessions
            </span>
            <i className="bi bi-chevron-right text-muted" />
          </ListGroup.Item>
        </ListGroup>
      </Card>

      <Card className="rs-card rs-card-static fx-panel fx-danger mb-4">
        <Card.Body>
          <h2 className="h5 fw-bold text-danger mb-2">
            <i className="bi bi-box-arrow-right me-2" />
            Logout
          </h2>
          <p className="text-muted small mb-3">Sign out of {BRAND} on this device only.</p>
          <Button variant="danger" disabled={loggingOut} onClick={() => void logout()}>
            {loggingOut ? (
              <>
                <Spinner size="sm" className="me-1" />
                Signing out…
              </>
            ) : (
              <>
                <i className="bi bi-box-arrow-right me-1" />
                Logout
              </>
            )}
          </Button>
        </Card.Body>
      </Card>
    </div>
  )
}

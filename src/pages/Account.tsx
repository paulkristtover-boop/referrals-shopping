import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Form, ListGroup, Spinner } from 'react-bootstrap'
import { useAuth } from '../contexts/AuthContext'
import { supabase, supabaseConfigured } from '../lib/supabase'
import { formatMoney } from '../lib/money'
import { NAME_COOLDOWN_MS } from '../lib/pageGuides'

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

export default function Account() {
  const { user, profile, refreshProfile, signOut } = useAuth()
  const nav = useNavigate()
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [taxId, setTaxId] = useState('')
  const [billingName, setBillingName] = useState('')
  const [saving, setSaving] = useState(false)
  const [pw, setPw] = useState({ next: '', confirm: '' })
  const [pwLoading, setPwLoading] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    setFullName(profile?.full_name || '')
    setTaxId(profile?.tax_id || '')
    setBillingName(profile?.billing_name || profile?.full_name || '')
  }, [profile?.id, profile?.full_name, profile?.tax_id, profile?.billing_name])

  const lockedUntil = useMemo(() => nameUnlockAt(profile), [profile])
  const nameLocked = Boolean(lockedUntil)

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !supabaseConfigured) return
    if (nameLocked && fullName.trim() !== (profile?.full_name || '')) {
      setErr(`Name is locked until ${lockedUntil!.toLocaleDateString()}. An admin can verify you for an earlier change.`)
      return
    }
    setSaving(true)
    setErr(null)
    setMsg(null)
    const { error } = await supabase.rpc('update_display_name', { p_name: fullName.trim() })
    setSaving(false)
    if (error) {
      if (error.message.toLowerCase().includes('function') || error.message.includes('schema cache')) {
        setErr('Run supabase/name_lock.sql, then try again.')
      } else {
        setErr(error.message)
      }
      return
    }
    setMsg('Name saved. The next change is available in 14 days unless an admin verifies you.')
    await refreshProfile()
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

  const initial = (fullName || user.email || '?').slice(0, 1).toUpperCase()

  return (
    <div className="page-enter">
      <h1 className="fw-bold mb-1">Account</h1>
      <p className="text-muted mb-3">Profile, billing, security, and how to use the site.</p>

      {err && <Alert variant="danger" onClose={() => setErr(null)} dismissible>{err}</Alert>}
      {msg && <Alert variant="success" onClose={() => setMsg(null)} dismissible>{msg}</Alert>}

      <div className="account-hero">
        <div className="account-avatar" aria-hidden>{initial}</div>
        <div className="min-w-0">
          <div className="fw-bold text-truncate">{fullName || 'Add your name'}</div>
          <div className="small text-muted text-truncate">{user.email}</div>
          <div className="small mt-1 d-flex flex-wrap gap-2 align-items-center">
            <span className="badge text-bg-secondary">{profile?.role || 'user'}</span>
            <code>{profile?.account_id || '…'}</code>
            {profile?.name_verified && <span className="badge text-bg-success">Name verified — one change</span>}
          </div>
        </div>
      </div>

      <div className="d-flex flex-wrap gap-2 mb-3">
        <Button
          size="sm"
          variant="outline-primary"
          onClick={() => window.dispatchEvent(new Event('rs-replay-guide'))}
        >
          <i className="bi bi-question-circle me-1" />
          Show this page guide
        </Button>
        <Button
          size="sm"
          variant="outline-secondary"
          disabled={!profile?.account_id}
          onClick={() =>
            void navigator.clipboard.writeText(profile?.account_id || '').then(() => setMsg('Account ID copied'))
          }
        >
          Copy Account ID
        </Button>
      </div>

      <Card className="rs-card rs-card-static mb-3">
        <Card.Body>
          <h5 className="fw-bold">Display name</h5>
          <p className="small text-muted">
            {profile?.role === 'admin'
              ? 'Admins can change their name any time.'
              : profile?.name_verified
                ? 'An admin verified you. You can change your name once now. It locks again for 14 days.'
                : nameLocked
                  ? `Locked until ${lockedUntil!.toLocaleDateString()}. Ask support if the name is wrong and needs verification.`
                  : 'You can change your name now. After you save, the next change waits 14 days.'}
          </p>
          <Form onSubmit={saveProfile}>
            <Form.Group className="mb-3">
              <Form.Label>Full name</Form.Label>
              <Form.Control
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                disabled={nameLocked}
                minLength={2}
                maxLength={80}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control value={user.email || ''} disabled readOnly />
            </Form.Group>
            <Button type="submit" disabled={saving || nameLocked}>
              {saving ? <><Spinner size="sm" className="me-1" />Saving…</> : 'Save name'}
            </Button>
          </Form>
        </Card.Body>
      </Card>

      <Card className="rs-card rs-card-static mb-3">
        <Card.Body>
          <h5 className="fw-bold">Billing / tax</h5>
          <p className="small text-muted">Optional. Shown on tax invoices. This is not your display name.</p>
          <Form
            onSubmit={async (e) => {
              e.preventDefault()
              setErr(null)
              const { error } = await supabase
                .from('profiles')
                .update({ tax_id: taxId.trim() || null, billing_name: billingName.trim() || null })
                .eq('id', user.id)
              if (error) setErr(error.message + ' — run tax_compliance.sql')
              else {
                setMsg('Billing details saved')
                void refreshProfile()
              }
            }}
          >
            <Form.Group className="mb-2">
              <Form.Label>Billing name</Form.Label>
              <Form.Control value={billingName} onChange={(e) => setBillingName(e.target.value)} placeholder="Name on invoice" />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Tax ID</Form.Label>
              <Form.Control value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="Optional VAT/TIN" />
            </Form.Group>
            <Button type="submit" size="sm" variant="outline-primary">Save billing</Button>
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
          <ListGroup.Item action as={Link} to="/guide" className="d-flex justify-content-between align-items-center">
            <span><i className="bi bi-book me-2 text-primary" />How the site works</span>
            <i className="bi bi-chevron-right text-muted" />
          </ListGroup.Item>
          {profile?.role !== 'admin' && (
            <>
              <ListGroup.Item action as={Link} to="/receipts" className="d-flex justify-content-between align-items-center">
                <span><i className="bi bi-receipt me-2 text-primary" />Receipts</span>
                <i className="bi bi-chevron-right text-muted" />
              </ListGroup.Item>
              <ListGroup.Item action as={Link} to="/proofs" className="d-flex justify-content-between align-items-center">
                <span><i className="bi bi-check2-square me-2 text-primary" />Confirm proofs</span>
                <i className="bi bi-chevron-right text-muted" />
              </ListGroup.Item>
              <ListGroup.Item action as={Link} to="/history" className="d-flex justify-content-between align-items-center">
                <span><i className="bi bi-clock-history me-2 text-primary" />Activity history</span>
                <i className="bi bi-chevron-right text-muted" />
              </ListGroup.Item>
              <ListGroup.Item action as={Link} to="/invite" className="d-flex justify-content-between align-items-center">
                <span><i className="bi bi-people me-2 text-primary" />Invite friends</span>
                <i className="bi bi-chevron-right text-muted" />
              </ListGroup.Item>
              <ListGroup.Item action as={Link} to="/wallet" className="d-flex justify-content-between align-items-center">
                <span><i className="bi bi-wallet2 me-2 text-primary" />Wallet · {formatMoney(profile?.balance || 0)}</span>
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
          <p className="text-muted small mb-3">Sign out of Referrals Shopping on this device.</p>
          <Button variant="danger" disabled={loggingOut} onClick={() => void logout()}>
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

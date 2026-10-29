import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Card, Form, InputGroup, Table, Spinner } from 'react-bootstrap'
import { useAuth } from '../contexts/AuthContext'
import { supabase, supabaseConfigured } from '../lib/supabase'
import { BRAND } from '../lib/brand'

type Invitee = {
  id: string
  email_masked: string
  full_name: string | null
  created_at: string
}

function newInviteCode() {
  // Short unique invite code (not the account id)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()
  }
  return Math.random().toString(36).slice(2, 12).toUpperCase()
}

export default function Invite() {
  const { user, profile, refreshProfile } = useAuth()
  const [code, setCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [count, setCount] = useState(0)
  const [invitees, setInvitees] = useState<Invitee[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  const loadCounts = useCallback(async () => {
    if (!user || !supabaseConfigured) {
      setLoading(false)
      return
    }
    setErr(null)
    try {
      const { data: n, error: cErr } = await supabase.rpc('count_my_invites')
      if (cErr) {
        // Fallback if SQL not run yet
        const { count: c, error } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('referred_by', user.id)
        if (error) setErr(error.message + ' — run supabase/invites_admin.sql')
        setCount(c || 0)
      } else {
        setCount(typeof n === 'number' ? n : Number(n) || 0)
      }

      const { data: list } = await supabase.rpc('list_my_invites')
      if (Array.isArray(list)) setInvitees(list as Invitee[])
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    void refreshProfile()
  }, [])

  useEffect(() => {
    void loadCounts()
  }, [loadCounts])

  useEffect(() => {
    if (profile?.invite_code) {
      setCode(profile.invite_code)
      return
    }
    if (!user || !supabaseConfigured) return
    void (async () => {
      const gen = newInviteCode()
      const { error } = await supabase
        .from('profiles')
        .update({ invite_code: gen })
        .eq('id', user.id)
        .is('invite_code', null)
      if (!error) {
        setCode(gen)
        await refreshProfile()
      }
    })()
  }, [profile?.invite_code, user?.id])

  const inviteCode = code || profile?.invite_code || ''
  const link = `${window.location.origin}/register?ref=${inviteCode}`

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="page-enter">
      <h1 className="fw-bold mb-2">Invite friends</h1>
      <p className="text-muted mb-4">
        Share your {BRAND} invite link. Friends who register with your code are counted as your invites. Your Account ID (for support) is separate — see Account.
      </p>
      {err && <Alert variant="warning">{err}</Alert>}
      {copied && <Alert variant="success">Copied.</Alert>}

      <Card className="rs-card rs-card-static mb-3">
        <Card.Body>
          <div className="text-muted small">Your invite code</div>
          <div className="pay-code mb-3 user-select-all" style={{ fontSize: '0.95rem', wordBreak: 'break-all' }}>
            {inviteCode || '…'}
          </div>
          <Form.Label>Invite link</Form.Label>
          <InputGroup className="mb-3">
            <Form.Control readOnly value={inviteCode ? link : 'Generating…'} className="small" />
            <Button variant="outline-secondary" disabled={!inviteCode} onClick={() => void copy(inviteCode)}>
              Copy code
            </Button>
            <Button variant="primary" disabled={!inviteCode} onClick={() => void copy(link)}>
              Copy link
            </Button>
          </InputGroup>
          <div className="d-flex align-items-center gap-2">
            <span className="small text-muted">People invited:</span>
            {loading ? <Spinner size="sm" /> : <strong className="fs-5">{count}</strong>}
            <Button size="sm" variant="link" className="px-1" onClick={() => void loadCounts()}>
              Refresh
            </Button>
          </div>
        </Card.Body>
      </Card>

      <h5 className="fw-bold">Recent invitees</h5>
      {invitees.length === 0 ? (
        <div className="empty-state">No one has used your code yet.</div>
      ) : (
        <Card className="rs-card rs-card-static">
          <Table size="sm" responsive className="mb-0">
            <thead>
              <tr>
                <th>User</th>
                <th>Name</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {invitees.map((i) => (
                <tr key={i.id}>
                  <td className="small font-monospace">{i.email_masked}</td>
                  <td className="small">{i.full_name || '—'}</td>
                  <td className="small">{new Date(i.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  )
}

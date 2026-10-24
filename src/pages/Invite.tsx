import { useEffect, useState } from 'react'
import { Alert, Button, Card, Form, InputGroup } from 'react-bootstrap'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function Invite() {
  const { user, profile, refreshProfile } = useAuth()
  const [code, setCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [count, setCount] = useState(0)

  useEffect(() => {
    void refreshProfile()
  }, [])

  useEffect(() => {
    if (profile?.invite_code) setCode(profile.invite_code)
    else if (user) {
      // ensure code
      void (async () => {
        const gen = Math.random().toString(36).slice(2, 10).toUpperCase()
        await supabase.from('profiles').update({ invite_code: gen }).eq('id', user.id).is('invite_code', null)
        await refreshProfile()
      })()
    }
  }, [profile?.invite_code, user?.id])

  useEffect(() => {
    if (!user) return
    void supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('referred_by', user.id)
      .then(({ count: c }) => setCount(c || 0))
  }, [user?.id])

  const link = `${window.location.origin}/register?ref=${code || profile?.invite_code || ''}`

  const copy = async () => {
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="page-enter">
      <h1 className="fw-bold mb-2">Invite friends</h1>
      <p className="text-muted mb-4">
        Share your personal link. When someone registers with it, they are tied to your account as an invite.
      </p>
      <Card className="rs-card rs-card-static mb-3">
        <Card.Body>
          <div className="text-muted small">Your invite code</div>
          <div className="pay-code mb-3">{profile?.invite_code || code || '…'}</div>
          <Form.Label>Invite link</Form.Label>
          <InputGroup className="mb-3">
            <Form.Control readOnly value={link} />
            <Button variant="primary" onClick={() => void copy()}>{copied ? 'Copied!' : 'Copy'}</Button>
          </InputGroup>
          <p className="mb-0 small text-muted">People invited: <strong>{count}</strong></p>
        </Card.Body>
      </Card>
      {copied && <Alert variant="success">Link copied.</Alert>}
    </div>
  )
}

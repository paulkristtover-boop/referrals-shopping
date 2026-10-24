import { useEffect, useState } from 'react'
import { Alert, Button, Card, Form, Badge, Spinner } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase, supabaseConfigured } from '../lib/supabase'

type Ticket = {
  id: string
  subject: string
  message: string
  status: string
  admin_reply: string | null
  created_at: string
}

export default function Support() {
  const { user } = useAuth()
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    if (!user || !supabaseConfigured) return
    const { data } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setTickets((data as Ticket[]) || [])
  }

  useEffect(() => {
    void load()
  }, [user?.id])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setLoading(true)
    setErr(null)
    const { error } = await supabase.from('support_tickets').insert({
      user_id: user.id,
      subject,
      message,
      status: 'open',
    })
    setLoading(false)
    if (error) setErr(error.message)
    else {
      setMsg('Ticket submitted. We will reply here.')
      setSubject('')
      setMessage('')
      void load()
    }
  }

  if (!user) {
    return (
      <Alert variant="info">
        Please <Link to="/login">login</Link> to contact customer service, or join{' '}
        <a href="https://t.me/referralshopping" target="_blank" rel="noreferrer">Telegram</a>.
      </Alert>
    )
  }

  return (
    <div className="page-enter">
      <h1 className="fw-bold mb-2">Customer service</h1>
      <p className="text-muted mb-4">
        Open a ticket for payment issues, refund reviews, or account help. For news, use{' '}
        <a href="https://t.me/referralshopping" target="_blank" rel="noreferrer">t.me/referralshopping</a>.
      </p>
      {err && <Alert variant="danger">{err}</Alert>}
      {msg && <Alert variant="success">{msg}</Alert>}

      <Card className="rs-card rs-card-static mb-4">
        <Card.Body>
          <h5 className="fw-bold">New ticket</h5>
          <Form onSubmit={submit}>
            <Form.Group className="mb-3">
              <Form.Label>Subject</Form.Label>
              <Form.Control value={subject} onChange={(e) => setSubject(e.target.value)} required maxLength={120} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Message</Form.Label>
              <Form.Control as="textarea" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} required />
            </Form.Group>
            <Button type="submit" disabled={loading}>{loading ? 'Sending…' : 'Submit ticket'}</Button>
          </Form>
        </Card.Body>
      </Card>

      <h5 className="fw-bold">Your tickets</h5>
      {tickets.length === 0 ? (
        <div className="empty-state">No tickets yet.</div>
      ) : (
        tickets.map((t) => (
          <Card key={t.id} className="rs-card rs-card-static mb-3">
            <Card.Body>
              <div className="d-flex justify-content-between gap-2 flex-wrap">
                <strong>{t.subject}</strong>
                <Badge bg={t.status === 'open' ? 'warning' : t.status === 'closed' ? 'secondary' : 'info'}>{t.status}</Badge>
              </div>
              <p className="small text-muted mb-1">{new Date(t.created_at).toLocaleString()}</p>
              <p className="mb-2">{t.message}</p>
              {t.admin_reply && (
                <Alert variant="light" className="mb-0 border">
                  <strong>Admin reply:</strong> {t.admin_reply}
                </Alert>
              )}
            </Card.Body>
          </Card>
        ))
      )}
    </div>
  )
}

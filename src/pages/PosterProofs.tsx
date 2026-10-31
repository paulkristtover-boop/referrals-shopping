import { useEffect, useState } from 'react'
import { Alert, Badge, Button, Card, Form, Spinner, Table } from 'react-bootstrap'
import { useAuth } from '../contexts/AuthContext'
import { supabase, supabaseConfigured } from '../lib/supabase'
import { formatMoney } from '../lib/money'
import { BRAND } from '../lib/brand'
import EmptyState from '../components/EmptyState'

type Row = {
  id: string
  status: string
  screenshot_url: string
  created_at: string
  dispute_reason?: string
  tasks?: {
    reward_amount: number
    campaigns?: { title: string; user_id: string }
  }
  profiles?: { email?: string; account_id?: string }
}

export default function PosterProofs() {
  const { user } = useAuth()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [reason, setReason] = useState<Record<string, string>>({})

  const load = async () => {
    if (!user || !supabaseConfigured) {
      setLoading(false)
      return
    }
    // Submissions for campaigns owned by me
    const { data: camps } = await supabase.from('campaigns').select('id').eq('user_id', user.id)
    const ids = (camps || []).map((c: { id: string }) => c.id)
    if (!ids.length) {
      setRows([])
      setLoading(false)
      return
    }
    const { data: tasks } = await supabase.from('tasks').select('id').in('campaign_id', ids)
    const tids = (tasks || []).map((t: { id: string }) => t.id)
    if (!tids.length) {
      setRows([])
      setLoading(false)
      return
    }
    const { data, error } = await supabase
      .from('task_submissions')
      .select('*, tasks(reward_amount, campaigns(title, user_id)), profiles:user_id(email, account_id)')
      .in('task_id', tids)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) setErr(error.message)
    setRows((data as Row[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [user?.id])

  const approve = async (id: string) => {
    setErr(null)
    const { error } = await supabase.rpc('poster_approve_submission', { p_submission_id: id })
    if (error) {
      setErr(error.message + ' — run naira_drafts_poster.sql')
      return
    }
    setMsg('Proof confirmed — earner credited')
    void load()
  }

  const dispute = async (id: string) => {
    setErr(null)
    const { error } = await supabase.rpc('poster_dispute_submission', {
      p_submission_id: id,
      p_reason: reason[id] || 'Needs admin review',
    })
    if (error) {
      setErr(error.message)
      return
    }
    setMsg('Sent to admin dispute queue')
    void load()
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="page-enter">
      <h1 className="fw-bold mb-2">Confirm proofs</h1>
      <p className="text-muted mb-3">
        You posted the referral link on {BRAND}. Confirm genuine screenshots or dispute for admin review.
      </p>
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

      {rows.length === 0 ? (
        <EmptyState>No proofs on your adverts yet.</EmptyState>
      ) : (
        <div className="d-flex flex-column gap-3">
          {rows.map((r) => (
            <Card key={r.id} className="rs-card rs-card-static">
              <Card.Body>
                <div className="d-flex flex-wrap justify-content-between gap-2 mb-2">
                  <div>
                    <div className="fw-semibold">{r.tasks?.campaigns?.title || 'Advert'}</div>
                    <div className="small text-muted">
                      Earner: {r.profiles?.account_id || r.profiles?.email || '—'} · Reward{' '}
                      {formatMoney(r.tasks?.reward_amount || 0)}
                    </div>
                  </div>
                  <Badge bg={r.status === 'disputed' ? 'warning' : r.status === 'approved' ? 'success' : 'secondary'}>
                    {r.status}
                  </Badge>
                </div>
                {r.screenshot_url && (
                  <a href={r.screenshot_url} target="_blank" rel="noreferrer">
                    <img
                      src={r.screenshot_url}
                      alt="Proof"
                      style={{ maxHeight: 160, maxWidth: '100%', borderRadius: 8 }}
                    />
                  </a>
                )}
                {r.dispute_reason && <p className="small text-warning mt-2 mb-0">Dispute: {r.dispute_reason}</p>}
                {(r.status === 'pending' || r.status === 'disputed') && (
                  <div className="mt-3 d-flex flex-wrap gap-2 align-items-end">
                    <Button size="sm" variant="success" onClick={() => void approve(r.id)}>
                      Confirm proof
                    </Button>
                    <Form.Control
                      size="sm"
                      style={{ maxWidth: 220 }}
                      placeholder="Dispute reason"
                      value={reason[r.id] || ''}
                      onChange={(e) => setReason((s) => ({ ...s, [r.id]: e.target.value }))}
                    />
                    <Button size="sm" variant="outline-danger" onClick={() => void dispute(r.id)}>
                      Dispute → admin
                    </Button>
                  </div>
                )}
              </Card.Body>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

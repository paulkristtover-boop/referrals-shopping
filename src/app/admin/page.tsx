'use client'

import { useEffect, useState, useCallback } from 'react'
import { Container, Tabs, Tab, Table, Badge, Button, Card, Spinner, Alert } from 'react-bootstrap'
import { createClient } from '@/lib/supabase/client'
import type { Campaign, TaskSubmission, Withdrawal } from '@/lib/types'

export default function AdminPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([])
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const supabase = createClient()
      const [cRes, sRes, wRes] = await Promise.all([
        supabase
          .from('campaigns')
          .select('*, packages(name, price_usd), profiles(email, full_name)')
          .order('created_at', { ascending: false }),
        supabase
          .from('task_submissions')
          .select('*, tasks(reward_amount, campaigns(title)), profiles(email, full_name)')
          .order('created_at', { ascending: false }),
        supabase
          .from('withdrawals')
          .select('*, profiles(email, full_name)')
          .order('created_at', { ascending: false }),
      ])
      if (cRes.error) throw cRes.error
      if (sRes.error) throw sRes.error
      if (wRes.error) throw wRes.error
      setCampaigns((cRes.data as Campaign[]) || [])
      setSubmissions((sRes.data as TaskSubmission[]) || [])
      setWithdrawals((wRes.data as Withdrawal[]) || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const approveCampaign = async (id: string) => {
    setActionLoading(id)
    setError(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.rpc('admin_approve_campaign', { p_campaign_id: id })
      if (error) throw error
      setMessage('Campaign approved and task created')
      await load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setActionLoading(null)
    }
  }

  const rejectCampaign = async (id: string) => {
    const notes = window.prompt('Rejection reason (optional):') || null
    setActionLoading(id)
    setError(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.rpc('admin_reject_campaign', {
        p_campaign_id: id,
        p_notes: notes,
      })
      if (error) throw error
      setMessage('Campaign rejected')
      await load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setActionLoading(null)
    }
  }

  const approveSubmission = async (id: string) => {
    setActionLoading(id)
    setError(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.rpc('admin_approve_submission', { p_submission_id: id })
      if (error) throw error
      setMessage('Submission approved — user balance credited')
      await load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setActionLoading(null)
    }
  }

  const rejectSubmission = async (id: string) => {
    const notes = window.prompt('Rejection reason (optional):') || null
    setActionLoading(id)
    setError(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.rpc('admin_reject_submission', {
        p_submission_id: id,
        p_notes: notes,
      })
      if (error) throw error
      setMessage('Submission rejected')
      await load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setActionLoading(null)
    }
  }

  const markWithdrawalPaid = async (id: string) => {
    const txHash = window.prompt('TX hash (optional):') || null
    setActionLoading(id)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('withdrawals')
        .update({
          status: 'paid',
          tx_hash: txHash,
          processed_at: new Date().toISOString(),
        })
        .eq('id', id)
      if (error) throw error
      setMessage('Withdrawal marked as paid')
      await load()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" />
      </Container>
    )
  }

  return (
    <Container>
      <h1 className="h3 mb-4">Admin Panel</h1>
      {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
      {message && <Alert variant="success" onClose={() => setMessage(null)} dismissible>{message}</Alert>}

      <Tabs defaultActiveKey="campaigns" className="mb-4">
        <Tab eventKey="campaigns" title={`Campaigns (${campaigns.filter(c => c.status === 'pending_approval' || c.status === 'pending_payment').length} pending)`}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-0">
              <Table responsive hover className="mb-0 align-middle">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>User</th>
                    <th>Package</th>
                    <th>Pay</th>
                    <th>Status</th>
                    <th>Ref</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.length === 0 && (
                    <tr><td colSpan={7} className="text-center text-muted py-4">No campaigns</td></tr>
                  )}
                  {campaigns.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className="fw-semibold">{c.title}</div>
                        <a href={c.referral_link} target="_blank" rel="noreferrer" className="small">
                          Link
                        </a>
                      </td>
                      <td className="small">
                        {(c as Campaign & { profiles?: { email?: string } }).profiles?.email || c.user_id.slice(0, 8)}
                      </td>
                      <td className="small">{(c as Campaign & { packages?: { name?: string; price_usd?: number } }).packages?.name}</td>
                      <td className="small">
                        ${Number(c.paid_amount || (c as Campaign & { packages?: { name?: string; price_usd?: number } }).packages?.price_usd || 0).toFixed(0)}
                        {c.crypto_currency && ` · ${c.crypto_currency}`}
                      </td>
                      <td>
                        <Badge
                          bg={
                            c.status === 'approved' ? 'success'
                              : c.status === 'rejected' ? 'danger'
                              : 'warning'
                          }
                          text={c.status.includes('pending') ? 'dark' : undefined}
                        >
                          {c.status}
                        </Badge>
                      </td>
                      <td className="small font-monospace">{c.deposit_reference || '—'}</td>
                      <td>
                        {(c.status === 'pending_approval' || c.status === 'pending_payment') && (
                          <>
                            <Button
                              size="sm"
                              variant="success"
                              className="me-1 mb-1"
                              disabled={actionLoading === c.id}
                              onClick={() => approveCampaign(c.id)}
                            >
                              {actionLoading === c.id ? <Spinner size="sm" /> : 'Approve'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-danger"
                              className="mb-1"
                              disabled={actionLoading === c.id}
                              onClick={() => rejectCampaign(c.id)}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="submissions" title={`Submissions (${submissions.filter(s => s.status === 'pending').length} pending)`}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-0">
              <Table responsive hover className="mb-0 align-middle">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>User</th>
                    <th>Screenshot</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.length === 0 && (
                    <tr><td colSpan={5} className="text-center text-muted py-4">No submissions</td></tr>
                  )}
                  {submissions.map((s) => (
                    <tr key={s.id}>
                      <td className="small">
                        {(s as TaskSubmission & { tasks?: { reward_amount?: number; campaigns?: { title?: string } } }).tasks?.campaigns?.title || s.task_id.slice(0, 8)}
                        <div className="text-muted">
                          Reward: ${Number((s as TaskSubmission & { tasks?: { reward_amount?: number; campaigns?: { title?: string } } }).tasks?.reward_amount || 0).toFixed(2)}
                        </div>
                      </td>
                      <td className="small">{(s as TaskSubmission & { profiles?: { email?: string } }).profiles?.email || s.user_id.slice(0, 8)}</td>
                      <td>
                        {s.screenshot_url ? (
                          <a href={s.screenshot_url} target="_blank" rel="noreferrer">
                            View
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        <Badge
                          bg={
                            s.status === 'approved' ? 'success'
                              : s.status === 'rejected' ? 'danger'
                              : 'warning'
                          }
                          text={s.status === 'pending' ? 'dark' : undefined}
                        >
                          {s.status}
                        </Badge>
                      </td>
                      <td>
                        {s.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="success"
                              className="me-1 mb-1"
                              disabled={actionLoading === s.id}
                              onClick={() => approveSubmission(s.id)}
                            >
                              {actionLoading === s.id ? <Spinner size="sm" /> : 'Approve'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-danger"
                              className="mb-1"
                              disabled={actionLoading === s.id}
                              onClick={() => rejectSubmission(s.id)}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="withdrawals" title={`Withdrawals (${withdrawals.filter(w => w.status === 'pending').length} pending)`}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-0">
              <Table responsive hover className="mb-0 align-middle">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Amount</th>
                    <th>Currency</th>
                    <th>Address</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.length === 0 && (
                    <tr><td colSpan={6} className="text-center text-muted py-4">No withdrawals</td></tr>
                  )}
                  {withdrawals.map((w) => (
                    <tr key={w.id}>
                      <td className="small">{(w as Withdrawal & { profiles?: { email?: string } }).profiles?.email || w.user_id.slice(0, 8)}</td>
                      <td>${Number(w.amount).toFixed(2)}</td>
                      <td>{w.crypto_currency}</td>
                      <td className="small font-monospace text-break" style={{ maxWidth: 140 }}>
                        {w.address}
                      </td>
                      <td>
                        <Badge
                          bg={
                            w.status === 'paid' ? 'success'
                              : w.status === 'rejected' ? 'danger'
                              : 'warning'
                          }
                          text={w.status === 'pending' ? 'dark' : undefined}
                        >
                          {w.status}
                        </Badge>
                      </td>
                      <td>
                        {w.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="success"
                            disabled={actionLoading === w.id}
                            onClick={() => markWithdrawalPaid(w.id)}
                          >
                            Mark paid
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </Container>
  )
}

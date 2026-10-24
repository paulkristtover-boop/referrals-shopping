import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, Row, Col, Table, Spinner, Alert, Badge } from 'react-bootstrap'
import { useAuth } from '../contexts/AuthContext'
import { supabase, supabaseConfigured } from '../lib/supabase'
import type { Campaign, Submission } from '../lib/types'

export default function Dashboard() {
  const { user, profile, refreshProfile } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [subs, setSubs] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void refreshProfile()
    if (!supabaseConfigured || !user) {
      setLoading(false)
      if (!supabaseConfigured) setError('Configure Supabase env vars on Vercel.')
      return
    }
    ;(async () => {
      try {
        const [c, s] = await Promise.all([
          supabase
            .from('campaigns')
            .select('*, packages(name, price_usd)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10),
          supabase
            .from('task_submissions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10),
        ])
        if (c.error) throw c.error
        if (s.error) throw s.error
        setCampaigns((c.data as Campaign[]) || [])
        setSubs((s.data as Submission[]) || [])
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Failed to load'
        setError(
          message.includes('relation') || message.includes('schema')
            ? 'Database tables missing. Run supabase/schema.sql in the Supabase SQL Editor.'
            : message
        )
      } finally {
        setLoading(false)
      }
    })()
  }, [user?.id])

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
      </div>
    )
  }

  return (
    <div className="page-enter">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <div>
          <h1 className="mb-0 fw-bold">Dashboard</h1>
          <p className="text-muted small mb-0">Welcome{profile?.full_name ? `, ${profile.full_name}` : ''}</p>
        </div>
      </div>

      {error && <Alert variant="warning">{error}</Alert>}

      <Row className="g-3 mb-4">
        <Col md={4}>
          <div className="stat-card">
            <div className="text-muted small">Balance</div>
            <div className="stat-value">${Number(profile?.balance ?? 0).toFixed(2)}</div>
            <Link to="/wallet" className="btn btn-sm btn-outline-primary mt-2">Wallet</Link>
          </div>
        </Col>
        <Col md={4}>
          <Card className="rs-card h-100 text-center p-3">
            <div className="mb-2 text-primary fs-3"><i className="bi bi-megaphone-fill" /></div>
            <h5>Promote</h5>
            <p className="small text-muted">Buy clicks for your link</p>
            <Link to="/promote" className="btn btn-primary">Open Promote</Link>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="rs-card h-100 text-center p-3">
            <div className="mb-2 text-success fs-3"><i className="bi bi-cash-coin" /></div>
            <h5>Earn</h5>
            <p className="small text-muted">Complete tasks & get paid</p>
            <Link to="/earn" className="btn btn-success">Open Earn</Link>
          </Card>
        </Col>
      </Row>

      <h4 className="fw-bold">Your campaigns</h4>
      {campaigns.length === 0 ? (
        <div className="empty-state mb-4">No campaigns yet. <Link to="/promote">Create one</Link></div>
      ) : (
        <Card className="rs-card rs-card-static mb-4">
          <Table size="sm" responsive className="mb-0">
            <thead>
              <tr><th>Title</th><th>Status</th><th>Date</th></tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id}>
                  <td>{c.title}</td>
                  <td><Badge bg="secondary" className="badge-status">{c.status.replace(/_/g, ' ')}</Badge></td>
                  <td className="small">{new Date(c.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      <h4 className="fw-bold">Your submissions</h4>
      {subs.length === 0 ? (
        <div className="empty-state">No submissions yet. <Link to="/earn">Browse tasks</Link></div>
      ) : (
        <Card className="rs-card rs-card-static">
          <Table size="sm" responsive className="mb-0">
            <thead><tr><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.id}>
                  <td><Badge bg={s.status === 'approved' ? 'success' : s.status === 'rejected' ? 'danger' : 'warning'} className="badge-status">{s.status}</Badge></td>
                  <td className="small">{new Date(s.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, Row, Col, Table, Spinner, Alert } from 'react-bootstrap'
import { useAuth } from '../contexts/AuthContext'
import { supabase, supabaseConfigured } from '../lib/supabase'
import type { Campaign, Submission } from '../lib/types'

export default function Dashboard() {
  const { profile, refreshProfile } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [subs, setSubs] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void refreshProfile()
    if (!supabaseConfigured) {
      setLoading(false)
      setError('Configure Supabase env vars on Vercel to load data.')
      return
    }
    ;(async () => {
      try {
        const [c, s] = await Promise.all([
          supabase.from('campaigns').select('*, packages(name, price_usd)').order('created_at', { ascending: false }).limit(10),
          supabase.from('task_submissions').select('*').order('created_at', { ascending: false }).limit(10),
        ])
        if (c.error) throw c.error
        if (s.error) throw s.error
        setCampaigns((c.data as Campaign[]) || [])
        setSubs((s.data as Submission[]) || [])
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) return <div className="text-center py-5"><Spinner /></div>

  return (
    <>
      <h1 className="mb-4">Dashboard</h1>
      {error && <Alert variant="warning">{error}</Alert>}
      <Row className="g-3 mb-4">
        <Col md={4}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="text-muted small">Balance</div>
              <div className="fs-3 fw-bold">${Number(profile?.balance ?? 0).toFixed(2)}</div>
              <Link to="/wallet" className="btn btn-sm btn-outline-primary mt-2">Wallet</Link>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm h-100 text-center p-3">
            <h5>Promote</h5>
            <p className="small text-muted">Buy clicks for your link</p>
            <Link to="/promote" className="btn btn-primary">Open Promote</Link>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm h-100 text-center p-3">
            <h5>Earn</h5>
            <p className="small text-muted">Complete tasks & get paid</p>
            <Link to="/earn" className="btn btn-success">Open Earn</Link>
          </Card>
        </Col>
      </Row>

      <h4>Your campaigns</h4>
      {campaigns.length === 0 ? (
        <p className="text-muted">No campaigns yet.</p>
      ) : (
        <Table size="sm" responsive className="mb-4">
          <thead><tr><th>Title</th><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id}>
                <td>{c.title}</td>
                <td><span className="badge text-bg-secondary">{c.status}</span></td>
                <td className="small">{new Date(c.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <h4>Your submissions</h4>
      {subs.length === 0 ? (
        <p className="text-muted">No submissions yet.</p>
      ) : (
        <Table size="sm" responsive>
          <thead><tr><th>Status</th><th>Date</th></tr></thead>
          <tbody>
            {subs.map((s) => (
              <tr key={s.id}>
                <td>{s.status}</td>
                <td className="small">{new Date(s.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  )
}

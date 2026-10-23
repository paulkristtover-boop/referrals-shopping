'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Container, Row, Col, Card, Button, Badge, Spinner, Alert } from 'react-bootstrap'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Campaign, TaskSubmission } from '@/lib/types'

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const [profileRes, campaignsRes, submissionsRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).single(),
          supabase
            .from('campaigns')
            .select('*, packages(name, referrals_count, price_usd)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('task_submissions')
            .select('*, tasks(reward_amount, campaigns(title))')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5),
        ])

        if (profileRes.error) throw profileRes.error
        setProfile(profileRes.data as Profile)
        setCampaigns((campaignsRes.data as Campaign[]) || [])
        setSubmissions((submissionsRes.data as TaskSubmission[]) || [])
      } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" />
      </Container>
    )
  }

  const pendingSubs = submissions.filter((s) => s.status === 'pending').length
  const activeCampaigns = campaigns.filter((c) =>
    ['pending_payment', 'pending_approval', 'approved'].includes(c.status)
  ).length
  const totalEarned = submissions
    .filter((s) => s.status === 'approved')
    .reduce((sum, s) => sum + Number(s.earned_amount || 0), 0)

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3 mb-0">
          Dashboard
          {profile?.full_name && (
            <span className="text-muted fs-6 ms-2">· {profile.full_name}</span>
          )}
        </h1>
        {profile?.role === 'admin' && (
          <Badge bg="danger">Admin</Badge>
        )}
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      <Row className="g-4 mb-4">
        <Col sm={6} lg={3}>
          <Card className="stat-card border-0 shadow-sm h-100">
            <Card.Body>
              <div className="text-muted small">Available Balance</div>
              <div className="fs-3 fw-bold text-success">
                ${Number(profile?.balance ?? 0).toFixed(2)}
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col sm={6} lg={3}>
          <Card className="stat-card border-0 shadow-sm h-100">
            <Card.Body>
              <div className="text-muted small">Pending Submissions</div>
              <div className="fs-3 fw-bold">{pendingSubs}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col sm={6} lg={3}>
          <Card className="stat-card border-0 shadow-sm h-100">
            <Card.Body>
              <div className="text-muted small">Active Campaigns</div>
              <div className="fs-3 fw-bold">{activeCampaigns}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col sm={6} lg={3}>
          <Card className="stat-card border-0 shadow-sm h-100">
            <Card.Body>
              <div className="text-muted small">Total Earned (recent)</div>
              <div className="fs-3 fw-bold">${totalEarned.toFixed(2)}</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="g-4 mb-4">
        <Col md={6}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="p-4 text-center">
              <i className="bi bi-megaphone display-4 text-primary mb-3 d-block"></i>
              <h4>Promote</h4>
              <p className="text-muted">
                Buy a referral package, submit your link, and get real users interacting with it.
              </p>
              <Link href="/promote" className="btn btn-primary">
                Create Campaign
              </Link>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card className="h-100 border-0 shadow-sm">
            <Card.Body className="p-4 text-center">
              <i className="bi bi-cash-coin display-4 text-success mb-3 d-block"></i>
              <h4>Earn</h4>
              <p className="text-muted">
                Complete simple tasks (visit links + submit screenshot) and get paid.
              </p>
              <Link href="/earn" className="btn btn-success">
                View Tasks
              </Link>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {campaigns.length > 0 && (
        <Card className="border-0 shadow-sm mb-4">
          <Card.Header className="bg-transparent fw-semibold">Your recent campaigns</Card.Header>
          <Card.Body className="p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c.id}>
                      <td>{c.title}</td>
                      <td>
                        <Badge
                          bg={
                            c.status === 'approved'
                              ? 'success'
                              : c.status === 'rejected'
                              ? 'danger'
                              : 'warning'
                          }
                          text={c.status.includes('pending') ? 'dark' : undefined}
                        >
                          {c.status}
                        </Badge>
                      </td>
                      <td className="small text-muted">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card.Body>
        </Card>
      )}
    </Container>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, Row, Col, Table, Spinner, Alert, Badge, ProgressBar } from 'react-bootstrap'
import { useAuth } from '../contexts/AuthContext'
import { supabase, supabaseConfigured } from '../lib/supabase'
import type { Campaign, Package, Submission } from '../lib/types'
import FirstSessionGuide from '../components/FirstSessionGuide'
import { ListFilters, ListPagination, paginate } from '../components/ListControls'
import { BRAND, TG, IG, IG_HANDLE } from '../lib/brand'

function errMsg(e: unknown): string {
  if (!e) return 'Failed to load'
  if (typeof e === 'string') return e
  if (e instanceof Error) return e.message || 'Failed to load'
  const o = e as { message?: string; error_description?: string; details?: string; code?: string }
  return o.message || o.error_description || o.details || 'Failed to load'
}

function statusBadge(status: string) {
  const s = status.replace(/_/g, ' ')
  const map: Record<string, string> = {
    pending_payment: 'warning',
    pending_approval: 'info',
    approved: 'success',
    rejected: 'danger',
    expired: 'secondary',
    pending: 'warning',
    paid: 'success',
  }
  return (
    <Badge bg={map[status] || 'secondary'} className="badge-status">
      {s}
    </Badge>
  )
}

function ruleLabel(cat?: string) {
  if (cat === 'gambling') return 'Account + deposit'
  return 'Signup only'
}

type CampRow = Campaign & {
  packages?: Package
  referrals_delivered?: number | null
}

export default function Dashboard() {
  const { user, profile, refreshProfile } = useAuth()
  const [campaigns, setCampaigns] = useState<CampRow[]>([])
  const [subs, setSubs] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const load = async () => {
    if (!supabaseConfigured || !user) {
      setLoading(false)
      if (!supabaseConfigured) setError('Configure Supabase env vars on Vercel.')
      return
    }
    setError(null)
    try {
      let cRes = await supabase
        .from('campaigns')
        .select('*, packages(name, category, referrals, price_usd)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (cRes.error) {
        cRes = await supabase
          .from('campaigns')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50)
        if (cRes.error) throw cRes.error
      }

      const sRes = await supabase
        .from('task_submissions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (sRes.error) throw sRes.error

      setCampaigns((cRes.data as CampRow[]) || [])
      setSubs((sRes.data as Submission[]) || [])
    } catch (e: unknown) {
      const message = errMsg(e)
      const lower = message.toLowerCase()
      if (lower.includes('relation') || lower.includes('does not exist') || lower.includes('schema cache')) {
        setError('Database tables missing. Run supabase/schema.sql in the SQL Editor, then refresh.')
      } else if (lower.includes('row-level security') || lower.includes('policy') || lower.includes('permission')) {
        setError(`${message} — Check RLS policies (fix_rls.sql).`)
      } else {
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refreshProfile()
    void load()
  }, [user?.id])

  useEffect(() => setPage(1), [search, status, pageSize])

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner />
      </div>
    )
  }

  const activeAds = campaigns.filter((c) => c.status === 'approved').length
  const awaitingPay = campaigns.filter((c) => c.status === 'pending_payment' || c.status === 'pending_approval').length
  const freeUsed = !!profile?.free_starter_used_at
  const totalOrdered = campaigns.reduce((sum, c) => sum + Number(c.packages?.referrals || 0), 0)
  const totalDelivered = campaigns.reduce((sum, c) => sum + Number(c.referrals_delivered || 0), 0)

  const q = search.trim().toLowerCase()
  const filtered = campaigns.filter((c) => {
    if (status !== 'all' && c.status !== status) return false
    if (!q) return true
    return (
      c.title.toLowerCase().includes(q) ||
      c.target_url.toLowerCase().includes(q) ||
      (c.packages?.name || '').toLowerCase().includes(q)
    )
  })
  const pg = paginate(filtered, page, pageSize)

  return (
    <div className="page-enter">
      <div className="dash-hero mb-4">
        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
          <div>
            <p className="small text-uppercase fw-semibold text-primary mb-1 letter-space">{BRAND}</p>
            <h1 className="mb-1 fw-bold">Your dashboard</h1>
            <p className="text-muted small mb-0">
              Welcome{profile?.full_name ? `, ${profile.full_name}` : ''} — shop referrals, track adverts, and earn
            </p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <Link to="/promote" className="btn btn-primary btn-sm">
              <i className="bi bi-shop me-1" />
              Shop referrals
            </Link>
            <Link to="/earn" className="btn btn-success btn-sm">
              <i className="bi bi-cash-coin me-1" />
              Earn
            </Link>
            <Link to="/account" className="btn btn-outline-secondary btn-sm">
              <i className="bi bi-person-circle me-1" />
              Account
            </Link>
          </div>
        </div>
      </div>

      <FirstSessionGuide />

      {error && (
        <Alert variant="warning">
          <strong>Could not load data:</strong> {error}
        </Alert>
      )}

      <Row className="g-3 mb-4">
        <Col xs={6} md={4} lg={2}>
          <div className="stat-card h-100">
            <div className="text-muted small">Wallet</div>
            <div className="stat-value">${Number(profile?.balance || 0).toFixed(2)}</div>
            <Link to="/wallet" className="small">
              Withdraw →
            </Link>
          </div>
        </Col>
        <Col xs={6} md={4} lg={2}>
          <div className="stat-card h-100">
            <div className="text-muted small">Live adverts</div>
            <div className="stat-value">{activeAds}</div>
            <span className="small text-muted">Approved</span>
          </div>
        </Col>
        <Col xs={6} md={4} lg={2}>
          <div className="stat-card h-100">
            <div className="text-muted small">Need payment</div>
            <div className="stat-value">{awaitingPay}</div>
            <Link to="/promote" className="small">
              Pay now →
            </Link>
          </div>
        </Col>
        <Col xs={6} md={4} lg={2}>
          <div className="stat-card h-100">
            <div className="text-muted small">Referrals ordered</div>
            <div className="stat-value">{totalOrdered.toLocaleString()}</div>
            <span className="small text-muted">Across packages</span>
          </div>
        </Col>
        <Col xs={6} md={4} lg={2}>
          <div className="stat-card h-100">
            <div className="text-muted small">Delivered</div>
            <div className="stat-value">{totalDelivered.toLocaleString()}</div>
            <span className="small text-muted">Marked by admin</span>
          </div>
        </Col>
        <Col xs={6} md={4} lg={2}>
          <div className="stat-card h-100">
            <div className="text-muted small">Free Starter</div>
            <div className="stat-value" style={{ fontSize: '1.15rem' }}>
              {freeUsed ? 'Used' : 'Available'}
            </div>
            <span className="small text-muted">{freeUsed ? '50 regular claimed' : '50 signup-only'}</span>
          </div>
        </Col>
      </Row>

      <Row className="g-3 mb-4">
        <Col md={12}>
          <Alert variant="light" className="border h-100 mb-0 py-3">
            <strong className="d-block mb-1">{BRAND} referral rules</strong>
            <span className="small text-muted">
              <Badge bg="primary" className="me-1">
                Regular
              </Badge>
              counts when someone <em>creates an account</em> via your link (no deposit).
              <Badge bg="danger" className="ms-2 me-1">
                Gambling
              </Badge>
              counts when they <em>sign up and deposit</em>.
            </span>
          </Alert>
        </Col>
        
      </Row>

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
        <h2 className="h4 fw-bold mb-0">
          <i className="bi bi-badge-ad me-2 text-primary" />
          My referral adverts
        </h2>
        <Link to="/promote" className="btn btn-primary btn-sm">
          <i className="bi bi-plus-lg me-1" />
          New package order
        </Link>
      </div>

      {campaigns.length > 0 && (
        <ListFilters
          search={search}
          onSearch={setSearch}
          placeholder="Title, URL, package…"
          status={status}
          onStatus={setStatus}
          statusOptions={[
            { value: 'all', label: 'All statuses' },
            { value: 'pending_payment', label: 'Awaiting payment' },
            { value: 'pending_approval', label: 'Payment submitted' },
            { value: 'approved', label: 'Live / approved' },
            { value: 'rejected', label: 'Rejected' },
            { value: 'expired', label: 'Expired' },
          ]}
          pageSize={pageSize}
          onPageSize={setPageSize}
        />
      )}

      {campaigns.length === 0 ? (
        <div className="empty-state mb-4">
          <p className="mb-1 fw-semibold">No referral packages ordered yet</p>
          <p className="small text-muted mb-3">Start with Free Starter (50 signup-only) or a paid {BRAND} package.</p>
          <Link to="/promote" className="btn btn-primary btn-sm">
            Shop referrals
          </Link>
        </div>
      ) : (
        <>
          <div className="d-none d-md-block mb-2">
            <Card className="rs-card rs-card-static">
              <Table responsive hover className="mb-0 align-middle">
                <thead>
                  <tr>
                    <th>Advert</th>
                    <th>Package</th>
                    <th>Rule</th>
                    <th>Progress</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {pg.slice.map((c) => {
                    const goal = c.packages?.referrals || 0
                    const done = Number(c.referrals_delivered || 0)
                    const pct =
                      goal > 0 ? Math.min(100, Math.round((done / goal) * 100)) : c.status === 'approved' ? 5 : 0
                    const isGamble = c.packages?.category === 'gambling'
                    return (
                      <tr key={c.id}>
                        <td>
                          <div className="fw-semibold">{c.title}</div>
                          <a
                            href={c.target_url}
                            target="_blank"
                            rel="noreferrer"
                            className="small text-truncate d-inline-block"
                            style={{ maxWidth: 220 }}
                          >
                            {c.target_url}
                          </a>
                        </td>
                        <td>
                          <div className="fw-semibold small">{c.packages?.name || '—'}</div>
                          <div className="text-muted small">
                            {goal ? `${goal.toLocaleString()} refs` : ''}
                            {c.paid_amount != null ? ` · $${Number(c.paid_amount).toFixed(0)}` : ''}
                          </div>
                        </td>
                        <td>
                          <Badge bg={isGamble ? 'danger' : 'primary'} className="badge-status">
                            {ruleLabel(c.packages?.category)}
                          </Badge>
                        </td>
                        <td style={{ minWidth: 130 }}>
                          <div className="small mb-1">
                            {done.toLocaleString()}/{goal ? goal.toLocaleString() : '—'}
                          </div>
                          <ProgressBar now={pct} style={{ height: 7 }} variant={pct >= 100 ? 'success' : 'primary'} />
                        </td>
                        <td>{statusBadge(c.status)}</td>
                        <td>
                          {(c.status === 'pending_payment' || c.status === 'pending_approval') && (
                            <Link to="/promote" className="btn btn-sm btn-outline-primary">
                              Pay
                            </Link>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </Table>
            </Card>
          </div>

          <div className="d-md-none">
            {pg.slice.map((c) => {
              const goal = c.packages?.referrals || 0
              const done = Number(c.referrals_delivered || 0)
              const pct = goal > 0 ? Math.min(100, Math.round((done / goal) * 100)) : c.status === 'approved' ? 5 : 0
              const isGamble = c.packages?.category === 'gambling'
              return (
                <Card key={c.id} className={`rs-card rs-card-static mb-2 ${isGamble ? 'package-card-deposit' : ''}`}>
                  <Card.Body className="py-3">
                    <div className="d-flex justify-content-between gap-2 mb-1">
                      <strong>{c.title}</strong>
                      {statusBadge(c.status)}
                    </div>
                    <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
                      <span className="fw-semibold small">{c.packages?.name || 'Package'}</span>
                      <Badge bg={isGamble ? 'danger' : 'primary'} className="badge-status">
                        {ruleLabel(c.packages?.category)}
                      </Badge>
                      <span className="small text-muted">
                        {goal ? `${goal.toLocaleString()} refs` : ''}
                        {c.paid_amount != null ? ` · $${Number(c.paid_amount).toFixed(0)}` : ''}
                      </span>
                    </div>
                    <ProgressBar now={pct} className="mb-1" style={{ height: 7 }} />
                    <div className="small text-muted mb-1">
                      {done.toLocaleString()}/{goal ? goal.toLocaleString() : '—'} delivered
                    </div>
                    <a href={c.target_url} className="small" target="_blank" rel="noreferrer">
                      Open referral link
                    </a>
                  </Card.Body>
                </Card>
              )
            })}
          </div>
          <ListPagination page={pg.page} totalPages={pg.totalPages} total={pg.total} onPage={setPage} />
        </>
      )}

      <h2 className="h4 fw-bold mt-4 mb-2">
        <i className="bi bi-clipboard-check me-2 text-success" />
        Recent earn proofs
      </h2>
      {subs.length === 0 ? (
        <div className="empty-state">
          No submissions yet. Complete tasks for {BRAND} advertisers — <Link to="/earn">browse earn</Link>
        </div>
      ) : (
        <Card className="rs-card rs-card-static">
          <Table size="sm" responsive className="mb-0">
            <thead>
              <tr>
                <th>When</th>
                <th>Status</th>
                <th>Proof</th>
              </tr>
            </thead>
            <tbody>
              {subs.slice(0, 8).map((s) => (
                <tr key={s.id}>
                  <td className="small">{new Date(s.created_at).toLocaleString()}</td>
                  <td>{statusBadge(s.status)}</td>
                  <td>
                    {s.screenshot_url ? (
                      <a href={s.screenshot_url} target="_blank" rel="noreferrer" className="small">
                        View
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, Row, Col, Spinner, Alert, Badge, ProgressBar, Button } from 'react-bootstrap'
import { useAuth } from '../contexts/AuthContext'
import { supabase, supabaseConfigured } from '../lib/supabase'
import type { Campaign, Package, Submission } from '../lib/types'
import FirstSessionGuide from '../components/FirstSessionGuide'
import ShareOrder from '../components/ShareOrder'
import { ListFilters, ListPagination, paginate } from '../components/ListControls'
import { BRAND } from '../lib/brand'
import { formatMoney } from '../lib/money'
import PageHeader from '../components/PageHeader'
import { adStatusLabel, adStatusVariant, adStatusHint } from '../lib/adStatus'

function errMsg(e: unknown): string {
  if (!e) return 'Failed to load'
  if (typeof e === 'string') return e
  if (e instanceof Error) return e.message || 'Failed to load'
  const o = e as { message?: string; error_description?: string; details?: string; code?: string }
  return o.message || o.error_description || o.details || 'Failed to load'
}

function statusBadge(status: string) {
  return (
    <Badge bg={adStatusVariant(status)} className="badge-status">
      {adStatusLabel(status)}
    </Badge>
  )
}

function ruleLabel(cat?: string) {
  if (cat === 'gambling') return 'Deposit'
  return 'Signup'
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



  const pauseAd = async (id: string) => {
    const { error } = await supabase.rpc('pause_campaign', { p_campaign_id: id })
    if (error) {
      setError(error.message.includes('function') ? 'Run supabase/ad_pause_resume.sql' : error.message)
      return
    }
    void load()
  }
  const resumeAd = async (id: string) => {
    const { error } = await supabase.rpc('resume_campaign', { p_campaign_id: id })
    if (error) {
      setError(error.message.includes('function') ? 'Run supabase/ad_pause_resume.sql' : error.message)
      return
    }
    void load()
  }

  return (
    <div className="page-enter dash-ads-page">
      <div className="dash-hero home-hero mb-3">
        <PageHeader
          title="Home"
          lead="Wallet, active ads, and quick actions — manage campaigns under My Ads."
          actions={
            <div className="d-flex flex-wrap gap-2">
              <Link to="/promote" className="btn btn-primary btn-sm">
                <i className="bi bi-megaphone me-1" />
                My Ads
              </Link>
              <Link to="/earn" className="btn btn-outline-primary btn-sm">
                <i className="bi bi-cash-coin me-1" />
                Earn
              </Link>
            </div>
          }
        />
        <p className="text-muted small mb-0">
          Hi{profile?.username ? ` @${profile.username}` : profile?.full_name ? `, ${profile.full_name}` : ''} — pay a small budget, get approval, earners deliver signups or deposits.
        </p>
      </div>

      <FirstSessionGuide />

      {error && (
        <Alert variant="warning">
          <strong>Could not load:</strong> {error}
        </Alert>
      )}

      {/* KPI row — 4 max, clear */}
      <Row className="g-2 g-md-3 mb-4">
        <Col xs={6} md={3}>
          <div className="stat-card h-100 fx-panel">
            <div className="text-muted small">Balance</div>
            <div className="stat-value">{formatMoney(profile?.balance || 0)}</div>
            <Link to="/account" className="small">Wallet in Account →</Link>
          </div>
        </Col>
        <Col xs={6} md={3}>
          <div className="stat-card h-100 fx-panel">
            <div className="text-muted small">Active ads</div>
            <div className="stat-value">{activeAds}</div>
            <span className="small text-muted">Running now</span>
          </div>
        </Col>
        <Col xs={6} md={3}>
          <div className="stat-card h-100 fx-panel">
            <div className="text-muted small">Action needed</div>
            <div className="stat-value">{awaitingPay}</div>
            <Link to="/promote" className="small">Review in My Ads →</Link>
          </div>
        </Col>
        <Col xs={6} md={3}>
          <div className="stat-card h-100 fx-panel">
            <div className="text-muted small">Delivered</div>
            <div className="stat-value">{totalDelivered.toLocaleString()}</div>
            <span className="small text-muted">of {totalOrdered.toLocaleString()} ordered</span>
          </div>
        </Col>
      </Row>

      {/* Ads overview — cards only, no spreadsheet */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
        <h2 className="h5 fw-bold mb-0">Your ads</h2>
        <Link to="/promote" className="btn btn-primary btn-sm">
          <i className="bi bi-plus-lg me-1" />
          Create ad
        </Link>
      </div>
      <p className="small text-muted mb-3">
        Each ad = budget + your link. Status is simple: Needs payment → In review → Active → Completed.
      </p>

      {campaigns.length === 0 ? (
        <Card className="rs-card rs-card-static fx-panel mb-4">
          <Card.Body className="text-center py-4">
            <p className="mb-2 fw-semibold">No ads yet</p>
            <p className="small text-muted mb-3">Start with a free trial or a small ₦800+ budget.</p>
            <Link to="/promote" className="btn btn-primary btn-sm">Create your first ad</Link>
          </Card.Body>
        </Card>
      ) : (
        <>
          <ListFilters
            search={search}
            onSearch={(v) => { setSearch(v); setPage(1) }}
            searchPlaceholder="Search ads…"
            status={status}
            onStatus={(v) => { setStatus(v); setPage(1) }}
            statusOptions={[
              { value: 'all', label: 'All' },
              { value: 'pending_payment', label: 'Needs payment' },
              { value: 'pending_approval', label: 'In review' },
              { value: 'approved', label: 'Active' },
              { value: 'paused', label: 'Paused' },
              { value: 'completed', label: 'Completed' },
              { value: 'rejected', label: 'Rejected' },
              { value: 'draft', label: 'Draft' },
            ]}
            pageSize={pageSize}
            onPageSize={(n) => { setPageSize(n); setPage(1) }}
          />
          <div className="d-flex flex-column gap-2 mb-2">
            {pg.slice.map((c) => {
              const goal = Number(c.packages?.referrals || 0)
              const done = Number(c.referrals_delivered || 0)
              const pct = goal ? Math.min(100, Math.round((done / goal) * 100)) : 0
              const isGamble = c.packages?.category === 'gambling'
              return (
                <Card key={c.id} className="rs-card rs-card-static fx-panel ad-manage-card">
                  <Card.Body className="py-3">
                    <div className="d-flex flex-wrap justify-content-between gap-2 align-items-start">
                      <div className="min-w-0 flex-grow-1">
                        <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                          <strong className="text-truncate">{c.title || 'Untitled ad'}</strong>
                          {statusBadge(c.status)}
                        </div>
                        <div className="small text-muted mb-2">
                          <Badge bg={isGamble ? 'danger' : 'primary'} className="badge-status me-1">
                            {ruleLabel(c.packages?.category)}
                          </Badge>
                          {goal ? `${goal.toLocaleString()} results` : '—'}
                          {c.paid_amount != null ? ` · ${formatMoney(Number(c.paid_amount))}` : ''}
                          {adStatusHint(c.status) ? ` · ${adStatusHint(c.status)}` : ''}
                        </div>
                        <ProgressBar now={pct} style={{ height: 6 }} className="mb-1" />
                        <div className="small text-muted">{done.toLocaleString()} / {goal ? goal.toLocaleString() : '—'} delivered</div>
                      </div>
                      <div className="d-flex flex-column gap-1 align-items-stretch">
                        {c.status === 'approved' && (
                          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => void pauseAd(c.id)}>Pause</button>
                        )}
                        {c.status === 'paused' && (
                          <button type="button" className="btn btn-sm btn-primary" onClick={() => void resumeAd(c.id)}>Resume</button>
                        )}
                        {(c.status === 'pending_payment' || c.status === 'draft') && (
                          <Link to="/promote" className="btn btn-sm btn-primary">Continue</Link>
                        )}
                        {c.status === 'approved' && (
                          <a href={c.target_url} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-primary">Open link</a>
                        )}
                        <ShareOrder
                          order={{
                            title: c.title,
                            targetUrl: c.target_url,
                            packageName: c.packages?.name,
                          }}
                        />
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              )
            })}
          </div>
          <ListPagination page={pg.page} totalPages={pg.totalPages} total={pg.total} onPage={setPage} />
        </>
      )}

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-4 mb-2">
        <h2 className="h5 fw-bold mb-0">Recent proofs</h2>
        <Link to="/earn" className="small">Browse earn →</Link>
      </div>
      {subs.length === 0 ? (
        <p className="small text-muted">No proofs yet. Complete tasks on Earn to get paid.</p>
      ) : (
        <div className="d-flex flex-column gap-2">
          {subs.slice(0, 5).map((s) => (
            <div key={s.id} className="fx-panel rs-card rs-card-static px-3 py-2 d-flex justify-content-between align-items-center gap-2">
              <span className="small text-truncate">{(s as { tasks?: { campaigns?: { title?: string } } }).tasks?.campaigns?.title || 'Task'}</span>
              {statusBadge(String((s as { status?: string }).status || ''))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

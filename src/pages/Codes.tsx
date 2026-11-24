import { useCallback, useEffect, useState } from 'react'
import { Alert, Badge, Button, Card, Spinner } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { supabase, supabaseConfigured } from '../lib/supabase'
import { BRAND, MSPORT_AFFILIATE_URL, MSPORT_CODES_DISCLAIMER } from '../lib/brand'
import { useAuth } from '../contexts/AuthContext'

type BetCode = {
  id: string
  code: string
  title: string | null
  note: string | null
  bookmaker: string
  code_date: string
  active: boolean
  created_at: string
}

function todayLagos() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export default function Codes() {
  const { user } = useAuth()
  const [rows, setRows] = useState<BetCode[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [filter, setFilter] = useState<'today' | 'recent'>('today')
  const [copied, setCopied] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!supabaseConfigured) {
      setLoading(false)
      setErr('App is not configured.')
      return
    }
    setLoading(true)
    setErr(null)
    const day = todayLagos()
    let q = supabase
      .from('bet_codes')
      .select('id, code, title, note, bookmaker, code_date, active, created_at')
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(40)

    if (filter === 'today') {
      q = q.eq('code_date', day)
    } else {
      q = q.gte('code_date', new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10))
    }

    const { data, error } = await q
    setLoading(false)
    if (error) {
      setErr(
        error.message.includes('bet_codes') || error.message.includes('schema') || error.message.includes('relation')
          ? 'Codes are not live in the database yet. Admin must run supabase/bet_codes.sql in Supabase SQL Editor.'
          : error.message,
      )
      setRows([])
      return
    }
    setRows((data as BetCode[]) || [])
  }, [filter])

  useEffect(() => {
    void load()
  }, [load])

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(code)
      window.setTimeout(() => setCopied(null), 2000)
    } catch {
      setErr('Could not copy — select the code manually.')
    }
  }

  return (
    <div className="page-enter codes-page">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
        <div>
          <h1 className="fw-bold mb-1">Free booking codes</h1>
          <p className="text-muted small mb-0">
            Free MSport-style codes from {BRAND}. No payment. Use them on MSport, then join the marketplace to{' '}
            <strong>Promote</strong> or <strong>Earn</strong> in Naira.
          </p>
        </div>
        <Badge bg="success" className="align-self-start">
          Free · 18+
        </Badge>
      </div>

      {/* Primary product funnel */}
      <Card className="rs-card rs-card-static mb-3 border-primary">
        <Card.Body className="py-3">
          <div className="fw-semibold mb-1">While you’re here — use the platform</div>
          <p className="small text-muted mb-2 mb-md-3">
            Codes are a free extra. The main product is referral packages: promoters pay for volume, earners complete
            tasks and withdraw ₦.
          </p>
          <div className="d-flex flex-wrap gap-2">
            {!user ? (
              <>
                <Button as={Link} to="/register" variant="primary">
                  Create free account
                </Button>
                <Button as={Link} to="/login" variant="outline-primary">
                  Sign in
                </Button>
              </>
            ) : (
              <>
                <Button as={Link} to="/earn" variant="primary">
                  Earn tasks
                </Button>
                <Button as={Link} to="/promote" variant="outline-primary">
                  Promote a link
                </Button>
                <Button as={Link} to="/dashboard" variant="outline-secondary">
                  Dashboard
                </Button>
              </>
            )}
            <Button as={Link} to="/guide" variant="outline-secondary" size="sm" className="align-self-center">
              How it works
            </Button>
          </div>
        </Card.Body>
      </Card>

      <Alert variant="warning" className="small">
        <strong>Not fixed games.</strong> {MSPORT_CODES_DISCLAIMER}
      </Alert>

      <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
        <span className="small text-muted me-1">Show:</span>
        <Button size="sm" variant={filter === 'today' ? 'dark' : 'outline-secondary'} onClick={() => setFilter('today')}>
          Today
        </Button>
        <Button
          size="sm"
          variant={filter === 'recent' ? 'dark' : 'outline-secondary'}
          onClick={() => setFilter('recent')}
        >
          Last 7 days
        </Button>
        <Button size="sm" variant="outline-secondary" onClick={() => void load()}>
          Refresh
        </Button>
      </div>

      {err && <Alert variant="danger">{err}</Alert>}

      {loading ? (
        <div className="text-center py-5">
          <Spinner />
        </div>
      ) : rows.length === 0 ? (
        <Card className="rs-card rs-card-static">
          <Card.Body className="text-center text-muted py-5">
            <p className="mb-2">No free codes posted for this filter yet.</p>
            <p className="small mb-3">Check back later — or start on the marketplace now.</p>
            <Button as={Link} to={user ? '/earn' : '/register'} variant="primary" size="sm">
              {user ? 'Browse Earn tasks' : 'Create free account'}
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <div className="d-flex flex-column gap-2">
          {rows.map((r) => (
            <Card key={r.id} className="rs-card rs-card-static">
              <Card.Body className="py-3">
                <div className="d-flex flex-wrap justify-content-between gap-2 align-items-start">
                  <div className="min-w-0">
                    <div className="small text-muted">
                      {r.code_date}
                      {r.bookmaker ? ` · ${r.bookmaker}` : ''}
                      {r.title ? ` · ${r.title}` : ''}
                    </div>
                    <div className="font-monospace fw-bold fs-5 text-break">{r.code}</div>
                    {r.note ? <div className="small text-muted mt-1">{r.note}</div> : null}
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    <Button size="sm" variant="primary" onClick={() => void copy(r.code)}>
                      {copied === r.code ? 'Copied' : 'Copy code'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      as="a"
                      href={MSPORT_AFFILIATE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open MSport
                    </Button>
                  </div>
                </div>
              </Card.Body>
            </Card>
          ))}
        </div>
      )}

      <Card className="rs-card rs-card-static mt-4">
        <Card.Body className="small">
          <strong>How to use a code</strong>
          <ol className="mb-3 ps-3 text-muted">
            <li>Copy a free code above.</li>
            <li>Open MSport, paste into the booking-code field.</li>
            <li>Check every selection, set your own stake — nothing is guaranteed.</li>
          </ol>
          <strong>Why this page exists</strong>
          <p className="text-muted mb-2">
            Codes are free traffic and goodwill. The business is {BRAND}: buy referral packages or complete earn tasks and
            withdraw in ₦.
          </p>
          <div className="d-flex flex-wrap gap-2">
            <Button as={Link} to={user ? '/promote' : '/register'} size="sm" variant="primary">
              {user ? 'Promote' : 'Join free'}
            </Button>
            <Button as={Link} to={user ? '/earn' : '/guide'} size="sm" variant="outline-primary">
              {user ? 'Earn' : 'Read the guide'}
            </Button>
          </div>
        </Card.Body>
      </Card>
    </div>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { Alert, Badge, Button, Card, Form, Spinner } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { supabase, supabaseConfigured } from '../lib/supabase'
import { BRAND, MSPORT_AFFILIATE_URL, MSPORT_CODES_DISCLAIMER } from '../lib/brand'

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
        error.message.includes('bet_codes') || error.message.includes('schema')
          ? 'Codes table not ready — run supabase/bet_codes.sql'
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
          <h1 className="fw-bold mb-1">Booking codes</h1>
          <p className="text-muted small mb-0">
            MSport-style booking codes shared on {BRAND}. Load on MSport, set your own stake.
          </p>
        </div>
        <Badge bg="secondary" className="align-self-start">
          18+
        </Badge>
      </div>

      <Alert variant="warning" className="small">
        <strong>Not fixed games.</strong> {MSPORT_CODES_DISCLAIMER}
      </Alert>

      <div className="d-flex flex-wrap gap-2 mb-3">
        <Button
          as="a"
          href={MSPORT_AFFILIATE_URL}
          target="_blank"
          rel="noopener noreferrer sponsored"
          variant="primary"
        >
          <i className="bi bi-box-arrow-up-right me-1" />
          Open MSport
        </Button>
        <Button
          size="sm"
          variant={filter === 'today' ? 'dark' : 'outline-secondary'}
          onClick={() => setFilter('today')}
        >
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

      <p className="small text-muted mb-3">
        We may earn a commission if you register or deposit via the MSport button (affiliate disclosure).
        Codes are for convenience only — always check selections before you stake.
      </p>

      {err && <Alert variant="danger">{err}</Alert>}

      {loading ? (
        <div className="text-center py-5">
          <Spinner />
        </div>
      ) : rows.length === 0 ? (
        <Card className="rs-card rs-card-static">
          <Card.Body className="text-center text-muted py-5">
            <p className="mb-2">No codes posted for this filter yet.</p>
            <p className="small mb-0">Check back later, or open MSport for the official booking-code list.</p>
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
                    <Button size="sm" variant="outline-primary" onClick={() => void copy(r.code)}>
                      {copied === r.code ? 'Copied' : 'Copy code'}
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      as="a"
                      href={MSPORT_AFFILIATE_URL}
                      target="_blank"
                      rel="noopener noreferrer sponsored"
                    >
                      Load on MSport
                    </Button>
                  </div>
                </div>
              </Card.Body>
            </Card>
          ))}
        </div>
      )}

      <Card className="rs-card rs-card-static mt-4">
        <Card.Body className="small text-muted">
          <strong className="text-body">How to use</strong>
          <ol className="mb-2 ps-3">
            <li>Copy a code above.</li>
            <li>Open MSport (button), sign in, paste into the booking-code field.</li>
            <li>Review every selection and odds, set your stake, then place only if you accept the risk.</li>
          </ol>
          <p className="mb-0">
            Looking for referral volume instead?{' '}
            <Link to="/promote">Promote packages</Link> or <Link to="/earn">Earn tasks</Link> on {BRAND}.
          </p>
        </Card.Body>
      </Card>
    </div>
  )
}

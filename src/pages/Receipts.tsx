import { useEffect, useState } from 'react'
import { Alert, Badge, Button, Card, Spinner } from 'react-bootstrap'
import { ListFilters, ListPagination, paginate } from '../components/ListControls'
import EmptyState from '../components/EmptyState'
import { useAuth } from '../contexts/AuthContext'
import { supabase, supabaseConfigured } from '../lib/supabase'
import { formatMoney } from '../lib/money'
import { BRAND } from '../lib/brand'
import { Reveal } from '../components/Animated'

type Row = {
  id: string
  title: string
  status: string
  paid_amount: number
  crypto_chain: string | null
  pay_code: string | null
  tx_hash: string | null
  payment_note: string | null
  created_at: string
  packages?: { name: string; referrals: number; category: string } | null
}

export default function Receipts() {
  const { user } = useAuth()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    if (!user || !supabaseConfigured) {
      setLoading(false)
      return
    }
    ;(async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, title, status, paid_amount, crypto_chain, pay_code, tx_hash, payment_note, created_at, packages(name, referrals, category)')
        .eq('user_id', user.id)
        .in('status', ['pending_approval', 'approved', 'completed', 'pending_payment'])
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) setErr(error.message)
      setRows((data as unknown as Row[]) || [])
      setLoading(false)
    })()
  }, [user?.id])

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner />
      </div>
    )
  }

  const q = search.trim().toLowerCase()
  const filtered = rows.filter((r) => {
    if (status !== 'all' && r.status !== status) return false
    if (!q) return true
    return (
      r.title.toLowerCase().includes(q) ||
      (r.pay_code || '').toLowerCase().includes(q) ||
      (r.packages?.name || '').toLowerCase().includes(q)
    )
  })
  const pg = paginate(filtered, page, pageSize)

  const printReceipt = (r: Row) => {
    const w = window.open('', '_blank', 'noopener,noreferrer,width=480,height=640')
    if (!w) return
    w.document.write(`<!DOCTYPE html><html><head><title>Receipt — ${BRAND}</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:24px;color:#111}
        h1{font-size:1.25rem;margin:0 0 8px}
        .muted{color:#666;font-size:0.85rem}
        .row{display:flex;justify-content:space-between;margin:8px 0;border-bottom:1px solid #eee;padding-bottom:6px}
        .total{font-size:1.35rem;font-weight:700;margin-top:16px}
      </style></head><body>
      <h1>${BRAND} — Payment receipt</h1>
      <p class="muted">${new Date(r.created_at).toLocaleString()}</p>
      <div class="row"><span>Order</span><span>${r.title}</span></div>
      <div class="row"><span>Package</span><span>${r.packages?.name || '—'} (${(r.packages?.referrals || 0).toLocaleString()} refs)</span></div>
      <div class="row"><span>Status</span><span>${r.status.replace(/_/g, ' ')}</span></div>
      <div class="row"><span>Method</span><span>${(r.crypto_chain || '').toUpperCase() === 'NGN_FLW' ? 'Flutterwave (NGN)' : (r.crypto_chain || '—').toUpperCase()}</span></div>
      <div class="row"><span>Reference</span><span>${r.pay_code || r.tx_hash || '—'}</span></div>
      <div class="total">${formatMoney(r.paid_amount || 0)}</div>
      <p class="muted">Keep this for your records. Support may ask for the reference.</p>
      <script>window.print()</script>
      </body></html>`)
    w.document.close()
  }

  return (
    <div className="page-enter">
      <Reveal>
        <h1 className="fw-bold mb-1">Receipts</h1>
        <p className="text-muted mb-3">Payment history for your referral orders on {BRAND}.</p>
      </Reveal>
      {err && <Alert variant="danger">{err}</Alert>}
      <ListFilters
        search={search}
        onSearch={(v) => {
          setSearch(v)
          setPage(1)
        }}
        placeholder="Title, package, pay code…"
        status={status}
        onStatus={(v) => {
          setStatus(v)
          setPage(1)
        }}
        statusOptions={[
          { value: 'all', label: 'All' },
          { value: 'pending_payment', label: 'Awaiting payment' },
          { value: 'pending_approval', label: 'Paid / checking' },
          { value: 'approved', label: 'Approved' },
          { value: 'completed', label: 'Completed' },
        ]}
        pageSize={pageSize}
        onPageSize={(n) => {
          setPageSize(n)
          setPage(1)
        }}
      />
      {rows.length === 0 ? (
        <EmptyState>No receipts yet. Place a paid order on Promote.</EmptyState>
      ) : (
        <div className="d-flex flex-column gap-3">
          {pg.slice.map((r) => (
            <Card key={r.id} className="rs-card rs-card-static">
              <Card.Body>
                <div className="d-flex flex-wrap justify-content-between gap-2">
                  <div>
                    <div className="fw-semibold">{r.title}</div>
                    <div className="small text-muted">
                      {r.packages?.name || 'Package'} · {(r.packages?.referrals || 0).toLocaleString()} referrals
                    </div>
                    <div className="small text-muted">{new Date(r.created_at).toLocaleString()}</div>
                  </div>
                  <div className="text-end">
                    <div className="fs-5 fw-bold text-primary">{formatMoney(r.paid_amount || 0)}</div>
                    <Badge bg="secondary">{r.status.replace(/_/g, ' ')}</Badge>
                  </div>
                </div>
                <div className="small mt-2">
                  Ref: <code className="user-select-all">{r.pay_code || r.tx_hash || '—'}</code>
                </div>
                <Button size="sm" variant="outline-primary" className="mt-2" onClick={() => printReceipt(r)}>
                  <i className="bi bi-printer me-1" />
                  Print / save receipt
                </Button>
              </Card.Body>
            </Card>
          ))}
          <ListPagination page={pg.page} totalPages={pg.totalPages} total={pg.total} onPage={setPage} />
        </div>
      )}
    </div>
  )
}

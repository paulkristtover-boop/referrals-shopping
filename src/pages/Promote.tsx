import { useEffect, useState } from 'react'
import { Alert, Button, Card, Form, Spinner, Badge } from 'react-bootstrap'
import { ListFilters, ListPagination, paginate } from '../components/ListControls'
import { useAuth } from '../contexts/AuthContext'
import { deposits, supabase, supabaseConfigured } from '../lib/supabase'
import type { Campaign, Package } from '../lib/types'

type PayOrder = {
  id: string
  campaign_id: string | null
  amount_crypto: number
  crypto_chain: string
  deposit_address: string
  expires_at: string
  status: string
  pay_code: string
}

function payCode() {
  return 'RS' + Math.random().toString(36).slice(2, 12).toUpperCase()
}

function useCountdown(expiresAt?: string | null) {
  const [left, setLeft] = useState(0)
  useEffect(() => {
    if (!expiresAt) {
      setLeft(0)
      return
    }
    const tick = () => {
      const ms = new Date(expiresAt).getTime() - Date.now()
      setLeft(Math.max(0, Math.floor(ms / 1000)))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt])
  const m = Math.floor(left / 60)
  const s = left % 60
  return { left, label: `${m}:${s.toString().padStart(2, '0')}` }
}


function CopyBtn({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [ok, setOk] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setOk(true)
      setTimeout(() => setOk(false), 1500)
    } catch {
      /* ignore */
    }
  }
  return (
    <Button size="sm" variant={ok ? 'success' : 'outline-secondary'} onClick={() => void copy()}>
      <i className={`bi ${ok ? 'bi-check-lg' : 'bi-clipboard'} me-1`} />
      {ok ? 'Copied' : label}
    </Button>
  )
}

function PaymentPanel({
  order,
  onUpdated,
}: {
  order: PayOrder
  campaignId: string
  onUpdated: () => void
}) {
  const { left, label } = useCountdown(order.expires_at)
  const [checking, setChecking] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [auto, setAuto] = useState(true)

  const chain = order.crypto_chain.toUpperCase()
  const addr = order.deposit_address || deposits[order.crypto_chain as 'trx' | 'sol' | 'ton'] || ''
  const amountStr = Number(order.amount_crypto).toFixed(6)
  // QR encodes amount + address hint as plain text address (universal)
  const qrPayload = addr
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(qrPayload)}`

  const check = async (silent = false) => {
    if (!silent) setChecking(true)
    if (!silent) setNote(null)
    try {
      const res = await fetch(`/api/payments/check?orderId=${encodeURIComponent(order.id)}`)
      const data = await res.json()
      if (data.status === 'confirmed') {
        setNote(`Payment detected automatically. TX: ${String(data.tx || '').slice(0, 18)}…`)
        setAuto(false)
        onUpdated()
      } else if (data.status === 'expired') {
        setNote('Payment window expired. Create a new order with a new unique amount.')
        setAuto(false)
        onUpdated()
      } else if (!silent) {
        setNote('Watching the blockchain… payment not seen yet. Keep this page open.')
      }
    } catch {
      if (!silent) setNote('Network issue while checking. Retrying…')
    } finally {
      if (!silent) setChecking(false)
    }
  }

  // Looks automatic: poll every 12s while window open
  useEffect(() => {
    if (!auto || order.status !== 'awaiting_payment' || left <= 0) return
    void check(true)
    const id = setInterval(() => void check(true), 12000)
    return () => clearInterval(id)
  }, [order.id, order.status, left, auto])

  return (
    <div className="pay-box mt-3">
      <div className="d-flex justify-content-between flex-wrap gap-2 mb-3">
        <strong>Send exact amount ({chain})</strong>
        {left > 0 ? (
          <Badge bg="warning" text="dark" className="d-flex align-items-center gap-1">
            <span className="spinner-grow spinner-grow-sm" style={{ width: 8, height: 8 }} />
            Auto-check · {label}
          </Badge>
        ) : (
          <Badge bg="danger">Expired</Badge>
        )}
      </div>

      <div className="row g-3 align-items-start">
        <div className="col-auto text-center">
          {addr ? (
            <img
              src={qrUrl}
              width={180}
              height={180}
              alt="Payment address QR"
              className="rounded border bg-white p-1"
              style={{ maxWidth: '100%' }}
            />
          ) : (
            <div className="text-muted small">No deposit address set</div>
          )}
          <div className="small text-muted mt-1">Scan to get address</div>
        </div>
        <div className="col">
          <div className="small text-muted">Amount (must match exactly)</div>
          <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
            <span className="pay-code">{amountStr} {chain}</span>
            <CopyBtn value={amountStr} label="Copy amount" />
          </div>

          <div className="small text-muted">Deposit address</div>
          <div
            className="font-monospace small p-2 rounded border mb-2 user-select-all"
            style={{ wordBreak: 'break-all', cursor: 'pointer', background: 'var(--bs-body-bg)' }}
            title="Click to copy"
            onClick={() => void navigator.clipboard.writeText(addr)}
          >
            {addr || '—'}
          </div>
          <CopyBtn value={addr} label="Copy address" />

          <div className="small text-muted mt-3">Pay code</div>
          <div className="d-flex flex-wrap align-items-center gap-2">
            <span className="pay-code" style={{ fontSize: '1rem' }}>{order.pay_code}</span>
            <CopyBtn value={order.pay_code} label="Copy code" />
          </div>
        </div>
      </div>

      {left > 0 && order.status === 'awaiting_payment' && (
        <div className="mt-3 d-flex flex-wrap gap-2 align-items-center">
          <Button size="sm" variant="success" disabled={checking} onClick={() => void check(false)}>
            {checking ? (
              <>
                <Spinner size="sm" className="me-1" /> Checking chain…
              </>
            ) : (
              <>
                <i className="bi bi-broadcast me-1" /> Check now
              </>
            )}
          </Button>
          <span className="small text-muted">Auto-checks every few seconds while the timer runs</span>
        </div>
      )}
      {note && <Alert variant="info" className="mt-3 mb-0 py-2 small">{note}</Alert>}
    </div>
  )
}

export default function Promote() {
  const { user } = useAuth()
  const [packages, setPackages] = useState<Package[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [orders, setOrders] = useState<PayOrder[]>([])
  const [packageId, setPackageId] = useState('')
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [chain, setChain] = useState<'trx' | 'sol' | 'ton'>('trx')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const load = async () => {
    if (!supabaseConfigured) {
      setLoading(false)
      setErr('Configure Supabase on Vercel.')
      return
    }
    const [p, c, o] = await Promise.all([
      supabase.from('packages').select('*').eq('active', true).order('price_usd'),
      supabase.from('campaigns').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
      supabase.from('payment_orders').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
    ])
    setPackages((p.data as Package[]) || [])
    setCampaigns((c.data as Campaign[]) || [])
    setOrders((o.data as PayOrder[]) || [])
    if (p.data?.[0]) setPackageId(p.data[0].id)
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [user?.id])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    const pkg = packages.find((x) => x.id === packageId)
    if (!pkg || !user) return
    setCreating(true)
    try {
      // Unique amount from API (15 min window)
      const qRes = await fetch(`/api/payments/quote?usd=${pkg.price_usd}&chain=${chain}`)
      const quote = await qRes.json()
      if (!qRes.ok) throw new Error(quote.error || 'Could not get payment quote')

      const code = payCode()
      const expires = quote.expires_at as string

      const { data: camp, error } = await supabase
        .from('campaigns')
        .insert({
          user_id: user.id,
          package_id: packageId,
          title,
          target_url: url,
          status: 'pending_payment',
          paid_amount: pkg.price_usd,
          crypto_chain: chain,
          pay_code: code,
          amount_crypto: quote.amount_crypto,
          expires_at: expires,
        })
        .select('*')
        .single()

      if (error) throw error

      const { error: oErr } = await supabase.from('payment_orders').insert({
        user_id: user.id,
        campaign_id: camp.id,
        amount_usd: pkg.price_usd,
        amount_crypto: quote.amount_crypto,
        unique_suffix: quote.unique_suffix,
        rate_usd: quote.rate_usd,
        crypto_chain: chain,
        pay_code: code,
        deposit_address: quote.deposit_address || deposits[chain],
        expires_at: expires,
        status: 'awaiting_payment',
      })
      if (oErr) throw oErr

      setMsg(`Send exactly ${Number(quote.amount_crypto).toFixed(6)} ${chain.toUpperCase()} within 15 minutes.`)
      setTitle('')
      setUrl('')
      void load()
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : 'Failed to create order')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner />
      </div>
    )
  }

  return (
    <>
      <h1 className="mb-2 fw-bold">Promote your link</h1>
      <p className="text-muted mb-4">
        Each order gets a <strong>unique crypto amount</strong> valid for <strong>15 minutes</strong>. A background worker watches the blockchain and confirms automatically.
      </p>
      {err && <Alert variant="danger">{err}</Alert>}
      {msg && <Alert variant="success">{msg}</Alert>}

      <Card className="rs-card rs-card-static mb-4">
        <Card.Body>
          <h5 className="fw-bold">New order</h5>
          <Form onSubmit={create}>
            <Form.Group className="mb-3">
              <Form.Label>Package</Form.Label>
              <Form.Select value={packageId} onChange={(e) => setPackageId(e.target.value)} required>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — ${p.price_usd} ({p.category})
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control value={title} onChange={(e) => setTitle(e.target.value)} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Target URL</Form.Label>
              <Form.Control type="url" value={url} onChange={(e) => setUrl(e.target.value)} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Pay with</Form.Label>
              <Form.Select value={chain} onChange={(e) => setChain(e.target.value as 'trx' | 'sol' | 'ton')}>
                <option value="trx">TRX (Tron)</option>
                <option value="sol">SOL (Solana)</option>
                <option value="ton">TON</option>
              </Form.Select>
            </Form.Group>
            <Button type="submit" disabled={creating}>
              {creating ? 'Creating…' : 'Create order (15 min unique amount)'}
            </Button>
          </Form>
        </Card.Body>
      </Card>

      <h4 className="fw-bold">Your orders</h4>
      {campaigns.length > 0 && (
        <ListFilters
          search={search}
          onSearch={(v) => { setSearch(v); setPage(1) }}
          placeholder="Title, URL…"
          status={statusFilter}
          onStatus={(v) => { setStatusFilter(v); setPage(1) }}
          statusOptions={[
            { value: 'all', label: 'All statuses' },
            { value: 'pending_payment', label: 'Awaiting payment' },
            { value: 'pending_approval', label: 'Checking / submitted' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
            { value: 'expired', label: 'Expired' },
          ]}
          pageSize={pageSize}
          onPageSize={(n) => { setPageSize(n); setPage(1) }}
        />
      )}
      {(() => {
        const q = search.trim().toLowerCase()
        const filtered = campaigns.filter((c) => {
          if (statusFilter !== 'all' && c.status !== statusFilter) return false
          if (!q) return true
          return c.title.toLowerCase().includes(q) || c.target_url.toLowerCase().includes(q)
        })
        const pg = paginate(filtered, page, pageSize)
        return (
          <>
      {pg.slice.map((c) => {
        const order = orders.find((o) => o.campaign_id === c.id)
        return (
          <Card key={c.id} className="rs-card rs-card-static mb-3">
            <Card.Body>
              <div className="d-flex justify-content-between flex-wrap gap-2">
                <div>
                  <strong>{c.title}</strong>
                  <div className="small text-muted">
                    ${Number(c.paid_amount || 0).toFixed(0)} · {(c.crypto_chain || '').toUpperCase()}
                  </div>
                  <a href={c.target_url} target="_blank" rel="noreferrer" className="small">
                    Open link
                  </a>
                </div>
                <Badge bg="secondary" className="badge-status">
                  {c.status.replace(/_/g, ' ')}
                </Badge>
              </div>
              {order && (c.status === 'pending_payment' || order.status === 'awaiting_payment') && (
                <PaymentPanel order={order} campaignId={c.id} onUpdated={() => void load()} />
              )}
              {c.status === 'approved' && (
                <p className="small text-success mt-2 mb-0">Payment confirmed — promotion active.</p>
              )}
            </Card.Body>
          </Card>
        )
      })}
      {pg.slice.length === 0 && campaigns.length > 0 && <div className="empty-state">No orders match filters.</div>}
      <ListPagination page={pg.page} totalPages={pg.totalPages} total={pg.total} onPage={setPage} />
          </>
        )
      })()}
      {campaigns.length === 0 && <div className="empty-state">No orders yet.</div>}
    </>
  )
}

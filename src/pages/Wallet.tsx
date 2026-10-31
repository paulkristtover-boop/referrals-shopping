import { useEffect, useState } from 'react'
import { Alert, Badge, Button, Card, Form, Table, Spinner } from 'react-bootstrap'
import { ListFilters, ListPagination, paginate } from '../components/ListControls'
import { useAuth } from '../contexts/AuthContext'
import { supabase, supabaseConfigured } from '../lib/supabase'
import { BRAND } from '../lib/brand'
import { formatMoney } from '../lib/money'
import EmptyState from '../components/EmptyState'

type W = {
  id: string
  amount: number
  crypto_chain: string
  wallet_address: string
  status: string
  created_at: string
}

const MIN_USD = 100

function statusBadge(status: string) {
  const map: Record<string, string> = {
    pending: 'warning',
    paid: 'success',
    rejected: 'danger',
  }
  return (
    <Badge bg={map[status] || 'secondary'} className="badge-status">
      {status}
    </Badge>
  )
}

export default function Wallet() {
  const { user, profile, refreshProfile } = useAuth()
  const [list, setList] = useState<W[]>([])
  const [amount, setAmount] = useState('')
  const [chain, setChain] = useState('trx')
  const [addr, setAddr] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const load = async () => {
    if (!user || !supabaseConfigured) {
      setLoading(false)
      return
    }
    const { data } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setList((data as W[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    void refreshProfile()
    void load()
  }, [user?.id])

  const request = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    const a = Number(amount)
    if (!supabaseConfigured || !user) return
    if (!a || a < MIN_USD) {
      setErr(`Minimum withdrawal is ₦${MIN_USD.toFixed(2)}`)
      return
    }
    if (a > Number(profile?.balance || 0)) {
      setErr('Amount exceeds available balance')
      return
    }
    if (addr.trim().length < 8) {
      setErr('Enter a valid wallet address')
      return
    }
    setSubmitting(true)
    try {
      const { error } = await supabase.rpc('request_withdrawal', {
        p_amount: a,
        p_chain: chain,
        p_wallet: addr.trim(),
      })
      if (error) {
        // Fallback if SQL not run yet (unsafe path — warn)
        if (error.message.toLowerCase().includes('function') || error.message.toLowerCase().includes('does not exist')) {
          setErr('Run supabase/withdrawals_safe.sql in Supabase, then try again.')
        } else {
          setErr(error.message)
        }
        return
      }
      setMsg('Withdrawal requested. Balance held until admin pays or rejects (refund on reject).')
      setAmount('')
      setAddr('')
      await refreshProfile()
      void load()
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner />
      </div>
    )
  }

  const bal = Number(profile?.balance ?? 0)
  const q = search.trim().toLowerCase()
  const filtered = list.filter((w) => {
    if (status !== 'all' && w.status !== status) return false
    if (!q) return true
    return w.wallet_address.toLowerCase().includes(q) || w.crypto_chain.toLowerCase().includes(q)
  })
  const pg = paginate(filtered, page, pageSize)

  return (
    <div className="page-enter">
      <h1 className="mb-1 fw-bold">Wallet</h1>
      <p className="text-muted mb-4">Earn rewards on {BRAND} — withdraw in TRX, SOL, or TON</p>

      {err && (
        <Alert variant="danger" dismissible onClose={() => setErr(null)}>
          {err}
        </Alert>
      )}
      {msg && (
        <Alert variant="success" dismissible onClose={() => setMsg(null)}>
          {msg}
        </Alert>
      )}

      <Card className="rs-card rs-card-static mb-4">
        <Card.Body>
          <div className="text-muted small">Available balance</div>
          <div className="fs-2 fw-bold text-primary">${bal.toFixed(2)}</div>
          <p className="small text-muted mb-0">Pending withdrawals reduce this balance until paid or rejected.</p>
        </Card.Body>
      </Card>

      <Card className="rs-card rs-card-static mb-4">
        <Card.Body>
          <h5 className="fw-bold">Request withdrawal</h5>
          <p className="small text-muted">Minimum {formatMoney(MIN_USD)}. Admin sends crypto to your address after review.</p>
          <Form onSubmit={request} className="row g-3">
            <div className="col-md-4">
              <Form.Label>Amount (USD)</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                min={MIN_USD}
                max={bal || undefined}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
              <Form.Text>
                <button type="button" className="btn btn-link btn-sm p-0" onClick={() => setAmount(bal > 0 ? bal.toFixed(2) : '')}>
                  Use max (${bal.toFixed(2)})
                </button>
              </Form.Text>
            </div>
            <div className="col-md-4">
              <Form.Label>Chain</Form.Label>
              <Form.Select value={chain} onChange={(e) => setChain(e.target.value)}>
                <option value="trx">TRX (Tron)</option>
                <option value="sol">SOL (Solana)</option>
                <option value="ton">TON</option>
              </Form.Select>
            </div>
            <div className="col-md-4">
              <Form.Label>Wallet address</Form.Label>
              <Form.Control
                value={addr}
                onChange={(e) => setAddr(e.target.value)}
                required
                placeholder="Your receive address"
                className="font-monospace"
              />
            </div>
            <div className="col-12">
              <Button type="submit" disabled={submitting || bal < MIN_USD}>
                {submitting ? 'Submitting…' : 'Request withdrawal'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>

      <h4 className="fw-bold">History</h4>
      <ListFilters
        search={search}
        onSearch={(v) => {
          setSearch(v)
          setPage(1)
        }}
        placeholder="Address, chain…"
        status={status}
        onStatus={(v) => {
          setStatus(v)
          setPage(1)
        }}
        statusOptions={[
          { value: 'all', label: 'All' },
          { value: 'pending', label: 'Pending' },
          { value: 'paid', label: 'Paid' },
          { value: 'rejected', label: 'Rejected' },
        ]}
        pageSize={pageSize}
        onPageSize={(n) => {
          setPageSize(n)
          setPage(1)
        }}
      />
      <Card className="rs-card rs-card-static">
        <Table size="sm" responsive className="mb-0">
          <thead>
            <tr>
              <th>Amount</th>
              <th>Chain</th>
              <th>Address</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {pg.slice.map((w) => (
              <tr key={w.id}>
                <td>{formatMoney(w.amount)}</td>
                <td>{w.crypto_chain.toUpperCase()}</td>
                <td className="small font-monospace text-truncate" style={{ maxWidth: 140 }}>
                  {w.wallet_address}
                </td>
                <td>{statusBadge(w.status)}</td>
                <td className="small">{new Date(w.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        {pg.slice.length === 0 && <EmptyState className="border-0">No withdrawals yet.</EmptyState>}
      </Card>
      <ListPagination page={pg.page} totalPages={pg.totalPages} total={pg.total} onPage={setPage} />
    </div>
  )
}

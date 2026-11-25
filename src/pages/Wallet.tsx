import { useEffect, useState } from 'react'
import { Alert, Badge, Button, Card, Form, Table, Spinner } from 'react-bootstrap'
import { ListFilters, ListPagination, paginate } from '../components/ListControls'
import { useAuth } from '../contexts/AuthContext'
import { supabase, supabaseConfigured } from '../lib/supabase'
import { BRAND } from '../lib/brand'
import { formatMoney } from '../lib/money'
import EmptyState from '../components/EmptyState'
import { useToast } from '../contexts/ToastContext'
import { NG_BANKS_FALLBACK } from '../lib/ngBanks'
import PageHeader from '../components/PageHeader'

type W = {
  id: string
  amount: number
  crypto_chain: string
  wallet_address: string
  status: string
  created_at: string
  method?: string | null
  bank_name?: string | null
  account_number?: string | null
  account_name?: string | null
}

type Bank = { code: string; name: string }

/** Minimum withdrawal in Naira */
const MIN_NGN = 1000

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
  const [method, setMethod] = useState<'bank' | 'crypto'>('bank')
  const [chain, setChain] = useState('trx')
  const [addr, setAddr] = useState('')
  const [banks, setBanks] = useState<Bank[]>([])
  const [bankCode, setBankCode] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [banksErr, setBanksErr] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const toast = useToast()

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

  useEffect(() => {
    if (method !== 'bank') return
    ;(async () => {
      try {
        const res = await fetch('/api/payments/flutterwave-banks')
        const text = await res.text()
        let j: { banks?: Bank[]; error?: string } = {}
        try {
          j = text ? JSON.parse(text) : {}
        } catch {
          // API returned HTML (e.g. Vercel 404 page) — use offline list
          setBanks(NG_BANKS_FALLBACK)
          setBanksErr(null)
          return
        }
        if (!res.ok) {
          setBanks(NG_BANKS_FALLBACK)
          setBanksErr(null)
          return
        }
        const list = j.banks && j.banks.length ? j.banks : NG_BANKS_FALLBACK
        setBanks(list)
        setBanksErr(null)
      } catch {
        setBanks(NG_BANKS_FALLBACK)
        setBanksErr(null)
      }
    })()
  }, [method])

  const request = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    const a = Number(amount)
    if (!supabaseConfigured || !user) return
    if (!a || a < MIN_NGN) {
      setErr(`Minimum withdrawal is ${formatMoney(MIN_NGN)}`)
      toast.error(`Minimum withdrawal is ${formatMoney(MIN_NGN)}`)
      return
    }
    if (a > Number(profile?.balance || 0)) {
      setErr('Amount exceeds available balance')
      return
    }
    setSubmitting(true)
    try {
      if (method === 'bank') {
        const { error } = await supabase.rpc('request_bank_withdrawal', {
          p_amount: a,
          p_bank_code: bankCode,
          p_bank_name: bankName,
          p_account_number: accountNumber.replace(/\D/g, ''),
          p_account_name: accountName.trim(),
        })
        if (error) {
          setErr(
            error.message.includes('function')
              ? 'Run supabase/withdrawals_bank.sql in Supabase, then try again.'
              : error.message
          )
          return
        }
        setMsg(`Bank withdrawal of ${formatMoney(a)} requested. Paid to your account after admin / Flutterwave processing.`)
        toast.success('Bank withdrawal requested')
        setAccountNumber('')
        setAccountName('')
      } else {
        if (addr.trim().length < 8) {
          setErr('Enter a valid wallet address')
          return
        }
        const { error } = await supabase.rpc('request_withdrawal', {
          p_amount: a,
          p_chain: chain,
          p_wallet: addr.trim(),
        })
        if (error) {
          setErr(
            error.message.includes('function')
              ? 'Run supabase/withdrawals_safe.sql and withdrawals_bank.sql'
              : error.message
          )
          return
        }
        setMsg(`Crypto withdrawal of ${formatMoney(a)} requested. Admin sends ${chain.toUpperCase()} after review.`)
        toast.success('Crypto withdrawal requested')
        setAddr('')
      }
      setAmount('')
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
    return (
      (w.wallet_address || '').toLowerCase().includes(q) ||
      (w.crypto_chain || '').toLowerCase().includes(q) ||
      (w.account_name || '').toLowerCase().includes(q) ||
      (w.bank_name || '').toLowerCase().includes(q)
    )
  })
  const pg = paginate(filtered, page, pageSize)

  return (
    <div className="page-enter">
      <PageHeader title="Wallet" lead="Balance in ₦. Withdraw to Nigerian bank or crypto. Minimum ₦1,000." />
      <p className="text-muted mb-4">
        Balance in <strong>₦ Naira</strong> on {BRAND}. Withdraw to <strong>Nigerian bank</strong> (Flutterwave) or crypto.
        Minimum {formatMoney(MIN_NGN)}.
      </p>

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
          <div className="text-muted small">Available balance (₦)</div>
          <div className="fs-2 fw-bold text-primary">{formatMoney(bal)}</div>
          <p className="small text-muted mb-0">Pending withdrawals reduce this balance until paid or rejected.</p>
        </Card.Body>
      </Card>

      <Card className="rs-card rs-card-static mb-4">
        <Card.Body>
          <h5 className="fw-bold">Request withdrawal</h5>
          <p className="small text-muted">Minimum {formatMoney(MIN_NGN)}. Amounts are always in Naira.</p>

          <div className="d-flex flex-wrap gap-2 mb-3">
            <Button type="button" size="sm" variant={method === 'bank' ? 'primary' : 'outline-primary'} onClick={() => setMethod('bank')}>
              <i className="bi bi-bank me-1" />
              Nigerian bank
            </Button>
            <Button type="button" size="sm" variant={method === 'crypto' ? 'primary' : 'outline-secondary'} onClick={() => setMethod('crypto')}>
              <i className="bi bi-currency-bitcoin me-1" />
              Crypto
            </Button>
          </div>

          <Form onSubmit={request} className="row g-3">
            <div className="col-md-4">
              <Form.Label>Amount (₦)</Form.Label>
              <Form.Control
                type="number"
                min={MIN_NGN}
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                placeholder={String(MIN_NGN)}
              />
              <button
                type="button"
                className="btn btn-link btn-sm p-0"
                onClick={() => setAmount(bal > 0 ? String(Math.floor(bal)) : '')}
              >
                Use max ({formatMoney(bal)})
              </button>
            </div>

            {method === 'bank' ? (
              <>
                <div className="col-md-8">
                  <Form.Label>Bank</Form.Label>
                  {banksErr && <div className="small text-danger mb-1">{banksErr}</div>}
                  <Form.Select
                    value={bankCode}
                    onChange={(e) => {
                      const code = e.target.value
                      setBankCode(code)
                      setBankName(banks.find((b) => b.code === code)?.name || '')
                    }}
                    required
                  >
                    <option value="">Select bank…</option>
                    {banks.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.name}
                      </option>
                    ))}
                  </Form.Select>
                </div>
                <div className="col-md-4">
                  <Form.Label>Account number</Form.Label>
                  <Form.Control
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    required
                    inputMode="numeric"
                    placeholder="10 digits"
                  />
                </div>
                <div className="col-md-4">
                  <Form.Label>Account name</Form.Label>
                  <Form.Control value={accountName} onChange={(e) => setAccountName(e.target.value)} required placeholder="As on bank account" />
                </div>
              </>
            ) : (
              <>
                <div className="col-md-4">
                  <Form.Label>Chain</Form.Label>
                  <Form.Select value={chain} onChange={(e) => setChain(e.target.value)}>
                    <option value="trx">TRX</option>
                    <option value="sol">SOL</option>
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
              </>
            )}

            <div className="col-12">
              <Button type="submit" disabled={submitting || bal < MIN_NGN}>
                {submitting ? 'Submitting…' : method === 'bank' ? 'Request bank payout' : 'Request crypto withdrawal'}
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
        placeholder="Bank, name, address…"
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
              <th>Amount (₦)</th>
              <th>Method</th>
              <th>Destination</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {pg.slice.map((w) => (
              <tr key={w.id}>
                <td>{formatMoney(w.amount)}</td>
                <td>{w.method === 'bank' || w.crypto_chain === 'ngn_bank' ? 'Bank' : (w.crypto_chain || '').toUpperCase()}</td>
                <td className="small">
                  {w.method === 'bank' || w.crypto_chain === 'ngn_bank' ? (
                    <>
                      {w.bank_name || 'Bank'} · {w.account_number || w.wallet_address}
                      {w.account_name ? <div className="text-muted">{w.account_name}</div> : null}
                    </>
                  ) : (
                    <span className="font-monospace text-truncate d-inline-block" style={{ maxWidth: 140 }}>
                      {w.wallet_address}
                    </span>
                  )}
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

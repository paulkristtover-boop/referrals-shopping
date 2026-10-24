import { useEffect, useState } from 'react'
import { Alert, Button, Card, Form, Table, Spinner } from 'react-bootstrap'
import { ListFilters, ListPagination, paginate } from '../components/ListControls'
import { useAuth } from '../contexts/AuthContext'
import { supabase, supabaseConfigured } from '../lib/supabase'

type W = { id: string; amount: number; crypto_chain: string; wallet_address: string; status: string; created_at: string }

export default function Wallet() {
  const { user, profile, refreshProfile } = useAuth()
  const [list, setList] = useState<W[]>([])
  const [amount, setAmount] = useState('')
  const [chain, setChain] = useState('trx')
  const [addr, setAddr] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const load = async () => {
    await refreshProfile()
    if (!supabaseConfigured) {
      setLoading(false)
      return
    }
    const { data } = await supabase.from('withdrawals').select('*').eq('user_id', user!.id).order('created_at', { ascending: false })
    setList((data as W[]) || [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [user?.id])

  const request = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    const a = parseFloat(amount)
    if (!a || a <= 0 || a > Number(profile?.balance || 0)) {
      setErr('Invalid amount')
      return
    }
    // Simple insert — admin will process; balance deducted via RPC or admin flow
    const { error } = await supabase.from('withdrawals').insert({
      user_id: user!.id,
      amount: a,
      crypto_chain: chain,
      wallet_address: addr,
      status: 'pending',
    })
    if (error) setErr(error.message)
    else {
      setMsg('Withdrawal requested.')
      setAmount('')
      setAddr('')
      void load()
    }
  }

  if (loading) return <div className="text-center py-5"><Spinner /></div>

  return (
    <>
      <h1 className="mb-3">Wallet</h1>
      {err && <Alert variant="danger">{err}</Alert>}
      {msg && <Alert variant="success">{msg}</Alert>}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <div className="text-muted small">Available balance</div>
          <div className="fs-2 fw-bold">${Number(profile?.balance ?? 0).toFixed(2)}</div>
        </Card.Body>
      </Card>
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <h5>Request withdrawal</h5>
          <Form onSubmit={request} className="row g-3">
            <div className="col-md-4">
              <Form.Label>Amount (USD)</Form.Label>
              <Form.Control type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
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
              <Form.Control value={addr} onChange={(e) => setAddr(e.target.value)} required />
            </div>
            <div className="col-12">
              <Button type="submit">Request withdrawal</Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
      <h4 className="fw-bold">History</h4>
      <ListFilters
        search={search}
        onSearch={(v) => { setSearch(v); setPage(1) }}
        placeholder="Address, chain…"
        status={status}
        onStatus={(v) => { setStatus(v); setPage(1) }}
        statusOptions={[
          { value: 'all', label: 'All' },
          { value: 'pending', label: 'Pending' },
          { value: 'paid', label: 'Paid' },
          { value: 'rejected', label: 'Rejected' },
        ]}
        pageSize={pageSize}
        onPageSize={(n) => { setPageSize(n); setPage(1) }}
      />
      {(() => {
        const q = search.trim().toLowerCase()
        const filtered = list.filter((w) => {
          if (status !== 'all' && w.status !== status) return false
          if (!q) return true
          return w.wallet_address.toLowerCase().includes(q) || w.crypto_chain.toLowerCase().includes(q)
        })
        const pg = paginate(filtered, page, pageSize)
        return (
          <>
            <Table size="sm" responsive>
              <thead><tr><th>Amount</th><th>Chain</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {pg.slice.map((w) => (
                  <tr key={w.id}>
                    <td>${Number(w.amount).toFixed(2)}</td>
                    <td>{w.crypto_chain.toUpperCase()}</td>
                    <td>{w.status}</td>
                    <td className="small">{new Date(w.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {pg.slice.length === 0 && <div className="empty-state">No withdrawals match filters.</div>}
            <ListPagination page={pg.page} totalPages={pg.totalPages} total={pg.total} onPage={setPage} />
          </>
        )
      })()}
    </>
  )
}

import { useEffect, useState } from 'react'
import { Alert, Badge, Button, Table, Spinner } from 'react-bootstrap'
import { supabase } from '../lib/supabase'
import { ListFilters, ListPagination, paginate } from '../components/ListControls'

export default function AdminPayments() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const load = async () => {
    const { data: camps } = await supabase
      .from('campaigns')
      .select('*, profiles(email), packages(name, price_usd)')
      .order('created_at', { ascending: false })
      .limit(200)
    setRows(camps || [])
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])
  useEffect(() => setPage(1), [search, status, pageSize])

  const confirm = async (id: string) => {
    const { error } = await supabase.rpc('admin_approve_campaign', { p_campaign_id: id })
    if (error) {
      await supabase.from('campaigns').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', id)
      await supabase.from('tasks').insert({ campaign_id: id, reward_amount: 0.1, wait_seconds: 15, active: true })
    }
    await supabase.from('payment_orders').update({ status: 'confirmed', confirmed_at: new Date().toISOString() }).eq('campaign_id', id)
    setMsg('Payment confirmed — promotion can start')
    void load()
  }

  const reject = async (id: string) => {
    await supabase.from('campaigns').update({ status: 'rejected' }).eq('id', id)
    await supabase.from('payment_orders').update({ status: 'rejected' }).eq('campaign_id', id)
    void load()
  }

  const q = search.trim().toLowerCase()
  const filtered = rows.filter((c) => {
    if (status !== 'all' && String(c.status) !== status) return false
    if (!q) return true
    return (
      String(c.title).toLowerCase().includes(q) ||
      String((c.profiles as { email?: string })?.email || '').toLowerCase().includes(q) ||
      String(c.pay_code || '').toLowerCase().includes(q) ||
      String(c.tx_hash || c.payment_note || '').toLowerCase().includes(q)
    )
  })
  const pg = paginate(filtered, page, pageSize)

  if (loading) return <div className="text-center py-5"><Spinner /></div>

  return (
    <div>
      <h1 className="fw-bold mb-3" style={{ color: '#fff' }}>Crypto payments</h1>
      <p className="text-white-50">Filter and confirm TX matches. Users also auto-check from the Promote page.</p>
      {msg && <Alert variant="success">{msg}</Alert>}
      <div className="admin-panel">
        <ListFilters
          search={search}
          onSearch={setSearch}
          placeholder="User, title, pay code, TX…"
          status={status}
          onStatus={setStatus}
          statusOptions={[
            { value: 'all', label: 'All' },
            { value: 'pending_payment', label: 'Awaiting payment' },
            { value: 'pending_approval', label: 'TX submitted' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
            { value: 'expired', label: 'Expired' },
          ]}
          pageSize={pageSize}
          onPageSize={setPageSize}
        />
        <Table size="sm" responsive hover>
          <thead>
            <tr><th>User</th><th>Order</th><th>Chain</th><th>Pay code / TX</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {pg.slice.map((c) => (
              <tr key={String(c.id)}>
                <td className="small">{String((c.profiles as { email?: string })?.email || '')}</td>
                <td>
                  {String(c.title)}
                  <div className="small">${Number(c.paid_amount || 0).toFixed(0)}</div>
                </td>
                <td>{String(c.crypto_chain || '').toUpperCase()}</td>
                <td className="small">
                  <div>{String(c.pay_code || '—')}</div>
                  <code>{String(c.tx_hash || c.payment_note || '')}</code>
                </td>
                <td><Badge bg="secondary">{String(c.status)}</Badge></td>
                <td className="text-nowrap">
                  {(c.status === 'pending_approval' || c.status === 'pending_payment') && (
                    <>
                      <Button size="sm" variant="success" className="me-1" onClick={() => void confirm(String(c.id))}>Confirm</Button>
                      <Button size="sm" variant="outline-danger" onClick={() => void reject(String(c.id))}>Reject</Button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        {pg.slice.length === 0 && <div className="empty-state">No payments match filters.</div>}
        <ListPagination page={pg.page} totalPages={pg.totalPages} total={pg.total} onPage={setPage} />
      </div>
    </div>
  )
}

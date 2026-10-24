import { useEffect, useState } from 'react'
import { Alert, Badge, Button, Table, Spinner } from 'react-bootstrap'
import { supabase } from '../lib/supabase'

export default function AdminPayments() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)

  const load = async () => {
    const { data: camps } = await supabase
      .from('campaigns')
      .select('*, profiles(email), packages(name, price_usd)')
      .in('status', ['pending_payment', 'pending_approval'])
      .order('created_at', { ascending: false })
    setRows(camps || [])
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

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

  if (loading) return <div className="text-center py-5"><Spinner /></div>

  return (
    <div>
      <h1 className="fw-bold mb-3" style={{ color: '#fff' }}>Crypto payments</h1>
      <p className="text-white-50">Confirm TX hashes and start promotion. Auto-queue = user submitted TX → you verify on-chain → Approve.</p>
      {msg && <Alert variant="success">{msg}</Alert>}
      <div className="admin-panel">
        <Table size="sm" responsive hover>
          <thead>
            <tr><th>User</th><th>Order</th><th>Chain</th><th>Pay code / TX</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((c) => (
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
                <td><Badge bg="warning">{String(c.status)}</Badge></td>
                <td className="text-nowrap">
                  {c.status === 'pending_approval' && (
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
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Alert, Button, Nav, Spinner, Table, Tab } from 'react-bootstrap'
import { supabase, supabaseConfigured } from '../lib/supabase'

export default function Admin() {
  const [campaigns, setCampaigns] = useState<Record<string, unknown>[]>([])
  const [subs, setSubs] = useState<Record<string, unknown>[]>([])
  const [withdrawals, setWithdrawals] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)

  const load = async () => {
    if (!supabaseConfigured) {
      setLoading(false)
      return
    }
    const [c, s, w] = await Promise.all([
      supabase.from('campaigns').select('*, packages(name, price_usd), profiles(email)').order('created_at', { ascending: false }).limit(50),
      supabase.from('task_submissions').select('*, profiles(email), tasks(reward_amount, campaigns(title))').order('created_at', { ascending: false }).limit(50),
      supabase.from('withdrawals').select('*, profiles(email)').order('created_at', { ascending: false }).limit(50),
    ])
    setCampaigns(c.data || [])
    setSubs(s.data || [])
    setWithdrawals(w.data || [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const approveCampaign = async (id: string) => {
    const { error } = await supabase.rpc('admin_approve_campaign', { p_campaign_id: id })
    if (error) {
      // fallback without RPC
      await supabase.from('campaigns').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', id)
      await supabase.from('tasks').insert({ campaign_id: id, reward_amount: 0.1, wait_seconds: 15, active: true })
    }
    setMsg('Campaign approved')
    void load()
  }

  const approveSub = async (id: string) => {
    const { error } = await supabase.rpc('admin_approve_submission', { p_submission_id: id })
    if (error) setMsg(error.message)
    else {
      setMsg('Submission approved')
      void load()
    }
  }

  if (loading) return <div className="text-center py-5"><Spinner /></div>

  return (
    <>
      <h1 className="mb-4">Admin</h1>
      {msg && <Alert variant="success">{msg}</Alert>}
      <Tab.Container defaultActiveKey="c">
        <Nav variant="tabs">
          <Nav.Item><Nav.Link eventKey="c">Campaigns</Nav.Link></Nav.Item>
          <Nav.Item><Nav.Link eventKey="s">Submissions</Nav.Link></Nav.Item>
          <Nav.Item><Nav.Link eventKey="w">Withdrawals</Nav.Link></Nav.Item>
        </Nav>
        <Tab.Content className="border border-top-0 p-3">
          <Tab.Pane eventKey="c">
            <Table size="sm" responsive>
              <thead><tr><th>Title</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={String(c.id)}>
                    <td>{String(c.title)}<div className="small text-muted">{String((c.profiles as { email?: string })?.email || '')}</div></td>
                    <td>{String(c.status)}</td>
                    <td>
                      {c.status === 'pending_approval' && (
                        <Button size="sm" variant="success" onClick={() => void approveCampaign(String(c.id))}>Approve</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Tab.Pane>
          <Tab.Pane eventKey="s">
            <Table size="sm" responsive>
              <thead><tr><th>User</th><th>Status</th><th>Shot</th><th></th></tr></thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={String(s.id)}>
                    <td className="small">{String((s.profiles as { email?: string })?.email || '')}</td>
                    <td>{String(s.status)}</td>
                    <td><a href={String(s.screenshot_url)} target="_blank" rel="noreferrer">View</a></td>
                    <td>
                      {s.status === 'pending' && (
                        <Button size="sm" variant="success" onClick={() => void approveSub(String(s.id))}>Approve</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Tab.Pane>
          <Tab.Pane eventKey="w">
            <Table size="sm" responsive>
              <thead><tr><th>User</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {withdrawals.map((w) => (
                  <tr key={String(w.id)}>
                    <td className="small">{String((w.profiles as { email?: string })?.email || '')}</td>
                    <td>${Number(w.amount).toFixed(2)}</td>
                    <td>{String(w.status)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>
    </>
  )
}

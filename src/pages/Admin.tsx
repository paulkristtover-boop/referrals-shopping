import { useEffect, useState } from 'react'
import { Alert, Badge, Button, Form, Nav, Spinner, Table, Row, Col, Modal } from 'react-bootstrap'
import { supabase, supabaseConfigured } from '../lib/supabase'
import type { Package } from '../lib/types'

type TabKey = 'overview' | 'campaigns' | 'submissions' | 'withdrawals' | 'packages' | 'users'

export default function Admin() {
  const [tab, setTab] = useState<TabKey>('overview')
  const [campaigns, setCampaigns] = useState<Record<string, unknown>[]>([])
  const [subs, setSubs] = useState<Record<string, unknown>[]>([])
  const [withdrawals, setWithdrawals] = useState<Record<string, unknown>[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [users, setUsers] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [pkgForm, setPkgForm] = useState({ name: '', category: 'regular', referrals: 1000, price_usd: 50 })
  const [showPkg, setShowPkg] = useState(false)

  const load = async () => {
    if (!supabaseConfigured) {
      setLoading(false)
      setErr('Supabase not configured')
      return
    }
    setLoading(true)
    setErr(null)
    const [c, s, w, p, u] = await Promise.all([
      supabase.from('campaigns').select('*, packages(name, price_usd), profiles(email)').order('created_at', { ascending: false }).limit(100),
      supabase.from('task_submissions').select('*, profiles(email), tasks(reward_amount, campaigns(title))').order('created_at', { ascending: false }).limit(100),
      supabase.from('withdrawals').select('*, profiles(email)').order('created_at', { ascending: false }).limit(100),
      supabase.from('packages').select('*').order('price_usd'),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(100),
    ])
    if (c.error || s.error || w.error) {
      setErr(c.error?.message || s.error?.message || w.error?.message || 'Load failed')
    }
    setCampaigns(c.data || [])
    setSubs(s.data || [])
    setWithdrawals(w.data || [])
    setPackages((p.data as Package[]) || [])
    setUsers(u.data || [])
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const flash = (m: string) => {
    setMsg(m)
    setTimeout(() => setMsg(null), 3000)
  }

  const approveCampaign = async (id: string) => {
    const { error } = await supabase.rpc('admin_approve_campaign', { p_campaign_id: id })
    if (error) {
      await supabase.from('campaigns').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', id)
      await supabase.from('tasks').insert({ campaign_id: id, reward_amount: 0.1, wait_seconds: 15, active: true })
    }
    flash('Campaign approved')
    void load()
  }

  const rejectCampaign = async (id: string) => {
    await supabase.from('campaigns').update({ status: 'rejected' }).eq('id', id)
    flash('Campaign rejected')
    void load()
  }

  const approveSub = async (id: string) => {
    const { error } = await supabase.rpc('admin_approve_submission', { p_submission_id: id })
    if (error) {
      setErr(error.message + ' — ensure RPCs ran from schema.sql')
      return
    }
    flash('Submission approved & balance credited')
    void load()
  }

  const rejectSub = async (id: string) => {
    await supabase.from('task_submissions').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', id)
    flash('Submission rejected')
    void load()
  }

  const payWithdrawal = async (id: string) => {
    await supabase.from('withdrawals').update({ status: 'paid', processed_at: new Date().toISOString() }).eq('id', id)
    flash('Marked as paid')
    void load()
  }

  const rejectWithdrawal = async (id: string, userId: string, amount: number) => {
    await supabase.from('withdrawals').update({ status: 'rejected', processed_at: new Date().toISOString() }).eq('id', id)
    // best-effort restore if column exists
    const { data: prof } = await supabase.from('profiles').select('balance').eq('id', userId).single()
    if (prof) {
      await supabase.from('profiles').update({ balance: Number(prof.balance) + amount }).eq('id', userId)
    }
    flash('Withdrawal rejected')
    void load()
  }

  const savePackage = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.from('packages').insert({
      name: pkgForm.name,
      category: pkgForm.category,
      referrals: pkgForm.referrals,
      price_usd: pkgForm.price_usd,
      active: true,
    })
    if (error) setErr(error.message)
    else {
      flash('Package added')
      setShowPkg(false)
      setPkgForm({ name: '', category: 'regular', referrals: 1000, price_usd: 50 })
      void load()
    }
  }

  const togglePackage = async (id: string, active: boolean) => {
    await supabase.from('packages').update({ active: !active }).eq('id', id)
    void load()
  }

  const setRole = async (id: string, role: string) => {
    await supabase.from('profiles').update({ role }).eq('id', id)
    flash(`Role set to ${role}`)
    void load()
  }

  const pendingC = campaigns.filter((c) => c.status === 'pending_approval').length
  const pendingS = subs.filter((s) => s.status === 'pending').length
  const pendingW = withdrawals.filter((w) => w.status === 'pending').length

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
      </div>
    )
  }

  return (
    <div className="page-enter">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h1 className="fw-bold mb-0">Admin CMS</h1>
          <p className="text-muted small mb-0">Manage campaigns, proofs, payouts & packages</p>
        </div>
        <Button size="sm" variant="outline-secondary" onClick={() => void load()}>
          <i className="bi bi-arrow-clockwise me-1" />Refresh
        </Button>
      </div>

      {msg && <Alert variant="success" onClose={() => setMsg(null)} dismissible>{msg}</Alert>}
      {err && <Alert variant="danger" onClose={() => setErr(null)} dismissible>{err}</Alert>}

      <Row className="g-3 mb-4">
        <Col xs={6} md={3}>
          <div className="stat-card">
            <div className="text-muted small">Pending campaigns</div>
            <div className="stat-value">{pendingC}</div>
          </div>
        </Col>
        <Col xs={6} md={3}>
          <div className="stat-card">
            <div className="text-muted small">Pending proofs</div>
            <div className="stat-value">{pendingS}</div>
          </div>
        </Col>
        <Col xs={6} md={3}>
          <div className="stat-card">
            <div className="text-muted small">Pending withdrawals</div>
            <div className="stat-value">{pendingW}</div>
          </div>
        </Col>
        <Col xs={6} md={3}>
          <div className="stat-card">
            <div className="text-muted small">Users</div>
            <div className="stat-value">{users.length}</div>
          </div>
        </Col>
      </Row>

      <div className="admin-shell">
        <Nav className="admin-side">
          {(
            [
              ['overview', 'Overview'],
              ['campaigns', `Campaigns${pendingC ? ` (${pendingC})` : ''}`],
              ['submissions', `Proofs${pendingS ? ` (${pendingS})` : ''}`],
              ['withdrawals', `Payouts${pendingW ? ` (${pendingW})` : ''}`],
              ['packages', 'Packages'],
              ['users', 'Users'],
            ] as [TabKey, string][]
          ).map(([k, label]) => (
            <Nav.Link key={k} active={tab === k} onClick={() => setTab(k)}>
              {label}
            </Nav.Link>
          ))}
        </Nav>

        <div className="admin-panel">
          {tab === 'overview' && (
            <div>
              <h5 className="fw-bold mb-3">Quick actions</h5>
              <p className="text-muted">
                Use the tabs above to approve campaigns, review screenshots, process withdrawals, edit packages, and manage user roles.
              </p>
              <ul>
                <li>Campaigns waiting: <strong>{pendingC}</strong></li>
                <li>Proofs waiting: <strong>{pendingS}</strong></li>
                <li>Payouts waiting: <strong>{pendingW}</strong></li>
              </ul>
            </div>
          )}

          {tab === 'campaigns' && (
            <Table size="sm" responsive hover>
              <thead>
                <tr><th>User</th><th>Title</th><th>Package</th><th>Chain</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={String(c.id)}>
                    <td className="small">{String((c.profiles as { email?: string })?.email || '')}</td>
                    <td>
                      {String(c.title)}
                      <div className="small"><a href={String(c.target_url)} target="_blank" rel="noreferrer">link</a></div>
                    </td>
                    <td className="small">{String((c.packages as { name?: string })?.name || '')}</td>
                    <td className="small">{String(c.crypto_chain || '').toUpperCase()}<div>{String(c.payment_note || '')}</div></td>
                    <td><Badge bg="secondary" className="badge-status">{String(c.status).replace(/_/g, ' ')}</Badge></td>
                    <td className="text-nowrap">
                      {c.status === 'pending_approval' && (
                        <>
                          <Button size="sm" variant="success" className="me-1" onClick={() => void approveCampaign(String(c.id))}>Approve</Button>
                          <Button size="sm" variant="outline-danger" onClick={() => void rejectCampaign(String(c.id))}>Reject</Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}

          {tab === 'submissions' && (
            <Table size="sm" responsive hover>
              <thead>
                <tr><th>User</th><th>Campaign</th><th>Reward</th><th>Shot</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={String(s.id)}>
                    <td className="small">{String((s.profiles as { email?: string })?.email || '')}</td>
                    <td className="small">{String((s.tasks as { campaigns?: { title?: string } })?.campaigns?.title || '')}</td>
                    <td>${Number((s.tasks as { reward_amount?: number })?.reward_amount || 0).toFixed(2)}</td>
                    <td><a href={String(s.screenshot_url)} target="_blank" rel="noreferrer">View</a></td>
                    <td><Badge className="badge-status" bg={s.status === 'pending' ? 'warning' : s.status === 'approved' ? 'success' : 'danger'}>{String(s.status)}</Badge></td>
                    <td className="text-nowrap">
                      {s.status === 'pending' && (
                        <>
                          <Button size="sm" variant="success" className="me-1" onClick={() => void approveSub(String(s.id))}>Approve</Button>
                          <Button size="sm" variant="outline-danger" onClick={() => void rejectSub(String(s.id))}>Reject</Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}

          {tab === 'withdrawals' && (
            <Table size="sm" responsive hover>
              <thead>
                <tr><th>User</th><th>Amount</th><th>Chain</th><th>Address</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {withdrawals.map((w) => (
                  <tr key={String(w.id)}>
                    <td className="small">{String((w.profiles as { email?: string })?.email || '')}</td>
                    <td>${Number(w.amount).toFixed(2)}</td>
                    <td>{String(w.crypto_chain).toUpperCase()}</td>
                    <td className="small">{String(w.wallet_address)}</td>
                    <td><Badge className="badge-status" bg="secondary">{String(w.status)}</Badge></td>
                    <td className="text-nowrap">
                      {w.status === 'pending' && (
                        <>
                          <Button size="sm" variant="success" className="me-1" onClick={() => void payWithdrawal(String(w.id))}>Paid</Button>
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => void rejectWithdrawal(String(w.id), String(w.user_id), Number(w.amount))}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}

          {tab === 'packages' && (
            <>
              <div className="d-flex justify-content-between mb-3">
                <h5 className="mb-0 fw-bold">Packages</h5>
                <Button size="sm" onClick={() => setShowPkg(true)}>+ Add package</Button>
              </div>
              <Table size="sm" responsive hover>
                <thead>
                  <tr><th>Name</th><th>Category</th><th>Referrals</th><th>Price</th><th>Active</th><th></th></tr>
                </thead>
                <tbody>
                  {packages.map((p) => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{p.category}</td>
                      <td>{p.referrals}</td>
                      <td>${Number(p.price_usd).toFixed(0)}</td>
                      <td>{(p as Package & { active?: boolean }).active === false ? 'No' : 'Yes'}</td>
                      <td>
                        <Button
                          size="sm"
                          variant="outline-secondary"
                          onClick={() => void togglePackage(p.id, (p as Package & { active?: boolean }).active !== false)}
                        >
                          Toggle
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <Modal show={showPkg} onHide={() => setShowPkg(false)} centered>
                <Modal.Header closeButton><Modal.Title>New package</Modal.Title></Modal.Header>
                <Form onSubmit={savePackage}>
                  <Modal.Body>
                    <Form.Group className="mb-2">
                      <Form.Label>Name</Form.Label>
                      <Form.Control value={pkgForm.name} onChange={(e) => setPkgForm({ ...pkgForm, name: e.target.value })} required />
                    </Form.Group>
                    <Form.Group className="mb-2">
                      <Form.Label>Category</Form.Label>
                      <Form.Select value={pkgForm.category} onChange={(e) => setPkgForm({ ...pkgForm, category: e.target.value })}>
                        <option value="regular">regular</option>
                        <option value="gambling">gambling</option>
                      </Form.Select>
                    </Form.Group>
                    <Form.Group className="mb-2">
                      <Form.Label>Referrals</Form.Label>
                      <Form.Control type="number" value={pkgForm.referrals} onChange={(e) => setPkgForm({ ...pkgForm, referrals: Number(e.target.value) })} />
                    </Form.Group>
                    <Form.Group className="mb-2">
                      <Form.Label>Price USD</Form.Label>
                      <Form.Control type="number" value={pkgForm.price_usd} onChange={(e) => setPkgForm({ ...pkgForm, price_usd: Number(e.target.value) })} />
                    </Form.Group>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowPkg(false)}>Cancel</Button>
                    <Button type="submit">Save</Button>
                  </Modal.Footer>
                </Form>
              </Modal>
            </>
          )}

          {tab === 'users' && (
            <Table size="sm" responsive hover>
              <thead>
                <tr><th>Email</th><th>Name</th><th>Balance</th><th>Role</th><th></th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={String(u.id)}>
                    <td className="small">{String(u.email || '')}</td>
                    <td>{String(u.full_name || '—')}</td>
                    <td>${Number(u.balance || 0).toFixed(2)}</td>
                    <td><Badge bg={u.role === 'admin' ? 'dark' : 'secondary'}>{String(u.role)}</Badge></td>
                    <td>
                      {u.role !== 'admin' ? (
                        <Button size="sm" variant="outline-dark" onClick={() => void setRole(String(u.id), 'admin')}>Make admin</Button>
                      ) : (
                        <Button size="sm" variant="outline-secondary" onClick={() => void setRole(String(u.id), 'user')}>Make user</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      </div>
    </div>
  )
}

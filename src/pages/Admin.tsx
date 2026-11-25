import { adStatusLabel, adStatusVariant } from '../lib/adStatus'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Alert, Badge, Button, Form, Nav, Spinner, Table, Row, Col, Modal, Card } from 'react-bootstrap'
import { supabase, supabaseConfigured } from '../lib/supabase'
import type { Package } from '../lib/types'
import { ListFilters, ListPagination, paginate } from '../components/ListControls'
import { BRAND, TG, IG, IG_HANDLE } from '../lib/brand'
import AdminBetCodes from '../components/AdminBetCodes'
import { formatMoney } from '../lib/money'
import { openWhatsAppUpdate } from '../lib/whatsapp'
import { useToast } from '../contexts/ToastContext'
import { notifyUser } from '../lib/notifications'

type TabKey = 'overview' | 'campaigns' | 'submissions' | 'withdrawals' | 'packages' | 'users' | 'codes' | 'settings'

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
  const [pkgForm, setPkgForm] = useState({ name: '', category: 'regular', referrals: 50, price_usd: 3500 })

  const [showPkg, setShowPkg] = useState(false)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [settings, setSettings] = useState({
    deposit_trx: '',
    deposit_sol: '',
    deposit_ton: '',
    tax_enabled: 'true',
    tax_rate_percent: '7.5',
    tax_mode: 'inclusive',
    tax_region: 'NG',
    tax_id: '',
    tax_supplier_name: 'Referrals Shopping',
    tax_supplier_address: '',
    tax_id_label: 'Tax ID / VAT No.',
  })
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [waMsg, setWaMsg] = useState('New tasks are live on Referrals Shopping. Open the app to Promote or Earn.')
  const toast = useToast()

  // reset page when tab/filter changes
  useEffect(() => { setPage(1) }, [tab, search, status, pageSize])

  const q = search.trim().toLowerCase()
  const match = (s: unknown) => String(s ?? '').toLowerCase().includes(q)

  const filteredCampaigns = campaigns.filter((c) => {
    if (status !== 'all' && String(c.status) !== status) return false
    if (!q) return true
    return match(c.title) || match((c.profiles as { email?: string })?.email) || match(c.pay_code) || match(c.tx_hash) || match(c.payment_note)
  })
  const filteredSubs = subs.filter((s) => {
    if (status !== 'all' && String(s.status) !== status) return false
    if (!q) return true
    return match((s.profiles as { email?: string })?.email) || match((s.tasks as { campaigns?: { title?: string } })?.campaigns?.title)
  })
  const filteredWd = withdrawals.filter((w) => {
    if (status !== 'all' && String(w.status) !== status) return false
    if (!q) return true
    return match((w.profiles as { email?: string })?.email) || match(w.wallet_address)
  })
  const filteredPkg = packages.filter((p) => {
    if (status === 'active' && (p as Package & { active?: boolean }).active === false) return false
    if (status === 'inactive' && (p as Package & { active?: boolean }).active !== false) return false
    if (!q) return true
    return match(p.name) || match(p.category)
  })
  // Users tab lists customers only — admins are never shown here
  const filteredUsers = users.filter((u) => {
    if (u.role === 'admin') return false
    if (!q) return true
    const id = String(u.id || '')
    return (
      match(u.email) ||
      match(u.full_name) ||
      match(u.invite_code) ||
      match(u.account_id) ||
      id.toLowerCase().includes(q) ||
      id.replace(/-/g, '').toLowerCase().includes(q.replace(/-/g, ''))
    )
  })

  const campPage = paginate(filteredCampaigns, page, pageSize)
  const subPage = paginate(filteredSubs, page, pageSize)
  const wdPage = paginate(filteredWd, page, pageSize)
  const pkgPage = paginate(filteredPkg, page, pageSize)
  const userPage = paginate(filteredUsers, page, pageSize)


  const load = async () => {
    if (!supabaseConfigured) {
      setLoading(false)
      setErr('Supabase not configured')
      return
    }
    setLoading(true)
    setErr(null)
    const [c, s, w, p, u] = await Promise.all([
      supabase.from('campaigns').select('*, packages(name, price_usd, category, referrals), profiles(email)').order('created_at', { ascending: false }).limit(100),
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
    setUsers(((u.data as Record<string, unknown>[]) || []).filter((row) => row.role !== 'admin'))
    const { data: dep } = await supabase.rpc('get_deposit_addresses')
    if (dep && typeof dep === 'object') {
      const d = dep as Record<string, string>
      setSettings((prev) => ({
        ...prev,
        deposit_trx: d.trx || '',
        deposit_sol: d.sol || '',
        deposit_ton: d.ton || '',
      }))
    }
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])


  const payBankFlw = async (id: string) => {
    setErr(null)
    const row = withdrawals.find((w) => String(w.id) === id)
    const uid = String(row?.user_id || '')
    const amount = Number(row?.amount || 0)
    try {
      const res = await fetch('/api/payments/flutterwave-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ withdrawalId: id }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Transfer failed')
      flash('Flutterwave bank transfer initiated')
      if (uid) {
        void notifyUser({
          userId: uid,
          title: 'Bank payout started',
          body: amount > 0
            ? `We started a bank transfer of ₦${amount.toLocaleString()} via Flutterwave.`
            : 'We started your bank payout via Flutterwave.',
          type: 'payment',
          link: '/wallet',
        })
      }
      void load()
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  const flash = (m: string) => {
    setMsg(m)
    setTimeout(() => setMsg(null), 3000)
  }

  const approveCampaign = async (id: string) => {
    const row = campaigns.find((c) => String(c.id) === id)
    const ownerId = String(row?.user_id || '')
    const title = String(row?.title || 'Your advert')
    const { error } = await supabase.rpc('admin_approve_campaign', { p_campaign_id: id })
    if (error) {
      await supabase.from('campaigns').update({ status: 'approved', approved_at: new Date().toISOString() }).eq('id', id)
      await supabase.from('tasks').insert({ campaign_id: id, reward_amount: 50, wait_seconds: 15, active: true })
    }
    flash('Campaign approved — tasks live')
    if (ownerId) {
      void notifyUser({
        userId: ownerId,
        title: 'Advert approved — tasks are live',
        body: `"${title}" is now earning referrals from the Earn board.`,
        type: 'success',
        link: '/dashboard',
      })
    }
    try {
      const { data: sess } = await supabase.auth.getSession()
      const token = sess.session?.access_token
      if (token) {
        await fetch('/api/whatsapp/notify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ event: 'task_live', campaignId: id }),
        })
      }
    } catch {
      /* WhatsApp optional */
    }
    void load()
  }

  const rejectCampaign = async (id: string) => {
    const row = campaigns.find((c) => String(c.id) === id)
    const ownerId = String(row?.user_id || '')
    const title = String(row?.title || 'Your advert')
    await supabase.from('campaigns').update({ status: 'rejected' }).eq('id', id)
    flash('Campaign rejected')
    if (ownerId) {
      void notifyUser({
        userId: ownerId,
        title: 'Advert not approved',
        body: `"${title}" was rejected. Open Promote to fix details or contact support.`,
        type: 'warning',
        link: '/promote',
      })
    }
    void load()
  }

  const approveSub = async (id: string) => {
    const row = subs.find((s) => String(s.id) === id)
    const earnerId = String(row?.user_id || '')
    const reward = Number((row?.tasks as { reward_amount?: number } | undefined)?.reward_amount || 0)
    const { error } = await supabase.rpc('admin_approve_submission', { p_submission_id: id })
    if (error) {
      setErr(error.message + ' — ensure RPCs ran from schema.sql')
      return
    }
    flash('Submission approved & balance credited')
    if (earnerId) {
      void notifyUser({
        userId: earnerId,
        title: 'Proof approved — balance credited',
        body: reward > 0 ? `Your earn proof was approved. ₦${reward.toLocaleString()} added to wallet.` : 'Your earn proof was approved.',
        type: 'success',
        link: '/wallet',
      })
    }
    void load()
  }

  const rejectSub = async (id: string) => {
    const row = subs.find((s) => String(s.id) === id)
    const earnerId = String(row?.user_id || '')
    await supabase.from('task_submissions').update({ status: 'rejected', reviewed_at: new Date().toISOString() }).eq('id', id)
    flash('Submission rejected')
    if (earnerId) {
      void notifyUser({
        userId: earnerId,
        title: 'Proof not accepted',
        body: 'Your screenshot was rejected. Try again with a clearer proof that matches the task rules.',
        type: 'warning',
        link: '/earn',
      })
    }
    void load()
  }

  const payWithdrawal = async (id: string) => {
    const row = withdrawals.find((w) => String(w.id) === id)
    const uid = String(row?.user_id || '')
    const amount = Number(row?.amount || 0)
    const { error } = await supabase.rpc('admin_mark_withdrawal_paid', { p_id: id })
    if (error) { await supabase.from('withdrawals').update({ status: 'paid', processed_at: new Date().toISOString() }).eq('id', id) }
    flash('Marked as paid')
    if (uid) {
      void notifyUser({
        userId: uid,
        title: 'Withdrawal paid',
        body: amount > 0 ? `Your withdrawal of ₦${amount.toLocaleString()} was marked paid.` : 'Your withdrawal was marked paid.',
        type: 'payment',
        link: '/wallet',
      })
    }
    void load()
  }

  const rejectWithdrawal = async (id: string, userId: string, amount: number) => {
    const { error } = await supabase.rpc('admin_reject_withdrawal', { p_id: id })
    if (error) {
      // Fallback only when RPC missing: reject + refund once
      await supabase.from('withdrawals').update({ status: 'rejected', processed_at: new Date().toISOString() }).eq('id', id)
      const { data: prof } = await supabase.from('profiles').select('balance').eq('id', userId).single()
      if (prof) {
        await supabase.from('profiles').update({ balance: Number(prof.balance) + amount }).eq('id', userId)
      }
      setErr(error.message + ' — used fallback reject; prefer withdrawals_safe.sql')
    } else {
      flash('Withdrawal rejected — balance refunded')
    }
    if (userId) {
      void notifyUser({
        userId,
        title: 'Withdrawal rejected',
        body: amount > 0
          ? `Your withdrawal of ₦${amount.toLocaleString()} was rejected. The amount was returned to your wallet.`
          : 'Your withdrawal was rejected and returned to your wallet.',
        type: 'warning',
        link: '/wallet',
      })
    }
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
      setPkgForm({ name: '', category: 'regular', referrals: 50, price_usd: 3500 })
      void load()
    }
  }

  const togglePackage = async (id: string, active: boolean) => {
    await supabase.from('packages').update({ active: !active }).eq('id', id)
    void load()
  }

  const setDelivered = async (id: string, value: string) => {
    const n = Math.max(0, parseInt(value, 10) || 0)
    const { error } = await supabase.rpc('admin_set_delivery', { p_campaign_id: id, p_delivered: n })
    if (error) {
      await supabase.from('campaigns').update({ referrals_delivered: n }).eq('id', id)
      setMsg(`Progress set to ${n} (run campaign_lifecycle.sql for auto-complete)`)
    } else {
      setMsg(`Delivery updated to ${n} — auto-completes when goal reached`)
    }
    void load()
  }

  const [adminToken, setAdminToken] = useState('')
  const [lastAdminToken, setLastAdminToken] = useState<string | null>(null)
  const [promoteUserId, setPromoteUserId] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [userDetail, setUserDetail] = useState<Record<string, unknown> | null>(null)
  const [userLogs, setUserLogs] = useState<{
    campaigns: Record<string, unknown>[]
    submissions: Record<string, unknown>[]
    payments: Record<string, unknown>[]
    withdrawals: Record<string, unknown>[]
    tickets: Record<string, unknown>[]
  }>({ campaigns: [], submissions: [], payments: [], withdrawals: [], tickets: [] })
  const [userLogLoading, setUserLogLoading] = useState(false)
  const [uuidSearch, setUuidSearch] = useState('')

  const createAdminInvite = async () => {
    const { data, error } = await supabase.rpc('create_admin_invite', { p_note: 'admin-promote' })
    if (error) {
      setErr(error.message + ' — run supabase/invites_admin.sql')
      return
    }
    const tok = String(data)
    setLastAdminToken(tok)
    setAdminToken(tok)
    flash('Unique admin UUID created — use it once to promote a user')
  }

  const promoteWithToken = async (userId: string) => {
    const tok = adminToken.trim()
    if (!tok) {
      setErr('Paste a unique admin invite UUID first (generate one below)')
      return
    }
    const { error } = await supabase.rpc('promote_admin_with_token', {
      p_user_id: userId,
      p_token: tok,
    })
    if (error) {
      setErr(error.message)
      return
    }
    flash('User promoted to admin (token consumed)')
    setAdminToken('')
    setPromoteUserId(null)
    setLastAdminToken(null)
    void load()
  }

  const demoteAdmin = async (userId: string) => {
    const { error } = await supabase.rpc('demote_admin', { p_user_id: userId })
    if (error) {
      // fallback
      await supabase.from('profiles').update({ role: 'user' }).eq('id', userId)
    }
    flash('Admin demoted to user')
    void load()
  }

  const setRole = async (id: string, role: string) => {
    if (role === 'admin') {
      setPromoteUserId(id)
      return
    }
    await demoteAdmin(id)
  }

  const openUserAccount = async (userId: string) => {
    setSelectedUserId(userId)
    setUserLogLoading(true)
    setUserDetail(null)
    try {
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
      setUserDetail((prof as Record<string, unknown>) || { id: userId })

      const [c, s, pay, w, tick] = await Promise.all([
        supabase.from('campaigns').select('*, packages(name, category, referrals)').eq('user_id', userId).order('created_at', { ascending: false }).limit(30),
        supabase.from('task_submissions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(30),
        supabase.from('payment_orders').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(30),
        supabase.from('withdrawals').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(30),
        supabase.from('support_tickets').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
      ])
      setUserLogs({
        campaigns: (c.data as Record<string, unknown>[]) || [],
        submissions: (s.data as Record<string, unknown>[]) || [],
        payments: (pay.data as Record<string, unknown>[]) || [],
        withdrawals: (w.data as Record<string, unknown>[]) || [],
        tickets: (tick.data as Record<string, unknown>[]) || [],
      })
    } finally {
      setUserLogLoading(false)
    }
  }

  const findByUuid = async () => {
    const raw = uuidSearch.trim()
    if (!raw) return
    const low = raw.toLowerCase()
    const found = users.find((u) => {
      const id = String(u.id || '').toLowerCase()
      const aid = String(u.account_id || '').toLowerCase()
      return (
        aid === low ||
        id === low ||
        id.replace(/-/g, '') === low.replace(/-/g, '') ||
        id.includes(low) ||
        aid.includes(low)
      )
    })
    if (found) {
      void openUserAccount(String(found.id))
      return
    }
    // RS-##### via RPC
    const { data: rid } = await supabase.rpc('resolve_account_id', { p_code: raw })
    if (rid) {
      const { data: prof } = await supabase.from('profiles').select('id, role').eq('id', rid).maybeSingle()
      if (prof?.role === 'admin') {
        setErr('That Account ID belongs to an admin — admins are not listed as users.')
        return
      }
      void openUserAccount(String(rid))
      return
    }
    // Internal UUID fallback (support/debug)
    const { data, error } = await supabase.from('profiles').select('id, role').eq('id', raw).maybeSingle()
    if (error || !data) {
      setErr('No user with that Account ID.')
      return
    }
    if (data.role === 'admin') {
      setErr('That Account ID belongs to an admin — admins are not listed as users.')
      return
    }
    void openUserAccount(String(data.id))
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
      <div className="admin-shell d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <p className="small text-uppercase mb-1 opacity-75 fw-semibold">CMS</p>
          <h1 className="fw-bold mb-0 h3">{BRAND} Admin</h1>
          <p className="small mb-0 opacity-90">Approve links · delivery · proofs · payouts · packages · compliance</p>
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

      <div className="admin-layout">
        <Nav className="admin-nav admin-side">
          {(
            [
              ['overview', 'Overview'],
              ['campaigns', `Adverts${pendingC ? ` (${pendingC})` : ''}`],
              ['submissions', `Proofs${pendingS ? ` (${pendingS})` : ''}`],
              ['withdrawals', `Payouts${pendingW ? ` (${pendingW})` : ''}`],
              ['packages', 'Packages'],
              ['users', 'Users'],
              ['codes', 'Codes'],
              ['settings', 'Settings'],
            ] as [TabKey, string][]
          ).map(([k, label]) => (
            <Nav.Link key={k} active={tab === k} onClick={() => setTab(k)}>
              {label}
            </Nav.Link>
          ))}
        </Nav>

        <div className="admin-panel">
          {tab === 'overview' && (
            <>

            <Card className="rs-card rs-card-static mb-4">
              <Card.Body>
                <h5 className="fw-bold">Compliance checklist</h5>
                <p className="small text-muted">Keep these current for a lawful marketplace posture.</p>
                <ul className="admin-check-list">
                  <li><i className="bi bi-shield-check" /><span><Link to="/terms">Terms</Link>, <Link to="/privacy">Privacy</Link>, <Link to="/refunds">Refunds</Link> published on the site</span></li>
                  <li><i className="bi bi-cash-stack" /><span>Tax settings: supplier name + tax ID (Settings tab)</span></li>
                  <li><i className="bi bi-credit-card" /><span>Flutterwave keys + webhook live; only real payments marked paid</span></li>
                  <li><i className="bi bi-link-45deg" /><span>Reject illegal or deceptive campaign links before approval</span></li>
                  <li><i className="bi bi-people" /><span>Earn proofs reviewed fairly; no self-task abuse</span></li>
                  <li><i className="bi bi-bank" /><span>Withdrawals: ₦ minimum enforced; bank payouts only to verified requests</span></li>
                </ul>
              </Card.Body>
            </Card>

            <div>
              <h5 className="fw-bold mb-3">Quick actions</h5>
              <p className="text-muted">
                Run the marketplace: approve Promote links so Earn tasks go live; update delivery counts; review proofs and disputes; process withdrawals; manage packages. Delivery = completed earner tasks, not automatic magic.
              </p>
              <ul className="mb-3">
                <li>Adverts waiting payment review: <strong>{pendingC}</strong></li>
                <li>Proofs waiting: <strong>{pendingS}</strong></li>
                <li>Payouts waiting: <strong>{pendingW}</strong></li>
              </ul>
              <div className="d-flex flex-wrap gap-2">
                <a href={TG} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-primary">
                  <i className="bi bi-telegram me-1" />Telegram
                </a>
                <a href={IG} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-danger">
                  <i className="bi bi-instagram me-1" />{IG_HANDLE}
                </a>
                <a href="/legal" className="btn btn-sm btn-outline-secondary">Legal hub</a>
              </div>
            </div>
            </>
          )}

          {tab === 'campaigns' && (
            <>
            <ListFilters
              search={search}
              onSearch={setSearch}
              placeholder="Email, title, pay code, TX…"
              status={status}
              onStatus={setStatus}
              statusOptions={[
                { value: 'all', label: 'All statuses' },
                { value: 'pending_payment', label: 'Pending payment' },
                { value: 'pending_approval', label: 'Pending approval' },
                { value: 'approved', label: 'Approved' },
                { value: 'rejected', label: 'Rejected' },
                { value: 'expired', label: 'Expired' },
              ]}
              pageSize={pageSize}
              onPageSize={setPageSize}
            />
            <p className="small text-muted">Advert management — approve payments, set referrals delivered (signup-only vs deposit packages).</p>
            <Table size="sm" responsive hover>
              <thead>
                <tr><th>User</th><th>Advert</th><th>Package / rule</th><th>Pay</th><th>Status</th><th>Delivered</th><th></th></tr>
              </thead>
              <tbody>
                {campPage.slice.map((c) => {
                  const cat = String((c.packages as { category?: string })?.category || 'regular')
                  const goal = Number((c.packages as { referrals?: number })?.referrals || 0)
                  return (
                  <tr key={String(c.id)}>
                    <td className="small">{String((c.profiles as { email?: string })?.email || '')}</td>
                    <td>
                      {String(c.title)}
                      <div className="small"><a href={String(c.target_url)} target="_blank" rel="noreferrer">link</a></div>
                      {c.description ? <div className="small text-muted text-truncate" style={{ maxWidth: 180 }}>{String(c.description)}</div> : null}
                      {c.sample_screenshot_url ? (
                        <a href={String(c.sample_screenshot_url)} target="_blank" rel="noreferrer" className="small">sample</a>
                      ) : null}
                    </td>
                    <td className="small">
                      {String((c.packages as { name?: string })?.name || '')}
                      <div className="text-muted">{cat === 'gambling' ? 'Account + deposit' : 'Signup only'}</div>
                    </td>
                    <td className="small">{String(c.crypto_chain || '').toUpperCase() || 'FREE'}
                      <div className="text-truncate" style={{ maxWidth: 90 }}>{String(c.payment_note || c.tx_hash || '')}</div>
                    </td>
                    <td><Badge bg="secondary" className="badge-status">{String(c.status).replace(/_/g, ' ')}</Badge></td>
                    <td style={{ maxWidth: 110 }}>
                      <Form.Control
                        size="sm"
                        type="number"
                        min={0}
                        defaultValue={Number(c.referrals_delivered || 0)}
                        key={`${c.id}-${c.referrals_delivered}`}
                        onBlur={(e) => void setDelivered(String(c.id), e.target.value)}
                      />
                      <div className="small text-muted">/ {goal || '—'}</div>
                    </td>
                    <td className="text-nowrap">
                      {(c.status === 'pending_approval' || c.status === 'pending_payment') && (
                        <>
                          <Button size="sm" variant="success" className="me-1" onClick={() => void approveCampaign(String(c.id))}>Approve</Button>
                          <Button size="sm" variant="outline-danger" onClick={() => void rejectCampaign(String(c.id))}>Reject</Button>
                        </>
                      )}
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </Table>
            <ListPagination page={campPage.page} totalPages={campPage.totalPages} total={campPage.total} onPage={setPage} />
            </>
          )}

          {tab === 'submissions' && (
            <>
            <ListFilters
              search={search}
              onSearch={setSearch}
              placeholder="Email, campaign…"
              status={status}
              onStatus={setStatus}
              statusOptions={[
                { value: 'all', label: 'All statuses' },
                { value: 'pending', label: 'Pending' },
                { value: 'disputed', label: 'Disputes' },
                { value: 'approved', label: 'Approved' },
                { value: 'rejected', label: 'Rejected' },
              ]}
              pageSize={pageSize}
              onPageSize={setPageSize}
            />
            <Table size="sm" responsive hover>
              <thead>
                <tr><th>User</th><th>Campaign</th><th>Reward</th><th>Shot</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {subPage.slice.map((s) => (
                  <tr key={String(s.id)}>
                    <td className="small">{String((s.profiles as { email?: string })?.email || '')}</td>
                    <td className="small">{String((s.tasks as { campaigns?: { title?: string } })?.campaigns?.title || '')}</td>
                    <td>{formatMoney((s.tasks as { reward_amount?: number })?.reward_amount || 0)}</td>
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
            <ListPagination page={subPage.page} totalPages={subPage.totalPages} total={subPage.total} onPage={setPage} />
            </>
          )}

          {tab === 'withdrawals' && (
            <>
            <ListFilters
              search={search}
              onSearch={setSearch}
              placeholder="Email, address…"
              status={status}
              onStatus={setStatus}
              statusOptions={[
                { value: 'all', label: 'All statuses' },
                { value: 'pending', label: 'Pending' },
                { value: 'disputed', label: 'Disputes' },
                { value: 'paid', label: 'Paid' },
                { value: 'rejected', label: 'Rejected' },
              ]}
              pageSize={pageSize}
              onPageSize={setPageSize}
            />
            <Table size="sm" responsive hover>
              <thead>
                <tr><th>User</th><th>Amount (₦)</th><th>Method</th><th>Destination</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {wdPage.slice.map((w) => (
                  <tr key={String(w.id)}>
                    <td className="small">{String((w.profiles as { email?: string })?.email || '')}</td>
                    <td>{formatMoney(w.amount)}</td>
                    <td className="small">{w.method === 'bank' || w.crypto_chain === 'ngn_bank' ? 'Bank' : String(w.crypto_chain).toUpperCase()}</td>
                    <td className="small">{w.method === 'bank' || w.crypto_chain === 'ngn_bank'
                      ? `${w.bank_name || 'Bank'} · ${w.account_number || w.wallet_address}${w.account_name ? ' · ' + w.account_name : ''}`
                      : String(w.wallet_address)}</td>
                    <td><Badge className="badge-status" bg="secondary">{String(w.status)}</Badge></td>
                    <td className="text-nowrap">
                      {w.status === 'pending' && (
                        <>
                          {(w.method === 'bank' || w.crypto_chain === 'ngn_bank') && (
                            <Button size="sm" variant="primary" className="me-1" onClick={() => void payBankFlw(String(w.id))}>
                              Pay bank (FLW)
                            </Button>
                          )}
                          <Button size="sm" variant="success" className="me-1" onClick={() => void payWithdrawal(String(w.id))}>
                            Mark paid
                          </Button>
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
            <ListPagination page={wdPage.page} totalPages={wdPage.totalPages} total={wdPage.total} onPage={setPage} />
            </>
          )}

          {tab === 'packages' && (
            <>
              <div className="d-flex justify-content-between mb-3">
                <h5 className="mb-0 fw-bold">Ad packages (micro budgets)</h5>
                <Button size="sm" onClick={() => setShowPkg(true)}>+ Add package</Button>
              </div>
              <ListFilters
                search={search}
                onSearch={setSearch}
                placeholder="Name, category…"
                status={status}
                onStatus={setStatus}
                statusOptions={[
                  { value: 'all', label: 'All' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ]}
                pageSize={pageSize}
                onPageSize={setPageSize}
              />
              <Table size="sm" responsive hover>
                <thead>
                  <tr><th>Name</th><th>Category</th><th>Referrals</th><th>Price (₦)</th><th>Active</th><th></th></tr>
                </thead>
                <tbody>
                  {pkgPage.slice.map((p) => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{p.category}</td>
                      <td>{p.referrals}</td>
                      <td>{formatMoney(p.price_usd)}</td>
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
              <ListPagination page={pkgPage.page} totalPages={pkgPage.totalPages} total={pkgPage.total} onPage={setPage} />
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
                      <Form.Label>Price (₦)</Form.Label>
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
            <>
            <Alert variant="light" className="border small mb-3">
              <strong>Admin invites are unique UUIDs (one-time).</strong> Generate a token, then promote a user with it.
              Direct “make admin” without a token is blocked after you run <code>invites_admin.sql</code>.
            </Alert>
            <div className="d-flex flex-wrap gap-2 align-items-end mb-3">
              <Form.Group className="mb-0" style={{ minWidth: 260, flex: 1 }}>
                <Form.Label className="small mb-0">Find account by Account ID</Form.Label>
                <Form.Control
                  size="sm"
                  value={uuidSearch}
                  onChange={(e) => setUuidSearch(e.target.value.trim())}
                  placeholder="RS-10042 or email"
                  className="font-monospace"
                />
              </Form.Group>
              <Button size="sm" variant="primary" onClick={() => void findByUuid()}>
                Open account
              </Button>
              <Button size="sm" variant="dark" onClick={() => void createAdminInvite()}>
                Generate admin UUID
              </Button>
              <Form.Group className="mb-0" style={{ minWidth: 280, flex: 1 }}>
                <Form.Label className="small mb-0">Admin invite UUID</Form.Label>
                <Form.Control
                  size="sm"
                  value={adminToken}
                  onChange={(e) => setAdminToken(e.target.value.trim())}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="font-monospace"
                />
              </Form.Group>
              {lastAdminToken && (
                <Button
                  size="sm"
                  variant="outline-secondary"
                  onClick={() => void navigator.clipboard.writeText(lastAdminToken)}
                >
                  Copy last UUID
                </Button>
              )}
            </div>
            {promoteUserId && (
              <Alert variant="info" className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                <span className="small">Promote user <code>{promoteUserId.slice(0, 8)}…</code> with the UUID above?</span>
                <span>
                  <Button size="sm" variant="dark" className="me-1" onClick={() => void promoteWithToken(promoteUserId)}>
                    Confirm promote
                  </Button>
                  <Button size="sm" variant="outline-secondary" onClick={() => setPromoteUserId(null)}>
                    Cancel
                  </Button>
                </span>
              </Alert>
            )}
            <ListFilters
              search={search}
              onSearch={setSearch}
              placeholder="Email, name, or RS-10042…"
              status={status}
              onStatus={setStatus}
              statusOptions={[
                { value: 'all', label: 'All users' },
              ]}
              pageSize={pageSize}
              onPageSize={setPageSize}
            />
            <p className="small text-muted mb-2">Customer accounts only — admin accounts are hidden from this list.</p>
            <Table size="sm" responsive hover>
              <thead>
                <tr><th>Email</th><th>Name</th><th>Account ID</th><th>Balance</th><th>Role</th><th></th></tr>
              </thead>
              <tbody>
                {userPage.slice.map((u) => (
                  <tr key={String(u.id)}>
                    <td className="small">{String(u.email || '')}</td>
                    <td>{String(u.full_name || '—')}</td>
                    <td className="small">
                      <code className="user-select-all fw-semibold">{String(u.account_id || '—')}</code>
                      {u.account_id ? (
                        <Button
                          size="sm"
                          variant="link"
                          className="p-0 ms-1"
                          onClick={() => void navigator.clipboard.writeText(String(u.account_id))}
                        >
                          Copy
                        </Button>
                      ) : null}
                    </td>
                    <td>{formatMoney(u.balance || 0)}</td>
                    <td><Badge bg={u.role === 'admin' ? 'dark' : 'secondary'}>{String(u.role)}</Badge></td>
                    <td className="text-nowrap">
                      <Button size="sm" variant="outline-primary" className="me-1" onClick={() => void openUserAccount(String(u.id))}>
                        View
                      </Button>
                      {u.role !== 'admin' ? (
                        <Button size="sm" variant="outline-dark" onClick={() => void setRole(String(u.id), 'admin')}>
                          Promote
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline-secondary" onClick={() => void setRole(String(u.id), 'user')}>
                          Demote
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <ListPagination page={userPage.page} totalPages={userPage.totalPages} total={userPage.total} onPage={setPage} />

            <Modal show={!!selectedUserId} onHide={() => setSelectedUserId(null)} size="lg" scrollable>
              <Modal.Header closeButton>
                <Modal.Title>User account</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                {userLogLoading && <div className="text-center py-4"><Spinner /></div>}
                {!userLogLoading && userDetail && (
                  <>
                    <div className="mb-3">
                      <div className="text-muted small">Account ID</div>
                      <code className="user-select-all fs-5 fw-bold">{String(userDetail.account_id || '—')}</code>
                      {userDetail.account_id ? (
                        <Button size="sm" variant="link" onClick={() => void navigator.clipboard.writeText(String(userDetail.account_id))}>Copy</Button>
                      ) : null}
                      <div className="text-muted small mt-2">Internal UUID (system only)</div>
                      <code className="user-select-all small text-muted">{String(userDetail.id)}</code>
                    </div>
                    <Row className="g-2 mb-3 small">
                      <Col md={6}><strong>Email:</strong> {String(userDetail.email || '—')}</Col>
                      <Col md={6}><strong>Name:</strong> {String(userDetail.full_name || '—')}</Col>
                      <Col md={6}>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={async () => {
                            const { error } = await supabase.rpc('admin_verify_display_name', { p_user_id: String(userDetail.id) })
                            if (error) setErr(error.message + ' — run name_lock.sql')
                            else {
                              flash('Name verified — user can change it once')
                              setUserDetail({ ...userDetail, name_verified: true })
                            }
                          }}
                        >
                          Verify name (unlock one change)
                        </Button>
                      </Col>
                      <Col md={6}><strong>Role:</strong> {String(userDetail.role || 'user')}</Col>
                      <Col md={6}><strong>Balance:</strong> {formatMoney(userDetail.balance || 0)}</Col>
                      <Col md={6}><strong>Invite code:</strong> <code>{String(userDetail.invite_code || '—')}</code></Col>
                      <Col md={6}><strong>Free starter:</strong> {userDetail.free_starter_used_at ? 'Used' : 'Available'}</Col>
                      <Col md={6}><strong>Joined:</strong> {userDetail.created_at ? new Date(String(userDetail.created_at)).toLocaleString() : '—'}</Col>
                      <Col md={6}><strong>Last seen:</strong> {userDetail.last_seen_at ? new Date(String(userDetail.last_seen_at)).toLocaleString() : '—'}</Col>
                    </Row>

                    <h6 className="fw-bold">Adverts / campaigns ({userLogs.campaigns.length})</h6>
                    {userLogs.campaigns.length === 0 ? <p className="small text-muted">None</p> : (
                      <Table size="sm" responsive className="mb-3">
                        <thead><tr><th>Title</th><th>Status</th><th>Delivered</th><th>When</th></tr></thead>
                        <tbody>
                          {userLogs.campaigns.map((c) => (
                            <tr key={String(c.id)}>
                              <td className="small">
                                {String(c.title)}
                                <div className="text-muted">{String((c.packages as { name?: string })?.name || '')}</div>
                              </td>
                              <td className="small">{String(c.status)}</td>
                              <td className="small">{Number(c.referrals_delivered || 0)}</td>
                              <td className="small">{c.created_at ? new Date(String(c.created_at)).toLocaleString() : ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    )}

                    <h6 className="fw-bold">Payment orders ({userLogs.payments.length})</h6>
                    {userLogs.payments.length === 0 ? <p className="small text-muted">None</p> : (
                      <Table size="sm" responsive className="mb-3">
                        <thead><tr><th>Amount</th><th>Chain</th><th>Status</th><th>When</th></tr></thead>
                        <tbody>
                          {userLogs.payments.map((c) => (
                            <tr key={String(c.id)}>
                              <td className="small">{formatMoney(c.amount_usd || 0)}</td>
                              <td className="small">{String(c.crypto_chain || '').toUpperCase()}</td>
                              <td className="small">{String(c.status)}</td>
                              <td className="small">{c.created_at ? new Date(String(c.created_at)).toLocaleString() : ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    )}

                    <h6 className="fw-bold">Earn submissions ({userLogs.submissions.length})</h6>
                    {userLogs.submissions.length === 0 ? <p className="small text-muted">None</p> : (
                      <Table size="sm" responsive className="mb-3">
                        <thead><tr><th>Status</th><th>Proof</th><th>When</th></tr></thead>
                        <tbody>
                          {userLogs.submissions.map((c) => (
                            <tr key={String(c.id)}>
                              <td className="small">{String(c.status)}</td>
                              <td className="small">{c.screenshot_url ? <a href={String(c.screenshot_url)} target="_blank" rel="noreferrer">view</a> : '—'}</td>
                              <td className="small">{c.created_at ? new Date(String(c.created_at)).toLocaleString() : ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    )}

                    <h6 className="fw-bold">Withdrawals ({userLogs.withdrawals.length})</h6>
                    {userLogs.withdrawals.length === 0 ? <p className="small text-muted">None</p> : (
                      <Table size="sm" responsive className="mb-3">
                        <thead><tr><th>Amount</th><th>Status</th><th>Wallet</th><th>When</th></tr></thead>
                        <tbody>
                          {userLogs.withdrawals.map((c) => (
                            <tr key={String(c.id)}>
                              <td className="small">{formatMoney(c.amount || 0)}</td>
                              <td className="small">{String(c.status)}</td>
                              <td className="small text-truncate" style={{ maxWidth: 120 }}>{String(c.wallet_address || '')}</td>
                              <td className="small">{c.created_at ? new Date(String(c.created_at)).toLocaleString() : ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    )}

                    <h6 className="fw-bold">Support tickets ({userLogs.tickets.length})</h6>
                    {userLogs.tickets.length === 0 ? <p className="small text-muted mb-0">None</p> : (
                      <Table size="sm" responsive className="mb-0">
                        <thead><tr><th>Subject</th><th>Status</th><th>When</th></tr></thead>
                        <tbody>
                          {userLogs.tickets.map((c) => (
                            <tr key={String(c.id)}>
                              <td className="small">{String(c.subject)}</td>
                              <td className="small">{String(c.status)}</td>
                              <td className="small">{c.created_at ? new Date(String(c.created_at)).toLocaleString() : ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    )}
                  </>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={() => setSelectedUserId(null)}>Close</Button>
              </Modal.Footer>
            </Modal>

            </>
          )}

          {tab === 'codes' && (
            <div>
              <h2 className="h5 fw-bold mb-3">Booking codes</h2>
              <AdminBetCodes />
            </div>
          )}

          {tab === 'settings' && (
            <>
              <h5 className="fw-bold mb-2">Platform settings</h5>
              <p className="small text-muted mb-3">
                Deposit wallets shown to customers when they pay for referral packages. Saved in the database (overrides env if set).
                Run <code>supabase/platform_settings.sql</code> once.
              </p>
              <Form
                className="row g-3"
                onSubmit={async (e) => {
                  e.preventDefault()
                  setSettingsSaving(true)
                  setErr(null)
                  try {
                    for (const [key, value] of [
                      ['deposit_trx', settings.deposit_trx],
                      ['deposit_sol', settings.deposit_sol],
                      ['deposit_ton', settings.deposit_ton],
                    ] as const) {
                      const { error } = await supabase.rpc('admin_set_setting', { p_key: key, p_value: value })
                      if (error) throw error
                    }
                    flash('Deposit addresses saved')
                  } catch (err: unknown) {
                    setErr(err instanceof Error ? err.message : 'Save failed — run platform_settings.sql')
                  } finally {
                    setSettingsSaving(false)
                  }
                }}
              >
                <div className="col-12">
                  <Form.Label>TRX deposit address</Form.Label>
                  <Form.Control
                    className="font-monospace"
                    value={settings.deposit_trx}
                    onChange={(e) => setSettings((s) => ({ ...s, deposit_trx: e.target.value.trim() }))}
                    placeholder="T…"
                  />
                </div>
                <div className="col-12">
                  <Form.Label>SOL deposit address</Form.Label>
                  <Form.Control
                    className="font-monospace"
                    value={settings.deposit_sol}
                    onChange={(e) => setSettings((s) => ({ ...s, deposit_sol: e.target.value.trim() }))}
                    placeholder="Solana address"
                  />
                </div>
                <div className="col-12">
                  <Form.Label>TON deposit address</Form.Label>
                  <Form.Control
                    className="font-monospace"
                    value={settings.deposit_ton}
                    onChange={(e) => setSettings((s) => ({ ...s, deposit_ton: e.target.value.trim() }))}
                    placeholder="EQ…"
                  />
                </div>
                <div className="col-12">
                  <Button type="submit" disabled={settingsSaving}>
                    {settingsSaving ? 'Saving…' : 'Save wallets'}
                  </Button>
                </div>
              </Form>

              <Card className="rs-card rs-card-static mt-4">
                <Card.Body>
                  <h5 className="fw-bold">WhatsApp group update</h5>
                  <p className="small text-muted mb-2">
                    Opens WhatsApp with this message. Set env <code>VITE_WA_GROUP</code> to a group invite URL or phone (digits).
                    Cloud API auto-alerts go to WHATSAPP_NOTIFY_TO numbers (Meta does not post into normal groups). Put those phones in your ops group.
                  </p>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    className="mb-2"
                    value={waMsg}
                    onChange={(e) => setWaMsg(e.target.value)}
                  />
                  <Button
                    size="sm"
                    variant="success"
                    onClick={() => {
                      openWhatsAppUpdate(waMsg)
                      toast.success('WhatsApp opened')
                    }}
                  >
                    <i className="bi bi-whatsapp me-1" />
                    Share update on WhatsApp
                  </Button>
                </Card.Body>
              </Card>
              <Card className="rs-card rs-card-static mt-4">
                <Card.Body>
                  <h5 className="fw-bold">Tax compliance</h5>
                  <p className="small text-muted">
                    Configure VAT/GST-style breakdown on receipts. Default mirrors Nigeria VAT 7.5% (inclusive).
                    You still must register and file with tax authorities where required — this only supports invoicing records.
                    Run <code>supabase/tax_compliance.sql</code>.
                  </p>
                  <div className="row g-2">
                    <div className="col-md-4">
                      <Form.Label className="small">Tax enabled</Form.Label>
                      <Form.Select
                        value={settings.tax_enabled}
                        onChange={(e) => setSettings((s) => ({ ...s, tax_enabled: e.target.value }))}
                      >
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </Form.Select>
                    </div>
                    <div className="col-md-4">
                      <Form.Label className="small">Rate %</Form.Label>
                      <Form.Control
                        value={settings.tax_rate_percent}
                        onChange={(e) => setSettings((s) => ({ ...s, tax_rate_percent: e.target.value }))}
                      />
                    </div>
                    <div className="col-md-4">
                      <Form.Label className="small">Mode</Form.Label>
                      <Form.Select
                        value={settings.tax_mode}
                        onChange={(e) => setSettings((s) => ({ ...s, tax_mode: e.target.value }))}
                      >
                        <option value="inclusive">Inclusive (price includes tax)</option>
                        <option value="none">No tax line</option>
                      </Form.Select>
                    </div>
                    <div className="col-md-6">
                      <Form.Label className="small">Supplier name</Form.Label>
                      <Form.Control
                        value={settings.tax_supplier_name}
                        onChange={(e) => setSettings((s) => ({ ...s, tax_supplier_name: e.target.value }))}
                      />
                    </div>
                    <div className="col-md-6">
                      <Form.Label className="small">Tax / VAT ID</Form.Label>
                      <Form.Control
                        value={settings.tax_id}
                        onChange={(e) => setSettings((s) => ({ ...s, tax_id: e.target.value }))}
                        placeholder="Your registered tax number"
                      />
                    </div>
                    <div className="col-12">
                      <Form.Label className="small">Supplier address</Form.Label>
                      <Form.Control
                        value={settings.tax_supplier_address}
                        onChange={(e) => setSettings((s) => ({ ...s, tax_supplier_address: e.target.value }))}
                      />
                    </div>
                    <div className="col-md-4">
                      <Form.Label className="small">Region code</Form.Label>
                      <Form.Control
                        value={settings.tax_region}
                        onChange={(e) => setSettings((s) => ({ ...s, tax_region: e.target.value }))}
                        placeholder="NG"
                      />
                    </div>
                    <div className="col-12">
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={settingsSaving}
                        onClick={async () => {
                          setSettingsSaving(true)
                          setErr(null)
                          try {
                            for (const [key, value] of [
                              ['tax_enabled', settings.tax_enabled],
                              ['tax_rate_percent', settings.tax_rate_percent],
                              ['tax_mode', settings.tax_mode],
                              ['tax_region', settings.tax_region],
                              ['tax_id', settings.tax_id],
                              ['tax_supplier_name', settings.tax_supplier_name],
                              ['tax_supplier_address', settings.tax_supplier_address],
                              ['tax_id_label', settings.tax_id_label],
                            ] as const) {
                              const { error } = await supabase.rpc('admin_set_setting', { p_key: key, p_value: value })
                              if (error) throw error
                            }
                            flash('Tax settings saved')
                            toast.success('Tax settings saved')
                          } catch (e: unknown) {
                            setErr(e instanceof Error ? e.message : 'Tax save failed')
                          } finally {
                            setSettingsSaving(false)
                          }
                        }}
                      >
                        Save tax settings
                      </Button>
                    </div>
                  </div>
                </Card.Body>
              </Card>

            </>
          )}

        </div>
      </div>
    </div>
  )
}

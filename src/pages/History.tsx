import { useEffect, useState } from 'react'
import { Alert, Badge, Spinner, Table } from 'react-bootstrap'
import { ListFilters, ListPagination, paginate } from '../components/ListControls'
import EmptyState from '../components/EmptyState'
import { useAuth } from '../contexts/AuthContext'
import { supabase, supabaseConfigured } from '../lib/supabase'
import { Reveal } from '../components/Animated'

type Log = {
  id: string
  action: string
  entity: string
  entity_id: string | null
  meta: Record<string, unknown> | null
  created_at: string
}

function actionLabel(a: string) {
  const map: Record<string, string> = {
    'campaign.cancelled': 'Order cancelled',
    'campaign.deleted': 'Order deleted',
    'payment.flutterwave_confirmed': 'Payment confirmed (Flutterwave)',
    'campaign.created': 'Order created',
  }
  return map[a] || a.replace(/\./g, ' · ')
}

export default function History() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)

  useEffect(() => {
    if (!user || !supabaseConfigured) {
      setLoading(false)
      return
    }
    ;(async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('actor_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) setErr(error.message + (error.message.includes('audit') ? ' — run supabase/audit_cancel.sql' : ''))
      setLogs((data as Log[]) || [])
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
  const filtered = logs.filter((l) => {
    if (!q) return true
    return (
      l.action.toLowerCase().includes(q) ||
      l.entity.toLowerCase().includes(q) ||
      (l.entity_id || '').toLowerCase().includes(q)
    )
  })
  const pg = paginate(filtered, page, pageSize)

  return (
    <div className="page-enter">
      <Reveal>
        <h1 className="fw-bold mb-1">History</h1>
        <p className="text-muted mb-3">Audit trail of your orders, payments, and account actions.</p>
      </Reveal>
      {err && <Alert variant="warning">{err}</Alert>}
      <ListFilters
        search={search}
        onSearch={(v) => {
          setSearch(v)
          setPage(1)
        }}
        placeholder="Action, entity…"
        pageSize={pageSize}
        onPageSize={(n) => {
          setPageSize(n)
          setPage(1)
        }}
      />
      {logs.length === 0 ? (
        <EmptyState>No history yet. Actions like pay, cancel, and delete appear here.</EmptyState>
      ) : (
        <div className="table-responsive anim-list">
          <Table size="sm" hover className="mb-0">
            <thead>
              <tr>
                <th>When</th>
                <th>Action</th>
                <th>Entity</th>
              </tr>
            </thead>
            <tbody>
              {pg.slice.map((l, i) => (
                <tr key={l.id} className="anim-row" style={{ animationDelay: `${i * 40}ms` }}>
                  <td className="small text-muted text-nowrap">{new Date(l.created_at).toLocaleString()}</td>
                  <td>
                    <Badge bg="secondary" className="badge-status">
                      {actionLabel(l.action)}
                    </Badge>
                  </td>
                  <td className="small">
                    {l.entity}
                    {l.entity_id ? (
                      <code className="ms-1" style={{ fontSize: '0.7rem' }}>
                        {l.entity_id.slice(0, 8)}…
                      </code>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <ListPagination page={pg.page} totalPages={pg.totalPages} total={pg.total} onPage={setPage} />
        </div>
      )}
    </div>
  )
}

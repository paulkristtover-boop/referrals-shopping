import { useEffect, useState } from 'react'
import { Alert, Badge, Button, Form, Table, Spinner } from 'react-bootstrap'
import { supabase } from '../lib/supabase'
import { ListFilters, ListPagination, paginate } from '../components/ListControls'

type Ticket = {
  id: string
  subject: string
  message: string
  status: string
  admin_reply: string | null
  created_at: string
  user_id: string
  profiles?: { email?: string }
}

export default function AdminSupport() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [replies, setReplies] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const load = async () => {
    const { data } = await supabase
      .from('support_tickets')
      .select('*, profiles(email)')
      .order('created_at', { ascending: false })
    setTickets((data as Ticket[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => setPage(1), [search, status, pageSize])

  const reply = async (id: string) => {
    const text = replies[id]?.trim()
    if (!text) return
    await supabase
      .from('support_tickets')
      .update({ admin_reply: text, status: 'replied', updated_at: new Date().toISOString() })
      .eq('id', id)
    setMsg('Reply saved')
    void load()
  }

  const close = async (id: string) => {
    await supabase.from('support_tickets').update({ status: 'closed' }).eq('id', id)
    void load()
  }

  const q = search.trim().toLowerCase()
  const filtered = tickets.filter((t) => {
    if (status !== 'all' && t.status !== status) return false
    if (!q) return true
    return (
      t.subject.toLowerCase().includes(q) ||
      t.message.toLowerCase().includes(q) ||
      (t.profiles?.email || '').toLowerCase().includes(q)
    )
  })
  const pg = paginate(filtered, page, pageSize)

  if (loading) return <div className="text-center py-5"><Spinner /></div>

  return (
    <div>
      <h1 className="fw-bold text-white mb-3">Support inbox</h1>
      {msg && <Alert variant="success">{msg}</Alert>}
      <div className="admin-panel">
        <ListFilters
          search={search}
          onSearch={setSearch}
          placeholder="Subject, message, email…"
          status={status}
          onStatus={setStatus}
          statusOptions={[
            { value: 'all', label: 'All' },
            { value: 'open', label: 'Open' },
            { value: 'replied', label: 'Replied' },
            { value: 'closed', label: 'Closed' },
          ]}
          pageSize={pageSize}
          onPageSize={setPageSize}
        />
        <Table size="sm" responsive hover>
          <thead>
            <tr><th>User</th><th>Subject</th><th>Status</th><th>Reply</th></tr>
          </thead>
          <tbody>
            {pg.slice.map((t) => (
              <tr key={t.id}>
                <td className="small">{t.profiles?.email || t.user_id.slice(0, 8)}</td>
                <td>
                  <strong>{t.subject}</strong>
                  <div className="small text-muted">{t.message}</div>
                  {t.admin_reply && <div className="small text-success">Reply: {t.admin_reply}</div>}
                </td>
                <td><Badge bg="secondary">{t.status}</Badge></td>
                <td style={{ minWidth: 220 }}>
                  <Form.Control
                    size="sm"
                    className="mb-1"
                    placeholder="Admin reply"
                    value={replies[t.id] || ''}
                    onChange={(e) => setReplies({ ...replies, [t.id]: e.target.value })}
                  />
                  <Button size="sm" className="me-1" onClick={() => void reply(t.id)}>Send</Button>
                  <Button size="sm" variant="outline-secondary" onClick={() => void close(t.id)}>Close</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        {pg.slice.length === 0 && <div className="empty-state">No tickets match filters.</div>}
        <ListPagination page={pg.page} totalPages={pg.totalPages} total={pg.total} onPage={setPage} />
      </div>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { Alert, Badge, Button, Card, ListGroup, Spinner } from 'react-bootstrap'
import { useNotifications } from '../contexts/NotificationContext'
import { ListFilters, ListPagination, paginate } from '../components/ListControls'
import { useEffect, useMemo, useState } from 'react'

export default function Notifications() {
  const { items, unread, loading, markRead, markAllRead, refresh } = useNotifications()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => setPage(1), [search, status, pageSize])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((n) => {
      if (status === 'unread' && n.read_at) return false
      if (status === 'read' && !n.read_at) return false
      if (!q) return true
      return n.title.toLowerCase().includes(q) || (n.body || '').toLowerCase().includes(q)
    })
  }, [items, search, status])

  const pg = paginate(filtered, page, pageSize)

  return (
    <div className="page-enter">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h1 className="fw-bold mb-0">Notifications</h1>
          <p className="text-muted small mb-0">{unread} unread</p>
        </div>
        <div className="d-flex gap-2">
          <Button size="sm" variant="outline-secondary" onClick={() => void refresh()}>
            <i className="bi bi-arrow-clockwise me-1" />Refresh
          </Button>
          {unread > 0 && (
            <Button size="sm" variant="primary" onClick={() => void markAllRead()}>
              Mark all read
            </Button>
          )}
        </div>
      </div>

      <ListFilters
        search={search}
        onSearch={setSearch}
        placeholder="Search notifications…"
        status={status}
        onStatus={setStatus}
        statusOptions={[
          { value: 'all', label: 'All' },
          { value: 'unread', label: 'Unread' },
          { value: 'read', label: 'Read' },
        ]}
        pageSize={pageSize}
        onPageSize={setPageSize}
      />

      {loading && items.length === 0 ? (
        <div className="text-center py-5">
          <Spinner />
        </div>
      ) : pg.total === 0 ? (
        <div className="empty-state">No notifications{status !== 'all' || search ? ' match filters' : ' yet'}.</div>
      ) : (
        <Card className="rs-card rs-card-static">
          <ListGroup variant="flush">
            {pg.slice.map((n) => (
              <ListGroup.Item
                key={n.id}
                className={!n.read_at ? 'notif-unread' : ''}
                action={!!n.link}
                as={n.link ? Link : undefined}
                to={n.link || undefined}
                onClick={() => void markRead(n.id)}
              >
                <div className="d-flex justify-content-between gap-2">
                  <div>
                    <div className="fw-semibold">
                      {!n.read_at && <Badge bg="primary" pill className="me-1">New</Badge>}
                      {n.title}
                    </div>
                    {n.body && <div className="text-muted small">{n.body}</div>}
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                      {new Date(n.created_at).toLocaleString()} · {n.type}
                    </div>
                  </div>
                  {n.link && <i className="bi bi-chevron-right text-muted align-self-center" />}
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Card>
      )}
      <ListPagination page={pg.page} totalPages={pg.totalPages} total={pg.total} onPage={setPage} />
    </div>
  )
}

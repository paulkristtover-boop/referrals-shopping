import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button, Dropdown, ListGroup, Spinner } from 'react-bootstrap'
import { useNotifications } from '../contexts/NotificationContext'

export default function NotificationBell({ light = false }: { light?: boolean }) {
  const { items, unread, loading, markRead, markAllRead, refresh } = useNotifications()
  const [open, setOpen] = useState(false)

  const recent = items.slice(0, 8)

  return (
    <Dropdown show={open} onToggle={(next) => setOpen(!!next)} align="end">
      <Dropdown.Toggle
        as={Button}
        size="sm"
        variant={light ? 'outline-light' : 'outline-secondary'}
        className="position-relative notif-bell"
        id="notif-dropdown"
      >
        <i className="bi bi-bell" />
        {unread > 0 && (
          <Badge bg="danger" pill className="notif-badge">
            {unread > 9 ? '9+' : unread}
          </Badge>
        )}
      </Dropdown.Toggle>
      <Dropdown.Menu className="notif-menu shadow border-0" style={{ minWidth: 300, maxWidth: 340 }}>
        <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
          <strong className="small">Notifications</strong>
          <div className="d-flex gap-1">
            <Button size="sm" variant="link" className="p-0 small" onClick={() => void refresh()}>
              <i className="bi bi-arrow-clockwise" />
            </Button>
            {unread > 0 && (
              <Button size="sm" variant="link" className="p-0 small" onClick={() => void markAllRead()}>
                Mark all read
              </Button>
            )}
          </div>
        </div>
        {loading && items.length === 0 ? (
          <div className="text-center py-3">
            <Spinner size="sm" />
          </div>
        ) : recent.length === 0 ? (
          <div className="text-muted small text-center py-4">No notifications yet</div>
        ) : (
          <ListGroup variant="flush" style={{ maxHeight: 320, overflowY: 'auto' }}>
            {recent.map((n) => (
              <ListGroup.Item
                key={n.id}
                action
                className={!n.read_at ? 'notif-unread' : ''}
                onClick={() => {
                  void markRead(n.id)
                  setOpen(false)
                }}
                as={n.link ? Link : 'div'}
                to={n.link || undefined}
              >
                <div className="fw-semibold small">{n.title}</div>
                {n.body && <div className="text-muted small text-truncate">{n.body}</div>}
                <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
        <div className="border-top text-center py-2">
          <Link to="/notifications" className="small" onClick={() => setOpen(false)}>
            View all
          </Link>
        </div>
      </Dropdown.Menu>
    </Dropdown>
  )
}

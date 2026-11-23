import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Dropdown, Spinner } from 'react-bootstrap'
import { useAuth } from '../contexts/AuthContext'
import { supabaseConfigured } from '../lib/supabase'
import {
  type AppNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notifIcon,
  relativeTime,
} from '../lib/notifications'

type Props = {
  /** Use light outline for admin dark navbar */
  variant?: 'default' | 'light'
  className?: string
}

/**
 * In-app notifications — polling only (no Supabase Realtime).
 * Realtime postgres_changes was crashing the app under React remounts.
 */
export default function NotificationBell({ variant = 'default', className = '' }: Props) {
  const { user } = useAuth()
  const [items, setItems] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const unread = items.filter((n) => !n.read_at).length

  const load = useCallback(async () => {
    if (!user || !supabaseConfigured) {
      setItems([])
      return
    }
    setLoading(true)
    try {
      const list = await fetchNotifications(40)
      setItems(list)
    } catch {
      /* keep previous list */
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (!user) return
    void load()
    const poll = window.setInterval(() => void load(), 45_000)
    return () => window.clearInterval(poll)
  }, [user?.id, load])

  const onOpen = (next: boolean) => {
    setOpen(next)
    if (next) void load()
  }

  const onClickItem = async (n: AppNotification) => {
    if (!n.read_at) {
      await markNotificationRead(n.id)
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)))
    }
  }

  const onMarkAll = async () => {
    await markAllNotificationsRead()
    setItems((prev) => prev.map((x) => ({ ...x, read_at: x.read_at || new Date().toISOString() })))
  }

  if (!user) return null

  const btnVariant = variant === 'light' ? 'outline-light' : 'outline-secondary'

  return (
    <Dropdown show={open} onToggle={(next) => onOpen(!!next)} align="end" className={className}>
      <Dropdown.Toggle
        as={Button}
        size="sm"
        variant={btnVariant}
        className="notif-bell position-relative"
        id="notif-toggle"
        aria-label={unread ? `${unread} unread notifications` : 'Notifications'}
      >
        <i className="bi bi-bell" />
        {unread > 0 && (
          <span className="notif-badge badge rounded-pill bg-danger">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </Dropdown.Toggle>

      <Dropdown.Menu className="notif-menu shadow" style={{ minWidth: 320, maxWidth: 'min(380px, 92vw)' }}>
        <div className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom">
          <strong className="small">Notifications</strong>
          <div className="d-flex gap-2 align-items-center">
            {loading && <Spinner animation="border" size="sm" />}
            {unread > 0 && (
              <button type="button" className="btn btn-link btn-sm p-0 text-decoration-none" onClick={() => void onMarkAll()}>
                Mark all read
              </button>
            )}
          </div>
        </div>

        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {items.length === 0 ? (
            <div className="text-center text-muted small py-4 px-3">
              {loading ? 'Loading…' : 'No notifications yet'}
            </div>
          ) : (
            items.map((n) => {
              const body = (
                <div className={`px-3 py-2 notif-item ${n.read_at ? '' : 'notif-unread'}`}>
                  <div className="d-flex gap-2">
                    <i className={`bi ${notifIcon(n.type)} text-primary mt-1 flex-shrink-0`} />
                    <div className="min-w-0 flex-grow-1">
                      <div className="fw-semibold small text-truncate">{n.title}</div>
                      {n.body ? (
                        <div className="small text-muted" style={{ whiteSpace: 'pre-wrap' }}>
                          {n.body}
                        </div>
                      ) : null}
                      <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                        {relativeTime(n.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              )
              if (n.link) {
                return (
                  <Dropdown.Item
                    key={n.id}
                    as={Link}
                    to={n.link}
                    className="p-0 text-wrap"
                    onClick={() => void onClickItem(n)}
                  >
                    {body}
                  </Dropdown.Item>
                )
              }
              return (
                <Dropdown.Item key={n.id} as="button" className="p-0 text-wrap" onClick={() => void onClickItem(n)}>
                  {body}
                </Dropdown.Item>
              )
            })
          )}
        </div>
      </Dropdown.Menu>
    </Dropdown>
  )
}

import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNotifications } from '../contexts/NotificationContext'

type Tab = { to: string; icon: string; label: string; end?: boolean; badge?: number }

export default function BottomTabBar() {
  const { user, profile } = useAuth()
  const { unread } = useNotifications()
  if (!user) return null
  if (profile?.role === 'admin') {
    const adminTabs: Tab[] = [
      { to: '/admin', icon: 'bi-grid-1x2', label: 'CMS', end: true },
      { to: '/admin/payments', icon: 'bi-currency-bitcoin', label: 'Pay' },
      { to: '/admin/support', icon: 'bi-headset', label: 'Support' },
      { to: '/notifications', icon: 'bi-bell', label: 'Alerts', badge: unread },
    ]
    return <TabBar tabs={adminTabs} />
  }

  const tabs: Tab[] = [
    { to: '/dashboard', icon: 'bi-speedometer2', label: 'Home' },
    { to: '/promote', icon: 'bi-megaphone', label: 'Promote' },
    { to: '/earn', icon: 'bi-cash-coin', label: 'Earn' },
    { to: '/wallet', icon: 'bi-wallet2', label: 'Wallet' },
    { to: '/notifications', icon: 'bi-bell', label: 'Alerts', badge: unread },
  ]
  return <TabBar tabs={tabs} />
}

function TabBar({ tabs }: { tabs: Tab[] }) {
  return (
    <nav className="bottom-tab-bar" aria-label="Bottom navigation">
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `bottom-tab ${isActive ? 'active' : ''}`}>
          <span className="bottom-tab-icon">
            <i className={`bi ${t.icon}`} />
            {!!t.badge && t.badge > 0 && (
              <span className="bottom-tab-badge">{t.badge > 9 ? '9+' : t.badge}</span>
            )}
          </span>
          <span className="bottom-tab-label">{t.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

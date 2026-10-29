import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

type Tab = { to: string; icon: string; label: string; end?: boolean }

export default function BottomTabBar() {
  const { user, profile } = useAuth()
  if (!user) return null
  if (profile?.role === 'admin') {
    const adminTabs: Tab[] = [
      { to: '/admin', icon: 'bi-grid-1x2', label: 'CMS', end: true },
      { to: '/admin/support', icon: 'bi-headset', label: 'Support' },
      { to: '/account', icon: 'bi-person-circle', label: 'Account' },
    ]
    return <TabBar tabs={adminTabs} />
  }

  const tabs: Tab[] = [
    { to: '/dashboard', icon: 'bi-speedometer2', label: 'Home' },
    { to: '/promote', icon: 'bi-shop', label: 'Shop' },
    { to: '/earn', icon: 'bi-cash-coin', label: 'Earn' },
    { to: '/wallet', icon: 'bi-wallet2', label: 'Wallet' },
    { to: '/account', icon: 'bi-person-circle', label: 'Account' },
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
          </span>
          <span className="bottom-tab-label">{t.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Guide from './pages/Guide'
import Terms from './pages/Terms'
import Faq from './pages/Faq'
import Support from './pages/Support'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Promote from './pages/Promote'
import Earn from './pages/Earn'
import Wallet from './pages/Wallet'
import Invite from './pages/Invite'
import Security from './pages/Security'
import Admin from './pages/Admin'
import AdminSupport from './pages/AdminSupport'
import AdminPayments from './pages/AdminPayments'
import Notifications from './pages/Notifications'
import { useAuth } from './contexts/AuthContext'
import { Spinner } from 'react-bootstrap'

function Private({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="text-center py-5"><Spinner /></div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function UserOnly({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  if (loading) return <div className="text-center py-5"><Spinner /></div>
  if (profile?.role === 'admin') return <Navigate to="/admin" replace />
  return <>{children}</>
}

function AdminOnly({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  if (loading) return <div className="text-center py-5"><Spinner /></div>
  if (profile?.role !== 'admin') return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="guide" element={<Guide />} />
        <Route path="faq" element={<Faq />} />
        <Route path="support" element={<Support />} />
        <Route path="terms" element={<Terms />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="dashboard" element={<Private><UserOnly><Dashboard /></UserOnly></Private>} />
        <Route path="promote" element={<Private><UserOnly><Promote /></UserOnly></Private>} />
        <Route path="earn" element={<Private><UserOnly><Earn /></UserOnly></Private>} />
        <Route path="wallet" element={<Private><UserOnly><Wallet /></UserOnly></Private>} />
        <Route path="invite" element={<Private><UserOnly><Invite /></UserOnly></Private>} />
        <Route path="security" element={<Private><Security /></Private>} />
        <Route path="notifications" element={<Private><Notifications /></Private>} />
        <Route path="admin" element={<Private><AdminOnly><Admin /></AdminOnly></Private>} />
        <Route path="admin/support" element={<Private><AdminOnly><AdminSupport /></AdminOnly></Private>} />
        <Route path="admin/payments" element={<Private><AdminOnly><AdminPayments /></AdminOnly></Private>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

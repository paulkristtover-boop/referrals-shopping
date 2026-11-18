import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Button, Card, Form } from 'react-bootstrap'
import { useTheme } from '../contexts/ThemeContext'
import { useAuth } from '../contexts/AuthContext'

const PREF_KEY = 'rs-user-preferences'
type Preferences = { productUpdates: boolean; taskAlerts: boolean; compactLists: boolean }
const DEFAULTS: Preferences = { productUpdates: true, taskAlerts: true, compactLists: false }

export default function Settings() {
  const { theme, toggle } = useTheme()
  const { user } = useAuth()
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS)
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    try { const stored = JSON.parse(localStorage.getItem(PREF_KEY) || '{}'); setPrefs({ ...DEFAULTS, ...stored }) } catch { setPrefs(DEFAULTS) }
  }, [])
  const save = () => {
    localStorage.setItem(PREF_KEY, JSON.stringify(prefs))
    setSaved(true)
  }
  return <div className="page-enter">
    <h1 className="fw-bold mb-1">Settings</h1>
    <p className="text-muted mb-4">Manage your display and in-app preferences.</p>
    {saved && <Alert variant="success" dismissible onClose={() => setSaved(false)}>Your preferences have been saved on this device.</Alert>}
    <Card className="rs-card rs-card-static mb-3"><Card.Body>
      <h5 className="fw-bold">Appearance</h5>
      <div className="d-flex align-items-center justify-content-between gap-3">
        <div><div className="fw-semibold">Dark mode</div><div className="small text-muted">Choose a comfortable display theme.</div></div>
        <Form.Check type="switch" id="rs-dark-mode" checked={theme === 'dark'} onChange={toggle} label={theme === 'dark' ? 'On' : 'Off'} />
      </div>
    </Card.Body></Card>
    <Card className="rs-card rs-card-static mb-3"><Card.Body>
      <h5 className="fw-bold">Notifications and display</h5>
      <Form.Check className="mb-3" type="switch" id="rs-product-updates" label="Product and platform updates" checked={prefs.productUpdates} onChange={(e) => setPrefs((p) => ({ ...p, productUpdates: e.target.checked }))} />
      <Form.Check className="mb-3" type="switch" id="rs-task-alerts" label="Earn task reminders" checked={prefs.taskAlerts} onChange={(e) => setPrefs((p) => ({ ...p, taskAlerts: e.target.checked }))} />
      <Form.Check type="switch" id="rs-compact-lists" label="Compact transaction and task lists" checked={prefs.compactLists} onChange={(e) => setPrefs((p) => ({ ...p, compactLists: e.target.checked }))} />
      <div className="small text-muted mt-2">These preferences are stored in this browser. Notification switches control display preferences only; they do not subscribe you to email or SMS messages.</div>
      <Button className="mt-3" onClick={save}>Save preferences</Button>
    </Card.Body></Card>
    <Card className="rs-card rs-card-static"><Card.Body>
      <h5 className="fw-bold">Account and security</h5>
      <p className="small text-muted">Signed in as {user?.email || 'your account'}.</p>
      <div className="d-flex flex-wrap gap-2"><Link className="btn btn-outline-primary btn-sm" to="/account">Account details</Link><Link className="btn btn-outline-primary btn-sm" to="/security">Password, 2FA and sessions</Link><Link className="btn btn-outline-secondary btn-sm" to="/support">Get support</Link></div>
    </Card.Body></Card>
  </div>
}

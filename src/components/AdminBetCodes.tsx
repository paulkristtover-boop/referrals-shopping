import { useCallback, useEffect, useState } from 'react'
import { Alert, Badge, Button, Form, Spinner, Table } from 'react-bootstrap'
import { supabase, supabaseConfigured } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

type Row = {
  id: string
  code: string
  title: string | null
  note: string | null
  bookmaker: string
  code_date: string
  active: boolean
  sort_order: number
  created_at: string
}

function todayLagos() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export default function AdminBetCodes() {
  const { user } = useAuth()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    code: '',
    title: '',
    note: '',
    bookmaker: 'msport',
    code_date: todayLagos(),
  })

  const load = useCallback(async () => {
    if (!supabaseConfigured) return
    setLoading(true)
    const { data, error } = await supabase
      .from('bet_codes')
      .select('*')
      .order('code_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(80)
    setLoading(false)
    if (error) {
      setErr(error.message + (error.message.includes('bet_codes') ? ' — run supabase/bet_codes.sql' : ''))
      return
    }
    setRows((data as Row[]) || [])
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    const code = form.code.trim()
    if (code.length < 3) {
      setErr('Paste a full booking code.')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('bet_codes').insert({
      code,
      title: form.title.trim() || null,
      note: form.note.trim() || null,
      bookmaker: form.bookmaker.trim() || 'msport',
      code_date: form.code_date || todayLagos(),
      active: true,
      created_by: user?.id ?? null,
    })
    setSaving(false)
    if (error) {
      setErr(error.message)
      return
    }
    setMsg('Code published.')
    setForm((f) => ({ ...f, code: '', title: '', note: '' }))
    await load()
  }

  const setActive = async (id: string, active: boolean) => {
    const { error } = await supabase.from('bet_codes').update({ active, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) setErr(error.message)
    else await load()
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this code permanently?')) return
    const { error } = await supabase.from('bet_codes').delete().eq('id', id)
    if (error) setErr(error.message)
    else await load()
  }

  return (
    <div>
      <p className="small text-muted">
        Post booking codes any day. Public page shows active codes only. Do not claim fixed or sure outcomes —
        the site disclaimer is always shown.
      </p>
      {err && (
        <Alert variant="danger" dismissible onClose={() => setErr(null)}>
          {err}
        </Alert>
      )}
      {msg && (
        <Alert variant="success" dismissible onClose={() => setMsg(null)}>
          {msg}
        </Alert>
      )}

      <Form onSubmit={(e) => void add(e)} className="border rounded p-3 mb-3 bg-body-tertiary">
        <div className="row g-2">
          <div className="col-md-4">
            <Form.Label className="small mb-0">Booking code</Form.Label>
            <Form.Control
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              placeholder="Paste code"
              required
            />
          </div>
          <div className="col-md-3">
            <Form.Label className="small mb-0">Date (Lagos)</Form.Label>
            <Form.Control
              type="date"
              value={form.code_date}
              onChange={(e) => setForm((f) => ({ ...f, code_date: e.target.value }))}
            />
          </div>
          <div className="col-md-2">
            <Form.Label className="small mb-0">Bookmaker</Form.Label>
            <Form.Control
              value={form.bookmaker}
              onChange={(e) => setForm((f) => ({ ...f, bookmaker: e.target.value }))}
            />
          </div>
          <div className="col-md-3">
            <Form.Label className="small mb-0">Label (optional)</Form.Label>
            <Form.Control
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Evening slip"
            />
          </div>
          <div className="col-12">
            <Form.Label className="small mb-0">Note (optional)</Form.Label>
            <Form.Control
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="Short context — never “sure win”"
            />
          </div>
        </div>
        <Button type="submit" className="mt-2" disabled={saving} size="sm">
          {saving ? <Spinner size="sm" /> : 'Publish code'}
        </Button>
      </Form>

      {loading ? (
        <Spinner size="sm" />
      ) : (
        <Table size="sm" responsive hover>
          <thead>
            <tr>
              <th>Date</th>
              <th>Code</th>
              <th>Label</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="small">{r.code_date}</td>
                <td className="font-monospace small">{r.code}</td>
                <td className="small">{r.title || '—'}</td>
                <td>
                  {r.active ? <Badge bg="success">Live</Badge> : <Badge bg="secondary">Off</Badge>}
                </td>
                <td className="text-end text-nowrap">
                  <Button size="sm" variant="outline-secondary" className="me-1" onClick={() => void setActive(r.id, !r.active)}>
                    {r.active ? 'Hide' : 'Show'}
                  </Button>
                  <Button size="sm" variant="outline-danger" onClick={() => void remove(r.id)}>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="text-muted small">
                  No codes yet.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      )}
    </div>
  )
}

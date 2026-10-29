import { useEffect, useMemo, useState } from 'react'
import { Alert, Badge, Button, Card, Form, Spinner } from 'react-bootstrap'
import { ListFilters, ListPagination, paginate } from '../components/ListControls'
import { useAuth } from '../contexts/AuthContext'
import { supabase, supabaseConfigured } from '../lib/supabase'
import type { Task } from '../lib/types'
import { BRAND } from '../lib/brand'

type TaskRow = Task & { campaigns?: { title: string; target_url: string; status: string; user_id?: string } }

export default function Earn() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [done, setDone] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [timers, setTimers] = useState<Record<string, number>>({})
  const [ready, setReady] = useState<Record<string, boolean>>({})
  const [starting, setStarting] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterDone, setFilterDone] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const load = async () => {
    if (!supabaseConfigured || !user) {
      setLoading(false)
      return
    }
    setErr(null)
    const [t, s] = await Promise.all([
      supabase.from('tasks').select('*, campaigns(title, target_url, status, user_id)').eq('active', true),
      supabase.from('task_submissions').select('task_id').eq('user_id', user.id),
    ])
    const list = ((t.data as TaskRow[]) || []).filter((x) => {
      if (x.campaigns?.status !== 'approved') return false
      // Hide own adverts client-side too
      if (x.campaigns?.user_id && x.campaigns.user_id === user.id) return false
      return true
    })
    setTasks(list)
    setDone(new Set((s.data || []).map((r: { task_id: string }) => r.task_id)))
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [user?.id])

  useEffect(() => setPage(1), [search, filterDone, pageSize])

  const openAndStart = async (task: TaskRow) => {
    if (!user || done.has(task.id)) return
    setErr(null)
    setStarting(task.id)
    try {
      const { data, error } = await supabase.rpc('start_earn_task', { p_task_id: task.id })
      if (error) {
        setErr(error.message + (error.message.includes('function') ? ' — run supabase/earn_integrity.sql' : ''))
        return
      }
      const wait = Number((data as { wait_seconds?: number })?.wait_seconds ?? task.wait_seconds ?? 15)
      const url = task.campaigns?.target_url
      if (url) window.open(url, '_blank', 'noopener,noreferrer')

      setTimers((t) => ({ ...t, [task.id]: wait }))
      setReady((r) => ({ ...r, [task.id]: false }))
      const iv = window.setInterval(() => {
        setTimers((t) => {
          const left = (t[task.id] ?? 1) - 1
          if (left <= 0) {
            window.clearInterval(iv)
            setReady((r) => ({ ...r, [task.id]: true }))
            return { ...t, [task.id]: 0 }
          }
          return { ...t, [task.id]: left }
        })
      }, 1000)
    } finally {
      setStarting(null)
    }
  }

  const submit = async (taskId: string, file: File | null) => {
    if (!file || !user) {
      setErr('Screenshot required')
      return
    }
    if (!ready[taskId]) {
      setErr('Finish the wait timer first')
      return
    }
    setErr(null)
    setMsg(null)
    setSubmitting(taskId)
    try {
      const path = `${user.id}/${taskId}_${Date.now()}_${file.name.replace(/[^\w.-]/g, '_')}`
      const up = await supabase.storage.from('screenshots').upload(path, file)
      if (up.error) {
        setErr(up.error.message)
        return
      }
      const { data: pub } = supabase.storage.from('screenshots').getPublicUrl(path)
      const { error } = await supabase.rpc('submit_earn_task', {
        p_task_id: taskId,
        p_screenshot_url: pub.publicUrl,
      })
      if (error) {
        // fallback direct insert if SQL not applied
        if (error.message.toLowerCase().includes('function') || error.message.toLowerCase().includes('does not exist')) {
          const { error: insErr } = await supabase.from('task_submissions').insert({
            task_id: taskId,
            user_id: user.id,
            screenshot_url: pub.publicUrl,
            status: 'pending',
          })
          if (insErr) {
            setErr(insErr.message + ' — run supabase/earn_integrity.sql for full protection')
            return
          }
        } else {
          setErr(error.message)
          return
        }
      }
      setMsg('Proof submitted — waiting for admin approval')
      setDone((d) => new Set(d).add(taskId))
      void load()
    } finally {
      setSubmitting(null)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tasks.filter((x) => {
      const isDone = done.has(x.id)
      if (filterDone === 'open' && isDone) return false
      if (filterDone === 'done' && !isDone) return false
      if (!q) return true
      return (x.campaigns?.title || '').toLowerCase().includes(q) || (x.campaigns?.target_url || '').toLowerCase().includes(q)
    })
  }, [tasks, done, search, filterDone])

  const pg = paginate(filtered, page, pageSize)

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="page-enter">
      <h1 className="mb-2 fw-bold">Earn from tasks</h1>
      <p className="text-muted mb-3">
        Open the advert link, wait the timer, upload a screenshot. You cannot earn on your own {BRAND} adverts.
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

      {tasks.length === 0 && <Alert variant="info">No active tasks right now. Check back after promoters go live.</Alert>}

      {tasks.length > 0 && (
        <ListFilters
          search={search}
          onSearch={setSearch}
          placeholder="Campaign title or URL…"
          status={filterDone}
          onStatus={setFilterDone}
          statusOptions={[
            { value: 'all', label: 'All tasks' },
            { value: 'open', label: 'Available' },
            { value: 'done', label: 'Submitted' },
          ]}
          pageSize={pageSize}
          onPageSize={setPageSize}
        />
      )}

      {pg.slice.map((t) => {
        const isDone = done.has(t.id)
        const left = timers[t.id]
        const canSubmit = ready[t.id] === true && !isDone
        return (
          <Card key={t.id} className="rs-card rs-card-static mb-3">
            <Card.Body>
              <div className="d-flex flex-wrap justify-content-between gap-2 mb-2">
                <div>
                  <div className="fw-semibold">{t.campaigns?.title || 'Task'}</div>
                  <div className="small text-muted text-truncate" style={{ maxWidth: 360 }}>
                    {t.campaigns?.target_url}
                  </div>
                </div>
                <div className="text-end">
                  <Badge bg="success" className="badge-status">
                    ${Number(t.reward_amount).toFixed(2)}
                  </Badge>
                  <div className="small text-muted">Wait {t.wait_seconds}s</div>
                </div>
              </div>

              {isDone ? (
                <Alert variant="secondary" className="mb-0 py-2 small">
                  Proof submitted — pending or reviewed
                </Alert>
              ) : (
                <>
                  <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={starting === t.id || left !== undefined}
                      onClick={() => void openAndStart(t)}
                    >
                      {starting === t.id ? 'Starting…' : left !== undefined ? 'Timer running' : 'Open link & start timer'}
                    </Button>
                    <span className="small text-muted">
                      {left === undefined && 'Starts server-side wait'}
                      {left !== undefined && left > 0 && (
                        <>
                          Wait <strong>{left}s</strong>…
                        </>
                      )}
                      {left === 0 && <span className="text-success fw-semibold">Ready to submit</span>}
                    </span>
                  </div>
                  <Form
                    onSubmit={(e) => {
                      e.preventDefault()
                      const input = (e.target as HTMLFormElement).elements.namedItem('shot') as HTMLInputElement
                      void submit(t.id, input.files?.[0] || null)
                    }}
                  >
                    <Form.Control type="file" name="shot" accept="image/*" size="sm" className="mb-2" required disabled={!canSubmit} />
                    <Button type="submit" size="sm" variant="success" disabled={!canSubmit || submitting === t.id}>
                      {submitting === t.id ? 'Uploading…' : 'Submit proof'}
                    </Button>
                  </Form>
                </>
              )}
            </Card.Body>
          </Card>
        )
      })}

      {tasks.length > 0 && pg.slice.length === 0 && <div className="empty-state">No tasks match your filters.</div>}
      {tasks.length > 0 && <ListPagination page={pg.page} totalPages={pg.totalPages} total={pg.total} onPage={setPage} />}
    </div>
  )
}

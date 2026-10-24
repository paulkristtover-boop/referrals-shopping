import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap'
import { ListFilters, ListPagination, paginate } from '../components/ListControls'
import { useAuth } from '../contexts/AuthContext'
import { supabase, supabaseConfigured } from '../lib/supabase'
import type { Task } from '../lib/types'

export default function Earn() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [done, setDone] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [timers, setTimers] = useState<Record<string, number>>({})
  const [ready, setReady] = useState<Record<string, boolean>>({})
  const [search, setSearch] = useState('')
  const [filterDone, setFilterDone] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const load = async () => {
    if (!supabaseConfigured) {
      setErr('Configure Supabase.')
      setLoading(false)
      return
    }
    const [t, s] = await Promise.all([
      supabase.from('tasks').select('*, campaigns(title, target_url, status)').eq('active', true),
      supabase.from('task_submissions').select('task_id').eq('user_id', user!.id),
    ])
    const list = ((t.data as Task[]) || []).filter((x) => x.campaigns?.status === 'approved')
    setTasks(list)
    setDone(new Set((s.data || []).map((r: { task_id: string }) => r.task_id)))
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [user?.id])

  useEffect(() => setPage(1), [search, filterDone, pageSize])

  const startTimer = (id: string, sec: number) => {
    if (timers[id] !== undefined) return
    setTimers((t) => ({ ...t, [id]: sec }))
    const iv = setInterval(() => {
      setTimers((t) => {
        const left = (t[id] ?? 1) - 1
        if (left <= 0) {
          clearInterval(iv)
          setReady((r) => ({ ...r, [id]: true }))
          return { ...t, [id]: 0 }
        }
        return { ...t, [id]: left }
      })
    }, 1000)
  }

  const submit = async (taskId: string, file: File | null) => {
    if (!file) {
      setErr('Screenshot required')
      return
    }
    setErr(null)
    const path = `${user!.id}/${taskId}_${Date.now()}_${file.name}`
    const up = await supabase.storage.from('screenshots').upload(path, file)
    if (up.error) {
      setErr(up.error.message)
      return
    }
    const { data: pub } = supabase.storage.from('screenshots').getPublicUrl(path)
    const { error } = await supabase.from('task_submissions').insert({
      task_id: taskId,
      user_id: user!.id,
      screenshot_url: pub.publicUrl,
      status: 'pending',
    })
    if (error) setErr(error.message)
    else {
      setMsg('Proof submitted.')
      void load()
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tasks.filter((x) => {
      const isDone = done.has(x.id)
      if (filterDone === 'open' && isDone) return false
      if (filterDone === 'done' && !isDone) return false
      if (q && !(x.campaigns?.title || '').toLowerCase().includes(q)) return false
      return true
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
    <>
      <h1 className="mb-3 fw-bold">Earn from tasks</h1>
      <p className="text-muted">Open the link, wait the timer, then upload a screenshot.</p>
      {err && <Alert variant="danger">{err}</Alert>}
      {msg && <Alert variant="success">{msg}</Alert>}
      {tasks.length === 0 && <Alert variant="info">No active tasks right now.</Alert>}

      {tasks.length > 0 && (
        <ListFilters
          search={search}
          onSearch={setSearch}
          placeholder="Search campaign title…"
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
        const canSubmit = ready[t.id]
        return (
          <Card key={t.id} className="mb-3 shadow-sm rs-card rs-card-static">
            <Card.Body>
              <div className="d-flex justify-content-between flex-wrap gap-2">
                <div>
                  <strong>{t.campaigns?.title}</strong>
                  <div className="small text-muted">
                    Reward ${Number(t.reward_amount).toFixed(2)} · Wait {t.wait_seconds}s
                  </div>
                </div>
                {isDone && <span className="badge text-bg-secondary">Submitted</span>}
              </div>
              {!isDone && (
                <>
                  <div className="mt-3">
                    <a
                      className="btn btn-outline-primary btn-sm"
                      href={t.campaigns?.target_url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => startTimer(t.id, t.wait_seconds)}
                    >
                      Open link
                    </a>
                    <span className="ms-2 small">
                      {left === undefined && `Wait ${t.wait_seconds}s after opening`}
                      {left !== undefined && left > 0 && `Wait ${left}s…`}
                      {left === 0 && 'You can submit now'}
                    </span>
                  </div>
                  <Form
                    className="mt-3"
                    onSubmit={(e) => {
                      e.preventDefault()
                      const input = (e.target as HTMLFormElement).elements.namedItem('shot') as HTMLInputElement
                      void submit(t.id, input.files?.[0] || null)
                    }}
                  >
                    <Form.Control type="file" name="shot" accept="image/*" size="sm" className="mb-2" required />
                    <Button type="submit" size="sm" variant="success" disabled={!canSubmit}>
                      Submit proof
                    </Button>
                  </Form>
                </>
              )}
            </Card.Body>
          </Card>
        )
      })}

      {tasks.length > 0 && pg.slice.length === 0 && (
        <div className="empty-state">No tasks match your filters.</div>
      )}
      {tasks.length > 0 && (
        <ListPagination page={pg.page} totalPages={pg.totalPages} total={pg.total} onPage={setPage} />
      )}
    </>
  )
}

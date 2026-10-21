'use client'

import { useEffect, useState } from 'react'
import { Container, Row, Col, Card, Button, Badge, ProgressBar, Form, Alert, Spinner } from 'react-bootstrap'
import { createClient } from '@/lib/supabase/client'
import type { Task } from '@/lib/types'

type TaskWithCampaign = Task & {
  campaigns?: { title: string; referral_link: string; status: string }
}

export default function EarnPage() {
  const [tasks, setTasks] = useState<TaskWithCampaign[]>([])
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set())
  const [activeTask, setActiveTask] = useState<TaskWithCampaign | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const [tasksRes, subsRes] = await Promise.all([
          supabase
            .from('tasks')
            .select('*, campaigns(title, referral_link, status)')
            .eq('status', 'active')
            .order('created_at', { ascending: false }),
          supabase
            .from('task_submissions')
            .select('task_id')
            .eq('user_id', user.id),
        ])

        if (tasksRes.error) throw tasksRes.error
        setTasks((tasksRes.data as TaskWithCampaign[]) || [])
        setCompletedTaskIds(new Set((subsRes.data || []).map((s: any) => s.task_id)))
      } catch (err: any) {
        setError(err.message || 'Failed to load tasks')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (!timerRunning || secondsLeft <= 0) return
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setTimerRunning(false)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [timerRunning, secondsLeft])

  const startTask = (task: TaskWithCampaign) => {
    setActiveTask(task)
    setSecondsLeft(task.required_wait_seconds)
    setTimerRunning(false)
    setScreenshot(null)
    setSubmitted(false)
    setError(null)
    const url = task.campaigns?.referral_link
    if (url) window.open(url, '_blank', 'noopener,noreferrer')
  }

  const startTimer = () => {
    if (activeTask) {
      setSecondsLeft(activeTask.required_wait_seconds)
      setTimerRunning(true)
    }
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setScreenshot(e.target.files[0])
  }

  const submitProof = async () => {
    if (!activeTask || !screenshot) return
    setSubmitting(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const ext = screenshot.name.split('.').pop() || 'jpg'
      const path = `${user.id}/${activeTask.id}-${Date.now()}.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from('screenshots')
        .upload(path, screenshot, { cacheControl: '3600', upsert: false })

      if (uploadErr) throw uploadErr

      const { data: publicUrlData } = supabase.storage.from('screenshots').getPublicUrl(path)
      const screenshotUrl = publicUrlData.publicUrl

      const { error: insertErr } = await supabase.from('task_submissions').insert({
        task_id: activeTask.id,
        user_id: user.id,
        screenshot_url: screenshotUrl,
        status: 'pending',
      })

      if (insertErr) throw insertErr

      setSubmitted(true)
      setCompletedTaskIds((prev) => new Set(prev).add(activeTask.id))
    } catch (err: any) {
      setError(err.message || 'Failed to submit proof')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" />
      </Container>
    )
  }

  if (activeTask) {
    const wait = activeTask.required_wait_seconds
    const progress = wait > 0 ? ((wait - secondsLeft) / wait) * 100 : 100
    const canSubmit = !timerRunning && secondsLeft === 0 && !!screenshot && !submitted

    return (
      <Container style={{ maxWidth: 560 }}>
        <Button variant="link" className="px-0 mb-3" onClick={() => setActiveTask(null)}>
          ← Back to tasks
        </Button>
        {error && <Alert variant="danger">{error}</Alert>}
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-4">
            <h4>{activeTask.campaigns?.title || 'Task'}</h4>
            <p className="text-muted small mb-3">
              Reward:{' '}
              <strong className="text-success">
                ${Number(activeTask.reward_amount).toFixed(2)}
              </strong>{' '}
              · Wait {wait}s
            </p>

            {!timerRunning && secondsLeft === wait && (
              <Alert variant="info">
                Link opened in a new tab. After you interact with the page, come back and start the timer.
              </Alert>
            )}

            <div className="text-center my-4">
              <div className="timer-display">
                {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:
                {String(secondsLeft % 60).padStart(2, '0')}
              </div>
              <ProgressBar now={progress} className="mt-2" style={{ height: 8 }} />
            </div>

            {!timerRunning && secondsLeft === wait && (
              <Button variant="primary" className="w-100 mb-3" onClick={startTimer}>
                Start Timer
              </Button>
            )}

            {timerRunning && (
              <Alert variant="warning" className="text-center">
                Keep this page open while the timer runs…
              </Alert>
            )}

            {!timerRunning && secondsLeft === 0 && !submitted && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Upload screenshot as proof</Form.Label>
                  <Form.Control type="file" accept="image/*" onChange={handleFile} />
                  {screenshot && (
                    <div className="small text-success mt-1">
                      <i className="bi bi-check-circle me-1"></i>
                      {screenshot.name}
                    </div>
                  )}
                </Form.Group>
                <Button
                  variant="success"
                  className="w-100"
                  disabled={!canSubmit || submitting}
                  onClick={submitProof}
                >
                  {submitting ? <Spinner size="sm" /> : 'Submit for Review'}
                </Button>
              </>
            )}

            {submitted && (
              <Alert variant="success">
                <i className="bi bi-check-circle me-2"></i>
                Submitted! An admin will review your screenshot. You will be credited once approved.
              </Alert>
            )}
          </Card.Body>
        </Card>
      </Container>
    )
  }

  const available = tasks.filter(
    (t) =>
      !completedTaskIds.has(t.id) &&
      t.campaigns?.status === 'approved' &&
      (t.max_completions == null || t.current_completions < t.max_completions)
  )

  return (
    <Container>
      <h1 className="h3 mb-4">Available Tasks</h1>
      <p className="text-muted mb-4">
        Complete tasks by visiting the link, waiting the required time, and uploading a screenshot.
      </p>
      {error && <Alert variant="danger">{error}</Alert>}

      {available.length === 0 ? (
        <Alert variant="secondary">No active tasks right now. Check back later.</Alert>
      ) : (
        <Row className="g-3">
          {available.map((task) => (
            <Col md={6} lg={4} key={task.id}>
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <Card.Title className="h6 mb-0">
                      {task.campaigns?.title || 'Task'}
                    </Card.Title>
                    <Badge bg="success">${Number(task.reward_amount).toFixed(2)}</Badge>
                  </div>
                  <p className="small text-muted mb-3">
                    <i className="bi bi-clock me-1"></i>
                    Wait {task.required_wait_seconds} seconds
                    {task.max_completions != null && (
                      <> · {task.current_completions}/{task.max_completions} done</>
                    )}
                  </p>
                  <Button
                    variant="outline-primary"
                    size="sm"
                    className="w-100"
                    onClick={() => startTask(task)}
                  >
                    Start Task
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Container>
  )
}

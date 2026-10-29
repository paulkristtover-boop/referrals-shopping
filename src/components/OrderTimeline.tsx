import { Badge } from 'react-bootstrap'

const STEPS = [
  { key: 'pending_payment', label: 'Pay' },
  { key: 'pending_approval', label: 'Confirm' },
  { key: 'approved', label: 'Promoting' },
  { key: 'completed', label: 'Done' },
] as const

function stepIndex(status: string): number {
  if (status === 'rejected' || status === 'expired') return -1
  if (status === 'completed') return 3
  if (status === 'approved') return 2
  if (status === 'pending_approval') return 1
  if (status === 'pending_payment') return 0
  return 0
}

export default function OrderTimeline({
  status,
  delivered,
  goal,
}: {
  status: string
  delivered?: number
  goal?: number
}) {
  const idx = stepIndex(status)
  const failed = status === 'rejected' || status === 'expired'

  return (
    <div className="order-timeline">
      {failed ? (
        <Badge bg="danger" className="badge-status">
          {status}
        </Badge>
      ) : (
        <div className="d-flex align-items-center gap-1 flex-wrap">
          {STEPS.map((s, i) => {
            const done = idx > i || (idx === i && status === 'completed')
            const active = idx === i && status !== 'completed'
            return (
              <span key={s.key} className="d-inline-flex align-items-center gap-1">
                {i > 0 && <span className="text-muted">→</span>}
                <span
                  className={`order-step ${done ? 'done' : ''} ${active ? 'active' : ''}`}
                >
                  {s.label}
                </span>
              </span>
            )
          })}
        </div>
      )}
      {typeof goal === 'number' && goal > 0 && (status === 'approved' || status === 'completed') && (
        <div className="small text-muted mt-1">
          Delivered {Number(delivered || 0).toLocaleString()} / {goal.toLocaleString()}
        </div>
      )}
    </div>
  )
}

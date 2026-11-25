import { Badge } from 'react-bootstrap'
import { adStatusLabel, adStatusVariant } from '../lib/adStatus'

const STEPS = [
  { key: 'pending_payment', label: 'Pay' },
  { key: 'pending_approval', label: 'Review' },
  { key: 'approved', label: 'Active' },
  { key: 'completed', label: 'Done' },
] as const

function stepIndex(status: string): number {
  if (status === 'rejected' || status === 'expired' || status === 'cancelled') return -1
  if (status === 'completed') return 3
  if (status === 'approved') return 2
  if (status === 'pending_approval') return 1
  if (status === 'pending_payment' || status === 'draft') return 0
  return 0
}

/** Compact pipeline: Pay → Review → Active → Done */
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
  const failed = status === 'rejected' || status === 'expired' || status === 'cancelled'

  return (
    <div className="order-timeline">
      {failed ? (
        <Badge bg={adStatusVariant(status)} className="badge-status">
          {adStatusLabel(status)}
        </Badge>
      ) : (
        <div className="d-flex align-items-center gap-1 flex-wrap">
          {STEPS.map((s, i) => {
            const done = idx > i || (idx === i && status === 'completed')
            const active = idx === i && status !== 'completed'
            return (
              <span key={s.key} className="d-inline-flex align-items-center gap-1">
                {i > 0 && <span className="text-muted small">→</span>}
                <span className={`order-step ${done ? 'done' : ''} ${active ? 'active' : ''}`}>{s.label}</span>
              </span>
            )
          })}
        </div>
      )}
      {typeof goal === 'number' && goal > 0 && (status === 'approved' || status === 'completed') && (
        <div className="small text-muted mt-1">
          {Number(delivered || 0).toLocaleString()} / {goal.toLocaleString()} delivered
        </div>
      )}
    </div>
  )
}

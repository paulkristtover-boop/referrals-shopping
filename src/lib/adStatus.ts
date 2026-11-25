/** User-facing campaign status — Ads Manager style, not internal jargon */

export type AdStatusKey =
  | 'draft'
  | 'pending_payment'
  | 'pending_approval'
  | 'approved'
  | 'completed'
  | 'rejected'
  | 'expired'
  | 'cancelled'
  | string

export function adStatusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: 'Draft',
    pending_payment: 'Needs payment',
    pending_approval: 'In review',
    approved: 'Active',
    completed: 'Completed',
    rejected: 'Rejected',
    expired: 'Ended',
    cancelled: 'Cancelled',
  }
  return map[status] || status
}

export function adStatusVariant(status: string): string {
  const map: Record<string, string> = {
    draft: 'secondary',
    pending_payment: 'warning',
    pending_approval: 'info',
    approved: 'success',
    completed: 'primary',
    rejected: 'danger',
    expired: 'secondary',
    cancelled: 'secondary',
  }
  return map[status] || 'secondary'
}

export function adStatusHint(status: string): string {
  const map: Record<string, string> = {
    draft: 'Finish setup to launch',
    pending_payment: 'Pay to start delivery',
    pending_approval: 'Admin checks payment',
    approved: 'Earners can complete tasks',
    completed: 'Target reached',
    rejected: 'See support if needed',
    expired: 'Payment window closed',
    cancelled: 'Stopped by you or admin',
  }
  return map[status] || ''
}

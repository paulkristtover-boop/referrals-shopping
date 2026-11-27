export function adStatusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: 'Draft',
    pending_payment: 'Needs payment',
    pending_approval: 'In review',
    approved: 'Active',
    paused: 'Paused',
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
    paused: 'secondary',
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
    pending_payment: 'Not live — pay first',
    pending_approval: 'Not live — admin review',
    approved: 'Live — earners can work',
    paused: 'Hidden from Earn until you resume',
    completed: 'Target reached',
    rejected: 'Contact support if needed',
    expired: 'Payment window closed',
    cancelled: 'Stopped',
  }
  return map[status] || ''
}

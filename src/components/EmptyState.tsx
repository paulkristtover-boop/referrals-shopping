import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  className?: string
  icon?: string
  title?: string
}

export default function EmptyState({ children, className = '', icon = 'bi-inbox', title }: Props) {
  return (
    <div className={`empty-state ${className}`.trim()}>
      <div className="feature-tile-icon mx-auto mb-2" style={{ width: '3rem', height: '3rem', fontSize: '1.35rem' }}>
        <i className={`bi ${icon}`} aria-hidden />
      </div>
      {title ? <div className="fw-semibold text-body mb-1">{title}</div> : null}
      <div className="small">{children}</div>
    </div>
  )
}

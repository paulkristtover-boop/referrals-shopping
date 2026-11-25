import type { ReactNode } from 'react'

type Props = {
  title: string
  lead?: string
  actions?: ReactNode
  className?: string
}

/** Consistent page title block used across the app */
export default function PageHeader({ title, lead, actions, className = '' }: Props) {
  return (
    <header className={`page-header page-header-row ${className}`.trim()}>
      <div className="min-w-0">
        <h1 className="mb-0">{title}</h1>
        {lead ? <p className="page-lead">{lead}</p> : null}
      </div>
      {actions ? <div className="d-flex flex-wrap gap-2 align-items-center">{actions}</div> : null}
    </header>
  )
}

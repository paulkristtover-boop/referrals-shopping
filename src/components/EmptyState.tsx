import type { ReactNode } from 'react'

export default function EmptyState({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`empty-state ${className}`.trim()}>
      <img
        className="empty-state-art"
        src="/illustrations/empty.svg"
        alt=""
        width={200}
        height={140}
      />
      <div>{children}</div>
    </div>
  )
}

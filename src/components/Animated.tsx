import { useEffect, useRef, type ReactNode } from 'react'
import { staggerIn, countUp, prefersReducedMotion } from '../lib/animate'
import { useReveal } from '../hooks/useReveal'

export function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useReveal<HTMLDivElement>()
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}

export function Stagger({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    staggerIn(ref.current, ':scope > .row > *', 70)
    staggerIn(ref.current, ':scope > *', 50)
  }, [children])
  return (
    <div ref={ref} className={`stagger-root ${className}`.trim()}>
      {children}
    </div>
  )
}

export function CountUp({
  value,
  className = '',
  duration = 900,
}: {
  value: number
  className?: string
  duration?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    countUp(ref.current, value, duration)
  }, [value, duration])
  return (
    <span ref={ref} className={className}>
      {prefersReducedMotion() ? value : 0}
    </span>
  )
}

export function FloatBlobs({ className = '' }: { className?: string }) {
  return (
    <div className={`float-blobs ${className}`.trim()} aria-hidden>
      <span className="blob b1" />
      <span className="blob b2" />
      <span className="blob b3" />
    </div>
  )
}

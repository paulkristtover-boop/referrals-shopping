import { useEffect, useRef } from 'react'
import { prefersReducedMotion } from '../lib/animate'

/** IntersectionObserver fade/slide-in */
export function useReveal<T extends HTMLElement = HTMLDivElement>(options?: { once?: boolean }) {
  const ref = useRef<T | null>(null)
  const once = options?.once !== false

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (prefersReducedMotion()) {
      el.classList.add('reveal-visible')
      return
    }
    el.classList.add('reveal')
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-visible')
            if (once) io.unobserve(entry.target)
          } else if (!once) {
            entry.target.classList.remove('reveal-visible')
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -24px 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [once])

  return ref
}

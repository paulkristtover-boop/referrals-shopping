/** Lightweight animation helpers (no extra deps) */

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Stagger-fade children of a container */
export function staggerIn(root: HTMLElement | null, itemSelector = ':scope > *', delayMs = 60) {
  if (!root || prefersReducedMotion()) return
  const items = root.querySelectorAll<HTMLElement>(itemSelector)
  items.forEach((el, i) => {
    el.classList.add('anim-prep')
    requestAnimationFrame(() => {
      el.style.transitionDelay = `${i * delayMs}ms`
      el.classList.add('anim-in')
    })
  })
}

/** Count up a number in an element */
export function countUp(el: HTMLElement | null, to: number, duration = 900) {
  if (!el) return
  if (prefersReducedMotion()) {
    el.textContent = String(to)
    return
  }
  const start = performance.now()
  const from = 0
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / duration)
    const eased = 1 - Math.pow(1 - t, 3)
    el.textContent = String(Math.round(from + (to - from) * eased))
    if (t < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

/** Subtle press ripple on click target */
export function bindRipple(el: HTMLElement | null) {
  if (!el || prefersReducedMotion()) return
  el.classList.add('has-ripple')
  el.addEventListener('click', (e) => {
    const rect = el.getBoundingClientRect()
    const span = document.createElement('span')
    span.className = 'ripple-ink'
    const size = Math.max(rect.width, rect.height)
    span.style.width = span.style.height = `${size}px`
    span.style.left = `${e.clientX - rect.left - size / 2}px`
    span.style.top = `${e.clientY - rect.top - size / 2}px`
    el.appendChild(span)
    setTimeout(() => span.remove(), 600)
  })
}

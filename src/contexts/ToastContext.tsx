import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

export type ToastKind = 'error' | 'success' | 'info'

type ToastItem = {
  id: number
  kind: ToastKind
  text: string
}

type ToastCtx = {
  push: (text: string, kind?: ToastKind, ms?: number) => void
  success: (text: string, ms?: number) => void
  error: (text: string, ms?: number) => void
  info: (text: string, ms?: number) => void
}

const Ctx = createContext<ToastCtx | undefined>(undefined)

let seq = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (text: string, kind: ToastKind = 'info', ms = 4500) => {
      const id = ++seq
      const msg = String(text || '').trim()
      if (!msg) return
      setItems((prev) => [...prev.slice(-4), { id, kind, text: msg }])
      window.setTimeout(() => remove(id), ms)
    },
    [remove]
  )

  const value = useMemo<ToastCtx>(
    () => ({
      push,
      success: (text, ms) => push(text, 'success', ms ?? 4000),
      error: (text, ms) => push(text, 'error', ms ?? 6000),
      info: (text, ms) => push(text, 'info', ms ?? 4500),
    }),
    [push]
  )

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="rs-toast-stack" aria-live="polite" aria-relevant="additions">
        {items.map((t) => (
          <div key={t.id} className={`rs-toast rs-toast-${t.kind}`} role={t.kind === 'error' ? 'alert' : 'status'}>
            <span className="rs-toast-icon">
              {t.kind === 'success' && <i className="bi bi-check-circle-fill" />}
              {t.kind === 'error' && <i className="bi bi-exclamation-circle-fill" />}
              {t.kind === 'info' && <i className="bi bi-info-circle-fill" />}
            </span>
            <span className="rs-toast-text">{t.text}</span>
            <button type="button" className="rs-toast-close" aria-label="Dismiss" onClick={() => remove(t.id)}>
              <i className="bi bi-x" />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export function useToast() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useToast outside ToastProvider')
  return v
}

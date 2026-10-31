import { useEffect, useState } from 'react'
import { Button } from 'react-bootstrap'

/**
 * Shows a banner when the network is slow or save-data is on.
 */
export default function SlowConnection() {
  const [slow, setSlow] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const check = () => {
      try {
        const nav = navigator as Navigator & {
          connection?: { effectiveType?: string; saveData?: boolean; addEventListener?: (e: string, fn: () => void) => void; removeEventListener?: (e: string, fn: () => void) => void }
        }
        const c = nav.connection
        if (!c) return
        const et = c.effectiveType || ''
        const isSlow = c.saveData === true || et === '2g' || et === 'slow-2g' || et === '3g'
        setSlow(isSlow)
      } catch {
        /* ignore */
      }
    }
    check()
    const nav = navigator as Navigator & { connection?: { addEventListener?: (e: string, fn: () => void) => void; removeEventListener?: (e: string, fn: () => void) => void } }
    const c = nav.connection
    c?.addEventListener?.('change', check)
    return () => c?.removeEventListener?.('change', check)
  }, [])

  if (!slow || dismissed) return null

  return (
    <div className="slow-connection-banner" role="status">
      <span>
        <i className="bi bi-reception-2 me-2" />
        Slow connection detected — large images may take longer.
      </span>
      <Button size="sm" variant="link" className="text-white py-0" onClick={() => setDismissed(true)}>
        Dismiss
      </Button>
    </div>
  )
}

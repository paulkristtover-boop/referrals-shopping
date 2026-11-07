const KEY = 'rs_session_key'

export function getOrCreateSessionKey(): string {
  try {
    let k = localStorage.getItem(KEY)
    if (!k) {
      k = crypto.randomUUID()
      localStorage.setItem(KEY, k)
    }
    return k
  } catch {
    return 'anon-' + String(Date.now())
  }
}

export function clearSessionKey() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

export function deviceLabelFromUA(ua: string): string {
  const u = ua || ''
  if (/Mobile|Android|iPhone/i.test(u)) {
    if (/iPhone/i.test(u)) return 'iPhone'
    if (/Android/i.test(u)) return 'Android phone'
    return 'Mobile'
  }
  if (/iPad|Tablet/i.test(u)) return 'Tablet'
  if (/Windows/i.test(u)) return 'Windows'
  if (/Mac OS|Macintosh/i.test(u)) return 'Mac'
  if (/Linux/i.test(u)) return 'Linux'
  return 'Browser'
}

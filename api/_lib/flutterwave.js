const FLW_BASE = 'https://api.flutterwave.com/v3'

export function flwSecret() {
  const k = (process.env.FLW_SECRET_KEY || process.env.FLUTTERWAVE_SECRET_KEY || '').trim()
  if (!k) throw new Error('FLW_SECRET_KEY not configured')
  return k
}

export function flwPublicKey() {
  return (
    process.env.FLW_PUBLIC_KEY ||
    process.env.VITE_FLW_PUBLIC_KEY ||
    process.env.FLUTTERWAVE_PUBLIC_KEY ||
    ''
  ).trim()
}

export async function flwFetch(path, options = {}) {
  const res = await fetch(`${FLW_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${flwSecret()}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

/** Create standard hosted checkout (V3 /payments) */
export async function createPaymentLink(payload) {
  const { ok, status, data } = await flwFetch('/payments', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (!ok || data?.status === 'error') {
    const msg =
      data?.message ||
      data?.data?.message ||
      (typeof data?.error === 'string' ? data.error : null) ||
      `Flutterwave HTTP ${status}`
    const err = new Error(msg)
    err.raw = data
    err.httpStatus = status
    throw err
  }
  return data
}

export async function verifyTransactionId(id) {
  const { ok, data } = await flwFetch(`/transactions/${id}/verify`, { method: 'GET' })
  if (!ok) throw new Error(data?.message || 'Verify failed')
  return data
}

export async function verifyByTxRef(txRef) {
  const { ok, data } = await flwFetch(
    `/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`,
    { method: 'GET' }
  )
  if (!ok) throw new Error(data?.message || 'Verify by ref failed')
  return data
}

export function assertWebhookHash(req) {
  const secret = (process.env.FLW_SECRET_HASH || process.env.FLW_WEBHOOK_HASH || '').trim()
  if (!secret) {
    console.error('FLW_SECRET_HASH is not configured; webhook requests must not be accepted')
    return false
  }
  const headers = req.headers || {}
  const header =
    headers['verif-hash'] ||
    headers['Verif-Hash'] ||
    Object.entries(headers).find(([k]) => k.toLowerCase() === 'verif-hash')?.[1]
  return Boolean(header && String(header) === String(secret))
}

export function isSuccessfulFlw(data) {
  const status = data?.data?.status || data?.status
  return String(status).toLowerCase() === 'successful'
}

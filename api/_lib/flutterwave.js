const FLW_BASE = 'https://api.flutterwave.com/v3'

export function flwSecret() {
  const k = process.env.FLW_SECRET_KEY || process.env.FLUTTERWAVE_SECRET_KEY
  if (!k) throw new Error('FLW_SECRET_KEY not configured')
  return k
}

export function flwPublicKey() {
  return process.env.FLW_PUBLIC_KEY || process.env.VITE_FLW_PUBLIC_KEY || process.env.FLUTTERWAVE_PUBLIC_KEY || ''
}

export async function flwFetch(path, options = {}) {
  const res = await fetch(`${FLW_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${flwSecret()}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data?.message || data?.error || `Flutterwave HTTP ${res.status}`
    throw new Error(msg)
  }
  return data
}

/** Create hosted checkout session */
export async function createPaymentLink(payload) {
  return flwFetch('/payments', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/** Verify by transaction id */
export async function verifyTransactionId(id) {
  return flwFetch(`/transactions/${id}/verify`, { method: 'GET' })
}

/** Verify by tx_ref */
export async function verifyByTxRef(txRef) {
  return flwFetch(`/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`, {
    method: 'GET',
  })
}

export function assertWebhookHash(req) {
  const secret = process.env.FLW_SECRET_HASH || process.env.FLW_WEBHOOK_HASH || ''
  if (!secret) return true // optional in test
  const header = req.headers['verif-hash'] || req.headers['Verif-Hash']
  return header && secret && header === secret
}

export function isSuccessfulFlw(data) {
  const status = data?.data?.status || data?.status
  return String(status).toLowerCase() === 'successful'
}

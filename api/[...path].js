/**
 * Catch-all API router (backup). Prefer explicit /api/payments/*.js routes.
 */
const routes = {
  'payments/check': () => import('../server/api/payments/check.js'),
  'payments/flutterwave-banks': () => import('../server/api/payments/flutterwave-banks.js'),
  'payments/flutterwave-health': () => import('../server/api/payments/flutterwave-health.js'),
  'payments/flutterwave-init': () => import('../server/api/payments/flutterwave-init.js'),
  'payments/flutterwave-transfer': () => import('../server/api/payments/flutterwave-transfer.js'),
  'payments/flutterwave-verify': () => import('../server/api/payments/flutterwave-verify.js'),
  'payments/flutterwave-webhook': () => import('../server/api/payments/flutterwave-webhook.js'),
  'payments/quote': () => import('../server/api/payments/quote.js'),
  'whatsapp/notify': () => import('../server/api/whatsapp/notify.js'),
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  let path = ''
  const q = req.query?.path
  if (Array.isArray(q)) path = q.filter(Boolean).join('/')
  else if (typeof q === 'string') path = q
  else if (req.url) {
    path = String(req.url).split('?')[0].replace(/^\/api\//, '').replace(/^\//, '')
  }
  path = path.replace(/^\/+|\/+$/g, '')

  const load = routes[path]
  if (!load) {
    return res.status(404).json({ error: 'API route not found', path, hint: 'Use /api/payments/flutterwave-init etc.' })
  }

  try {
    const module = await load()
    if (typeof module.default !== 'function') {
      return res.status(500).json({ error: 'API handler is not configured' })
    }
    return await module.default(req, res)
  } catch (error) {
    console.error(`API route failed: ${path}`, error)
    if (!res.headersSent) {
      return res.status(500).json({ error: error.message || 'Internal server error' })
    }
  }
}

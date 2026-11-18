/**
 * Vercel Hobby-compatible API router.
 * Keep implementation modules in /server/api so Vercel deploys only this
 * catch-all entry point as a Serverless Function.
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
  const rawPath = req.query?.path
  const path = (Array.isArray(rawPath) ? rawPath : [rawPath])
    .filter(Boolean)
    .join('/')
    .replace(/^\/+|\/+$/g, '')

  const load = routes[path]
  if (!load) return res.status(404).json({ error: 'API route not found' })

  try {
    const module = await load()
    if (typeof module.default !== 'function') {
      return res.status(500).json({ error: 'API handler is not configured' })
    }
    return await module.default(req, res)
  } catch (error) {
    console.error(`API route failed: ${path}`, error)
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error' })
    }
  }
}

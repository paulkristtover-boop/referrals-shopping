/**
 * GET/POST /api/payments/flutterwave-health
 * Use this URL to confirm the server is reachable (Flutterwave downtime checks).
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, verif-hash')
  if (req.method === 'OPTIONS') return res.status(200).end()

  return res.status(200).json({
    ok: true,
    service: 'referrals-shopping',
    flutterwave: 'ready',
    webhook: '/api/payments/flutterwave-webhook',
    time: new Date().toISOString(),
    hasSecretKey: Boolean(process.env.FLW_SECRET_KEY || process.env.FLUTTERWAVE_SECRET_KEY),
    hasSecretHash: Boolean(process.env.FLW_SECRET_HASH || process.env.FLW_WEBHOOK_HASH),
  })
}

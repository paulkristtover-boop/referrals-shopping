/** GET Nigerian banks for withdrawals */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })

  const key = process.env.FLW_SECRET_KEY || process.env.FLUTTERWAVE_SECRET_KEY
  if (!key) return res.status(500).json({ error: 'FLW_SECRET_KEY not set' })

  try {
    const r = await fetch('https://api.flutterwave.com/v3/banks/NG', {
      headers: { Authorization: `Bearer ${key}` },
    })
    const j = await r.json()
    if (!r.ok) return res.status(r.status).json({ error: j.message || 'Banks fetch failed', detail: j })
    const banks = (j.data || [])
      .map((b) => ({ code: String(b.code), name: b.name }))
      .sort((a, b) => a.name.localeCompare(b.name))
    return res.status(200).json({ banks })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}

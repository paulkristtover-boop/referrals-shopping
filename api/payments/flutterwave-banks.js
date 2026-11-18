/** GET Nigerian banks for withdrawals. Provider list is preferred; stable fallback keeps the form usable during outages. */
const FALLBACK_BANKS = [
  ['044', 'Access Bank'], ['063', 'Access Bank (Diamond)'], ['035', 'Wema Bank'],
  ['023', 'Citibank Nigeria'], ['050', 'Ecobank Nigeria'], ['070', 'Fidelity Bank'],
  ['011', 'First Bank of Nigeria'], ['214', 'First City Monument Bank'], ['058', 'Guaranty Trust Bank'],
  ['030', 'Heritage Bank'], ['301', 'Jaiz Bank'], ['082', 'Keystone Bank'],
  ['076', 'Polaris Bank'], ['221', 'Stanbic IBTC Bank'], ['068', 'Standard Chartered Bank'],
  ['232', 'Sterling Bank'], ['100', 'SunTrust Bank'], ['032', 'Union Bank of Nigeria'],
  ['033', 'United Bank for Africa'], ['215', 'Unity Bank'], ['057', 'Zenith Bank'],
].map(([code, name]) => ({ code, name }))

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })
  const key = process.env.FLW_SECRET_KEY || process.env.FLUTTERWAVE_SECRET_KEY
  if (!key) return res.status(200).json({ banks: FALLBACK_BANKS, source: 'fallback', warning: 'Live bank list is temporarily unavailable.' })
  try {
    const r = await fetch('https://api.flutterwave.com/v3/banks/NG', {
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
    })
    const j = await r.json().catch(() => ({}))
    const raw = Array.isArray(j.data) ? j.data : Array.isArray(j.banks) ? j.banks : []
    const banks = raw.map((b) => ({ code: String(b.code ?? b.id ?? ''), name: String(b.name ?? b.bank_name ?? '').trim() }))
      .filter((b) => b.code && b.name)
      .sort((a, b) => a.name.localeCompare(b.name))
    if (!r.ok || !banks.length) return res.status(200).json({ banks: FALLBACK_BANKS, source: 'fallback', warning: 'Live bank list could not be loaded. Confirm bank details before submitting.' })
    return res.status(200).json({ banks, source: 'flutterwave' })
  } catch {
    return res.status(200).json({ banks: FALLBACK_BANKS, source: 'fallback', warning: 'Live bank list could not be reached. Confirm bank details before submitting.' })
  }
}

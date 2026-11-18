import { flwFetch } from './_lib/flutterwave.js'

/** Return Nigerian electricity billers and prepaid/postpaid items supported by this Flutterwave account. */
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })
  try {
    const billersResult = await flwFetch('/bills/UTILITYBILLS/billers?country=NG', { method: 'GET' })
    if (!billersResult.ok) return res.status(502).json({ error: billersResult.data?.message || 'Could not load utility billers' })
    const billers = Array.isArray(billersResult.data?.data) ? billersResult.data.data : []
    const matches = billers.filter((b) => /electric|disco|power/i.test(`${b.name || ''} ${b.description || ''} ${b.short_name || ''}`))
    const providers = []
    for (const biller of matches) {
      const code = String(biller.biller_code || '')
      if (!code) continue
      const itemsResult = await flwFetch(`/billers/${encodeURIComponent(code)}/items`, { method: 'GET' })
      if (!itemsResult.ok) continue
      const items = Array.isArray(itemsResult.data?.data) ? itemsResult.data.data : []
      for (const item of items) {
        const itemCode = String(item.item_code || '')
        const label = String(item.short_name || item.name || item.label_name || biller.name || 'Electricity')
        const combined = `${label} ${item.name || ''} ${item.group_name || ''}`
        if (!itemCode || !/prepaid|postpaid/i.test(combined)) continue
        providers.push({ code, item_code: itemCode, meter_type: /postpaid/i.test(combined) ? 'postpaid' : 'prepaid', name: `${biller.name} — ${label}` })
      }
    }
    return res.status(200).json({ providers })
  } catch (e) { return res.status(502).json({ error: e.message || 'Could not load electricity providers' }) }
}

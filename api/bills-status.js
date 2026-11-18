import { createClient } from '@supabase/supabase-js'
import { adminClient } from './_lib/supabaseAdmin.js'
import { flwFetch } from './_lib/flutterwave.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: 'Sign in to check this payment.' })
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) return res.status(500).json({ error: 'Supabase auth is not configured.' })
  const client = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } })
  const { data: auth } = await client.auth.getUser()
  if (!auth?.user) return res.status(401).json({ error: 'Session expired.' })
  const reference = String(req.query?.reference || '')
  if (!/^RSB-[a-f0-9]{8}-\d+$/.test(reference)) return res.status(400).json({ error: 'Invalid bill reference.' })
  const sb = adminClient()
  const { data: bill, error } = await sb.from('bill_payments').select('*').eq('reference', reference).eq('user_id', auth.user.id).maybeSingle()
  if (error || !bill) return res.status(404).json({ error: 'Bill payment not found.' })
  if (['paid','refunded'].includes(bill.status)) return res.status(200).json({ status: bill.status, token: bill.provider_response?.extra || bill.provider_response?.recharge_token || bill.provider_response?.data?.extra || bill.provider_response?.data?.recharge_token || null })
  const history = await flwFetch(`/bills/history?reference=${encodeURIComponent(reference)}&country=NG&limit=5`, { method: 'GET' })
  if (!history.ok) return res.status(200).json({ status: 'pending', message: 'The provider has not returned a final status yet. Try again shortly.' })
  const entry = (Array.isArray(history.data?.data) ? history.data.data : [])[0] || {}
  const rawStatus = String(entry.status || '').toLowerCase()
  let providerDetails = entry
  if (['successful','success','completed','paid'].includes(rawStatus)) {
    const details = await flwFetch(`/bills/${encodeURIComponent(reference)}?verbose=1`, { method: 'GET' })
    providerDetails = details.ok ? details.data?.data || entry : entry
    await sb.from('bill_payments').update({ status: 'paid', provider_response: providerDetails, provider_reference: entry.flw_ref || bill.provider_reference, updated_at: new Date().toISOString() }).eq('id', bill.id)
    return res.status(200).json({ status: 'paid', token: providerDetails.extra || providerDetails.recharge_token || null })
  }
  if (['failed','failure','reversed','refunded'].includes(rawStatus)) {
    const { error: refundError } = await sb.rpc('refund_failed_bill', { p_bill_id: bill.id, p_reason: `Provider status: ${rawStatus}` })
    if (refundError) return res.status(500).json({ error: 'Provider reported a failed payment, but the refund needs support review.' })
    return res.status(200).json({ status: 'refunded', message: 'Payment failed. Your wallet has been refunded.' })
  }
  return res.status(200).json({ status: 'pending', message: 'The provider has not returned a final status yet. Try again shortly.' })
}

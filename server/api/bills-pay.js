import { createClient } from '@supabase/supabase-js'
import { adminClient } from './_lib/supabaseAdmin.js'
import { flwFetch } from './_lib/flutterwave.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: 'Sign in to pay an electricity bill.' })
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) return res.status(500).json({ error: 'Supabase auth is not configured on the server.' })
  const authClient = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } })
  const { data: auth, error: authError } = await authClient.auth.getUser()
  if (authError || !auth?.user) return res.status(401).json({ error: 'Your session has expired. Sign in again.' })
  const { provider_code, item_code, meter_number, meter_type, amount } = req.body || {}
  const value = Math.round(Number(amount))
  if (!provider_code || !item_code || !/^\d{8,15}$/.test(String(meter_number || '')) || !['prepaid', 'postpaid'].includes(meter_type) || !Number.isFinite(value) || value < 500) {
    return res.status(400).json({ error: 'Choose a provider, enter a valid meter number and meter type, and enter at least ₦500.' })
  }
  const sb = adminClient()
  // Validate the meter before reserving any wallet funds.
  const validation = await flwFetch(`/bill-items/${encodeURIComponent(String(item_code))}/validate?customer=${encodeURIComponent(String(meter_number))}`, { method: 'GET' })
  if (!validation.ok || validation.data?.status === 'error' || String(validation.data?.data?.response_code || '') !== '00') {
    return res.status(400).json({ error: validation.data?.data?.response_message || validation.data?.message || 'Meter number could not be validated. Check the number and provider.' })
  }
  const min = Number(validation.data?.data?.minimum || 0)
  const max = Number(validation.data?.data?.maximum || 0)
  if ((min > 0 && value < min) || (max > 0 && value > max)) {
    return res.status(400).json({ error: `Amount must be between ${min || 500} and ${max || 'the provider limit'}.` })
  }
  const reference = `RSB-${auth.user.id.slice(0, 8)}-${Date.now()}`
  const { data: debit, error: debitError } = await authClient.rpc('debit_wallet_for_bill', {
    p_amount: value, p_provider_code: String(provider_code), p_meter_number: String(meter_number),
    p_meter_type: meter_type, p_reference: reference,
  })
  if (debitError) return res.status(400).json({ error: debitError.message.includes('function') ? 'Run supabase/bill_payments.sql in Supabase before using bill payments.' : debitError.message })
  const billId = typeof debit === 'string' ? debit : debit?.id
  if (!billId) return res.status(500).json({ error: 'Wallet debit did not return a bill reference. Contact support before retrying.' })

  try {
    const { ok, status, data } = await flwFetch(`/billers/${encodeURIComponent(String(provider_code))}/items/${encodeURIComponent(String(item_code))}/payment`, {
      method: 'POST', body: JSON.stringify({ country: 'NG', customer_id: String(meter_number), amount: value, reference }),
    })
    const providerStatus = String(data?.data?.status || data?.status || '').toLowerCase()
    if (!ok || data?.status === 'error' || ['failed', 'error'].includes(providerStatus)) {
      const { error: refundError } = await sb.rpc('refund_failed_bill', { p_bill_id: billId, p_reason: data?.message || `Provider HTTP ${status}` })
      if (refundError) console.error('Electricity bill refund failed', billId, refundError.message)
      return res.status(502).json({ error: 'Electricity payment failed. ' + (refundError ? 'Your refund needs support review.' : 'Your wallet has been refunded.'), reference })
    }
    const providerRef = String(data?.data?.flw_ref || data?.data?.reference || reference)
    const { error: updateError } = await sb.from('bill_payments').update({ status: 'pending', provider_reference: providerRef, provider_response: data }).eq('id', billId).eq('user_id', auth.user.id)
    if (updateError) console.error('Could not update bill record', updateError.message)
    return res.status(200).json({ ok: true, status: 'pending', reference, provider_reference: providerRef, message: 'Payment submitted to the provider and is awaiting final confirmation.' })
  } catch (e) {
    // A network timeout is ambiguous: the provider may have accepted the request.
    // Keep funds reserved and let the status checker resolve it instead of risking a double refund.
    console.error('Electricity bill provider response uncertain', reference, e.message)
    return res.status(200).json({ ok: true, status: 'pending', reference, message: 'The provider response is delayed. Your wallet debit is on hold while we verify the payment; check status shortly.' })
  }
}

import { adminClient } from '../_lib/supabaseAdmin.js'
import { flwSecret } from '../_lib/flutterwave.js'
import { requireAdmin } from '../_lib/auth.js'

/**
 * POST { withdrawalId } — admin pays bank withdrawal via Flutterwave Transfer
 * Requires FLW_SECRET_KEY. Debits your Flutterwave NGN balance.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  try {
    const auth = await requireAdmin(req)
    if (!auth.user) return res.status(401).json({ error: 'Sign in required.' })
    if (!auth.admin) return res.status(403).json({ error: 'Admin access required.' })
    const { withdrawalId } = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
    if (!withdrawalId) return res.status(400).json({ error: 'withdrawalId required' })

    const sb = adminClient()
    const { data: w, error } = await sb.from('withdrawals').select('*').eq('id', withdrawalId).single()
    if (error || !w) return res.status(404).json({ error: 'Withdrawal not found' })
    if (w.status !== 'pending') return res.status(400).json({ error: 'Not pending' })
    if (w.flw_reference) return res.status(409).json({ error: 'This withdrawal has already been submitted to Flutterwave. Check its transfer status before retrying.' })
    if (w.method !== 'bank' && w.crypto_chain !== 'ngn_bank') {
      return res.status(400).json({ error: 'Not a bank withdrawal — mark paid manually for crypto' })
    }

    const ref = `rs_wd_${String(w.id).replace(/-/g, '').slice(0, 24)}`
    const payload = {
      account_bank: w.bank_code,
      account_number: w.account_number || w.wallet_address,
      amount: Number(w.amount),
      narration: `Referrals Shopping withdrawal`,
      currency: 'NGN',
      reference: ref,
      debit_currency: 'NGN',
      beneficiary_name: w.account_name || undefined,
    }

    const r = await fetch('https://api.flutterwave.com/v3/transfers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${flwSecret()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const j = await r.json()
    if (!r.ok || j.status !== 'success') {
      return res.status(400).json({ error: j.message || 'Transfer failed', detail: j })
    }

    const transferStatus = String(j.data?.status || '').toLowerCase()
    await sb
      .from('withdrawals')
      .update({
        status: ['successful', 'success', 'completed'].includes(transferStatus) ? 'paid' : 'pending',
        processed_at: new Date().toISOString(),
        flw_transfer_id: String(j.data?.id || ''),
        flw_reference: ref,
        admin_note: ['successful', 'success', 'completed'].includes(transferStatus) ? 'flutterwave_transfer_paid' : 'flutterwave_transfer_processing',
      })
      .eq('id', withdrawalId)

    return res.status(200).json({ ok: true, status: transferStatus || 'processing', transfer: j.data, reference: ref, message: ['successful', 'success', 'completed'].includes(transferStatus) ? 'Transfer completed.' : 'Transfer submitted and awaiting provider confirmation. Do not submit it again.' })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}

import { detectPayment } from '../_lib/chains.js'
import { adminClient } from '../_lib/supabaseAdmin.js'

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.authorization || ''
    if (auth !== `Bearer ${secret}` && req.headers['x-vercel-cron'] !== '1') {
      // Allow Vercel Cron without bearer when header present; still prefer CRON_SECRET for manual hits
      if (!req.headers['x-vercel-cron']) {
        return res.status(401).json({ error: 'unauthorized' })
      }
    }
  }

  try {
    const sb = adminClient()
    try {
      await sb.rpc('expire_payment_orders')
    } catch (_) {}

    const { data: orders, error } = await sb
      .from('payment_orders')
      .select('*')
      .eq('status', 'awaiting_payment')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(40)

    if (error) throw error
    const results = []
    for (const order of orders || []) {
      if (!order.amount_crypto || !order.deposit_address) continue
      try {
        const found = await detectPayment(
          order.crypto_chain,
          order.deposit_address,
          Number(order.amount_crypto),
          order.created_at
        )
        if (!found) {
          results.push({ id: order.id, status: 'waiting' })
          continue
        }
        await sb
          .from('payment_orders')
          .update({
            status: 'confirmed',
            detected_tx: found.hash,
            tx_hash: found.hash,
            confirmed_at: new Date().toISOString(),
          })
          .eq('id', order.id)
        if (order.campaign_id) {
          await sb
            .from('campaigns')
            .update({
              status: 'approved',
              approved_at: new Date().toISOString(),
              tx_hash: found.hash,
              payment_note: found.hash,
            })
            .eq('id', order.campaign_id)
          await sb.from('tasks').insert({
            campaign_id: order.campaign_id,
            reward_amount: 0.1,
            wait_seconds: 15,
            active: true,
          })
        }
        results.push({ id: order.id, status: 'confirmed', tx: found.hash })
      } catch (err) {
        results.push({ id: order.id, status: 'error', error: err.message })
      }
    }
    return res.json({ checked: (orders || []).length, results })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: e.message || 'cron failed' })
  }
}

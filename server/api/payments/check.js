import { detectPayment } from '../_lib/chains.js'
import { adminClient } from '../_lib/supabaseAdmin.js'
import { authenticatedUser } from '../_lib/auth.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const user = await authenticatedUser(req)
    if (!user) return res.status(401).json({ error: 'Sign in to check this payment.' })
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
    const orderId = req.method === 'GET' ? req.query.orderId : body.orderId
    if (!orderId) return res.status(400).json({ error: 'orderId required' })

    const sb = adminClient()
    const { data: order, error } = await sb.from('payment_orders').select('*').eq('id', orderId).eq('user_id', user.id).single()
    if (error || !order) return res.status(404).json({ error: 'Order not found' })

    if (order.status === 'confirmed') {
      return res.json({ status: 'confirmed', tx: order.detected_tx || order.tx_hash })
    }
    if (order.status === 'expired' || (order.expires_at && new Date(order.expires_at) < new Date())) {
      if (order.status !== 'expired') {
        await sb.from('payment_orders').update({ status: 'expired' }).eq('id', order.id)
        if (order.campaign_id) {
          await sb.from('campaigns').update({ status: 'expired' }).eq('id', order.campaign_id).eq('status', 'pending_payment')
        }
      }
      return res.json({ status: 'expired' })
    }
    if (!order.amount_crypto || !order.deposit_address) {
      return res.status(400).json({ error: 'Order missing amount_crypto or deposit_address' })
    }

    const found = await detectPayment(
      order.crypto_chain,
      order.deposit_address,
      Number(order.amount_crypto),
      order.created_at
    )
    if (!found) {
      return res.json({
        status: 'awaiting_payment',
        amount_crypto: order.amount_crypto,
        chain: order.crypto_chain,
        expires_at: order.expires_at,
      })
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
          status: 'pending_approval',
          tx_hash: found.hash,
          payment_note: found.hash,
        })
        .eq('id', order.campaign_id)
    }

    return res.json({ status: 'confirmed', tx: found.hash, amount: found.amount })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: e.message || 'check failed' })
  }
}

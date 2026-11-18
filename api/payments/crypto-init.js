import { randomUUID } from 'crypto'
import { adminClient } from '../_lib/supabaseAdmin.js'
import { authenticatedUser } from '../_lib/auth.js'
import { getRates, makeUniqueCryptoAmount, resolveDepositAddress } from '../_lib/chains.js'

/** Create a server-owned crypto payment order. Clients cannot choose the amount or deposit address. */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  try {
    const user = await authenticatedUser(req)
    if (!user) return res.status(401).json({ error: 'Sign in to create a crypto payment.' })
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
    const campaignId = String(body.campaignId || '')
    const chain = String(body.chain || '').toLowerCase()
    if (!campaignId || !['trx','sol','ton'].includes(chain)) return res.status(400).json({ error: 'Select an order and a supported crypto network.' })

    const sb = adminClient()
    const { data: campaign, error } = await sb.from('campaigns').select('id,user_id,status,paid_amount,title').eq('id', campaignId).eq('user_id', user.id).maybeSingle()
    if (error || !campaign) return res.status(404).json({ error: 'Order not found.' })
    if (campaign.status !== 'pending_payment') return res.status(400).json({ error: 'This order is not awaiting payment.' })
    const amountNgn = Math.round(Number(campaign.paid_amount || 0))
    if (!Number.isFinite(amountNgn) || amountNgn < 1000) return res.status(400).json({ error: 'Invalid order amount. Minimum paid order is ₦1,000.' })

    const ngnPerUsd = Number(process.env.NGN_PER_USD || process.env.VITE_NGN_PER_USD || 1600)
    if (!Number.isFinite(ngnPerUsd) || ngnPerUsd <= 0) return res.status(500).json({ error: 'Crypto conversion rate is not configured.' })
    const rates = await getRates()
    const rateUsd = Number(rates[chain])
    if (!Number.isFinite(rateUsd) || rateUsd <= 0) return res.status(502).json({ error: 'Could not retrieve the selected network rate.' })
    const usd = amountNgn / ngnPerUsd
    const { amount: amountCrypto, suffix } = makeUniqueCryptoAmount(usd, rateUsd)
    const depositAddress = await resolveDepositAddress(chain)
    if (!depositAddress) return res.status(503).json({ error: `The ${chain.toUpperCase()} deposit wallet is not configured.` })
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    const payCode = `RS${randomUUID().replace(/-/g, '').slice(0,20).toUpperCase()}`
    const { error: expireError } = await sb.from('payment_orders').update({ status: 'expired' }).eq('campaign_id', campaignId).eq('status', 'awaiting_payment')
    if (expireError) return res.status(500).json({ error: 'Could not close the previous payment window. Try again.' })
    const { data: order, error: insertError } = await sb.from('payment_orders').insert({
      user_id: user.id, campaign_id: campaignId, amount_usd: amountNgn,
      amount_crypto: amountCrypto, unique_suffix: suffix, rate_usd: rateUsd,
      crypto_chain: chain, pay_code: payCode, deposit_address: depositAddress,
      expires_at: expiresAt, status: 'awaiting_payment',
    }).select('id').single()
    if (insertError) return res.status(500).json({ error: 'Could not save the crypto payment order. Please try again.' })
    const { error: campaignUpdateError } = await sb.from('campaigns').update({
      crypto_chain: chain, pay_code: payCode, amount_crypto: amountCrypto, expires_at: expiresAt,
    }).eq('id', campaignId).eq('user_id', user.id)
    if (campaignUpdateError) {
      await sb.from('payment_orders').update({ status: 'rejected' }).eq('id', order.id)
      return res.status(500).json({ error: 'Could not link the crypto payment to your order.' })
    }
    return res.status(200).json({ ok: true, orderId: order.id, chain, amount_ngn: amountNgn, amount_crypto: amountCrypto, rate_usd: rateUsd, deposit_address: depositAddress, pay_code: payCode, expires_at: expiresAt })
  } catch (e) {
    console.error('crypto-init', e)
    return res.status(500).json({ error: e.message || 'Could not create crypto payment.' })
  }
}

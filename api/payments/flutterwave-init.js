import { adminClient } from '../_lib/supabaseAdmin.js'
import { createPaymentLink, flwPublicKey } from '../_lib/flutterwave.js'

/**
 * POST { campaignId, email, name, amountNgn }
 * Creates Flutterwave hosted checkout. Secret key never leaves the server.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
    const { campaignId, email, name, amountNgn } = body
    if (!campaignId || !email || !amountNgn) {
      return res.status(400).json({ error: 'campaignId, email, amountNgn required' })
    }
    const amount = Number(amountNgn)
    if (!Number.isFinite(amount) || amount < 100) {
      return res.status(400).json({ error: 'Invalid amount (min ₦100)' })
    }

    const sb = adminClient()
    const { data: camp, error } = await sb
      .from('campaigns')
      .select('id, user_id, title, status, paid_amount, package_id')
      .eq('id', campaignId)
      .single()
    if (error || !camp) return res.status(404).json({ error: 'Campaign not found' })
    if (!['pending_payment', 'draft'].includes(camp.status)) {
      return res.status(400).json({ error: 'Campaign is not awaiting payment' })
    }

    const expected = Number(camp.paid_amount || amount)
    if (Math.abs(expected - amount) > 0.01 && expected > 0) {
      // allow amount from client only if matches package
    }

    const tx_ref = `rs_${campaignId.replace(/-/g, '').slice(0, 12)}_${Date.now()}`
    const origin =
      process.env.APP_URL ||
      process.env.VITE_APP_URL ||
      (req.headers.origin ? String(req.headers.origin) : 'https://referrals-shopping.vercel.app')
    const redirect_url = `${origin.replace(/\/$/, '')}/promote?flw=1&campaignId=${campaignId}&tx_ref=${encodeURIComponent(tx_ref)}`

    const flw = await createPaymentLink({
      tx_ref,
      amount: expected > 0 ? expected : amount,
      currency: 'NGN',
      redirect_url,
      customer: {
        email: String(email).trim(),
        name: String(name || email).trim().slice(0, 80),
      },
      customizations: {
        title: 'Referrals Shopping',
        description: (camp.title || 'Referral package').slice(0, 100),
        logo: '',
      },
      meta: {
        campaign_id: campaignId,
        user_id: camp.user_id,
        source: 'referrals-shopping',
      },
      payment_options: 'card,banktransfer,ussd,account',
    })

    const link = flw?.data?.link
    if (!link) return res.status(502).json({ error: 'Flutterwave did not return a checkout link', raw: flw })

    const orderRow = {
      user_id: camp.user_id,
      campaign_id: campaignId,
      amount_usd: expected > 0 ? expected : amount,
      amount_crypto: 0,
      crypto_chain: 'ngn_flw',
      pay_code: tx_ref,
      deposit_address: 'flutterwave',
      status: 'awaiting_payment',
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    }
    const { data: existing } = await sb
      .from('payment_orders')
      .select('id')
      .eq('campaign_id', campaignId)
      .maybeSingle()
    if (existing?.id) {
      await sb.from('payment_orders').update(orderRow).eq('id', existing.id)
    } else {
      await sb.from('payment_orders').insert(orderRow)
    }

    await sb
      .from('campaigns')
      .update({
        status: 'pending_payment',
        crypto_chain: 'ngn_flw',
        pay_code: tx_ref,
        paid_amount: expected > 0 ? expected : amount,
      })
      .eq('id', campaignId)

    return res.json({
      link,
      tx_ref,
      public_key: flwPublicKey(),
      amount: expected > 0 ? expected : amount,
      currency: 'NGN',
    })
  } catch (e) {
    console.error('flw-init', e)
    return res.status(500).json({ error: e.message || 'Init failed' })
  }
}

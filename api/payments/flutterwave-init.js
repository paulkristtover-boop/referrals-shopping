import { adminClient } from '../_lib/supabaseAdmin.js'
import { createPaymentLink, flwPublicKey, flwSecret } from '../_lib/flutterwave.js'

/**
 * POST { campaignId, email, name, amountNgn }
 * Returns { link } for Flutterwave hosted checkout.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  try {
    try {
      flwSecret()
    } catch {
      return res.status(500).json({
        error:
          'FLW_SECRET_KEY missing on Vercel. Use Flutterwave V3 Secret key (FLWSECK_… or FLWSECK_TEST_…), then redeploy.',
      })
    }

    let body = req.body
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body || '{}')
      } catch {
        return res.status(400).json({ error: 'Invalid JSON body' })
      }
    }
    body = body || {}

    const campaignId = body.campaignId
    const email = body.email
    const name = body.name || email
    const amountNgn = body.amountNgn ?? body.amount

    if (!campaignId) return res.status(400).json({ error: 'campaignId required' })
    if (!email) return res.status(400).json({ error: 'email required' })

    let sb
    try {
      sb = adminClient()
    } catch {
      return res.status(500).json({
        error:
          'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on Vercel (service role is server-only, not VITE_).',
      })
    }

    const { data: camp, error: campErr } = await sb
      .from('campaigns')
      .select('id, user_id, title, status, paid_amount')
      .eq('id', campaignId)
      .maybeSingle()

    if (campErr || !camp) {
      return res.status(404).json({ error: 'Order not found', detail: campErr?.message })
    }

    // Allow re-open checkout for unpaid orders
    if (!['pending_payment', 'draft'].includes(camp.status)) {
      return res.status(400).json({
        error: `This order is already "${camp.status}". Create a new order or use refill if needed.`,
      })
    }

    const payAmount = Math.round(Number(camp.paid_amount || amountNgn || 0))
    if (!Number.isFinite(payAmount) || payAmount < 100) {
      return res.status(400).json({ error: 'Invalid amount (min ₦100)' })
    }

    const shortId = String(campaignId).replace(/-/g, '').slice(0, 10)
    const tx_ref = `rs_${shortId}_${Date.now()}`

    const host =
      process.env.APP_URL ||
      process.env.VITE_APP_URL ||
      (req.headers['x-forwarded-host']
        ? `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers['x-forwarded-host']}`
        : req.headers.origin || '')

    if (!host) {
      return res.status(500).json({
        error: 'Set APP_URL on Vercel to your full site URL, e.g. https://referrals-shopping.vercel.app',
      })
    }

    const base = String(host).replace(/\/$/, '')
    const redirect_url = `${base}/promote?flw=1&campaignId=${encodeURIComponent(campaignId)}&tx_ref=${encodeURIComponent(tx_ref)}`

    let flw
    try {
      flw = await createPaymentLink({
        tx_ref,
        amount: payAmount,
        currency: 'NGN',
        redirect_url,
        customer: {
          email: String(email).trim().toLowerCase(),
          name: String(name || email).trim().slice(0, 100),
        },
        customizations: {
          title: 'Referrals Shopping',
          description: String(camp.title || 'Referral package').slice(0, 120),
        },
        meta: {
          campaign_id: campaignId,
          user_id: camp.user_id,
        },
        payment_options: 'card,banktransfer,ussd',
      })
    } catch (e) {
      console.error('flw createPaymentLink', e.message, e.raw)
      return res.status(502).json({
        error: e.message || 'Flutterwave payment init failed',
        hint: 'Confirm V3 secret key, live vs test mode, and that the key matches your Flutterwave account.',
        raw: e.raw || null,
      })
    }

    const link = flw?.data?.link
    if (!link) {
      return res.status(502).json({ error: 'No checkout link from Flutterwave', raw: flw })
    }

    // Upsert payment order
    const orderRow = {
      user_id: camp.user_id,
      campaign_id: campaignId,
      amount_usd: payAmount,
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
      const ins = await sb.from('payment_orders').insert(orderRow)
      if (ins.error) console.error('payment_orders insert', ins.error)
    }

    await sb
      .from('campaigns')
      .update({
        status: 'pending_payment',
        crypto_chain: 'ngn_flw',
        pay_code: tx_ref,
        paid_amount: payAmount,
      })
      .eq('id', campaignId)

    return res.status(200).json({
      ok: true,
      link,
      tx_ref,
      amount: payAmount,
      currency: 'NGN',
      public_key: flwPublicKey() || undefined,
    })
  } catch (e) {
    console.error('flw-init', e)
    return res.status(500).json({ error: e.message || 'Init failed' })
  }
}

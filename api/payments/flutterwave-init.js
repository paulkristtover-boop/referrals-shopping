import { adminClient } from '../_lib/supabaseAdmin.js'
import { createPaymentLink, flwPublicKey, flwSecret } from '../_lib/flutterwave.js'

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
    // Fail fast with clear message if secrets missing
    try {
      flwSecret()
    } catch (e) {
      return res.status(500).json({
        error: 'FLW_SECRET_KEY is not set on Vercel. Add Flutterwave V3 Secret key and redeploy.',
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
    const name = body.name
    const amountNgn = body.amountNgn ?? body.amount
    if (!campaignId || !email || amountNgn == null) {
      return res.status(400).json({ error: 'campaignId, email, amountNgn required' })
    }
    const amount = Number(amountNgn)
    if (!Number.isFinite(amount) || amount < 100) {
      return res.status(400).json({ error: 'Invalid amount (min ₦100)' })
    }

    let sb
    try {
      sb = adminClient()
    } catch (e) {
      return res.status(500).json({
        error:
          'Server Supabase not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on Vercel (no VITE_ prefix for service role).',
      })
    }

    const { data: camp, error } = await sb
      .from('campaigns')
      .select('id, user_id, title, status, paid_amount, package_id')
      .eq('id', campaignId)
      .single()
    if (error || !camp) {
      return res.status(404).json({ error: 'Campaign not found', detail: error?.message })
    }
    if (!['pending_payment', 'draft'].includes(camp.status)) {
      return res.status(400).json({ error: `Campaign status is "${camp.status}" — cannot start payment` })
    }

    const expected = Number(camp.paid_amount || amount) || amount
    const payAmount = expected > 0 ? expected : amount

    const tx_ref = `rs_${String(campaignId).replace(/-/g, '').slice(0, 12)}_${Date.now()}`
    const origin =
      process.env.APP_URL ||
      process.env.VITE_APP_URL ||
      (req.headers['x-forwarded-host']
        ? `https://${req.headers['x-forwarded-host']}`
        : req.headers.origin
          ? String(req.headers.origin)
          : '')
    if (!origin) {
      return res.status(500).json({ error: 'Set APP_URL on Vercel to your site URL (e.g. https://your-app.vercel.app)' })
    }
    const redirect_url = `${origin.replace(/\/$/, '')}/promote?flw=1&campaignId=${campaignId}&tx_ref=${encodeURIComponent(tx_ref)}`

    let flw
    try {
      flw = await createPaymentLink({
        tx_ref,
        amount: payAmount,
        currency: 'NGN',
        redirect_url,
        customer: {
          email: String(email).trim(),
          name: String(name || email).trim().slice(0, 80),
          phonenumber: body.phone || undefined,
        },
        customizations: {
          title: 'Referrals Shopping',
          description: String(camp.title || 'Referral package').slice(0, 100),
        },
        meta: {
          campaign_id: campaignId,
          user_id: camp.user_id,
          source: 'referrals-shopping',
        },
        payment_options: 'card,banktransfer,ussd,account',
      })
    } catch (flwErr) {
      return res.status(502).json({
        error: flwErr.message || 'Flutterwave rejected payment init',
        hint: 'Use Flutterwave V3 Secret key (FLWSECK_…), not V4 Client Secret. Check live vs test mode.',
      })
    }

    const link = flw?.data?.link
    if (!link) {
      return res.status(502).json({
        error: 'Flutterwave did not return a checkout link',
        raw: flw,
      })
    }

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
      await sb.from('payment_orders').insert(orderRow)
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
      link,
      tx_ref,
      public_key: flwPublicKey(),
      amount: payAmount,
      currency: 'NGN',
    })
  } catch (e) {
    console.error('flw-init', e)
    return res.status(500).json({ error: e.message || 'Init failed' })
  }
}

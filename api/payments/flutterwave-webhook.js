import { adminClient } from '../_lib/supabaseAdmin.js'
import { assertWebhookHash, isSuccessfulFlw, verifyByTxRef, verifyTransactionId } from '../_lib/flutterwave.js'

/**
 * Flutterwave webhook — set URL in dashboard to /api/payments/flutterwave-webhook
 * Configure FLW_SECRET_HASH to match dashboard secret hash.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    if (!assertWebhookHash(req)) {
      return res.status(401).json({ error: 'Invalid verif-hash' })
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
    const event = body.event || body['event.type']
    const data = body.data || {}

    // Always re-verify with Flutterwave API (do not trust webhook body alone)
    let verified
    if (data.id) {
      verified = await verifyTransactionId(data.id)
    } else if (data.tx_ref) {
      verified = await verifyByTxRef(data.tx_ref)
    } else {
      return res.status(200).json({ ok: true, skipped: true })
    }

    if (!isSuccessfulFlw(verified)) {
      return res.status(200).json({ ok: true, status: 'not_successful' })
    }

    const v = verified.data
    const tx_ref = v.tx_ref || data.tx_ref
    const campId = v.meta?.campaign_id || data.meta?.campaign_id
    const sb = adminClient()

    let id = campId
    if (!id && tx_ref) {
      const { data: ord } = await sb.from('payment_orders').select('campaign_id').eq('pay_code', tx_ref).maybeSingle()
      id = ord?.campaign_id
    }
    if (id) {
      await sb
        .from('campaigns')
        .update({
          status: 'pending_approval',
          tx_hash: String(v.id || v.flw_ref || ''),
          payment_note: `flw_webhook:${event || 'charge'}`,
        })
        .eq('id', id)
        .in('status', ['pending_payment', 'draft'])

      await sb
        .from('payment_orders')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
          detected_tx: String(v.flw_ref || v.id || ''),
        })
        .eq('campaign_id', id)
    }

    return res.status(200).json({ ok: true })
  } catch (e) {
    console.error('flw-webhook', e)
    return res.status(500).json({ error: e.message })
  }
}

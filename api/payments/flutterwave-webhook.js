import { adminClient } from '../_lib/supabaseAdmin.js'
import {
  assertWebhookHash,
  isSuccessfulFlw,
  verifyByTxRef,
  verifyTransactionId,
} from '../_lib/flutterwave.js'

/**
 * Flutterwave webhook endpoint
 * Dashboard URL: https://YOUR_DOMAIN/api/payments/flutterwave-webhook
 * Secret hash must match FLW_SECRET_HASH on Vercel.
 *
 * Always responds quickly with 200 when possible so Flutterwave does not mark downtime.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, verif-hash, Verif-Hash')

  if (req.method === 'OPTIONS') return res.status(200).end()

  // URL probe / browser open
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      message: 'Flutterwave webhook endpoint is live. Use POST for events.',
      health: '/api/payments/flutterwave-health',
    })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // verif-hash: if configured, must match; if not configured, still process (log warning)
    const hashOk = assertWebhookHash(req)
    if (!hashOk) {
      console.warn('flw-webhook: invalid or missing verif-hash')
      return res.status(401).json({ error: 'Invalid verif-hash' })
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
    const event = body.event || body['event.type'] || body.type || ''
    const data = body.data || body

    let verified = null
    try {
      if (data.id || data.transaction_id) {
        verified = await verifyTransactionId(data.id || data.transaction_id)
      } else if (data.tx_ref) {
        verified = await verifyByTxRef(data.tx_ref)
      }
    } catch (verifyErr) {
      console.error('flw-webhook verify error', verifyErr)
      // Acknowledge receipt so Flutterwave does not retry forever on bad payloads
      return res.status(200).json({ ok: true, received: true, verified: false })
    }

    if (!verified || !isSuccessfulFlw(verified)) {
      return res.status(200).json({
        ok: true,
        status: verified?.data?.status || 'ignored',
        event,
      })
    }

    const v = verified.data || {}
    const tx_ref = v.tx_ref || data.tx_ref
    const campId = v.meta?.campaign_id || data.meta?.campaign_id
    const sb = adminClient()

    let id = campId
    if (!id && tx_ref) {
      const { data: ord } = await sb
        .from('payment_orders')
        .select('campaign_id')
        .eq('pay_code', tx_ref)
        .maybeSingle()
      id = ord?.campaign_id
    }

    if (id) {
      const { data: camp } = await sb.from('campaigns').select('id, status, user_id').eq('id', id).maybeSingle()

      if (camp && ['pending_payment', 'draft'].includes(camp.status)) {
        await sb
          .from('campaigns')
          .update({
            status: 'pending_approval',
            tx_hash: String(v.id || v.flw_ref || tx_ref || ''),
            payment_note: `flw_webhook:${event || 'charge.completed'}`,
          })
          .eq('id', id)

        await sb
          .from('payment_orders')
          .update({
            status: 'confirmed',
            confirmed_at: new Date().toISOString(),
            detected_tx: String(v.flw_ref || v.id || ''),
            tx_hash: String(v.id || ''),
          })
          .eq('campaign_id', id)

        // Audit (best-effort)
        try {
          await sb.from('audit_logs').insert({
            actor_id: camp.user_id,
            action: 'payment.flutterwave_confirmed',
            entity: 'campaign',
            entity_id: id,
            meta: { tx_ref, flw_ref: v.flw_ref, event, amount: v.amount },
          })
        } catch {
          /* table may not exist yet */
        }
      }
    }

    return res.status(200).json({ ok: true, campaignId: id || null })
  } catch (e) {
    console.error('flw-webhook', e)
    // Still 200 so FLW does not flag permanent downtime on transient errors
    return res.status(200).json({ ok: false, error: e.message || 'error' })
  }
}

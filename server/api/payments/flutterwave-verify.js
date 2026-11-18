import { broadcastWhatsApp, formatPaidOrderMessage } from '../_lib/whatsapp.js'
import { adminClient } from '../_lib/supabaseAdmin.js'
import { verifyByTxRef, verifyTransactionId, isSuccessfulFlw } from '../_lib/flutterwave.js'

/**
 * POST { tx_ref?, transaction_id?, campaignId? }
 * Server-side verification only — never trust the browser alone.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const body =
      req.method === 'GET'
        ? req.query
        : typeof req.body === 'string'
          ? JSON.parse(req.body || '{}')
          : req.body || {}
    const tx_ref = body.tx_ref || body.txRef
    const transaction_id = body.transaction_id || body.transactionId
    const campaignId = body.campaignId || body.campaign_id

    if (!tx_ref && !transaction_id) {
      return res.status(400).json({ error: 'tx_ref or transaction_id required' })
    }

    let verified
    if (transaction_id) {
      verified = await verifyTransactionId(transaction_id)
    } else {
      verified = await verifyByTxRef(tx_ref)
    }

    if (!isSuccessfulFlw(verified)) {
      return res.json({
        status: 'pending',
        flw_status: verified?.data?.status || verified?.status,
        message: 'Payment not successful yet',
      })
    }

    const data = verified.data
    const metaCampaign = data?.meta?.campaign_id || campaignId
    const paid = Number(data.amount)
    const currency = data.currency
    if (currency && currency !== 'NGN') {
      return res.status(400).json({ error: 'Unexpected currency' })
    }

    const sb = adminClient()
    let campId = metaCampaign
    if (!campId && tx_ref) {
      const { data: ord } = await sb.from('payment_orders').select('campaign_id').eq('pay_code', tx_ref).maybeSingle()
      campId = ord?.campaign_id
    }
    if (!campId) return res.status(404).json({ error: 'Campaign not linked to payment' })

    const { data: camp } = await sb.from('campaigns').select('*').eq('id', campId).single()
    if (!camp) return res.status(404).json({ error: 'Campaign not found' })

    // Amount check (allow small float tolerance)
    const expected = Number(camp.paid_amount || 0)
    if (expected > 0 && Math.abs(paid - expected) > 1) {
      return res.status(400).json({
        error: 'Amount mismatch',
        expected,
        paid,
      })
    }

    if (camp.status === 'approved' || camp.status === 'pending_approval') {
      return res.json({ status: 'confirmed', campaignId: campId, already: true })
    }

    await sb
      .from('campaigns')
      .update({
        status: 'pending_approval',
        tx_hash: String(data.id || data.flw_ref || tx_ref),
        payment_note: `flutterwave:${data.flw_ref || data.id}`,
      })
      .eq('id', campId)

    await sb
      .from('payment_orders')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        tx_hash: String(data.id || ''),
        detected_tx: String(data.flw_ref || ''),
      })
      .eq('campaign_id', campId)

    try {
      await sb.rpc('apply_order_tax', { p_campaign_id: campId })
    } catch (taxErr) {
      console.error('apply_order_tax', taxErr)
    }

    try {
      await broadcastWhatsApp(
        formatPaidOrderMessage({
          title: camp.title,
          amountNgn: camp.paid_amount || paid,
          campaignId: campId,
        })
      )
    } catch (waErr) {
      console.error('wa verify notify', waErr)
    }

    return res.json({
      status: 'confirmed',
      campaignId: campId,
      amount: paid,
      flw_ref: data.flw_ref,
    })
  } catch (e) {
    console.error('flw-verify', e)
    return res.status(500).json({ error: e.message || 'Verify failed' })
  }
}

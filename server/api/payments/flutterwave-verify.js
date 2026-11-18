import { broadcastWhatsApp, formatPaidOrderMessage } from '../_lib/whatsapp.js'
import { adminClient } from '../_lib/supabaseAdmin.js'
import { authenticatedUser } from '../_lib/auth.js'
import { verifyByTxRef, verifyTransactionId, isSuccessfulFlw } from '../_lib/flutterwave.js'

/** Authenticated checkout-return verification. Never trust campaignId or amount from the browser. */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  try {
    const user = await authenticatedUser(req)
    if (!user) return res.status(401).json({ error: 'Sign in to verify this payment.' })
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
    const txRefInput = body.tx_ref || body.txRef
    const transactionId = body.transaction_id || body.transactionId
    if (!txRefInput && !transactionId) return res.status(400).json({ error: 'tx_ref or transaction_id required' })

    const verified = transactionId ? await verifyTransactionId(transactionId) : await verifyByTxRef(txRefInput)
    if (!isSuccessfulFlw(verified)) return res.status(200).json({ status: 'pending', flw_status: verified?.data?.status || verified?.status, message: 'Payment has not been confirmed yet.' })
    const data = verified.data || {}
    const txRef = String(data.tx_ref || txRefInput || '')
    if (!txRef) return res.status(400).json({ error: 'Flutterwave response did not include a transaction reference.' })
    const sb = adminClient()
    const { data: order, error: orderError } = await sb.from('payment_orders').select('*').eq('pay_code', txRef).maybeSingle()
    if (orderError || !order || order.user_id !== user.id || !order.campaign_id) return res.status(403).json({ error: 'This payment reference does not belong to your account.' })
    const { data: camp, error: campError } = await sb.from('campaigns').select('*').eq('id', order.campaign_id).eq('user_id', user.id).maybeSingle()
    if (campError || !camp) return res.status(404).json({ error: 'Linked order not found.' })
    if (String(data.currency || '').toUpperCase() !== 'NGN') return res.status(400).json({ error: 'Unexpected payment currency.' })
    const expected = Number(order.amount_usd || camp.paid_amount || 0)
    const paid = Number(data.amount || 0)
    if (!expected || !Number.isFinite(paid) || paid + 0.01 < expected) return res.status(400).json({ error: 'Payment amount does not match the order.', expected, paid })
    if (['approved','pending_approval'].includes(camp.status) || order.status === 'confirmed') return res.status(200).json({ status: 'confirmed', campaignId: camp.id, already: true })
    if (!['pending_payment','draft'].includes(camp.status)) return res.status(400).json({ error: `Order cannot be confirmed from status: ${camp.status}` })

    const { error: campUpdateError } = await sb.from('campaigns').update({ status: 'pending_approval', tx_hash: String(data.id || data.flw_ref || txRef), payment_note: `flutterwave:${data.flw_ref || data.id || txRef}` }).eq('id', camp.id).eq('user_id', user.id)
    if (campUpdateError) throw campUpdateError
    const { error: orderUpdateError } = await sb.from('payment_orders').update({ status: 'confirmed', confirmed_at: new Date().toISOString(), tx_hash: String(data.id || ''), detected_tx: String(data.flw_ref || '') }).eq('id', order.id).eq('user_id', user.id)
    if (orderUpdateError) throw orderUpdateError
    try { await sb.rpc('apply_order_tax', { p_campaign_id: camp.id }) } catch (e) { console.error('apply_order_tax', e) }
    try { await broadcastWhatsApp(formatPaidOrderMessage({ title: camp.title, amountNgn: camp.paid_amount || paid, campaignId: camp.id })) } catch (e) { console.error('WhatsApp payment notification', e) }
    return res.status(200).json({ status: 'confirmed', campaignId: camp.id, amount: paid, flw_ref: data.flw_ref })
  } catch (e) {
    console.error('flw-verify', e)
    return res.status(500).json({ error: e.message || 'Verification failed' })
  }
}

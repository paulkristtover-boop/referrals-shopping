import { adminClient } from '../_lib/supabaseAdmin.js'
import {
  broadcastWhatsApp,
  formatPaidOrderMessage,
  formatTaskLiveMessage,
  formatNewOrderPendingMessage,
  waConfigured,
} from '../_lib/whatsapp.js'

/**
 * POST { event, campaignId, message? }
 * event: order_paid | task_live | order_created
 * Auth: Bearer <user access token> (admin) OR x-wa-secret: WHATSAPP_NOTIFY_SECRET
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-wa-secret')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  try {
    if (!waConfigured()) {
      return res.status(503).json({
        error: 'WhatsApp not configured',
        need: ['WHATSAPP_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_NOTIFY_TO'],
      })
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
    const secret = process.env.WHATSAPP_NOTIFY_SECRET || ''
    const headerSecret = req.headers['x-wa-secret']
    let authorized = Boolean(secret && headerSecret && headerSecret === secret)

    if (!authorized) {
      const auth = req.headers.authorization || ''
      const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
      if (!token) return res.status(401).json({ error: 'Unauthorized' })
      const sb = adminClient()
      const { data: userData, error: userErr } = await sb.auth.getUser(token)
      if (userErr || !userData?.user) return res.status(401).json({ error: 'Invalid token' })
      const { data: prof } = await sb.from('profiles').select('role').eq('id', userData.user.id).maybeSingle()
      if (prof?.role !== 'admin') return res.status(403).json({ error: 'Admin only' })
      authorized = true
    }

    const event = body.event
    const campaignId = body.campaignId
    if (!event) return res.status(400).json({ error: 'event required' })

    const sb = adminClient()
    let message = body.message

    if (!message && campaignId) {
      const { data: camp } = await sb
        .from('campaigns')
        .select('id, title, target_url, paid_amount, status, user_id, profiles(email)')
        .eq('id', campaignId)
        .maybeSingle()
      if (!camp) return res.status(404).json({ error: 'Campaign not found' })

      if (event === 'order_paid') {
        message = formatPaidOrderMessage({
          title: camp.title,
          amountNgn: camp.paid_amount,
          campaignId: camp.id,
          email: camp.profiles?.email,
        })
      } else if (event === 'task_live') {
        message = formatTaskLiveMessage({
          title: camp.title,
          targetUrl: camp.target_url,
          campaignId: camp.id,
        })
      } else if (event === 'order_created') {
        message = formatNewOrderPendingMessage({
          title: camp.title,
          amountNgn: camp.paid_amount,
          campaignId: camp.id,
        })
      }
    }

    if (!message) return res.status(400).json({ error: 'message or campaignId+event required' })

    const result = await broadcastWhatsApp(message)
    return res.status(200).json(result)
  } catch (e) {
    console.error('wa-notify', e)
    return res.status(500).json({ error: e.message })
  }
}

/**
 * WhatsApp Business Cloud API (Meta)
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 *
 * Cloud API delivers to phone numbers (1:1). It does not post into a normal
 * WhatsApp group chat. Put your ops numbers in WHATSAPP_NOTIFY_TO — those people
 * can sit in your group and forward, or you treat the numbers as your alert channel.
 */

const GRAPH = process.env.WHATSAPP_GRAPH_URL || 'https://graph.facebook.com'
const VERSION = process.env.WHATSAPP_API_VERSION || 'v21.0'

export function waConfigured() {
  return Boolean(
    process.env.WHATSAPP_TOKEN &&
      process.env.WHATSAPP_PHONE_NUMBER_ID &&
      (process.env.WHATSAPP_NOTIFY_TO || '').trim()
  )
}

export function notifyNumbers() {
  return String(process.env.WHATSAPP_NOTIFY_TO || '')
    .split(/[,;\s]+/)
    .map((n) => n.replace(/\D/g, ''))
    .filter((n) => n.length >= 10)
}

export async function sendWhatsAppText(toDigits, body) {
  const token = process.env.WHATSAPP_TOKEN
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
  if (!token || !phoneId) throw new Error('WhatsApp Cloud API not configured')

  const to = String(toDigits).replace(/\D/g, '')
  const res = await fetch(`${GRAPH}/${VERSION}/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: {
        preview_url: false,
        body: String(body).slice(0, 4000),
      },
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data?.error?.message || data?.message || `WhatsApp HTTP ${res.status}`
    const err = new Error(msg)
    err.raw = data
    throw err
  }
  return data
}

/** Send same text to all notify numbers; never throws to callers */
export async function broadcastWhatsApp(body) {
  if (!waConfigured()) {
    return { ok: false, skipped: true, reason: 'not_configured' }
  }
  const list = notifyNumbers()
  const results = []
  for (const to of list) {
    try {
      const data = await sendWhatsAppText(to, body)
      results.push({ to, ok: true, id: data?.messages?.[0]?.id })
    } catch (e) {
      console.error('wa send', to, e.message)
      results.push({ to, ok: false, error: e.message })
    }
  }
  return { ok: results.some((r) => r.ok), results }
}

export function formatPaidOrderMessage({ title, amountNgn, campaignId, email }) {
  return (
    `*Referrals Shopping — New paid order*\n` +
    `Title: ${title || '—'}\n` +
    `Amount: ₦${Number(amountNgn || 0).toLocaleString('en-NG')}\n` +
    (email ? `Buyer: ${email}\n` : '') +
    `Order ID: ${String(campaignId || '').slice(0, 8)}…\n` +
    `Open Admin → Campaigns to approve the link.`
  )
}

export function formatTaskLiveMessage({ title, targetUrl, campaignId }) {
  return (
    `*Referrals Shopping — Tasks live*\n` +
    `Campaign: ${title || '—'}\n` +
    (targetUrl ? `Link: ${targetUrl}\n` : '') +
    `Earn users can take this task now.\n` +
    `ID: ${String(campaignId || '').slice(0, 8)}…`
  )
}

export function formatNewOrderPendingMessage({ title, amountNgn, campaignId }) {
  return (
    `*Referrals Shopping — New order (awaiting payment)*\n` +
    `Title: ${title || '—'}\n` +
    `Amount: ₦${Number(amountNgn || 0).toLocaleString('en-NG')}\n` +
    `ID: ${String(campaignId || '').slice(0, 8)}…`
  )
}

import { WA_GROUP } from './brand'

/**
 * Open WhatsApp with a pre-filled update message.
 * - If VITE_WA_GROUP is a group invite link (chat.whatsapp.com), opens the group (user pastes message).
 * - If it is a phone number (digits), opens wa.me chat with text.
 * True automated group posting needs WhatsApp Business Cloud API (server-side).
 */
export function openWhatsAppUpdate(message: string) {
  const text = encodeURIComponent(message.trim())
  const target = (WA_GROUP || '').trim()
  if (!target) {
    // Generic share — user picks any chat/group
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer')
    return
  }
  if (target.includes('chat.whatsapp.com') || target.includes('whatsapp.com')) {
    window.open(target, '_blank', 'noopener,noreferrer')
    // Also copy text for paste into group
    try {
      void navigator.clipboard.writeText(message.trim())
    } catch {
      /* ignore */
    }
    return
  }
  const phone = target.replace(/\D/g, '')
  window.open(`https://wa.me/${phone}?text=${text}`, '_blank', 'noopener,noreferrer')
}

export function formatOrderUpdate(opts: {
  title: string
  refs?: number
  status?: string
  brand?: string
}) {
  const brand = opts.brand || 'Referrals Shopping'
  return (
    `*${brand} update*\n` +
    `Order: ${opts.title}\n` +
    (opts.refs != null ? `Referrals: ${opts.refs.toLocaleString()}\n` : '') +
    (opts.status ? `Status: ${opts.status}\n` : '') +
    `\nOpen the app to promote or earn.`
  )
}

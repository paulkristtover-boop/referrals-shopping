import { useState } from 'react'
import { Button, Dropdown } from 'react-bootstrap'
import { BRAND } from '../lib/brand'

/** Public share payload — never include payment/order status */
export type ShareOrderPayload = {
  title: string
  /** Referral link to share externally */
  targetUrl: string
  packageName?: string
}

function buildMessage(p: ShareOrderPayload) {
  const lines = [
    `${BRAND}`,
    p.title,
    p.packageName ? `Package: ${p.packageName}` : null,
    '',
    'Join via this referral link:',
    p.targetUrl,
  ].filter((x) => x !== null && x !== undefined) as string[]
  return lines.join('\n')
}

function shareLinks(p: ShareOrderPayload) {
  const text = buildMessage(p)
  const short = `${BRAND}: ${p.title}`
  const url = p.targetUrl
  return {
    text,
    wa: `https://wa.me/?text=${encodeURIComponent(text)}`,
    tg: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(short)}`,
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(short)}&url=${encodeURIComponent(url)}`,
    fb: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    mail: `mailto:?subject=${encodeURIComponent(`${BRAND} — ${p.title}`)}&body=${encodeURIComponent(text)}`,
  }
}

type Props = {
  order: ShareOrderPayload
  size?: 'sm'
  variant?: string
  className?: string
}

export default function ShareOrder({ order, size = 'sm', variant = 'outline-secondary', className = '' }: Props) {
  const [copied, setCopied] = useState<'link' | 'msg' | null>(null)
  const links = shareLinks(order)

  const copy = async (value: string, kind: 'link' | 'msg') => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(kind)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      /* ignore */
    }
  }

  const nativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${BRAND} — ${order.title}`,
          text: buildMessage(order),
          url: order.targetUrl,
        })
        return
      } catch {
        /* cancelled */
      }
    }
    void copy(order.targetUrl, 'link')
  }

  const open = (href: string) => {
    window.open(href, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className={`d-inline-flex flex-wrap gap-1 align-items-center ${className}`}>
      <Dropdown>
        <Dropdown.Toggle size={size} variant={variant} id={`share-${order.targetUrl.slice(-12)}`}>
          <i className="bi bi-share me-1" />
          Share
        </Dropdown.Toggle>
        <Dropdown.Menu align="end">
          <Dropdown.Header>Share referral link only</Dropdown.Header>
          <Dropdown.Item onClick={() => open(links.wa)}>
            <i className="bi bi-whatsapp text-success me-2" />
            WhatsApp
          </Dropdown.Item>
          <Dropdown.Item onClick={() => open(links.tg)}>
            <i className="bi bi-telegram text-primary me-2" />
            Telegram
          </Dropdown.Item>
          <Dropdown.Item onClick={() => open(links.x)}>
            <i className="bi bi-twitter-x me-2" />
            X (Twitter)
          </Dropdown.Item>
          <Dropdown.Item onClick={() => open(links.fb)}>
            <i className="bi bi-facebook text-primary me-2" />
            Facebook
          </Dropdown.Item>
          <Dropdown.Item onClick={() => open(links.mail)}>
            <i className="bi bi-envelope me-2" />
            Email
          </Dropdown.Item>
          <Dropdown.Divider />
          <Dropdown.Item onClick={() => void nativeShare()}>
            <i className="bi bi-phone me-2" />
            Device share…
          </Dropdown.Item>
          <Dropdown.Item onClick={() => void copy(order.targetUrl, 'link')}>
            <i className="bi bi-link-45deg me-2" />
            {copied === 'link' ? 'Copied!' : 'Copy referral link'}
          </Dropdown.Item>
          <Dropdown.Item onClick={() => void copy(links.text, 'msg')}>
            <i className="bi bi-clipboard me-2" />
            {copied === 'msg' ? 'Copied!' : 'Copy message'}
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
      <Button size={size} variant="outline-success" title="WhatsApp" onClick={() => open(links.wa)} aria-label="Share on WhatsApp">
        <i className="bi bi-whatsapp" />
      </Button>
      <Button size={size} variant="outline-primary" title="Telegram" onClick={() => open(links.tg)} aria-label="Share on Telegram">
        <i className="bi bi-telegram" />
      </Button>
    </div>
  )
}

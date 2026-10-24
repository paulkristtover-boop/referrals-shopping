import { Accordion, Card } from 'react-bootstrap'
import { Link } from 'react-router-dom'

export default function Faq() {
  const items = [
    {
      q: 'After I pay for a package, how long until I receive all referrals?',
      a: 'It depends on the package size and the type of site or channel you ordered for. In most cases referrals are collected over about 3 to 12 days. Larger packages and harder niches can take longer. You can track status on your Dashboard after payment is confirmed.',
    },
    {
      q: 'Do you offer a free trial?',
      a: 'No. Free trials are not available because of past abuse. Every order starts with a paid package so we can keep promotion quality consistent for paying customers.',
    },
    {
      q: 'What is the refund / guarantee condition?',
      a: 'We aim for at least 70% of the referrals you ordered to remain active for about a month. If your active percentage is clearly below that, open a Support ticket and share the details the admin asks for (order info, screenshots, stats). Eligible cases are reviewed for a partial or full refund path according to admin review.',
    },
    {
      q: 'Which cryptocurrencies can I pay with?',
      a: 'TRX (Tron), SOL (Solana), and TON. Each order gets a unique pay code — include it in your payment note when possible, and always submit the transaction hash on the Promote page.',
    },
    {
      q: 'How do invite codes work?',
      a: 'Every user gets a personal invite code and link. When someone registers with your code, they are linked as your invite. Use Invite in the menu to copy your link.',
    },
    {
      q: 'How do I contact customer service?',
      a: 'Use Support on the website to open a ticket, or join our Telegram channel for announcements and updates.',
    },
  ]

  return (
    <div className="page-enter">
      <h1 className="fw-bold mb-2">FAQ</h1>
      <p className="text-muted mb-4">Frequently asked questions about Referral Shopping.</p>
      <Card className="rs-card rs-card-static">
        <Card.Body>
          <Accordion alwaysOpen>
            {items.map((item, i) => (
              <Accordion.Item eventKey={String(i)} key={item.q}>
                <Accordion.Header>{item.q}</Accordion.Header>
                <Accordion.Body className="text-muted">{item.a}</Accordion.Body>
              </Accordion.Item>
            ))}
          </Accordion>
        </Card.Body>
      </Card>
      <p className="mt-3 small">
        Still need help? <Link to="/support">Open a support ticket</Link> or{' '}
        <a href="https://t.me/referralshopping" target="_blank" rel="noreferrer">message the Telegram channel</a>.
      </p>
    </div>
  )
}

import { Accordion, Card } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { BRAND, TG, IG, IG_HANDLE } from '../lib/brand'

export default function Faq() {
  const items = [
    {
      q: 'What counts as a referral?',
      a: 'Regular packages: the person opens your referral link and creates an account — no deposit required. Investment/gambling packages: they must create an account and make a deposit. We only count referrals that meet the rule for the package you bought.',
    },
    {
      q: 'Why are gambling / investment packages more expensive?',
      a: 'Those referrals must deposit, not only register. That is harder to deliver, so pricing is higher than regular (signup-only) packages.',
    },
    {
      q: 'After I pay for a package, how long until I receive all referrals?',
      a: 'It depends on package size and category (regular vs deposit). In most cases delivery takes about 3 to 12 days. Deposit-based orders can take longer. Track status on your Dashboard after payment is confirmed.',
    },
    {
      q: 'Do you offer a free trial?',
      a: 'Yes — a one-time Free Starter: 50 regular-site referrals per account. No free gambling packages. After that, choose a paid package for more volume. Unlimited free trials were removed because of abuse.',
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
      a: 'Use Support on the website to open a ticket, or follow us on Telegram and Instagram (@referralshopping) for announcements.',
    },
  ]

  return (
    <div className="page-enter">
      <h1 className="fw-bold mb-2">FAQ</h1>
      <p className="text-muted mb-4">Frequently asked questions about {BRAND}.</p>
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
        <a href={TG} target="_blank" rel="noreferrer">Telegram</a>
        {' · '}
        <a href={IG} target="_blank" rel="noreferrer">{IG_HANDLE}</a>.
      </p>
    </div>
  )
}

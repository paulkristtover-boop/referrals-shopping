import { Link } from 'react-router-dom'
import { Accordion, Card } from 'react-bootstrap'
import { BRAND, TG, IG, IG_HANDLE } from '../lib/brand'

export default function Faq() {
  const items = [
    {
      q: 'Do I get a tax invoice?',
      a: 'Yes. Open Receipts for net, tax, and total in ₦, then print a tax invoice. Supplier tax details come from platform settings. Tax rules vary by country — this is a payment record, not personalised tax advice.',
    },

    {
      q: `How does ${BRAND} get referrals for my link?`,
      a: 'We run a two-sided marketplace. When you pay for a Promote package, your link becomes Earn tasks. Users on this platform open your link, wait the timer, and submit a screenshot. You (the poster) can confirm proofs; admin handles disputes and approves links. We may also highlight offers on Telegram/Instagram when those channels are active. Delivery speed depends on earner activity—not on a fixed “bot” push.',
    },
    {
      q: 'What if you have few earners?',
      a: 'Orders fill only as tasks are completed. Large packages take longer when Earn supply is low. Check order status on Dashboard; Support can clarify capacity. We do not invent numbers—proofs and delivery counts are the record.',
    },
    {
      q: 'Regular vs investment / deposit packages?',
      a: 'Regular: the referred person signs up via your link (no deposit). Investment/deposit: they must sign up and deposit on your offer. Deposit tasks cost more and usually fill slower.',
    },
    {
      q: 'After I pay, how long until referrals arrive?',
      a: 'Often about 3–12 days, depending on package size and type. Deposit orders and very large volumes can take longer. Your order timeline shows payment → approval → delivery progress.',
    },
    {
      q: 'Is there a free trial?',
      a: 'One-time Free Starter: 50 regular referrals per account. No free deposit packages. Unlimited free trials were removed because of abuse.',
    },
    {
      q: 'Refund / active-referral condition?',
      a: 'We aim for about 70% of ordered referrals to stay active for roughly a month where that can be checked. If the active rate is clearly lower, open Support with order info and anything admin asks for. Outcomes are case-by-case after review.',
    },
    {
      q: 'How do I pay?',
      a: 'Flutterwave in Naira (card, bank, USSD) or crypto (TRX, SOL, TON). Flutterwave payments are verified on our servers. Crypto orders use a unique amount window—submit the tx hash when asked.',
    },
    {
      q: 'What do earners do?',
      a: 'Open a task from Earn, visit the promoter’s link, wait the required time, upload a clear screenshot. You cannot earn on your own adverts. Balance is credited after poster or admin approval; withdraw from Wallet.',
    },
    {
      q: 'How do invite codes work?',
      a: 'Each account has an invite code and link under Invite. When someone registers with your code, they are linked to you.',
    },
    {
      q: 'Customer service?',
      a: `Use Support on the site for tickets. Announcements: Telegram and Instagram (${IG_HANDLE}).`,
    },
  ]

  return (
    <div className="page-enter">
      <h1 className="fw-bold mb-2">FAQ</h1>
      <p className="text-muted mb-4">
        Honest answers about how {BRAND} delivers referrals through Promote + Earn.
      </p>
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
        <a href={TG} target="_blank" rel="noreferrer">
          Telegram
        </a>
        {' · '}
        <a href={IG} target="_blank" rel="noreferrer">
          {IG_HANDLE}
        </a>
        {' · '}
        <Link to="/guide">Full guide</Link>.
      </p>
    </div>
  )
}

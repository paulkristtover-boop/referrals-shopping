import { Container, Card } from 'react-bootstrap'

export default function TermsPage() {
  return (
    <Container style={{ maxWidth: 720 }}>
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4">
          <h1 className="h3 mb-4">Terms and Conditions</h1>
          <p className="text-muted">Last updated: October 2026</p>

          <h5>1. Acceptance of Terms</h5>
          <p>
            By creating an account and using Referrals Shopping you agree to these Terms and Conditions
            and our cookie policy.
          </p>

          <h5>2. Promote Service</h5>
          <p>
            When you purchase a referral package you are paying for distribution of your link to real users.
            We guarantee that real people will interact with your link. If we cannot promote within 24 hours
            you are entitled to an automatic refund.
          </p>

          <h5>3. Earn Service</h5>
          <p>
            Earners must complete tasks honestly: visit the provided link, wait the required time, and submit
            a genuine screenshot as proof. Fraudulent submissions will be rejected and may lead to account suspension.
          </p>

          <h5>4. Payments & Withdrawals</h5>
          <p>
            Payments are accepted in TRX, SOL and TON. Withdrawals are processed manually by admins and may take
            1–3 business days. Minimum withdrawal amounts may apply.
          </p>

          <h5>5. Prohibited Content</h5>
          <p>
            Links that promote illegal activity, malware, phishing, or content that violates applicable laws
            are strictly forbidden and will be rejected.
          </p>

          <h5>6. Contact</h5>
          <p>
            For support contact the platform administrators through the Admin / FAQ section once available.
          </p>
        </Card.Body>
      </Card>
    </Container>
  )
}

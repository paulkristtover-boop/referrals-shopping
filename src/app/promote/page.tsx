'use client'

import { useEffect, useState } from 'react'
import { Container, Row, Col, Card, Form, Button, Badge, Alert, Spinner } from 'react-bootstrap'
import { createClient } from '@/lib/supabase/client'
import { DEPOSIT_ADDRESSES, generateDepositReference } from '@/lib/config'
import type { Package, Campaign, CryptoCurrency } from '@/lib/types'

export default function PromotePage() {
  const [packages, setPackages] = useState<Package[]>([])
  const [myCampaigns, setMyCampaigns] = useState<Campaign[]>([])
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [link, setLink] = useState('')
  const [description, setDescription] = useState('')
  const [currency, setCurrency] = useState<CryptoCurrency>('TRX')
  const [step, setStep] = useState<'select' | 'details' | 'payment' | 'done'>('select')
  const [campaignId, setCampaignId] = useState<string | null>(null)
  const [depositRef, setDepositRef] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const pkg = packages.find((p) => p.id === selectedPackage)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const [pkgRes, campRes] = await Promise.all([
          supabase.from('packages').select('*').eq('active', true).order('price_usd'),
          supabase
            .from('campaigns')
            .select('*, packages(name)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
        ])
        if (pkgRes.error) throw pkgRes.error
        setPackages((pkgRes.data as Package[]) || [])
        setMyCampaigns((campRes.data as Campaign[]) || [])
      } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const createCampaign = async () => {
    if (!pkg || !title || !link) return
    setSubmitting(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const ref = generateDepositReference()
      const { data, error: insertErr } = await supabase
        .from('campaigns')
        .insert({
          user_id: user.id,
          package_id: pkg.id,
          title,
          description: description || null,
          referral_link: link,
          status: 'pending_payment',
          crypto_currency: currency,
          deposit_address: DEPOSIT_ADDRESSES[currency],
          deposit_reference: ref,
          paid_amount: pkg.price_usd,
        })
        .select()
        .single()

      if (insertErr) throw insertErr
      setCampaignId(data.id)
      setDepositRef(ref)
      setStep('payment')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign')
    } finally {
      setSubmitting(false)
    }
  }

  const markPaid = async () => {
    if (!campaignId) return
    setSubmitting(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error: updateErr } = await supabase
        .from('campaigns')
        .update({
          status: 'pending_approval',
          updated_at: new Date().toISOString(),
        })
        .eq('id', campaignId)

      if (updateErr) throw updateErr

      // Optional: create pending deposit transaction
      const { data: { user } } = await supabase.auth.getUser()
      if (user && pkg) {
        await supabase.from('transactions').insert({
          user_id: user.id,
          type: 'deposit',
          amount: pkg.price_usd,
          currency: 'USD',
          crypto_currency: currency,
          status: 'pending',
          reference_id: campaignId,
          notes: `Deposit for campaign ${depositRef}`,
        })
      }

      setSuccess(
        'Payment marked. An admin will verify the on-chain transfer and approve your campaign. Tasks will go live after approval.'
      )
      setStep('done')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update campaign')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" />
      </Container>
    )
  }

  return (
    <Container>
      <h1 className="h3 mb-4">Promote Your Link</h1>
      {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <div className="d-flex gap-2 mb-4 flex-wrap">
        <Badge bg={step === 'select' ? 'primary' : 'secondary'}>1. Choose Package</Badge>
        <Badge bg={step === 'details' ? 'primary' : 'secondary'}>2. Campaign Details</Badge>
        <Badge bg={step === 'payment' || step === 'done' ? 'primary' : 'secondary'}>3. Pay with Crypto</Badge>
      </div>

      {step === 'select' && (
        <>
          <h5 className="mb-3">Regular Sites / Channels / Bots</h5>
          <Row className="g-3 mb-4">
            {packages.filter((p) => p.type === 'regular').map((p) => (
              <Col md={4} key={p.id}>
                <Card
                  className={`package-card h-100 ${selectedPackage === p.id ? 'selected' : ''}`}
                  onClick={() => setSelectedPackage(p.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <Card.Body className="text-center">
                    <div className="fs-4 fw-bold">${Number(p.price_usd).toFixed(0)}</div>
                    <div className="text-muted">{p.referrals_count.toLocaleString()} referrals</div>
                    <div className="small mt-2">{p.name}</div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>

          <h5 className="mb-3">Investment / Gambling Sites</h5>
          <Row className="g-3 mb-4">
            {packages.filter((p) => p.type === 'gambling').map((p) => (
              <Col md={4} key={p.id}>
                <Card
                  className={`package-card h-100 ${selectedPackage === p.id ? 'selected' : ''}`}
                  onClick={() => setSelectedPackage(p.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <Card.Body className="text-center">
                    <div className="fs-4 fw-bold">${Number(p.price_usd).toFixed(0)}</div>
                    <div className="text-muted">{p.referrals_count.toLocaleString()} referrals</div>
                    <div className="small mt-2">{p.name}</div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>

          <Button variant="primary" disabled={!selectedPackage} onClick={() => setStep('details')}>
            Continue
          </Button>
        </>
      )}

      {step === 'details' && pkg && (
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-4">
            <Alert variant="info">
              Selected: <strong>{pkg.name}</strong> — {pkg.referrals_count.toLocaleString()} referrals for $
              {Number(pkg.price_usd).toFixed(0)}
            </Alert>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Campaign Title</Form.Label>
                <Form.Control
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. My Awesome Store Referral"
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Referral Link</Form.Label>
                <Form.Control
                  type="url"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://example.com/ref/yourcode"
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Description (optional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Any special instructions for users..."
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Pay with</Form.Label>
                <div className="d-flex gap-2 flex-wrap">
                  {(['TRX', 'SOL', 'TON'] as CryptoCurrency[]).map((c) => (
                    <Button
                      key={c}
                      variant={currency === c ? 'primary' : 'outline-primary'}
                      onClick={() => setCurrency(c)}
                    >
                      {c}
                    </Button>
                  ))}
                </div>
              </Form.Group>
              <div className="d-flex gap-2">
                <Button variant="outline-secondary" onClick={() => setStep('select')}>
                  Back
                </Button>
                <Button
                  variant="primary"
                  disabled={!title || !link || submitting}
                  onClick={createCampaign}
                >
                  {submitting ? <Spinner size="sm" /> : 'Create & Proceed to Payment'}
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      )}

      {step === 'payment' && pkg && (
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-4">
            <h5 className="mb-3">
              Pay ${Number(pkg.price_usd).toFixed(0)} in {currency}
            </h5>
            <Alert variant="warning">
              <strong>Payment instructions</strong>
              <ol className="mb-0 mt-2">
                <li>Send the USD equivalent in <strong>{currency}</strong> to the address below.</li>
                <li>Put the reference code in the memo / note if your wallet supports it.</li>
                <li>After sending, click <strong>I have paid</strong>. An admin will verify the transfer and approve the campaign.</li>
              </ol>
            </Alert>

            <Card className="bg-body-secondary mb-3">
              <Card.Body>
                <div className="small text-muted">Deposit Address ({currency})</div>
                <code className="fs-6 user-select-all d-block break-all">
                  {DEPOSIT_ADDRESSES[currency]}
                </code>
                <div className="small text-muted mt-2">
                  Reference: <strong>{depositRef}</strong>
                </div>
                <div className="small text-muted">
                  Amount: <strong>${Number(pkg.price_usd).toFixed(2)} USD</strong> (send equivalent in {currency})
                </div>
              </Card.Body>
            </Card>

            <div className="d-flex gap-2">
              <Button variant="outline-secondary" onClick={() => setStep('details')} disabled={submitting}>
                Back
              </Button>
              <Button variant="success" onClick={markPaid} disabled={submitting}>
                {submitting ? <Spinner size="sm" /> : (
                  <>
                    <i className="bi bi-check-circle me-1"></i> I have paid
                  </>
                )}
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}

      {step === 'done' && (
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-4 text-center">
            <i className="bi bi-hourglass-split display-4 text-warning mb-3 d-block"></i>
            <h4>Awaiting admin approval</h4>
            <p className="text-muted">
              Your campaign is in the queue. Once payment is confirmed and the campaign is approved,
              tasks will appear for Earn users.
            </p>
            <Button variant="primary" onClick={() => { setStep('select'); setSelectedPackage(null); setTitle(''); setLink(''); setDescription(''); setSuccess(null); }}>
              Create another campaign
            </Button>
          </Card.Body>
        </Card>
      )}

      {myCampaigns.length > 0 && step === 'select' && (
        <Card className="border-0 shadow-sm mt-5">
          <Card.Header className="bg-transparent fw-semibold">Your campaigns</Card.Header>
          <Card.Body className="p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Currency</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {myCampaigns.map((c) => (
                    <tr key={c.id}>
                      <td>{c.title}</td>
                      <td>
                        <Badge
                          bg={
                            c.status === 'approved' ? 'success'
                              : c.status === 'rejected' ? 'danger'
                              : 'warning'
                          }
                          text={c.status.includes('pending') ? 'dark' : undefined}
                        >
                          {c.status}
                        </Badge>
                      </td>
                      <td>{c.crypto_currency || '—'}</td>
                      <td className="small text-muted">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card.Body>
        </Card>
      )}
    </Container>
  )
}

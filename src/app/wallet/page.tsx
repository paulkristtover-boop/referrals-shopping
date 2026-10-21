'use client'

import { useEffect, useState } from 'react'
import { Container, Row, Col, Card, Form, Button, Table, Badge, Spinner, Alert } from 'react-bootstrap'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Transaction, Withdrawal, CryptoCurrency } from '@/lib/types'

export default function WalletPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState<CryptoCurrency>('TRX')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const load = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [pRes, tRes, wRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('withdrawals')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10),
      ])
      if (pRes.error) throw pRes.error
      setProfile(pRes.data as Profile)
      setTransactions((tRes.data as Transaction[]) || [])
      setWithdrawals((wRes.data as Withdrawal[]) || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const requestWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!amt || amt <= 0 || !address) return
    if (profile && amt > Number(profile.balance)) {
      setError('Insufficient balance')
      return
    }
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Debit balance optimistically via update (admin can reverse if needed)
      // Safer: create withdrawal pending and debit only when paid — for MVP debit now
      const { error: balErr } = await supabase
        .from('profiles')
        .update({ balance: Number(profile!.balance) - amt })
        .eq('id', user.id)
        .gte('balance', amt)

      if (balErr) throw balErr

      const { error: wErr } = await supabase.from('withdrawals').insert({
        user_id: user.id,
        amount: amt,
        currency: 'USD',
        crypto_currency: currency,
        address,
        status: 'pending',
      })
      if (wErr) throw wErr

      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'withdrawal',
        amount: amt,
        currency: 'USD',
        crypto_currency: currency,
        status: 'pending',
        notes: `Withdrawal to ${currency} ${address.slice(0, 12)}…`,
      })

      setSuccess('Withdrawal requested. Admin will process it shortly.')
      setAmount('')
      setAddress('')
      await load()
    } catch (err: any) {
      setError(err.message || 'Withdrawal failed')
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
      <h1 className="h3 mb-4">Wallet</h1>
      {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess(null)} dismissible>{success}</Alert>}

      <Row className="g-4 mb-4">
        <Col md={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="text-center">
              <div className="text-muted small">Available Balance</div>
              <div className="display-6 fw-bold text-success">
                ${Number(profile?.balance ?? 0).toFixed(2)}
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={8}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <h5 className="mb-3">Request Withdrawal</h5>
              <Form onSubmit={requestWithdraw}>
                <Row className="g-3">
                  <Col sm={4}>
                    <Form.Label>Amount (USD)</Form.Label>
                    <Form.Control
                      type="number"
                      min="1"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="5.00"
                      required
                    />
                  </Col>
                  <Col sm={4}>
                    <Form.Label>Currency</Form.Label>
                    <Form.Select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as CryptoCurrency)}
                    >
                      <option value="TRX">TRX</option>
                      <option value="SOL">SOL</option>
                      <option value="TON">TON</option>
                    </Form.Select>
                  </Col>
                  <Col sm={12}>
                    <Form.Label>Your {currency} Address</Form.Label>
                    <Form.Control
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder={`Paste your ${currency} wallet address`}
                      required
                    />
                  </Col>
                  <Col>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={!amount || !address || submitting}
                    >
                      {submitting ? <Spinner size="sm" /> : 'Request Withdrawal'}
                    </Button>
                  </Col>
                </Row>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <h5 className="mb-3">Transaction History</h5>
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body className="p-0">
          <Table responsive hover className="mb-0">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-muted py-3">
                    No transactions yet
                  </td>
                </tr>
              )}
              {transactions.map((t) => (
                <tr key={t.id}>
                  <td className="small">{new Date(t.created_at).toLocaleString()}</td>
                  <td className="text-capitalize">{t.type}</td>
                  <td className={t.type === 'earning' || t.type === 'refund' ? 'text-success' : t.type === 'withdrawal' ? 'text-danger' : ''}>
                    {t.type === 'earning' || t.type === 'refund' ? '+' : t.type === 'withdrawal' ? '-' : ''}
                    ${Number(t.amount).toFixed(2)}
                  </td>
                  <td>
                    <Badge
                      bg={
                        t.status === 'completed' ? 'success'
                          : t.status === 'failed' ? 'danger'
                          : 'warning'
                      }
                      text={t.status === 'pending' ? 'dark' : undefined}
                    >
                      {t.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {withdrawals.length > 0 && (
        <>
          <h5 className="mb-3">Withdrawal Requests</h5>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-0">
              <Table responsive hover className="mb-0">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>To</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((w) => (
                    <tr key={w.id}>
                      <td className="small">{new Date(w.created_at).toLocaleString()}</td>
                      <td>${Number(w.amount).toFixed(2)} → {w.crypto_currency}</td>
                      <td className="small font-monospace">{w.address.slice(0, 16)}…</td>
                      <td>
                        <Badge
                          bg={
                            w.status === 'paid' ? 'success'
                              : w.status === 'rejected' ? 'danger'
                              : 'warning'
                          }
                          text={w.status === 'pending' ? 'dark' : undefined}
                        >
                          {w.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </>
      )}
    </Container>
  )
}

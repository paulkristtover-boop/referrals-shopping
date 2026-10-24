import { useEffect, useState } from 'react'
import { Alert, Button, Card, Form, Spinner } from 'react-bootstrap'
import { useAuth } from '../contexts/AuthContext'
import { deposits, supabase, supabaseConfigured } from '../lib/supabase'
import type { Campaign, Package } from '../lib/types'

export default function Promote() {
  const { user } = useAuth()
  const [packages, setPackages] = useState<Package[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [packageId, setPackageId] = useState('')
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [chain, setChain] = useState<'trx' | 'sol' | 'ton'>('trx')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    if (!supabaseConfigured) {
      setLoading(false)
      setErr('Configure Supabase on Vercel.')
      return
    }
    const [p, c] = await Promise.all([
      supabase.from('packages').select('*').eq('active', true).order('price_usd'),
      supabase.from('campaigns').select('*, packages(name, price_usd)').eq('user_id', user!.id).order('created_at', { ascending: false }),
    ])
    setPackages((p.data as Package[]) || [])
    setCampaigns((c.data as Campaign[]) || [])
    if (p.data?.[0]) setPackageId(p.data[0].id)
    setLoading(false)
  }

  useEffect(() => { void load() }, [user?.id])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    const pkg = packages.find((x) => x.id === packageId)
    if (!pkg) return
    const { error } = await supabase.from('campaigns').insert({
      user_id: user!.id,
      package_id: packageId,
      title,
      target_url: url,
      status: 'pending_payment',
      paid_amount: pkg.price_usd,
      crypto_chain: chain,
    })
    if (error) setErr(error.message)
    else {
      setMsg('Campaign created. Pay then mark as paid.')
      setTitle('')
      setUrl('')
      void load()
    }
  }

  const markPaid = async (id: string, note: string) => {
    const { error } = await supabase.from('campaigns').update({ status: 'pending_approval', payment_note: note }).eq('id', id)
    if (error) setErr(error.message)
    else {
      setMsg('Marked paid — waiting for admin.')
      void load()
    }
  }

  if (loading) return <div className="text-center py-5"><Spinner /></div>

  return (
    <>
      <h1 className="mb-3">Promote your link</h1>
      {err && <Alert variant="danger">{err}</Alert>}
      {msg && <Alert variant="success">{msg}</Alert>}

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <h5>New campaign</h5>
          <Form onSubmit={create}>
            <Form.Group className="mb-3">
              <Form.Label>Package</Form.Label>
              <Form.Select value={packageId} onChange={(e) => setPackageId(e.target.value)} required>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — ${p.price_usd} ({p.category})</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control value={title} onChange={(e) => setTitle(e.target.value)} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Target URL</Form.Label>
              <Form.Control type="url" value={url} onChange={(e) => setUrl(e.target.value)} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Pay with</Form.Label>
              <Form.Select value={chain} onChange={(e) => setChain(e.target.value as 'trx' | 'sol' | 'ton')}>
                <option value="trx">TRX</option>
                <option value="sol">SOL</option>
                <option value="ton">TON</option>
              </Form.Select>
            </Form.Group>
            <Button type="submit">Create campaign</Button>
          </Form>
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <h5>Deposit addresses</h5>
          <ul className="small mb-0">
            <li><strong>TRX:</strong> <code>{deposits.trx}</code></li>
            <li><strong>SOL:</strong> <code>{deposits.sol}</code></li>
            <li><strong>TON:</strong> <code>{deposits.ton}</code></li>
          </ul>
        </Card.Body>
      </Card>

      <h4>Your campaigns</h4>
      {campaigns.map((c) => (
        <Card key={c.id} className="mb-3 shadow-sm">
          <Card.Body>
            <div className="d-flex justify-content-between flex-wrap gap-2">
              <div>
                <strong>{c.title}</strong>
                <div className="small text-muted">{c.status} · {(c.crypto_chain || '').toUpperCase()}</div>
                <a href={c.target_url} target="_blank" rel="noreferrer" className="small">Open link</a>
              </div>
              <span className="badge text-bg-secondary">{c.status}</span>
            </div>
            {c.status === 'pending_payment' && (
              <MarkPaidForm amount={c.paid_amount} chain={c.crypto_chain || 'trx'} onSubmit={(note) => void markPaid(c.id, note)} />
            )}
          </Card.Body>
        </Card>
      ))}
    </>
  )
}

function MarkPaidForm({ amount, chain, onSubmit }: { amount: number | null; chain: string; onSubmit: (note: string) => void }) {
  const [note, setNote] = useState('')
  const addr = deposits[chain as keyof typeof deposits] || ''
  return (
    <div className="mt-3">
      <p className="small">Send <strong>${Number(amount || 0).toFixed(0)}</strong> in {chain.toUpperCase()} to <code>{addr}</code></p>
      <Form
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit(note)
        }}
        className="d-flex gap-2 flex-wrap"
      >
        <Form.Control size="sm" placeholder="Tx hash / note" value={note} onChange={(e) => setNote(e.target.value)} />
        <Button size="sm" variant="success" type="submit">I have paid</Button>
      </Form>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Alert, Button, Card, Form, Spinner, Badge } from 'react-bootstrap'
import { ListFilters, ListPagination, paginate } from '../components/ListControls'
import OrderTimeline from '../components/OrderTimeline'
import ShareOrder from '../components/ShareOrder'
import { useAuth } from '../contexts/AuthContext'
import { deposits as envDeposits, loadDeposits, supabase, supabaseConfigured } from '../lib/supabase'
import { formatMoney } from '../lib/money'
import {
  type RefCategory,
  REGULAR_TIERS,
  INVESTMENT_TIERS,
  MIN_ORDER_NGN,
  FREE_STARTER_REFS,
  priceForReferrals,
  isFreeStarter,
} from '../lib/pricing'
import type { Campaign, Package } from '../lib/types'
import EmptyState from '../components/EmptyState'

type PayOrder = {
  id: string
  campaign_id: string | null
  amount_crypto: number
  crypto_chain: string
  deposit_address: string
  expires_at: string
  status: string
  pay_code: string
}

function payCode() {
  return 'RS' + Math.random().toString(36).slice(2, 12).toUpperCase()
}

function useCountdown(expiresAt?: string | null) {
  const [left, setLeft] = useState(0)
  useEffect(() => {
    if (!expiresAt) {
      setLeft(0)
      return
    }
    const tick = () => {
      const ms = new Date(expiresAt).getTime() - Date.now()
      setLeft(Math.max(0, Math.floor(ms / 1000)))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt])
  const m = Math.floor(left / 60)
  const s = left % 60
  return { left, label: `${m}:${s.toString().padStart(2, '0')}` }
}


function CopyBtn({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [ok, setOk] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setOk(true)
      setTimeout(() => setOk(false), 1500)
    } catch {
      /* ignore */
    }
  }
  return (
    <Button size="sm" variant={ok ? 'success' : 'outline-secondary'} onClick={() => void copy()}>
      <i className={`bi ${ok ? 'bi-check-lg' : 'bi-clipboard'} me-1`} />
      {ok ? 'Copied' : label}
    </Button>
  )
}

function PaymentPanel({
  order,
  campaignId,
  onUpdated,
  wallets = envDeposits,
}: {
  order: PayOrder
  campaignId: string
  onUpdated: () => void
  wallets?: { trx: string; sol: string; ton: string }
}) {
  const { left, label } = useCountdown(order.expires_at)
  const [checking, setChecking] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [auto, setAuto] = useState(true)
  const [txHash, setTxHash] = useState('')
  const [txBusy, setTxBusy] = useState(false)

  const chain = order.crypto_chain.toUpperCase()
  const addr = order.deposit_address || wallets[order.crypto_chain as 'trx' | 'sol' | 'ton'] || ''
  const amountStr = Number(order.amount_crypto).toFixed(6)
  // QR encodes amount + address hint as plain text address (universal)
  const qrPayload = addr
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(qrPayload)}`

  const check = async (silent = false) => {
    if (!silent) setChecking(true)
    if (!silent) setNote(null)
    try {
      const res = await fetch(`/api/payments/check?orderId=${encodeURIComponent(order.id)}`)
      const data = await res.json()
      if (data.status === 'confirmed') {
        setNote(`Payment detected automatically. TX: ${String(data.tx || '').slice(0, 18)}…`)
        setAuto(false)
        onUpdated()
      } else if (data.status === 'expired') {
        setNote('Payment window expired. Create a new order with a new unique amount.')
        setAuto(false)
        onUpdated()
      } else if (!silent) {
        setNote('Watching the blockchain… payment not seen yet. Keep this page open.')
      }
    } catch {
      if (!silent) setNote('Network issue while checking. Retrying…')
    } finally {
      if (!silent) setChecking(false)
    }
  }

  // Looks automatic: poll every 12s while window open
  useEffect(() => {
    if (!auto || order.status !== 'awaiting_payment' || left <= 0) return
    void check(true)
    const id = setInterval(() => void check(true), 12000)
    return () => clearInterval(id)
  }, [order.id, order.status, left, auto])

  return (
    <div className="pay-box mt-3">
      <div className="d-flex justify-content-between flex-wrap gap-2 mb-3">
        <strong>Send exact amount ({chain})</strong>
        {left > 0 ? (
          <Badge bg="warning" text="dark" className="d-flex align-items-center gap-1">
            <span className="spinner-grow spinner-grow-sm" style={{ width: 8, height: 8 }} />
            Auto-check · {label}
          </Badge>
        ) : (
          <Badge bg="danger">Expired</Badge>
        )}
      </div>

      <div className="row g-3 align-items-start">
        <div className="col-auto text-center">
          {addr ? (
            <img
              src={qrUrl}
              width={180}
              height={180}
              alt="Payment address QR"
              className="rounded border bg-white p-1"
              style={{ maxWidth: '100%' }}
            />
          ) : (
            <div className="text-muted small">No deposit address set</div>
          )}
          <div className="small text-muted mt-1">Scan to get address</div>
        </div>
        <div className="col">
          <div className="small text-muted">Amount (must match exactly)</div>
          <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
            <span className="pay-code">{amountStr} {chain}</span>
            <CopyBtn value={amountStr} label="Copy amount" />
          </div>

          <div className="small text-muted">Deposit address</div>
          <div
            className="font-monospace small p-2 rounded border mb-2 user-select-all"
            style={{ wordBreak: 'break-all', cursor: 'pointer', background: 'var(--bs-body-bg)' }}
            title="Click to copy"
            onClick={() => void navigator.clipboard.writeText(addr)}
          >
            {addr || '—'}
          </div>
          <CopyBtn value={addr} label="Copy address" />

          <div className="small text-muted mt-3">Pay code</div>
          <div className="d-flex flex-wrap align-items-center gap-2">
            <span className="pay-code" style={{ fontSize: '1rem' }}>{order.pay_code}</span>
            <CopyBtn value={order.pay_code} label="Copy code" />
          </div>
        </div>
      </div>

      {left > 0 && order.status === 'awaiting_payment' && (
        <div className="mt-3 d-flex flex-wrap gap-2 align-items-center">
          <Button size="sm" variant="success" disabled={checking} onClick={() => void check(false)}>
            {checking ? (
              <>
                <Spinner size="sm" className="me-1" /> Checking chain…
              </>
            ) : (
              <>
                <i className="bi bi-broadcast me-1" /> Check now
              </>
            )}
          </Button>
          <span className="small text-muted">Auto-checks every few seconds while the timer runs</span>
        </div>
      )}
      {note && <Alert variant="info" className="mt-3 mb-0 py-2 small">{note}</Alert>}

      <div className="mt-3 pt-3 border-top">
        <div className="small fw-semibold mb-1">Paid already? Submit TX hash</div>
        <div className="d-flex flex-wrap gap-2">
          <Form.Control
            size="sm"
            className="font-monospace"
            style={{ maxWidth: 320 }}
            placeholder="Transaction hash / id"
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
          />
          <Button
            size="sm"
            variant="outline-primary"
            disabled={txBusy || txHash.trim().length < 8}
            onClick={async () => {
              setTxBusy(true)
              setNote(null)
              const { error } = await supabase.rpc('submit_campaign_tx', {
                p_campaign_id: campaignId,
                p_tx_hash: txHash.trim(),
              })
              setTxBusy(false)
              if (error) {
                setNote(error.message + ' — or wait for auto-check')
                return
              }
              setNote('TX submitted — admin will confirm payment.')
              setAuto(false)
              onUpdated()
            }}
          >
            {txBusy ? 'Sending…' : 'Submit TX'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function Promote() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [packages, setPackages] = useState<Package[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [orders, setOrders] = useState<PayOrder[]>([])
  const [walletDeposits, setWalletDeposits] = useState(envDeposits)
  const [packageId, setPackageId] = useState('')
  const [refCategory, setRefCategory] = useState<RefCategory>('regular')
  const [referralCount, setReferralCount] = useState(1000)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [sampleFile, setSampleFile] = useState<File | null>(null)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [chain, setChain] = useState<'trx' | 'sol' | 'ton'>('trx')
  const [payMethod, setPayMethod] = useState<'flutterwave' | 'crypto'>('flutterwave')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [freeUsed, setFreeUsed] = useState(false)

  const load = async () => {
    if (!supabaseConfigured) {
      setLoading(false)
      setErr('Configure Supabase on Vercel.')
      return
    }
    const [p, c, o, prof] = await Promise.all([
      supabase.from('packages').select('*').eq('active', true).order('price_usd'),
      supabase.from('campaigns').select('*, packages(name, category, referrals)').eq('user_id', user!.id).order('created_at', { ascending: false }),
      supabase.from('payment_orders').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
      supabase.from('profiles').select('free_starter_used_at').eq('id', user!.id).maybeSingle(),
    ])
    const pkgs = (p.data as Package[]) || []
    setPackages(pkgs)
    setCampaigns((c.data as Campaign[]) || [])
    setOrders((o.data as PayOrder[]) || [])
    const used = !!(prof.data as { free_starter_used_at?: string } | null)?.free_starter_used_at
    setFreeUsed(used)
    // Prefer selecting free package first if still available
    const freePkg = pkgs.find((x) => Number(x.price_usd) === 0)
    if (!used && freePkg) setPackageId(freePkg.id)
    else if (pkgs[0]) setPackageId(pkgs[0].id)
    setLoading(false)
  }

  useEffect(() => {
    void load()
    void loadDeposits().then(setWalletDeposits)
  }, [user?.id])

  // Secure Flutterwave return — verify on server
  useEffect(() => {
    const flw = searchParams.get('flw')
    const tx_ref = searchParams.get('tx_ref')
    const campaignId = searchParams.get('campaignId')
    const transaction_id = searchParams.get('transaction_id') || searchParams.get('transactionId')
    if (flw !== '1' || (!tx_ref && !transaction_id)) return
    let cancelled = false
    ;(async () => {
      setMsg('Verifying Flutterwave payment…')
      try {
        const res = await fetch('/api/payments/flutterwave-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tx_ref, transaction_id, campaignId }),
        })
        const data = await res.json()
        if (cancelled) return
        if (data.status === 'confirmed') {
          setMsg('Payment confirmed — waiting for admin to approve your referral link.')
        } else {
          setErr(data.error || data.message || 'Payment not confirmed yet. Contact support with your receipt.')
        }
      } catch {
        if (!cancelled) setErr('Could not verify payment. Try again or contact support.')
      } finally {
        setSearchParams({}, { replace: true })
        void load()
      }
    })()
    return () => {
      cancelled = true
    }
  }, [searchParams])

  useEffect(() => {
    const match =
      packages.find(
        (x) =>
          x.category === refCategory &&
          Number(x.referrals) === Number(referralCount)
      ) ||
      packages.find(
        (x) =>
          x.category === refCategory &&
          Math.abs(Number(x.referrals) - Number(referralCount)) ===
            Math.min(...packages.filter((p) => p.category === refCategory).map((p) => Math.abs(Number(p.referrals) - Number(referralCount))))
      )
    if (match) setPackageId(match.id)
  }, [refCategory, referralCount, packages])

  const selectedPkg =
    packages.find(
      (x) =>
        x.category === refCategory &&
        Number(x.referrals) === Number(referralCount) &&
        (isFreeStarter(referralCount, refCategory) ? Number(x.price_usd) === 0 : Number(x.price_usd) > 0)
    ) ||
    packages.find((x) => x.category === refCategory && Number(x.referrals) === Number(referralCount)) ||
    packages.find((x) => x.id === packageId)

  const quotePrice = priceForReferrals(referralCount, refCategory)
  const isFree = isFreeStarter(referralCount, refCategory)
  const effectivePrice = isFree ? 0 : Math.max(MIN_ORDER_NGN, quotePrice)

  // Keep packageId in sync when tiers change
  // (applied in effects below)

  const uploadSample = async (): Promise<string | null> => {
    if (!sampleFile || !user) return null
    const path = `${user.id}/samples/${Date.now()}_${sampleFile.name.replace(/[^\w.-]/g, '_')}`
    const up = await supabase.storage.from('screenshots').upload(path, sampleFile)
    if (up.error) throw new Error(up.error.message)
    return supabase.storage.from('screenshots').getPublicUrl(path).data.publicUrl
  }

  const saveDraft = async () => {
    if (!user || !packageId) {
      setErr('Choose referral count, title and URL to save a draft')
      return
    }
    setErr(null)
    setCreating(true)
    try {
      const sampleUrl = await uploadSample()
      const { data, error } = await supabase.rpc('save_campaign_draft', {
        p_title: title,
        p_target_url: url,
        p_package_id: packageId,
        p_description: description.trim() || null,
        p_sample_screenshot_url: sampleUrl,
        p_campaign_id: draftId,
      })
      if (error) {
        // fallback insert
        const { data: camp, error: e2 } = await supabase.from('campaigns').insert({
          user_id: user.id,
          package_id: packageId,
          title,
          target_url: url,
          description: description.trim() || null,
          sample_screenshot_url: sampleUrl,
          status: 'draft',
          paid_amount: 0,
        }).select('id').single()
        if (e2) throw e2
        setDraftId(camp.id)
      } else {
        setDraftId(data as string)
      }
      setMsg('Draft saved — continue anytime and post when ready.')
      void load()
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : 'Could not save draft')
    } finally {
      setCreating(false)
    }
  }

  const continueDraft = (c: Campaign) => {
    setDraftId(c.id)
    setTitle(c.title)
    setUrl(c.target_url)
    setDescription(c.description || '')
    setPackageId(c.package_id)
    setSampleFile(null)
    setMsg('Draft loaded — edit and post, or save again.')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }


  const cancelOrder = async (id: string) => {
    if (!confirm('Cancel this order?')) return
    setErr(null)
    const { error } = await supabase.rpc('cancel_campaign', { p_campaign_id: id })
    if (error) {
      setErr(error.message + ' — run audit_cancel.sql')
      return
    }
    setMsg('Order cancelled')
    void load()
  }

  const deleteOrder = async (id: string) => {
    if (!confirm('Permanently delete this order?')) return
    setErr(null)
    const { error } = await supabase.rpc('delete_campaign', { p_campaign_id: id })
    if (error) {
      setErr(error.message + ' — run audit_cancel.sql')
      return
    }
    setMsg('Order deleted')
    if (draftId === id) setDraftId(null)
    void load()
  }

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    const pkg = selectedPkg || packages.find((x) => x.id === packageId)
    if (!user) return
    if (!isFree && effectivePrice < MIN_ORDER_NGN) {
      setErr(`Minimum order is ${formatMoney(MIN_ORDER_NGN)}`)
      return
    }
    if (!pkg && !isFree) {
      setErr('Select a referral amount from the list (run packages_ngn.sql if empty).')
      return
    }
    setCreating(true)
    try {
      let sampleUrl: string | null = null
      if (sampleFile) {
        const path = `${user.id}/samples/${Date.now()}_${sampleFile.name.replace(/[^\w.-]/g, '_')}`
        const up = await supabase.storage.from('screenshots').upload(path, sampleFile)
        if (up.error) throw new Error(up.error.message)
        sampleUrl = supabase.storage.from('screenshots').getPublicUrl(path).data.publicUrl
      }
      const desc = description.trim() || null

      // Free Starter — one per account, no crypto payment
      if (isFree) {
        if (freeUsed) throw new Error('You already used your Free Starter (50 referrals). Choose a paid amount.')
        const { error: freeErr } = await supabase.rpc('claim_free_starter', {
          p_title: title,
          p_target_url: url,
          p_description: desc,
          p_sample_screenshot_url: sampleUrl,
        })
        if (freeErr) {
          // fallback 2-arg RPC
          const { error: e2 } = await supabase.rpc('claim_free_starter', { p_title: title, p_target_url: url })
          if (e2) throw new Error(freeErr.message)
        }
        setMsg('Free Starter activated — 50 referrals. Promotion can start (approved).')
        setTitle('')
        setUrl('')
        setDescription('')
        setSampleFile(null)
        setDraftId(null)
        void load()
        return
      }

      // Create campaign then checkout
      let campId = draftId
      if (campId) {
        await supabase
          .from('campaigns')
          .update({
            title,
            target_url: url,
            description: desc,
            sample_screenshot_url: sampleUrl,
            package_id: (pkg?.id || packageId),
            paid_amount: effectivePrice,
            status: 'pending_payment',
          })
          .eq('id', campId)
          .eq('user_id', user.id)
      } else {
        const { data: camp, error } = await supabase
          .from('campaigns')
          .insert({
            user_id: user.id,
            package_id: (pkg?.id || packageId),
            title,
            target_url: url,
            description: desc,
            sample_screenshot_url: sampleUrl,
            status: 'pending_payment',
            paid_amount: effectivePrice,
            crypto_chain: payMethod === 'flutterwave' ? 'ngn_flw' : chain,
          })
          .select('*')
          .single()
        if (error) throw error
        campId = camp.id
      }

      if (payMethod === 'flutterwave') {
        const initRes = await fetch('/api/payments/flutterwave-init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignId: campId,
            email: user.email,
            name: user.user_metadata?.full_name || user.email,
            amountNgn: effectivePrice,
          }),
        })
        const init = await initRes.json()
        if (!initRes.ok || !init.link) throw new Error(init.error || 'Could not start Flutterwave checkout')
        setMsg('Redirecting to secure Flutterwave checkout…')
        window.location.href = init.link as string
        return
      }

      // Crypto path
      const qRes = await fetch(`/api/payments/quote?usd=${effectivePrice}&chain=${chain}`)
      const quote = await qRes.json()
      if (!qRes.ok) throw new Error(quote.error || 'Could not get payment quote')

      const code = payCode()
      const expires = quote.expires_at as string

      await supabase
        .from('campaigns')
        .update({
          crypto_chain: chain,
          pay_code: code,
          amount_crypto: quote.amount_crypto,
          expires_at: expires,
        })
        .eq('id', campId)

      await supabase.from('payment_orders').insert({
        user_id: user.id,
        campaign_id: campId,
        amount_usd: effectivePrice,
        amount_crypto: quote.amount_crypto,
        unique_suffix: quote.unique_suffix,
        rate_usd: quote.rate_usd,
        crypto_chain: chain,
        pay_code: code,
        deposit_address: quote.deposit_address || walletDeposits[chain as 'trx' | 'sol' | 'ton'] || envDeposits[chain as 'trx' | 'sol' | 'ton'],
        expires_at: expires,
        status: 'awaiting_payment',
      })

      setMsg(`Send exactly ${Number(quote.amount_crypto).toFixed(6)} ${chain.toUpperCase()} within 15 minutes.`)
      setTitle('')
      setUrl('')
      setDescription('')
      setSampleFile(null)
      setDraftId(null)
      void load()
    } catch (ex: unknown) {
      setErr(ex instanceof Error ? ex.message : 'Failed to create order')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner />
      </div>
    )
  }

  return (
    <>
      <h1 className="mb-2 fw-bold">Shop referrals</h1>
      <p className="text-muted mb-3">
        <strong>Regular</strong> = signup via your link (no deposit). <strong>Gambling / investment</strong> = signup + deposit.
        On Referrals Shopping: Free Starter is 50 regular referrals once. Paid packages use a unique crypto amount for 15 minutes.
      </p>
      {!freeUsed && packages.some((x) => Number(x.price_usd) === 0) && (
        <Alert variant="info" className="py-2">
          <i className="bi bi-gift me-1" /> Free Starter available — 50 referrals, regular sites only, once per account.
        </Alert>
      )}
      {freeUsed && (
        <Alert variant="secondary" className="py-2 small">
          Free Starter already used on this account. Upgrade with a paid package for more volume.
        </Alert>
      )}
      {err && <Alert variant="danger">{err}</Alert>}
      {msg && <Alert variant="success">{msg}</Alert>}

      <Card className="rs-card rs-card-static mb-4">
        <Card.Body>
          <h5 className="fw-bold">New order</h5>
          <Form onSubmit={create}>
            <Form.Group className="mb-3">
              <Form.Label>Type</Form.Label>
              <div className="d-flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={refCategory === 'regular' ? 'primary' : 'outline-primary'}
                  onClick={() => { setRefCategory('regular'); setReferralCount(1000) }}
                >
                  Regular (signup only)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={refCategory === 'gambling' ? 'primary' : 'outline-primary'}
                  onClick={() => { setRefCategory('gambling'); setReferralCount(1000) }}
                >
                  Investment / deposit
                </Button>
              </div>
              <Form.Text className="text-muted">Sites, channels, bots, and groups</Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>How many referrals?</Form.Label>
              <div className="d-flex flex-wrap gap-2 mb-2">
                {refCategory === 'regular' && (
                  <Button
                    type="button"
                    size="sm"
                    variant={referralCount === FREE_STARTER_REFS ? 'success' : 'outline-success'}
                    disabled={freeUsed}
                    onClick={() => setReferralCount(FREE_STARTER_REFS)}
                  >
                    Free 50{freeUsed ? ' (used)' : ''}
                  </Button>
                )}
                {(refCategory === 'regular' ? REGULAR_TIERS : INVESTMENT_TIERS).map(([refs]) => (
                  <Button
                    key={refs}
                    type="button"
                    size="sm"
                    variant={referralCount === refs ? 'primary' : 'outline-secondary'}
                    onClick={() => setReferralCount(refs)}
                  >
                    {refs.toLocaleString()}
                  </Button>
                ))}
              </div>
              <Form.Control
                type="number"
                min={refCategory === 'regular' ? FREE_STARTER_REFS : 1000}
                step={100}
                value={referralCount}
                onChange={(e) => setReferralCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
              />
              <Form.Text className="text-muted">
                Or type a custom amount. Paid orders: minimum {formatMoney(MIN_ORDER_NGN)}.
              </Form.Text>
            </Form.Group>

            <Alert variant={isFree ? 'success' : 'light'} className="py-2 border">
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <span>
                  <strong>{referralCount.toLocaleString()}</strong> referrals ·{' '}
                  {refCategory === 'gambling' ? 'deposit type' : 'signup only'}
                </span>
                <span className="fs-5 fw-bold text-primary">
                  {isFree ? 'FREE' : formatMoney(effectivePrice)}
                </span>
              </div>
            </Alert>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. My app invite" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Target URL</Form.Label>
              <Form.Control type="url" value={url} onChange={(e) => setUrl(e.target.value)} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description <span className="text-muted fw-normal">(optional)</span></Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What should referred users do? Any notes for earners…"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Sample screenshot <span className="text-muted fw-normal">(optional)</span></Form.Label>
              <Form.Control
                type="file"
                accept="image/*"
                onChange={(e) => setSampleFile((e.target as HTMLInputElement).files?.[0] || null)}
              />
              <Form.Text className="text-muted">Example of the signup/deposit screen — helps earners submit the right proof.</Form.Text>
            </Form.Group>
            {!isFree && (
              <Form.Group className="mb-3">
                <Form.Label>Payment method</Form.Label>
                <div className="d-flex flex-wrap gap-2 mb-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={payMethod === 'flutterwave' ? 'primary' : 'outline-primary'}
                    onClick={() => setPayMethod('flutterwave')}
                  >
                    <i className="bi bi-credit-card me-1" />
                    Flutterwave (₦)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={payMethod === 'crypto' ? 'primary' : 'outline-secondary'}
                    onClick={() => setPayMethod('crypto')}
                  >
                    <i className="bi bi-currency-bitcoin me-1" />
                    Crypto
                  </Button>
                </div>
                <Form.Text className="text-muted d-block">
                  Card, bank transfer, USSD via Flutterwave. Payment is verified on our servers.
                </Form.Text>
              </Form.Group>
            )}
            {payMethod === 'crypto' && !isFree && (
              <Form.Group className="mb-3">
                <Form.Label>Crypto chain</Form.Label>
                <Form.Select value={chain} onChange={(e) => setChain(e.target.value as 'trx' | 'sol' | 'ton')}>
                  <option value="trx">TRX (Tron)</option>
                  <option value="sol">SOL (Solana)</option>
                  <option value="ton">TON</option>
                </Form.Select>
              </Form.Group>
            )}
            {isFree && (
              <p className="small text-muted">No payment needed for Free Starter. One claim per account.</p>
            )}
            <div className="d-flex flex-wrap gap-2">
              <Button type="submit" disabled={creating || (isFree && freeUsed) || (!isFree && effectivePrice < MIN_ORDER_NGN)} variant={isFree ? 'success' : 'primary'}>
                {creating
                  ? 'Working…'
                  : isFree
                    ? 'Claim Free Starter (50 referrals)'
                    : payMethod === 'flutterwave'
                      ? 'Pay with Flutterwave'
                      : 'Create order (crypto)'}
              </Button>
              {!isFree && (
                <Button type="button" variant="outline-secondary" disabled={creating || !packageId || !title || !url} onClick={() => void saveDraft()}>
                  Save draft
                </Button>
              )}
            </div>
          </Form>
        </Card.Body>
      </Card>

      <h4 className="fw-bold">Your orders</h4>
      {campaigns.length > 0 && (
        <ListFilters
          search={search}
          onSearch={(v) => { setSearch(v); setPage(1) }}
          placeholder="Title, URL…"
          status={statusFilter}
          onStatus={(v) => { setStatusFilter(v); setPage(1) }}
          statusOptions={[
            { value: 'all', label: 'All statuses' },
            { value: 'draft', label: 'Drafts' },
            { value: 'cancelled', label: 'Cancelled' },
            { value: 'pending_payment', label: 'Awaiting payment' },
            { value: 'pending_approval', label: 'Checking / submitted' },
            { value: 'approved', label: 'Promoting' },
            { value: 'completed', label: 'Completed' },
            { value: 'rejected', label: 'Rejected' },
            { value: 'expired', label: 'Expired' },
          ]}
          pageSize={pageSize}
          onPageSize={(n) => { setPageSize(n); setPage(1) }}
        />
      )}
      {(() => {
        const q = search.trim().toLowerCase()
        const filtered = campaigns.filter((c) => {
          if (statusFilter !== 'all' && c.status !== statusFilter) return false
          if (!q) return true
          return c.title.toLowerCase().includes(q) || c.target_url.toLowerCase().includes(q)
        })
        const pg = paginate(filtered, page, pageSize)
        return (
          <>
      {pg.slice.map((c) => {
        const order = orders.find((o) => o.campaign_id === c.id)
        return (
          <Card key={c.id} className="rs-card rs-card-static mb-3">
            <Card.Body>
              <div className="d-flex justify-content-between flex-wrap gap-2">
                <div>
                  <strong>{c.title}</strong>
                  <div className="small text-muted">
                    {formatMoney(c.paid_amount || 0)} · {(c.crypto_chain || '').toUpperCase()}
                  </div>
                  <a href={c.target_url} target="_blank" rel="noreferrer" className="small">
                    Open link
                  </a>
                </div>
                <OrderTimeline
                  status={c.status}
                  delivered={Number((c as { referrals_delivered?: number }).referrals_delivered || 0)}
                  goal={undefined}
                />
              </div>
              {order && (c.status === 'pending_payment' || order.status === 'awaiting_payment') && order.crypto_chain !== 'ngn_flw' && (
                <div className="mt-3">
                  <PaymentPanel order={order} campaignId={c.id} onUpdated={() => void load()} wallets={walletDeposits} />
                </div>
              )}
              {c.status === 'pending_payment' && (c.crypto_chain === 'ngn_flw' || order?.crypto_chain === 'ngn_flw') && (
                <div className="mt-3">
                  <p className="small text-muted mb-2">Flutterwave checkout — complete payment in the window, then return here.</p>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={async () => {
                      const res = await fetch('/api/payments/flutterwave-init', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          campaignId: c.id,
                          email: user?.email,
                          name: user?.email,
                          amountNgn: c.paid_amount,
                        }),
                      })
                      const data = await res.json()
                      if (data.link) window.location.href = data.link
                      else setErr(data.error || 'Could not open checkout')
                    }}
                  >
                    Open Flutterwave checkout
                  </Button>
                </div>
              )}
              {c.status === 'pending_approval' && (
                <p className="small text-info mt-2 mb-0">Payment submitted — waiting for admin confirmation.</p>
              )}
              {c.status === 'approved' && (
                <p className="small text-success mt-2 mb-0">Promoting your link — track progress on Dashboard.</p>
              )}
              {c.status === 'draft' && (
                <div className="mt-2 d-flex flex-wrap gap-2">
                  <Button size="sm" variant="primary" onClick={() => continueDraft(c)}>Continue draft</Button>
                  <Button size="sm" variant="outline-warning" onClick={() => void cancelOrder(c.id)}>Cancel</Button>
                  <Button size="sm" variant="outline-danger" onClick={() => void deleteOrder(c.id)}>Delete</Button>
                </div>
              )}
              {c.status === 'pending_payment' && (
                <div className="mt-2">
                  <Button size="sm" variant="outline-warning" onClick={() => void cancelOrder(c.id)}>Cancel order</Button>
                </div>
              )}
              {c.status === 'cancelled' && (
                <div className="mt-2">
                  <Button size="sm" variant="outline-danger" onClick={() => void deleteOrder(c.id)}>Delete</Button>
                </div>
              )}
              {c.status === 'completed' && (
                <p className="small text-success mt-2 mb-0">Order complete — referral target reached.</p>
              )}
              <div className="mt-3 pt-2 border-top d-flex flex-wrap justify-content-between align-items-center gap-2">
                <span className="small text-muted">Share referral link</span>
                <ShareOrder
                  order={{
                    title: c.title,
                    targetUrl: c.target_url,
                    packageName: c.packages?.name || packages.find((x) => x.id === c.package_id)?.name,
                  }}
                />
              </div>
            </Card.Body>
          </Card>
        )
      })}
      {pg.slice.length === 0 && campaigns.length > 0 && <div className="empty-state">No orders match filters.</div>}
      <ListPagination page={pg.page} totalPages={pg.totalPages} total={pg.total} onPage={setPage} />
          </>
        )
      })()}
      {campaigns.length === 0 && <EmptyState>No orders yet.</EmptyState>}
    </>
  )
}

import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Alert, Button, Card, Form, Spinner, Badge } from 'react-bootstrap'
import { ListFilters, ListPagination, paginate } from '../components/ListControls'
import OrderTimeline from '../components/OrderTimeline'
import ShareOrder from '../components/ShareOrder'
import { useAuth } from '../contexts/AuthContext'
import { deposits as envDeposits, loadDeposits, supabase, supabaseConfigured } from '../lib/supabase'
import { formatMoney } from '../lib/money'
import PackagePicker from '../components/PackagePicker'
import {
  type RefCategory,
  REGULAR_PACKAGES,
  INVESTMENT_PACKAGES,
  MIN_ORDER_NGN,
  FREE_STARTER_REFS,
  priceForReferrals,
  isFreeStarter,
  nameForReferrals,
  orderSummaryLine,
  perReferralNgn,
  categoryHint,
  economicsHint,
} from '../lib/pricing'
import type { Campaign, Package } from '../lib/types'
import EmptyState from '../components/EmptyState'
import { useToast } from '../contexts/ToastContext'
import PageHeader from '../components/PageHeader'
import { adStatusLabel, adStatusVariant } from '../lib/adStatus'


/** Ready-to-ship ad starters — clear offer, Nigeria-friendly */
const AD_STARTERS: { label: string; title: string; description: string }[] = [
  {
    label: 'App signup',
    title: 'Join our app — free account',
    description: 'Create an account with my link. No deposit required for this campaign.',
  },
  {
    label: 'Telegram / channel',
    title: 'Join our Telegram channel',
    description: 'Open the link and join the channel. Screenshot the join confirmation.',
  },
  {
    label: 'WhatsApp group',
    title: 'Join our WhatsApp community',
    description: 'Tap the invite, join the group, keep the chat open for the wait timer.',
  },
  {
    label: 'Betting signup',
    title: 'Register on our betting site',
    description: 'Sign up with my link. Deposit campaigns need a funded account proof.',
  },
  {
    label: 'Fintech / wallet',
    title: 'Open a free wallet account',
    description: 'Register with my referral link. Complete signup; deposit only if the ad requires it.',
  },
  {
    label: 'Course / lead',
    title: 'Get free access — register here',
    description: 'Fill the form or create an account via my link. One account per person.',
  },
]


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
          <span className="d-block small text-muted mt-1">Exact amount only — underpay fails; rates can move after the timer ends.</span>
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
          <div className="small text-muted">Crypto amount (exact match only — priced in ₦; do not wait until after the timer if markets are moving)</div>
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
  const [referralCount, setReferralCount] = useState(20)
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
  const toast = useToast()
  const errRef = useRef<HTMLDivElement>(null)
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
    toast.success('Order cancelled')
    void load()
  }

  const refillOrder = async (id: string) => {
    if (!confirm('Create a refill order for remaining referrals? You will pay again for what is left.')) return
    setErr(null)
    const { data, error } = await supabase.rpc('refill_campaign', { p_campaign_id: id })
    if (error) {
      setErr(error.message + ' — run supabase/refill_campaign.sql')
      return
    }
    setMsg('Refill order created — complete payment to renew promotion.')
    toast.success('Refill order created')
    void load()
    if (data) {
      // scroll to top to see new pending_payment order
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
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



  const pauseAd = async (id: string) => {
    setErr(null)
    const { error } = await supabase.rpc('pause_campaign', { p_campaign_id: id })
    if (error) {
      setErr(error.message.includes('function') ? 'Run supabase/ad_pause_resume.sql then try Pause again.' : error.message)
      return
    }
    setMsg('Ad paused — hidden from Earn until you resume.')
    void load()
  }

  const resumeAd = async (id: string) => {
    setErr(null)
    const { error } = await supabase.rpc('resume_campaign', { p_campaign_id: id })
    if (error) {
      setErr(error.message.includes('function') ? 'Run supabase/ad_pause_resume.sql then try Resume again.' : error.message)
      return
    }
    setMsg('Ad is active again.')
    void load()
  }

  const startFlutterwaveCheckout = async (campaignId: string, amountNgn: number) => {
    if (!user?.email) throw new Error('You must be signed in with an email')
    const initRes = await fetch('/api/payments/flutterwave-init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId,
        email: user.email,
        name: (user.user_metadata as { full_name?: string } | undefined)?.full_name || user.email,
        amountNgn,
      }),
    })
    const text = await initRes.text()
    let init: { link?: string; error?: string; hint?: string; ok?: boolean } = {}
    try {
      init = JSON.parse(text)
    } catch {
      throw new Error(
        initRes.status === 404
          ? 'Payment API not found (404). Deploy api/payments/*.js and set FLW_SECRET_KEY on Vercel, then redeploy.'
          : `Payment server error (${initRes.status}). ${text.slice(0, 120)}`
      )
    }
    if (!initRes.ok || !init.link) {
      throw new Error([init.error, init.hint].filter(Boolean).join(' — ') || `Checkout failed (${initRes.status})`)
    }
    setMsg('Opening Flutterwave secure checkout…')
    toast.info('Opening Flutterwave…')
    window.location.href = init.link
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

      // Free trial — one per account, no crypto payment
      if (isFree) {
        if (freeUsed) throw new Error('You already used your free trial. Choose a paid plan.')
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
        setMsg('Free trial activated — your ad is live (approved).')
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
        if (!pkg?.id && !packageId) {
          throw new Error('No package selected. Run packages_ngn.sql or pick a referral amount again.')
        }
        await startFlutterwaveCheckout(String(campId), effectivePrice)
        return
      }

      // Crypto path
      const qRes = await fetch(`/api/payments/quote?ngn=${effectivePrice}&chain=${chain}`)
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

      setMsg(`Order ${formatMoney(effectivePrice)}. Send exactly ${Number(quote.amount_crypto).toFixed(6)} ${chain.toUpperCase()} within 15 minutes. If the market moves, do not send an old amount — expire and get a fresh quote, or switch to Flutterwave (₦).`)
      setTitle('')
      setUrl('')
      setDescription('')
      setSampleFile(null)
      setDraftId(null)
      void load()
    } catch (ex: unknown) {
      const message = ex instanceof Error ? ex.message : 'Failed to create order'
      setErr(message)
      toast.error(message)
      setTimeout(() => errRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
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
      <PageHeader title="My Ads" lead="Ship clear offers, small ₦ budgets, track real delivery — not vanity clicks." />
      <p className="text-muted mb-3">
        Buy referral volume for sites, channels, bots, or groups. Your link becomes <strong>Earn tasks</strong> after payment and admin approval.
        <strong>Regular</strong> = signup only. <strong>Investment</strong> = signup + deposit. Minimum paid order ₦1,500. Budgets in ₦. Naira (Flutterwave) is the default rail; crypto is optional for people who already hold TRX/SOL/TON.
        Confirm earner proofs under <strong>Proofs</strong>. Prices are ₦ as shown. <a href="/terms">Terms</a> · <a href="/refunds">Refunds</a>.
      </p>
      {!freeUsed && packages.some((x) => Number(x.price_usd) === 0) && (
        <Alert variant="info" className="py-2">
          <i className="bi bi-gift me-1" /> Free trial available — 5 signup results, once per account (signup ads only).
        </Alert>
      )}
      {freeUsed && (
        <Alert variant="secondary" className="py-2 small">
          Free trial already used on this account. Upgrade with a paid package for more volume.
        </Alert>
      )}
      {err && (
        <Alert ref={errRef} variant="danger" dismissible onClose={() => setErr(null)}>
          <strong>Could not start payment</strong>
          <div className="small mt-1">{err}</div>
        </Alert>
      )}
      {msg && <Alert variant="success">{msg}</Alert>}

      <Card className="rs-card rs-card-static mb-4">
        <Card.Body>
          <h5 className="fw-bold">Create ad</h5>
          <Form onSubmit={create}>
            {/* 1 · What counts as a referral */}
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">1. Result type (like ad objective)</Form.Label>
              <div className="d-flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={refCategory === 'regular' ? 'primary' : 'outline-primary'}
                  onClick={() => { setRefCategory('regular'); setReferralCount(20) }}
                >
                  Signup only
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={refCategory === 'gambling' ? 'primary' : 'outline-primary'}
                  onClick={() => { setRefCategory('gambling'); setReferralCount(20) }}
                >
                  Signup + deposit
                </Button>
              </div>
              <Form.Text className="text-muted d-block mt-1">{categoryHint(refCategory)}</Form.Text>
            </Form.Group>

            {/* 2 · Package grid — price at a glance */}
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">2. Budget size (results)</Form.Label>
              <PackagePicker
                category={refCategory}
                packages={refCategory === 'regular' ? REGULAR_PACKAGES : INVESTMENT_PACKAGES}
                selectedRefs={referralCount}
                onSelect={setReferralCount}
                freeUsed={freeUsed}
                showFree={refCategory === 'regular'}
              />
            </Form.Group>

            {/* Glance summary */}
            <div className="order-glance" role="status">
              <div className="order-glance-item">
                <span>Referrals</span>
                <strong>{referralCount.toLocaleString()}</strong>
              </div>
              <div className="order-glance-item">
                <span>You pay</span>
                <strong className="text-primary">{isFree ? 'FREE' : formatMoney(effectivePrice)}</strong>
              </div>
              <div className="order-glance-item">
                <span>Per referral</span>
                <strong>
                  {isFree || !referralCount
                    ? '—'
                    : formatMoney(perReferralNgn(effectivePrice, referralCount))}
                </strong>
              </div>
            </div>
            <p className="small text-muted mb-3">
              {orderSummaryLine(referralCount, isFree ? 0 : effectivePrice, refCategory)}. {economicsHint(refCategory)}. Link goes live as Earn tasks after payment + approval.
            </p>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Join our app — free account" maxLength={80} />
              <Form.Text className="text-muted d-block mb-2">Clear titles convert better. Pick a starter or write your own.</Form.Text>
              <div className="d-flex flex-wrap gap-1 mb-2">
                {AD_STARTERS.map((s) => (
                  <Button
                    key={s.label}
                    type="button"
                    size="sm"
                    variant="outline-secondary"
                    className="rounded-pill"
                    onClick={() => {
                      setTitle(s.title)
                      if (!description.trim()) setDescription(s.description)
                    }}
                  >
                    {s.label}
                  </Button>
                ))}
              </div>
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
                <Form.Label>Payment rails</Form.Label>
                <p className="small text-muted mb-2">
                  Ad budgets are always priced in <strong>₦</strong>. We use the rails that work for Nigerian advertisers —
                  not a single stablecoin ideology. Primary: bank/card. Optional: on-chain if you already hold crypto.
                </p>
                <div className="d-flex flex-wrap gap-2 mb-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={payMethod === 'flutterwave' ? 'primary' : 'outline-primary'}
                    onClick={() => setPayMethod('flutterwave')}
                  >
                    <i className="bi bi-credit-card me-1" />
                    Naira · Flutterwave
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={payMethod === 'crypto' ? 'primary' : 'outline-secondary'}
                    onClick={() => setPayMethod('crypto')}
                  >
                    <i className="bi bi-currency-bitcoin me-1" />
                    Crypto · TRX/SOL/TON
                  </Button>
                </div>
                <Form.Text className="text-muted d-block">
                  {payMethod === 'flutterwave'
                    ? 'Card, bank transfer, USSD. Fixed ₦ amount. Verified on our servers.'
                    : 'On-chain quote for the same ₦ budget. Volatile coins (not USDT/USDC). Exact amount + timer.'}
                </Form.Text>
              </Form.Group>
            )}
            {payMethod === 'crypto' && !isFree && (
              <Alert variant="warning" className="py-2 small mb-2">
                <strong>Markets can turn fast.</strong> Large bitcoin options and crowded trades often make prices shaky
                into Fridays and weekends. Your ad budget is still in <strong>₦</strong>; the TRX/SOL/TON amount is
                quoted and locked for about <strong>15 minutes</strong> only.
                Prefer <strong>Flutterwave (₦)</strong> for a fixed naira checkout if you are not actively trading.
              </Alert>
            )}
            {payMethod === 'crypto' && !isFree && (
              <Form.Group className="mb-3">
                <Form.Label>Chain (volatile, not stablecoin)</Form.Label>
                <Form.Select value={chain} onChange={(e) => setChain(e.target.value as 'trx' | 'sol' | 'ton')}>
                  <option value="trx">TRX (Tron)</option>
                  <option value="sol">SOL (Solana)</option>
                  <option value="ton">TON</option>
                </Form.Select>
                <Form.Text className="text-muted">We are not pushing USDT or USDC — quote matches your ₦ budget on the chain you choose.</Form.Text>
              </Form.Group>
            )}
            {isFree && (
              <p className="small text-muted">No payment needed for Free trial. One claim per account.</p>
            )}
            <div className="d-flex flex-wrap gap-2">
              <Button type="submit" disabled={creating || (isFree && freeUsed) || (!isFree && effectivePrice < MIN_ORDER_NGN)} variant={isFree ? 'success' : 'primary'}>
                {creating
                  ? 'Working…'
                  : isFree
                    ? 'Start free trial (5 results)'
                    : payMethod === 'flutterwave'
                      ? 'Pay with Flutterwave'
                      : 'Create ad (crypto)'}
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

      <h4 className="fw-bold">Manage ads</h4>
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
            { value: 'approved', label: 'Active' },
            { value: 'paused', label: 'Paused' },
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
                <div className="min-w-0 flex-grow-1">
                  <strong>{c.title}</strong>
                  <div className="advert-status-row text-muted">
                    <span>{formatMoney(c.paid_amount || 0)}</span>
                    <span>·</span>
                    <span>{(c.packages as { category?: string } | undefined)?.category === 'gambling' ? 'Deposit refs' : 'Signup refs'}</span>
                    <span>·</span>
                    <span>{Number((c as { referrals_delivered?: number }).referrals_delivered || 0).toLocaleString()} / {(c.packages as { referrals?: number } | undefined)?.referrals?.toLocaleString?.() || '—'}</span>
                  </div>
                  <a href={c.target_url} target="_blank" rel="noreferrer" className="small text-break">
                    Open link
                  </a>
                </div>
                <OrderTimeline
                  status={c.status}
                  delivered={Number((c as { referrals_delivered?: number }).referrals_delivered || 0)}
                  goal={Number((c.packages as { referrals?: number } | undefined)?.referrals || 0) || undefined}
                />
              </div>
              {order && (c.status === 'pending_payment' || order.status === 'awaiting_payment') && order.crypto_chain !== 'ngn_flw' && (
                <div className="mt-3">
                  <PaymentPanel order={order} campaignId={c.id} onUpdated={() => void load()} wallets={walletDeposits} />
                </div>
              )}
              {c.status === 'pending_payment' && (c.crypto_chain === 'ngn_flw' || order?.crypto_chain === 'ngn_flw') && (
                <div className="mt-3">
                  <p className="small text-muted mb-2">Flutterwave — complete payment, then you return here automatically.</p>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={async () => {
                      setErr(null)
                      try {
                        await startFlutterwaveCheckout(c.id, Number(c.paid_amount) || 0)
                      } catch (ex: unknown) {
                        setErr(ex instanceof Error ? ex.message : 'Checkout failed')
                        setTimeout(() => errRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
                      }
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
                <div className="mt-2">
                  <p className="small text-success mb-2">Promoting your link — track progress on Dashboard.</p>
                  <Button size="sm" variant="outline-primary" onClick={() => void refillOrder(c.id)}>
                    Refill remaining
                  </Button>
                </div>
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
              {c.status === 'approved' && (
                <div className="mt-2 d-flex flex-wrap gap-2">
                  <Button size="sm" variant="outline-secondary" onClick={() => void pauseAd(c.id)}>Pause</Button>
                  <Button size="sm" variant="outline-primary" onClick={() => void refillOrder(c.id)}>Refill</Button>
                </div>
              )}
              {c.status === 'paused' && (
                <div className="mt-2">
                  <Button size="sm" variant="primary" onClick={() => void resumeAd(c.id)}>Resume ad</Button>
                </div>
              )}
              {c.status === 'completed' && (
                <div className="mt-2">
                  <p className="small text-success mb-2">Order complete — referral target reached.</p>
                  <Button size="sm" variant="outline-primary" onClick={() => void refillOrder(c.id)}>
                    Order again / refill
                  </Button>
                </div>
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
      {campaigns.length === 0 && <EmptyState>No ads yet — start with a small budget.</EmptyState>}
    </>
  )
}

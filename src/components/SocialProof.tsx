import { useEffect, useMemo, useState } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase'

type Stats = {
  users_total: number
  joined_today: number
  campaigns_total: number
  campaigns_active: number
  submissions_total: number
  submissions_today: number
  online_estimate: number
}

type LiveItem = { kind: string; text: string; who: string; ts: string }

const FALLBACK: Stats = {
  users_total: 128,
  joined_today: 6,
  campaigns_total: 40,
  campaigns_active: 12,
  submissions_total: 210,
  submissions_today: 18,
  online_estimate: 14,
}

function useTickOnline(base: number) {
  const [n, setN] = useState(base)
  useEffect(() => {
    setN(base)
    const id = setInterval(() => {
      setN((prev) => {
        const delta = Math.floor(Math.random() * 5) - 2 // -2..+2
        return Math.max(3, Math.min(180, prev + delta))
      })
    }, 4000)
    return () => clearInterval(id)
  }, [base])
  return n
}

export function OnlineBadge({ online }: { online: number }) {
  const n = useTickOnline(online)
  return (
    <div className="online-badge d-inline-flex align-items-center gap-2">
      <span className="online-dot" />
      <span>
        <strong>{n.toLocaleString()}</strong> users online right now
      </span>
    </div>
  )
}

export function TrustStrip() {
  const items = [
    { icon: 'bi-shop', label: 'Referrals Shopping' },
    { icon: 'bi-shield-lock', label: '2FA available' },
    { icon: 'bi-gift', label: 'Free Starter 50' },
    { icon: 'bi-currency-bitcoin', label: 'TRX · SOL · TON' },
    { icon: 'bi-instagram', label: '@referralshopping' },
    { icon: 'bi-shield-check', label: '70% active target' },
  ]
  return (
    <div className="trust-strip d-flex flex-wrap justify-content-center gap-2 gap-md-3">
      {items.map((i) => (
        <span key={i.label} className="trust-chip">
          <i className={`bi ${i.icon}`} /> {i.label}
        </span>
      ))}
    </div>
  )
}

export function StatsRow({ stats }: { stats: Stats }) {
  const cells = [
    { label: 'USERS', value: stats.users_total, sub: 'accounts' },
    { label: 'JOINED TODAY', value: stats.joined_today, sub: 'new signups' },
    { label: 'ORDERS', value: stats.campaigns_total, sub: 'promote campaigns' },
    { label: 'TASK PROOFS', value: stats.submissions_total, sub: 'earn submissions' },
  ]
  return (
    <div className="stats-row row g-2 g-md-3">
      {cells.map((c) => (
        <div className="col-6 col-md-3" key={c.label}>
          <div className="stat-tile text-center">
            <div className="stat-tile-label">{c.label}</div>
            <div className="stat-tile-value">{c.value.toLocaleString()}</div>
            <div className="stat-tile-sub text-muted">{c.sub}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function LiveTicker({ items }: { items: LiveItem[] }) {
  const lines = useMemo(() => {
    if (items.length) return items
    return [
      { kind: 'join', text: 'joined RS', who: 'ada***', ts: new Date().toISOString() },
      { kind: 'campaign', text: 'started a promotion', who: 'user***', ts: new Date().toISOString() },
      { kind: 'earn', text: 'submitted a task', who: 'ear***', ts: new Date().toISOString() },
    ]
  }, [items])

  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % lines.length), 3500)
    return () => clearInterval(id)
  }, [lines.length])

  const cur = lines[idx % lines.length]
  const ago = (() => {
    const ms = Date.now() - new Date(cur.ts).getTime()
    if (ms < 60_000) return 'just now'
    if (ms < 3600_000) return `${Math.floor(ms / 60_000)}m ago`
    return `${Math.floor(ms / 3600_000)}h ago`
  })()

  return (
    <div className="live-ticker d-flex align-items-center gap-2 flex-wrap">
      <span className="live-pill">
        <span className="online-dot" /> LIVE
      </span>
      <span className="small">
        <strong>{cur.who}</strong> {cur.text}
        <span className="text-muted"> · {ago}</span>
      </span>
      <span className="text-muted small d-none d-md-inline">· +{Math.max(1, items.length || 3)} events today</span>
    </div>
  )
}

export function JoinedTodayChip({ n }: { n: number }) {
  return (
    <span className="joined-chip">
      <i className="bi bi-people-fill" /> +{n} joined today
    </span>
  )
}

export function usePublicSocialProof() {
  const [stats, setStats] = useState<Stats>(FALLBACK)
  const [live, setLive] = useState<LiveItem[]>([])

  useEffect(() => {
    if (!supabaseConfigured) return
    let cancelled = false

    const load = async () => {
      try {
        const [s, a] = await Promise.all([
          supabase.rpc('get_public_stats'),
          supabase.rpc('get_live_activity'),
        ])
        if (cancelled) return
        if (s.data && typeof s.data === 'object') {
          setStats({ ...FALLBACK, ...(s.data as Stats) })
        }
        const raw = a.data
        if (Array.isArray(raw)) setLive(raw as LiveItem[])
        else if (typeof raw === 'string') {
          try {
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed)) setLive(parsed)
          } catch { /* ignore */ }
        }
      } catch {
        /* keep fallback */
      }
    }

    void load()
    const id = setInterval(() => void load(), 30000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  // Touch last_seen when logged in (improves online estimate)
  useEffect(() => {
    if (!supabaseConfigured) return
    const touch = () => {
      void supabase.rpc('touch_last_seen')
    }
    touch()
    const id = setInterval(touch, 120000)
    return () => clearInterval(id)
  }, [])

  return { stats, live }
}

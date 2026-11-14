import { useEffect, useState } from 'react'
import { Alert, Badge, Button, Card, Spinner } from 'react-bootstrap'
import { ListFilters, ListPagination, paginate } from '../components/ListControls'
import EmptyState from '../components/EmptyState'
import { useAuth } from '../contexts/AuthContext'
import { supabase, supabaseConfigured } from '../lib/supabase'
import { formatMoney } from '../lib/money'
import { BRAND } from '../lib/brand'
import { Reveal } from '../components/Animated'
import { breakdownFromGross, parseTaxConfig, type PlatformTaxConfig } from '../lib/tax'

type Row = {
  id: string
  title: string
  status: string
  paid_amount: number
  tax_rate?: number | null
  tax_amount?: number | null
  net_amount?: number | null
  tax_mode?: string | null
  tax_region?: string | null
  invoice_number?: string | null
  crypto_chain: string | null
  pay_code: string | null
  tx_hash: string | null
  payment_note: string | null
  created_at: string
  packages?: { name: string; referrals: number; category: string } | null
}

export default function Receipts() {
  const { user, profile } = useAuth()
  const [rows, setRows] = useState<Row[]>([])
  const [taxCfg, setTaxCfg] = useState<PlatformTaxConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    if (!user || !supabaseConfigured) {
      setLoading(false)
      return
    }
    ;(async () => {
      const [{ data, error }, settingsRes] = await Promise.all([
        supabase
          .from('campaigns')
          .select(
            'id, title, status, paid_amount, tax_rate, tax_amount, net_amount, tax_mode, tax_region, invoice_number, crypto_chain, pay_code, tx_hash, payment_note, created_at, packages(name, referrals, category)'
          )
          .eq('user_id', user.id)
          .in('status', ['pending_approval', 'approved', 'completed', 'pending_payment'])
          .order('created_at', { ascending: false })
          .limit(100),
        supabase.from('platform_settings').select('key, value').like('key', 'tax_%'),
      ])
      if (error) setErr(error.message + (error.message.includes('tax_') ? ' — run supabase/tax_compliance.sql' : ''))
      setRows((data as unknown as Row[]) || [])
      const map: Record<string, string> = {}
      for (const row of settingsRes.data || []) {
        map[(row as { key: string }).key] = String((row as { value: string }).value ?? '')
      }
      setTaxCfg(parseTaxConfig(map))
      setLoading(false)
    })()
  }, [user?.id])

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner />
      </div>
    )
  }

  const cfg = taxCfg
  const q = search.trim().toLowerCase()
  const filtered = rows.filter((r) => {
    if (status !== 'all' && r.status !== status) return false
    if (!q) return true
    return (
      r.title.toLowerCase().includes(q) ||
      (r.pay_code || '').toLowerCase().includes(q) ||
      (r.invoice_number || '').toLowerCase().includes(q) ||
      (r.packages?.name || '').toLowerCase().includes(q)
    )
  })
  const pg = paginate(filtered, page, pageSize)

  const linesFor = (r: Row) => {
    if (r.tax_amount != null && r.net_amount != null) {
      return {
        gross: Number(r.paid_amount || 0),
        net: Number(r.net_amount),
        tax: Number(r.tax_amount),
        rate: Number(r.tax_rate || 0),
      }
    }
    const b = breakdownFromGross(Number(r.paid_amount || 0), {
      enabled: cfg?.enabled !== false,
      mode: (cfg?.mode as 'inclusive' | 'exclusive' | 'none') || 'inclusive',
      ratePercent: cfg?.ratePercent ?? 7.5,
      currency: 'NGN',
    })
    return { gross: b.gross, net: b.net, tax: b.tax, rate: b.rate }
  }

  const printReceipt = (r: Row) => {
    const w = window.open('', '_blank', 'noopener,noreferrer,width=520,height=720')
    if (!w) return
    const t = linesFor(r)
    const inv = r.invoice_number || `RS-${r.id.slice(0, 8).toUpperCase()}`
    w.document.write(`<!DOCTYPE html><html><head><title>Tax invoice — ${BRAND}</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:24px;color:#111;max-width:480px;margin:0 auto}
        h1{font-size:1.2rem;margin:0 0 4px}
        .muted{color:#666;font-size:0.85rem}
        .row{display:flex;justify-content:space-between;margin:8px 0;border-bottom:1px solid #eee;padding-bottom:6px}
        .total{font-size:1.25rem;font-weight:700;margin-top:12px}
        .box{border:1px solid #ddd;border-radius:8px;padding:12px;margin:12px 0}
      </style></head><body>
      <h1>${BRAND} — Tax invoice / receipt</h1>
      <p class="muted">Invoice ${inv}<br/>${new Date(r.created_at).toLocaleString()}</p>
      <div class="box">
        <div class="muted">Supplier</div>
        <strong>${cfg?.supplierName || BRAND}</strong>
        ${cfg?.supplierAddress ? `<div class="muted">${cfg.supplierAddress}</div>` : ''}
        ${cfg?.taxId ? `<div class="muted">${cfg.taxIdLabel || 'Tax ID'}: ${cfg.taxId}</div>` : ''}
        <div class="muted">Region: ${r.tax_region || cfg?.regionLabel || 'NG'}</div>
      </div>
      <div class="box">
        <div class="muted">Bill to</div>
        <strong>${(profile as { billing_name?: string } | null)?.billing_name || profile?.full_name || user?.email || 'Customer'}</strong>
        <div class="muted">${user?.email || ''}</div>
        ${(profile as { tax_id?: string } | null)?.tax_id ? `<div class="muted">Customer tax ID: ${(profile as { tax_id?: string }).tax_id}</div>` : ''}
      </div>
      <div class="row"><span>Description</span><span>${r.title}</span></div>
      <div class="row"><span>Package</span><span>${r.packages?.name || '—'} (${(r.packages?.referrals || 0).toLocaleString()} refs)</span></div>
      <div class="row"><span>Status</span><span>${r.status.replace(/_/g, ' ')}</span></div>
      <div class="row"><span>Payment ref</span><span>${r.pay_code || r.tx_hash || '—'}</span></div>
      <div class="row"><span>Net (excl. tax)</span><span>${formatMoney(t.net)}</span></div>
      <div class="row"><span>Tax ${t.rate ? `(${t.rate}%)` : ''}</span><span>${formatMoney(t.tax)}</span></div>
      <div class="total">Total paid ${formatMoney(t.gross)}</div>
      <p class="muted" style="margin-top:16px">${cfg?.invoiceFooter || 'Tax treatment depends on local law. Keep this for your records.'}</p>
      <script>window.print()</script>
      </body></html>`)
    w.document.close()
  }

  return (
    <div className="page-enter">
      <Reveal>
        <h1 className="fw-bold mb-1">Receipts & tax invoices</h1>
        <p className="text-muted mb-3">
          Payment records with net / tax / total breakdown (₦). Run <code>tax_compliance.sql</code> for stored invoice numbers.
        </p>
      </Reveal>
      {err && <Alert variant="warning">{err}</Alert>}
      <ListFilters
        search={search}
        onSearch={(v) => {
          setSearch(v)
          setPage(1)
        }}
        placeholder="Title, invoice, pay code…"
        status={status}
        onStatus={(v) => {
          setStatus(v)
          setPage(1)
        }}
        statusOptions={[
          { value: 'all', label: 'All' },
          { value: 'pending_payment', label: 'Awaiting payment' },
          { value: 'pending_approval', label: 'Paid / checking' },
          { value: 'approved', label: 'Approved' },
          { value: 'completed', label: 'Completed' },
        ]}
        pageSize={pageSize}
        onPageSize={(n) => {
          setPageSize(n)
          setPage(1)
        }}
      />
      {rows.length === 0 ? (
        <EmptyState>No receipts yet. Place a paid order on Promote.</EmptyState>
      ) : (
        <div className="d-flex flex-column gap-3">
          {pg.slice.map((r) => {
            const t = linesFor(r)
            return (
              <Card key={r.id} className="rs-card rs-card-static">
                <Card.Body>
                  <div className="d-flex flex-wrap justify-content-between gap-2">
                    <div>
                      <div className="fw-semibold">{r.title}</div>
                      <div className="small text-muted">
                        {r.invoice_number || 'Invoice pending'} · {r.packages?.name || 'Package'} ·{' '}
                        {(r.packages?.referrals || 0).toLocaleString()} referrals
                      </div>
                      <div className="small text-muted">{new Date(r.created_at).toLocaleString()}</div>
                    </div>
                    <div className="text-end">
                      <div className="fs-5 fw-bold text-primary">{formatMoney(t.gross)}</div>
                      <Badge bg="secondary">{r.status.replace(/_/g, ' ')}</Badge>
                    </div>
                  </div>
                  <div className="small mt-2 text-muted">
                    Net {formatMoney(t.net)} · Tax {formatMoney(t.tax)}
                    {t.rate ? ` (${t.rate}%)` : ''} · Total {formatMoney(t.gross)}
                  </div>
                  <div className="small mt-1">
                    Ref: <code className="user-select-all">{r.pay_code || r.tx_hash || '—'}</code>
                  </div>
                  <Button size="sm" variant="outline-primary" className="mt-2" onClick={() => printReceipt(r)}>
                    <i className="bi bi-printer me-1" />
                    Print tax invoice
                  </Button>
                </Card.Body>
              </Card>
            )
          })}
          <ListPagination page={pg.page} totalPages={pg.totalPages} total={pg.total} onPage={setPage} />
        </div>
      )}
    </div>
  )
}

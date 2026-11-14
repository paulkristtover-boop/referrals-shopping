/**
 * Tax helpers for marketplace orders (VAT/GST-style).
 * Prices on packages are treated as tax-inclusive by default (common for B2C).
 * Operators must register and file in each country they are required to — software supports records, it does not replace registration.
 */

export type TaxMode = 'inclusive' | 'exclusive' | 'none'

export type TaxBreakdown = {
  gross: number
  net: number
  tax: number
  rate: number
  mode: TaxMode
  currency: string
}

export type PlatformTaxConfig = {
  enabled: boolean
  mode: TaxMode
  /** e.g. 7.5 for Nigeria VAT */
  ratePercent: number
  currency: string
  supplierName: string
  supplierAddress: string
  taxIdLabel: string
  taxId: string
  regionLabel: string
  invoiceFooter: string
}

export const DEFAULT_TAX_CONFIG: PlatformTaxConfig = {
  enabled: true,
  mode: 'inclusive',
  ratePercent: 7.5,
  currency: 'NGN',
  supplierName: 'Referrals Shopping',
  supplierAddress: '',
  taxIdLabel: 'Tax ID / VAT No.',
  taxId: '',
  regionLabel: 'NG',
  invoiceFooter:
    'Tax treatment depends on your location and local law. This receipt is a payment record. Consult a qualified tax adviser for filing obligations.',
}

/** Split gross (tax-inclusive) into net + tax */
export function splitInclusive(gross: number, ratePercent: number): TaxBreakdown {
  const rate = Math.max(0, Number(ratePercent) || 0)
  const g = Math.max(0, Number(gross) || 0)
  if (rate <= 0) {
    return { gross: g, net: g, tax: 0, rate: 0, mode: 'none', currency: 'NGN' }
  }
  const net = Math.round((g / (1 + rate / 100)) * 100) / 100
  const tax = Math.round((g - net) * 100) / 100
  return { gross: g, net, tax, rate, mode: 'inclusive', currency: 'NGN' }
}

/** Add tax on top of net */
export function addExclusive(net: number, ratePercent: number): TaxBreakdown {
  const rate = Math.max(0, Number(ratePercent) || 0)
  const n = Math.max(0, Number(net) || 0)
  if (rate <= 0) {
    return { gross: n, net: n, tax: 0, rate: 0, mode: 'none', currency: 'NGN' }
  }
  const tax = Math.round(n * (rate / 100) * 100) / 100
  const gross = Math.round((n + tax) * 100) / 100
  return { gross, net: n, tax, rate, mode: 'exclusive', currency: 'NGN' }
}

export function breakdownFromGross(
  gross: number,
  cfg: Pick<PlatformTaxConfig, 'enabled' | 'mode' | 'ratePercent' | 'currency'>
): TaxBreakdown {
  if (!cfg.enabled || cfg.mode === 'none' || !(cfg.ratePercent > 0)) {
    const g = Math.max(0, Number(gross) || 0)
    return { gross: g, net: g, tax: 0, rate: 0, mode: 'none', currency: cfg.currency || 'NGN' }
  }
  if (cfg.mode === 'exclusive') {
    // stored package prices are still "what customer pays" as gross in our app; exclusive means show net+tax=gross using reverse of exclusive... 
    // Prefer inclusive split of customer-paid total.
    return { ...splitInclusive(gross, cfg.ratePercent), mode: 'exclusive', currency: cfg.currency || 'NGN' }
  }
  return { ...splitInclusive(gross, cfg.ratePercent), currency: cfg.currency || 'NGN' }
}

export function parseTaxConfig(raw: Record<string, unknown> | null | undefined): PlatformTaxConfig {
  const d = DEFAULT_TAX_CONFIG
  if (!raw) return { ...d }
  return {
    enabled: raw.tax_enabled === false || raw.tax_enabled === 'false' ? false : true,
    mode: (String(raw.tax_mode || d.mode) as TaxMode) || d.mode,
    ratePercent: Number(raw.tax_rate_percent ?? d.ratePercent) || 0,
    currency: String(raw.tax_currency || d.currency),
    supplierName: String(raw.tax_supplier_name || d.supplierName),
    supplierAddress: String(raw.tax_supplier_address || d.supplierAddress),
    taxIdLabel: String(raw.tax_id_label || d.taxIdLabel),
    taxId: String(raw.tax_id || d.taxId),
    regionLabel: String(raw.tax_region || d.regionLabel),
    invoiceFooter: String(raw.tax_invoice_footer || d.invoiceFooter),
  }
}

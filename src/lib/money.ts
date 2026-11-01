/** App currency: Nigerian Naira only (no USD display) */
export const CURRENCY = 'NGN'
export const CURRENCY_SYMBOL = '₦'
export const CURRENCY_LABEL = 'Naira'

/** Format amount stored as Naira (packages.price_usd column holds NGN values) */
export function formatMoney(amount: number | string | null | undefined): string {
  const n = Number(amount ?? 0)
  if (!Number.isFinite(n)) return `${CURRENCY_SYMBOL}0`
  return (
    CURRENCY_SYMBOL +
    n.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  )
}

/** NGN per 1 USD — only for crypto conversion on the server path */
export function ngnPerUsd(): number {
  const v = Number(import.meta.env.VITE_NGN_PER_USD || 1600)
  return v > 0 ? v : 1600
}

export function ngnToUsd(ngn: number): number {
  return ngn / ngnPerUsd()
}

/** Package price helper: DB field price_usd is NGN */
export function packagePriceNgn(pkg: { price_usd?: number | null; price_ngn?: number | null }): number {
  return Number(pkg.price_ngn ?? pkg.price_usd ?? 0)
}

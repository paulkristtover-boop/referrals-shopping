/** App currency: Nigerian Naira */
export const CURRENCY = 'NGN'
export const CURRENCY_SYMBOL = '₦'

/** Format amount already stored as Naira */
export function formatMoney(amount: number | string | null | undefined): string {
  const n = Number(amount ?? 0)
  if (!Number.isFinite(n)) return `${CURRENCY_SYMBOL}0`
  return (
    CURRENCY_SYMBOL +
    n.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  )
}

/** Approx NGN per 1 USD for crypto quotes (override with VITE_NGN_PER_USD) */
export function ngnPerUsd(): number {
  const v = Number(import.meta.env.VITE_NGN_PER_USD || 1600)
  return v > 0 ? v : 1600
}

export function ngnToUsd(ngn: number): number {
  return ngn / ngnPerUsd()
}

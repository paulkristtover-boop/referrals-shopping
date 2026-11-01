/** Referral pricing in Naira — matches published tiers ($ × 1600) */

export type RefCategory = 'regular' | 'gambling'

/** [referrals, priceNgn] ascending */
export const REGULAR_TIERS: [number, number][] = [
  [1000, 12800],
  [2000, 16000],
  [3000, 24000],
  [4000, 32000],
  [5000, 40000],
  [10000, 80000],
  [20000, 160000],
  [30000, 240000],
]

export const INVESTMENT_TIERS: [number, number][] = [
  [1000, 25600],
  [2000, 32000],
  [3000, 48000],
  [4000, 64000],
  [5000, 80000],
  [10000, 160000],
  [20000, 320000],
  [30000, 480000],
]

export const MIN_ORDER_NGN = 1000
export const FREE_STARTER_REFS = 50

export function tiersFor(category: RefCategory) {
  return category === 'gambling' ? INVESTMENT_TIERS : REGULAR_TIERS
}

/**
 * Price for an exact tier, or interpolate by rate of nearest lower tier.
 * Paid orders never settle below MIN_ORDER_NGN.
 */
export function priceForReferrals(referrals: number, category: RefCategory): number {
  const n = Math.max(0, Math.floor(Number(referrals) || 0))
  if (n <= 0) return 0
  if (n === FREE_STARTER_REFS && category === 'regular') return 0

  const tiers = tiersFor(category)
  const exact = tiers.find(([r]) => r === n)
  if (exact) return Math.max(MIN_ORDER_NGN, exact[1])

  // Rate from nearest tier (prefer closest by referral count)
  let best = tiers[0]
  let bestDist = Math.abs(tiers[0][0] - n)
  for (const t of tiers) {
    const d = Math.abs(t[0] - n)
    if (d < bestDist) {
      best = t
      bestDist = d
    }
  }
  const rate = best[1] / best[0]
  const raw = Math.round(n * rate)
  return Math.max(MIN_ORDER_NGN, raw)
}

export function isFreeStarter(referrals: number, category: RefCategory) {
  return category === 'regular' && referrals === FREE_STARTER_REFS
}

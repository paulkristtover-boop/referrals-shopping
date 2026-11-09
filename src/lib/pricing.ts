/**
 * Realistic Naira package prices for NG market.
 * Aimed to leave room for earner rewards (~₦40–80/task regular) + platform margin + fees.
 */

export type RefCategory = 'regular' | 'gambling'

export type Tier = {
  name: string
  referrals: number
  priceNgn: number
}

/** Regular: signup only — ~₦25–35 effective per ref, volume discounts at top end */
export const REGULAR_PACKAGES: Tier[] = [
  { name: 'Spark', referrals: 1000, priceNgn: 30000 },
  { name: 'Pulse', referrals: 2000, priceNgn: 55000 },
  { name: 'Wave', referrals: 3000, priceNgn: 80000 },
  { name: 'Boost', referrals: 4000, priceNgn: 100000 },
  { name: 'Surge', referrals: 5000, priceNgn: 120000 },
  { name: 'Orbit', referrals: 10000, priceNgn: 220000 },
  { name: 'Nova', referrals: 20000, priceNgn: 400000 },
  { name: 'Galaxy', referrals: 30000, priceNgn: 550000 },
]

/** Investment / deposit — harder action, ~1.8–2× regular */
export const INVESTMENT_PACKAGES: Tier[] = [
  { name: 'Vault Lite', referrals: 1000, priceNgn: 60000 },
  { name: 'Vault Plus', referrals: 2000, priceNgn: 110000 },
  { name: 'Vault Pro', referrals: 3000, priceNgn: 160000 },
  { name: 'Vault Max', referrals: 4000, priceNgn: 200000 },
  { name: 'Vault Elite', referrals: 5000, priceNgn: 240000 },
  { name: 'Vault Ultra', referrals: 10000, priceNgn: 420000 },
  { name: 'Vault Prime', referrals: 20000, priceNgn: 780000 },
  { name: 'Vault Titan', referrals: 30000, priceNgn: 1100000 },
]

export const REGULAR_TIERS: [number, number][] = REGULAR_PACKAGES.map((p) => [p.referrals, p.priceNgn])
export const INVESTMENT_TIERS: [number, number][] = INVESTMENT_PACKAGES.map((p) => [p.referrals, p.priceNgn])

export const MIN_ORDER_NGN = 1000
export const FREE_STARTER_REFS = 50
export const FREE_STARTER_NAME = 'Free Starter'

/** Earn reward per completed regular-style task (Naira) */
export const DEFAULT_TASK_REWARD_NGN = 50

export function packagesFor(category: RefCategory): Tier[] {
  return category === 'gambling' ? INVESTMENT_PACKAGES : REGULAR_PACKAGES
}

export function tiersFor(category: RefCategory) {
  return category === 'gambling' ? INVESTMENT_TIERS : REGULAR_TIERS
}

export function nameForReferrals(referrals: number, category: RefCategory): string {
  if (category === 'regular' && referrals === FREE_STARTER_REFS) return FREE_STARTER_NAME
  const hit = packagesFor(category).find((p) => p.referrals === referrals)
  if (hit) return hit.name
  return `${referrals.toLocaleString()} referrals`
}

export function priceForReferrals(referrals: number, category: RefCategory): number {
  const n = Math.max(0, Math.floor(Number(referrals) || 0))
  if (n <= 0) return 0
  if (n === FREE_STARTER_REFS && category === 'regular') return 0

  const list = packagesFor(category)
  const exact = list.find((p) => p.referrals === n)
  if (exact) return Math.max(MIN_ORDER_NGN, exact.priceNgn)

  let best = list[0]
  let bestDist = Math.abs(list[0].referrals - n)
  for (const t of list) {
    const d = Math.abs(t.referrals - n)
    if (d < bestDist) {
      best = t
      bestDist = d
    }
  }
  const rate = best.priceNgn / best.referrals
  return Math.max(MIN_ORDER_NGN, Math.round(n * rate))
}

export function refillPriceNgn(
  remainingRefs: number,
  orderedRefs: number,
  originalPaidNgn: number,
  category: RefCategory
): number {
  if (remainingRefs <= 0) return 0
  if (orderedRefs > 0 && originalPaidNgn > 0) {
    return Math.max(MIN_ORDER_NGN, Math.round((remainingRefs / orderedRefs) * originalPaidNgn))
  }
  return priceForReferrals(remainingRefs, category)
}

export function isFreeStarter(referrals: number, category: RefCategory) {
  return category === 'regular' && referrals === FREE_STARTER_REFS
}

/**
 * Sustainable NGN pricing model (18 Nov 2026).
 * Each approved referral costs the platform ₦15 in earner rewards.
 * Package prices target roughly 30–46% contribution before gateway fees,
 * support, tax and fixed operating costs. Smaller entry tiers help SMEs start.
 */

export type RefCategory = 'regular' | 'gambling'

export type Tier = {
  name: string
  referrals: number
  priceNgn: number
}

/** Regular packages: signup only; no deposit required. */
export const REGULAR_PACKAGES: Tier[] = [
  { name: 'Mini', referrals: 250, priceNgn: 6900 },
  { name: 'Starter', referrals: 500, priceNgn: 13500 },
  { name: 'Spark', referrals: 1000, priceNgn: 25900 },
  { name: 'Pulse', referrals: 2000, priceNgn: 49900 },
  { name: 'Wave', referrals: 3000, priceNgn: 73900 },
  { name: 'Boost', referrals: 4000, priceNgn: 97900 },
  { name: 'Surge', referrals: 5000, priceNgn: 119900 },
  { name: 'Orbit', referrals: 10000, priceNgn: 229000 },
  { name: 'Nova', referrals: 20000, priceNgn: 449000 },
  { name: 'Galaxy', referrals: 30000, priceNgn: 649000 },
]

/** Deposit-required campaigns carry a 10% service/risk-review premium. */
export const INVESTMENT_PACKAGES: Tier[] = [
  { name: 'Vault Mini', referrals: 250, priceNgn: 7500 },
  { name: 'Vault Starter', referrals: 500, priceNgn: 14900 },
  { name: 'Vault Lite', referrals: 1000, priceNgn: 28500 },
  { name: 'Vault Plus', referrals: 2000, priceNgn: 54900 },
  { name: 'Vault Pro', referrals: 3000, priceNgn: 81500 },
  { name: 'Vault Max', referrals: 4000, priceNgn: 107500 },
  { name: 'Vault Elite', referrals: 5000, priceNgn: 131500 },
  { name: 'Vault Ultra', referrals: 10000, priceNgn: 252000 },
  { name: 'Vault Prime', referrals: 20000, priceNgn: 494000 },
  { name: 'Vault Titan', referrals: 30000, priceNgn: 714000 },
]

export const REGULAR_TIERS: [number, number][] = REGULAR_PACKAGES.map((p) => [p.referrals, p.priceNgn])
export const INVESTMENT_TIERS: [number, number][] = INVESTMENT_PACKAGES.map((p) => [p.referrals, p.priceNgn])

export const MIN_ORDER_NGN = 1000
export const FREE_STARTER_REFS = 50
export const FREE_STARTER_NAME = 'Free Starter'

/** Earner reward for each approved task/referral (Naira). */
export const DEFAULT_TASK_REWARD_NGN = 15

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

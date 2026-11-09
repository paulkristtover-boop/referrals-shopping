/** Referral pricing in Naira — tier ratio from published USD × 1600 */

export type RefCategory = 'regular' | 'gambling'

export type Tier = {
  name: string
  referrals: number
  priceNgn: number
}

/** Regular: sites / channels / bots / groups — signup only */
export const REGULAR_PACKAGES: Tier[] = [
  { name: 'Spark', referrals: 1000, priceNgn: 12800 },
  { name: 'Pulse', referrals: 2000, priceNgn: 16000 },
  { name: 'Wave', referrals: 3000, priceNgn: 24000 },
  { name: 'Boost', referrals: 4000, priceNgn: 32000 },
  { name: 'Surge', referrals: 5000, priceNgn: 40000 },
  { name: 'Orbit', referrals: 10000, priceNgn: 80000 },
  { name: 'Nova', referrals: 20000, priceNgn: 160000 },
  { name: 'Galaxy', referrals: 30000, priceNgn: 240000 },
]

/** Investment / deposit — signup + deposit */
export const INVESTMENT_PACKAGES: Tier[] = [
  { name: 'Vault Lite', referrals: 1000, priceNgn: 25600 },
  { name: 'Vault Plus', referrals: 2000, priceNgn: 32000 },
  { name: 'Vault Pro', referrals: 3000, priceNgn: 48000 },
  { name: 'Vault Max', referrals: 4000, priceNgn: 64000 },
  { name: 'Vault Elite', referrals: 5000, priceNgn: 80000 },
  { name: 'Vault Ultra', referrals: 10000, priceNgn: 160000 },
  { name: 'Vault Prime', referrals: 20000, priceNgn: 320000 },
  { name: 'Vault Titan', referrals: 30000, priceNgn: 480000 },
]

/** Legacy tuple form for older callers */
export const REGULAR_TIERS: [number, number][] = REGULAR_PACKAGES.map((p) => [p.referrals, p.priceNgn])
export const INVESTMENT_TIERS: [number, number][] = INVESTMENT_PACKAGES.map((p) => [p.referrals, p.priceNgn])

export const MIN_ORDER_NGN = 1000
export const FREE_STARTER_REFS = 50
export const FREE_STARTER_NAME = 'Free Starter'

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

export function isFreeStarter(referrals: number, category: RefCategory) {
  return category === 'regular' && referrals === FREE_STARTER_REFS
}

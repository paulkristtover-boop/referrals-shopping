/**
 * Naira package prices — designed to be readable at a glance.
 * Always show: referrals · total ₦ · ₦ per referral · what counts.
 */

export type RefCategory = 'regular' | 'gambling'

export type Tier = {
  name: string
  referrals: number
  priceNgn: number
}

/** Regular = referred person signs up only */
export const REGULAR_PACKAGES: Tier[] = [
  { name: '1k Signups', referrals: 1000, priceNgn: 30000 },
  { name: '2k Signups', referrals: 2000, priceNgn: 55000 },
  { name: '3k Signups', referrals: 3000, priceNgn: 80000 },
  { name: '4k Signups', referrals: 4000, priceNgn: 100000 },
  { name: '5k Signups', referrals: 5000, priceNgn: 120000 },
  { name: '10k Signups', referrals: 10000, priceNgn: 220000 },
  { name: '20k Signups', referrals: 20000, priceNgn: 400000 },
  { name: '30k Signups', referrals: 30000, priceNgn: 550000 },
]

/** Investment = signup + deposit on the promoter’s offer (harder, higher price) */
export const INVESTMENT_PACKAGES: Tier[] = [
  { name: '1k Deposits', referrals: 1000, priceNgn: 60000 },
  { name: '2k Deposits', referrals: 2000, priceNgn: 110000 },
  { name: '3k Deposits', referrals: 3000, priceNgn: 160000 },
  { name: '4k Deposits', referrals: 4000, priceNgn: 200000 },
  { name: '5k Deposits', referrals: 5000, priceNgn: 240000 },
  { name: '10k Deposits', referrals: 10000, priceNgn: 420000 },
  { name: '20k Deposits', referrals: 20000, priceNgn: 780000 },
  { name: '30k Deposits', referrals: 30000, priceNgn: 1100000 },
]

export const REGULAR_TIERS: [number, number][] = REGULAR_PACKAGES.map((p) => [p.referrals, p.priceNgn])
export const INVESTMENT_TIERS: [number, number][] = INVESTMENT_PACKAGES.map((p) => [p.referrals, p.priceNgn])

export const MIN_ORDER_NGN = 1000
export const FREE_STARTER_REFS = 50
export const FREE_STARTER_NAME = 'Free Starter'
export const DEFAULT_TASK_REWARD_NGN = 50

export function packagesFor(category: RefCategory): Tier[] {
  return category === 'gambling' ? INVESTMENT_PACKAGES : REGULAR_PACKAGES
}

export function tiersFor(category: RefCategory) {
  return category === 'gambling' ? INVESTMENT_TIERS : REGULAR_TIERS
}

export function perReferralNgn(priceNgn: number, referrals: number): number {
  if (!referrals) return 0
  return Math.round(priceNgn / referrals)
}

export function categoryLabel(category: RefCategory): string {
  return category === 'gambling' ? 'Deposit referrals' : 'Signup referrals'
}

export function categoryHint(category: RefCategory): string {
  return category === 'gambling'
    ? 'Counts when someone signs up and deposits on your offer'
    : 'Counts when someone signs up with your link (no deposit required)'
}

export function nameForReferrals(referrals: number, category: RefCategory): string {
  if (category === 'regular' && referrals === FREE_STARTER_REFS) return FREE_STARTER_NAME
  const hit = packagesFor(category).find((p) => p.referrals === referrals)
  if (hit) return hit.name
  return `${referrals.toLocaleString()} referrals`
}

export function priceForReferrals(referrals: number, category: RefCategory): number {
  if (category === 'regular' && referrals === FREE_STARTER_REFS) return 0
  const hit = packagesFor(category).find((p) => p.referrals === referrals)
  return hit?.priceNgn ?? 0
}

/** Human one-liner for order summary */
export function orderSummaryLine(referrals: number, priceNgn: number, category: RefCategory): string {
  const per = perReferralNgn(priceNgn, referrals)
  const kind = category === 'gambling' ? 'deposit' : 'signup'
  if (priceNgn <= 0) return `${referrals} free ${kind} referrals`
  return `${referrals.toLocaleString()} ${kind} referrals · ${priceNgn.toLocaleString('en-NG')} total · ~₦${per.toLocaleString('en-NG')} each`
}

export function refillPriceNgn(
  remaining: number,
  category: RefCategory,
): number {
  const tiers = packagesFor(category)
  // nearest tier by referrals, scale linearly from that unit price
  const sorted = [...tiers].sort((a, b) => a.referrals - b.referrals)
  let unit = sorted[0] ? sorted[0].priceNgn / sorted[0].referrals : 30
  for (const t of sorted) {
    if (remaining >= t.referrals) unit = t.priceNgn / t.referrals
  }
  return Math.max(MIN_ORDER_NGN, Math.round(unit * remaining))
}

export function isFreeStarter(referrals: number, category: RefCategory) {
  return category === 'regular' && referrals === FREE_STARTER_REFS
}

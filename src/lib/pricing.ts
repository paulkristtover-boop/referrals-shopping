/**
 * Facebook / Google Ads–style micro budgets (₦).
 *
 * Unit economics (target):
 *  Signup CPA  ≈ ₦80  → earner ~₦40–45 + platform/fees ~₦35–40
 *  Deposit CPA ≈ ₦140 → earner ~₦70–80 + platform/fees ~₦60–70
 *
 * Small packs reduce sticker shock; volume tiers unlock slight discounts.
 */

export type RefCategory = 'regular' | 'gambling'

export type Tier = {
  name: string
  referrals: number
  priceNgn: number
}

/** Signup-only ads — small daily-budget style packs */
export const REGULAR_PACKAGES: Tier[] = [
  { name: '10 signups', referrals: 10, priceNgn: 800 },
  { name: '25 signups', referrals: 25, priceNgn: 1800 },
  { name: '50 signups', referrals: 50, priceNgn: 3500 },
  { name: '100 signups', referrals: 100, priceNgn: 6500 },
  { name: '250 signups', referrals: 250, priceNgn: 15000 },
  { name: '500 signups', referrals: 500, priceNgn: 28000 },
]

/** Signup + deposit — higher CPA, still micro-start friendly */
export const INVESTMENT_PACKAGES: Tier[] = [
  { name: '10 deposits', referrals: 10, priceNgn: 1400 },
  { name: '25 deposits', referrals: 25, priceNgn: 3250 },
  { name: '50 deposits', referrals: 50, priceNgn: 6000 },
  { name: '100 deposits', referrals: 100, priceNgn: 11000 },
  { name: '250 deposits', referrals: 250, priceNgn: 25000 },
  { name: '500 deposits', referrals: 500, priceNgn: 48000 },
]

export const REGULAR_TIERS: [number, number][] = REGULAR_PACKAGES.map((p) => [p.referrals, p.priceNgn])
export const INVESTMENT_TIERS: [number, number][] = INVESTMENT_PACKAGES.map((p) => [p.referrals, p.priceNgn])

/** Minimum paid ad budget (one small pack floor) */
export const MIN_ORDER_NGN = 800
export const FREE_STARTER_REFS = 10
export const FREE_STARTER_NAME = 'Free trial'
/** Suggested earner payout for a completed signup task (admin can override in DB) */
export const DEFAULT_TASK_REWARD_NGN = 40
/** Suggested earner payout for deposit-proof tasks */
export const DEFAULT_DEPOSIT_TASK_REWARD_NGN = 70

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
  return category === 'gambling' ? 'Deposit ads' : 'Signup ads'
}

export function categoryHint(category: RefCategory): string {
  return category === 'gambling'
    ? 'Someone signs up and deposits on your offer — higher cost per result'
    : 'Someone signs up with your link — lower cost, like traffic ads'
}

export function nameForReferrals(referrals: number, category: RefCategory): string {
  if (category === 'regular' && referrals === FREE_STARTER_REFS) return FREE_STARTER_NAME
  const hit = packagesFor(category).find((p) => p.referrals === referrals)
  if (hit) return hit.name
  return `${referrals.toLocaleString()} results`
}

export function priceForReferrals(referrals: number, category: RefCategory): number {
  if (category === 'regular' && referrals === FREE_STARTER_REFS) return 0
  const hit = packagesFor(category).find((p) => p.referrals === referrals)
  if (hit) return hit.priceNgn
  // interpolate from nearest lower pack unit price
  const packs = packagesFor(category)
  const sorted = [...packs].sort((a, b) => a.referrals - b.referrals)
  let unit = sorted[0] ? sorted[0].priceNgn / sorted[0].referrals : 80
  for (const t of sorted) {
    if (referrals >= t.referrals) unit = t.priceNgn / t.referrals
  }
  return Math.max(MIN_ORDER_NGN, Math.round(unit * referrals))
}

export function isFreeStarter(referrals: number, category: RefCategory) {
  return category === 'regular' && referrals === FREE_STARTER_REFS
}

export function orderSummaryLine(referrals: number, priceNgn: number, category: RefCategory): string {
  const per = perReferralNgn(priceNgn, referrals)
  const kind = category === 'gambling' ? 'deposit' : 'signup'
  if (priceNgn <= 0) return `${referrals} free ${kind} results (trial)`
  return `Budget ${priceNgn.toLocaleString('en-NG')} ₦ · ${referrals} ${kind} results · ~₦${per}/result`
}

export function refillPriceNgn(remaining: number, category: RefCategory): number {
  return priceForReferrals(Math.max(remaining, 10), category)
}

/** Split of CPA for transparency (approximate) */
export function economicsHint(category: RefCategory): string {
  return category === 'gambling'
    ? 'From each result: ~₦70 to earners, rest covers platform + payment fees'
    : 'From each result: ~₦40 to earners, rest covers platform + payment fees'
}

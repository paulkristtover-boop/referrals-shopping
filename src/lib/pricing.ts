/**
 * Recalibrated plans (₦) — micro budgets + honest unit economics.
 *
 * Free trial: 5 signup results, once per account (acquisition, not volume).
 * Paid signup CPA target ≈ ₦60–100 → earner ~₦40 + platform/fees.
 * Deposit CPA ≈ 1.7–1.9× signup (harder action).
 */

export type RefCategory = 'regular' | 'gambling'

export type Tier = {
  name: string
  referrals: number
  priceNgn: number
}

/** Signup-only — what counts: referred user creates an account */
export const REGULAR_PACKAGES: Tier[] = [
  { name: 'Starter', referrals: 20, priceNgn: 1500 },
  { name: 'Boost', referrals: 50, priceNgn: 3500 },
  { name: 'Growth', referrals: 100, priceNgn: 6500 },
  { name: 'Pro', referrals: 250, priceNgn: 15000 },
  { name: 'Scale', referrals: 500, priceNgn: 28000 },
]

/** Signup + deposit on the advertiser’s offer */
export const INVESTMENT_PACKAGES: Tier[] = [
  { name: 'Starter+', referrals: 20, priceNgn: 2700 },
  { name: 'Boost+', referrals: 50, priceNgn: 6300 },
  { name: 'Growth+', referrals: 100, priceNgn: 12000 },
  { name: 'Pro+', referrals: 250, priceNgn: 27000 },
  { name: 'Scale+', referrals: 500, priceNgn: 50000 },
]

export const REGULAR_TIERS: [number, number][] = REGULAR_PACKAGES.map((p) => [p.referrals, p.priceNgn])
export const INVESTMENT_TIERS: [number, number][] = INVESTMENT_PACKAGES.map((p) => [p.referrals, p.priceNgn])

export const MIN_ORDER_NGN = 1500
/** Free trial size — small on purpose so it is a test drive, not free volume */
export const FREE_STARTER_REFS = 5
export const FREE_STARTER_NAME = 'Free trial'
export const DEFAULT_TASK_REWARD_NGN = 40
export const DEFAULT_DEPOSIT_TASK_REWARD_NGN = 70
/** Reward on free-trial tasks (platform covers; keep modest) */
export const FREE_TRIAL_TASK_REWARD_NGN = 25

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
    ? 'Counts when someone signs up and deposits on your offer'
    : 'Counts when someone signs up with your link (no deposit required)'
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
  const packs = packagesFor(category)
  const sorted = [...packs].sort((a, b) => a.referrals - b.referrals)
  let unit = sorted[0] ? sorted[0].priceNgn / sorted[0].referrals : 75
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
  if (priceNgn <= 0) return `Free trial · ${referrals} ${kind} results · once per account`
  return `${nameForReferrals(referrals, category)} · ${referrals} ${kind} · ₦${priceNgn.toLocaleString('en-NG')} (~₦${per}/result)`
}

export function refillPriceNgn(remaining: number, category: RefCategory): number {
  return priceForReferrals(Math.max(remaining, 20), category)
}

export function economicsHint(category: RefCategory): string {
  return category === 'gambling'
    ? 'From each result: ~₦70 to earners, rest covers platform + fees'
    : 'From each result: ~₦40 to earners, rest covers platform + fees'
}

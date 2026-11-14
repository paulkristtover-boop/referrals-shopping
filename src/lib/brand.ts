/** Referrals Shopping — Nigeria-first marketplace, AI-assisted web */

export const BRAND = 'Referrals Shopping'
export const BRAND_SHORT = 'RS'
export const BRAND_TAGLINE = 'Nigeria’s referral marketplace'
export const BRAND_SUB = 'Promote · Earn · Deliver — powered by smart automation'
export const BRAND_AI = 'Web experience assisted by AI'
export const LOCALE = 'en-NG'
export const CURRENCY_NOTE = 'All amounts in Nigerian Naira (₦)'

export const TG = 'https://t.me/referralshopping'
export const IG =
  'https://www.instagram.com/referralshopping?vrfl=bjdsOXFyZ2tteDZt'
export const IG_HANDLE = '@referralshopping'

export const SOCIAL = {
  telegram: TG,
  instagram: IG,
} as const


/** WhatsApp group or business number for updates (digits only for wa.me, or full group invite URL) */
export const WA_GROUP =
  (typeof import.meta !== 'undefined' && (import.meta as { env?: Record<string, string> }).env?.VITE_WA_GROUP) ||
  ''
export const WA_UPDATES_ENABLED = Boolean(WA_GROUP)

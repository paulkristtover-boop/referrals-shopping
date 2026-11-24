export type GuideStep = { title: string; body: string }

const DAY = 14 * 24 * 60 * 60 * 1000
const STORE = 'rs_page_guides_v1'

export function guideKey(pathname: string) {
  const p = pathname.replace(/\/$/, '') || '/'
  if (p.startsWith('/admin/support')) return '/admin/support'
  if (p.startsWith('/admin')) return '/admin'
  return p
}

const GUIDES: Record<string, { title: string; steps: GuideStep[] }> = {
  '/': {
    title: 'Home',
    steps: [
      { title: 'What this site is', body: 'Referrals Shopping is a marketplace. Promoters pay for referral volume. Earners complete those tasks and get paid in Naira.' },
      { title: 'Two paths', body: 'Promote if you have a link to fill. Earn if you want to complete tasks and withdraw.' },
      { title: 'Prices', body: 'Packages are priced in Naira before you pay. Regular means signup only. Investment means signup plus a deposit on the promoter’s offer.' },
    ],
  },
  '/login': {
    title: 'Sign in',
    steps: [
      { title: 'Use the email you registered', body: 'Email confirmation is off. If you turned on 2FA, you will be asked for the code after the password.' },
      { title: 'New here?', body: 'Open Register. You must be 18 and accept Terms and Privacy.' },
    ],
  },
  '/register': {
    title: 'Create an account',
    steps: [
      { title: 'One account', body: 'Use a real name and email. Extra accounts to farm Free Starter or refunds can be closed.' },
      { title: 'Name lock', body: 'After you set your name, you can change it again after 14 days, or sooner if an admin verifies you.' },
    ],
  },
  '/dashboard': {
    title: 'Your dashboard',
    steps: [
      { title: 'What you see', body: 'Balance, orders waiting for payment, referrals ordered, and how many have been marked delivered.' },
      { title: 'Next step', body: 'Pay an unpaid order, open Earn for tasks, or confirm proofs on your own promotions.' },
    ],
  },
  '/promote': {
    title: 'Promote',
    steps: [
      { title: 'Create an order', body: 'Pick Regular or Investment, choose how many referrals, paste your link, then pay with Flutterwave or crypto.' },
      { title: 'After you pay', body: 'Admin approves the link. It becomes Earn tasks. You confirm proofs. Delivery follows real completions, not a fixed clock.' },
      { title: 'Drafts and refill', body: 'Save a draft and finish later. If an order is short, use Refill for the remaining referrals (you pay again for what is left).' },
    ],
  },
  '/earn': {
    title: 'Earn',
    steps: [
      { title: 'You supply the referrals', body: 'Open a live task, wait the timer, upload a clear screenshot. You cannot earn on your own adverts.' },
      { title: 'Getting paid', body: 'Credit hits your wallet after the poster or admin accepts the proof. Withdraw from Wallet (minimum applies).' },
    ],
  },
  '/wallet': {
    title: 'Wallet',
    steps: [
      { title: 'Balance is Naira', body: 'The number is ₦. Pending withdrawals are already deducted until paid or rejected.' },
      { title: 'Payout', body: 'Nigerian bank via Flutterwave, or crypto (TRX, SOL, TON). Minimum withdrawal is ₦1,000.' },
    ],
  },
  '/invite': {
    title: 'Invites',
    steps: [
      { title: 'Your link', body: 'Share your invite code. People who register with it are linked to you. This is not the same as buying a referral package.' },
    ],
  },
  '/receipts': {
    title: 'Receipts',
    steps: [
      { title: 'Tax invoices', body: 'Each paid order can show net, tax, and total. Print or save the invoice for your records.' },
    ],
  },
  '/history': {
    title: 'Activity history',
    steps: [
      { title: 'Your audit trail', body: 'Orders you cancelled, payments confirmed, and other account actions appear here for your records.' },
    ],
  },
  '/proofs': {
    title: 'Proofs',
    steps: [
      { title: 'Poster review', body: 'Check screenshots against your sample. Confirm good ones. Dispute bad ones so admin can look.' },
    ],
  },
  '/security': {
    title: 'Security',
    steps: [
      { title: '2FA', body: 'Turn on an authenticator app. It replaces email confirmation.' },
      { title: 'Sessions', body: 'See devices and sign out other sessions if something looks wrong.' },
    ],
  },
  '/account': {
    title: 'Account',
    steps: [
      { title: 'Username', body: 'Your public @handle appears on proofs and invites. Letters, numbers, underscore. First set is free; later changes wait 30 days.' },
      { title: 'Display name', body: 'How we greet you. Locked for 14 days after each change unless an admin verifies you.' },
      { title: 'Security & billing', body: 'Change password, manage 2FA/sessions, and optional tax details for invoices.' },
    ],
  },
  '/support': {
    title: 'Support',
    steps: [
      { title: 'Tickets', body: 'Describe the order, payment reference, and what you need. Refunds are reviewed case by case.' },
    ],
  },
  '/guide': {
    title: 'How it works',
    steps: [
      { title: 'Read once', body: 'This page is the long version of Promote versus Earn, what counts as a referral, and how long delivery usually takes.' },
    ],
  },
  '/codes': {
    title: 'Booking codes',
    steps: [
      { title: 'What these are', body: 'Booking codes load selections on MSport. They are not fixed games or guaranteed wins. 18+ only.' },
      { title: 'How to use', body: 'Copy a code, open MSport, paste into the booking-code field, check every leg, set your own stake.' },
      { title: 'Affiliate', body: 'Open MSport may use our referral link. We may earn if you register or deposit.' },
    ],
  },
  '/faq': {
    title: 'FAQ',
    steps: [
      { title: 'Common questions', body: 'Where referrals come from, timelines, free starter, refunds, and payments.' },
    ],
  },
  '/legal': {
    title: 'Legal',
    steps: [
      { title: 'Read before you pay', body: 'Terms, privacy, and refunds live here. The platform is an intermediary, not the owner of offers you promote.' },
    ],
  },
  '/terms': {
    title: 'Terms',
    steps: [
      { title: 'The contract', body: '18+, one account, honest proofs, Naira prices, and limits on what we promise.' },
    ],
  },
  '/privacy': {
    title: 'Privacy',
    steps: [
      { title: 'Your data', body: 'We store account, orders, and screenshots you upload so tasks can be reviewed.' },
    ],
  },
  '/refunds': {
    title: 'Refunds',
    steps: [
      { title: 'When to ask', body: 'Platform faults and clear shortfalls can be reviewed. Change of mind after delivery starts usually is not refunded.' },
    ],
  },
  '/admin': {
    title: 'Admin CMS',
    steps: [
      { title: 'Approve before tasks go live', body: 'Paid orders wait here. Approve a real link, reject deceptive ones, then earners can work.' },
      { title: 'Money and proofs', body: 'Mark withdrawals, pay banks through Flutterwave, and review disputed screenshots.' },
      { title: 'Name verification', body: 'Open a user and verify their display name if they need to change it before 14 days.' },
    ],
  },
  '/admin/support': {
    title: 'Admin support',
    steps: [
      { title: 'Tickets', body: 'Reply here. Ask for order id, pay reference, and screenshots before you promise a refund.' },
    ],
  },
}

export function guideFor(pathname: string) {
  return GUIDES[guideKey(pathname)] || {
    title: 'This page',
    steps: [{ title: 'How to use it', body: 'Read the headings, then use the main button on the page. Open Guide or FAQ if you want the full explanation.' }],
  }
}

type Store = Record<string, number>

function readStore(): Store {
  try {
    return JSON.parse(localStorage.getItem(STORE) || '{}') as Store
  } catch {
    return {}
  }
}

export function shouldShowGuide(pathname: string) {
  try {
    const seen = readStore()[guideKey(pathname)]
    if (!seen) return true
    return Date.now() - seen > DAY
  } catch {
    return false
  }
}

export function markGuideSeen(pathname: string) {
  try {
    const store = readStore()
    store[guideKey(pathname)] = Date.now()
    localStorage.setItem(STORE, JSON.stringify(store))
  } catch {
    /* private mode */
  }
}

export function clearGuideSeen(pathname: string) {
  try {
    const store = readStore()
    delete store[guideKey(pathname)]
    localStorage.setItem(STORE, JSON.stringify(store))
  } catch {
    /* private mode */
  }
}

export const NAME_COOLDOWN_MS = DAY

export type Profile = {
  id: string
  email: string
  full_name: string | null
  role: 'user' | 'admin'
  balance: number
  terms_accepted_at: string | null
}

export type Package = {
  id: string
  name: string
  category: 'regular' | 'gambling'
  referrals: number
  price_usd: number
  active?: boolean
}

export type Campaign = {
  id: string
  user_id: string
  package_id: string
  title: string
  target_url: string
  status: string
  paid_amount: number | null
  crypto_chain: string | null
  payment_note: string | null
  created_at: string
  packages?: Package
}

export type Task = {
  id: string
  campaign_id: string
  reward_amount: number
  wait_seconds: number
  active: boolean
  campaigns?: { title: string; target_url: string; status: string }
}

export type Submission = {
  id: string
  task_id: string
  user_id: string
  screenshot_url: string
  status: string
  created_at: string
}

export type Profile = {
  id: string
  email: string
  full_name: string | null
  role: 'user' | 'admin'
  balance: number
  terms_accepted_at: string | null
  account_id?: string | null
  invite_code?: string | null
  free_starter_used_at?: string | null
  referred_by?: string | null
  totp_enabled?: boolean
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
  description?: string | null
  sample_screenshot_url?: string | null
  status: string
  paid_amount: number | null
  crypto_chain: string | null
  payment_note: string | null
  pay_code?: string | null
  tx_hash?: string | null
  created_at: string
  referrals_delivered?: number | null
  packages?: Package
}

export type Task = {
  id: string
  campaign_id: string
  reward_amount: number
  wait_seconds: number
  active: boolean
  campaigns?: { title: string; target_url: string; status: string; description?: string | null; sample_screenshot_url?: string | null; user_id?: string }
}

export type Submission = {
  id: string
  task_id: string
  user_id: string
  screenshot_url: string
  status: string
  created_at: string
}

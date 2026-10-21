export type UserRole = 'user' | 'admin'
export type PackageType = 'regular' | 'gambling'
export type CampaignStatus =
  | 'pending_payment'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'paused'
export type TaskStatus = 'active' | 'paused' | 'completed'
export type SubmissionStatus = 'pending' | 'approved' | 'rejected'
export type CryptoCurrency = 'TRX' | 'SOL' | 'TON'
export type TransactionType = 'deposit' | 'earning' | 'withdrawal' | 'refund'
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled'
export type WithdrawalStatus = 'pending' | 'processing' | 'paid' | 'rejected'

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  role: UserRole
  balance: number
  terms_accepted_at: string | null
  created_at: string
  updated_at: string
}

export interface Package {
  id: string
  name: string
  type: PackageType
  referrals_count: number
  price_usd: number
  active: boolean
  created_at: string
}

export interface Campaign {
  id: string
  user_id: string
  package_id: string
  title: string
  description: string | null
  referral_link: string
  status: CampaignStatus
  paid_amount: number | null
  crypto_currency: CryptoCurrency | null
  deposit_address: string | null
  deposit_reference: string | null
  tx_hash: string | null
  admin_notes: string | null
  created_at: string
  updated_at: string
  // joins
  packages?: Package
  profiles?: { email: string | null; full_name: string | null }
}

export interface Task {
  id: string
  campaign_id: string
  required_wait_seconds: number
  reward_amount: number
  status: TaskStatus
  max_completions: number | null
  current_completions: number
  created_at: string
  // joins
  campaigns?: {
    title: string
    referral_link: string
    status: CampaignStatus
  }
}

export interface TaskSubmission {
  id: string
  task_id: string
  user_id: string
  screenshot_url: string | null
  status: SubmissionStatus
  earned_amount: number | null
  admin_notes: string | null
  reviewed_at: string | null
  reviewed_by: string | null
  created_at: string
  // joins
  tasks?: Task & { campaigns?: { title: string } }
  profiles?: { email: string | null; full_name: string | null }
}

export interface Transaction {
  id: string
  user_id: string
  type: TransactionType
  amount: number
  currency: string
  crypto_currency: string | null
  tx_hash: string | null
  status: TransactionStatus
  reference_id: string | null
  notes: string | null
  created_at: string
}

export interface Withdrawal {
  id: string
  user_id: string
  amount: number
  currency: string
  crypto_currency: CryptoCurrency
  address: string
  status: WithdrawalStatus
  tx_hash: string | null
  admin_notes: string | null
  processed_at: string | null
  created_at: string
  profiles?: { email: string | null; full_name: string | null }
}

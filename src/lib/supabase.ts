import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || ''
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabaseConfigured = Boolean(url && key)

export const supabase = supabaseConfigured
  ? createClient(url, key)
  : (null as unknown as ReturnType<typeof createClient>)

export const deposits = {
  trx: import.meta.env.VITE_DEPOSIT_TRX || 'TYourTRXAddress',
  sol: import.meta.env.VITE_DEPOSIT_SOL || 'YourSOLAddress',
  ton: import.meta.env.VITE_DEPOSIT_TON || 'EQYourTONAddress',
}

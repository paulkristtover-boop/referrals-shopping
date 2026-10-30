import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || ''
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabaseConfigured = Boolean(url && key)

export const supabase = supabaseConfigured
  ? createClient(url, key)
  : (null as unknown as ReturnType<typeof createClient>)



/** Env defaults; override with admin platform_settings via get_deposit_addresses */
export const deposits = {
  trx: import.meta.env.VITE_DEPOSIT_TRX || '',
  sol: import.meta.env.VITE_DEPOSIT_SOL || '',
  ton: import.meta.env.VITE_DEPOSIT_TON || '',
}

export async function loadDeposits(): Promise<{ trx: string; sol: string; ton: string }> {
  const base = { ...deposits }
  if (!supabaseConfigured) return base
  try {
    const { data } = await supabase.rpc('get_deposit_addresses')
    if (data && typeof data === 'object') {
      const d = data as Record<string, string>
      return {
        trx: (d.trx && d.trx.trim()) || base.trx,
        sol: (d.sol && d.sol.trim()) || base.sol,
        ton: (d.ton && d.ton.trim()) || base.ton,
      }
    }
  } catch {
    /* ignore */
  }
  return base
}

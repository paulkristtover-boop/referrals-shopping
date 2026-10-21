/** Platform deposit addresses – set in .env.local */
export const DEPOSIT_ADDRESSES: Record<'TRX' | 'SOL' | 'TON', string> = {
  TRX: process.env.NEXT_PUBLIC_DEPOSIT_TRX || 'TYourTRXDepositAddressHere',
  SOL: process.env.NEXT_PUBLIC_DEPOSIT_SOL || 'YourSOLDepositAddressHere',
  TON: process.env.NEXT_PUBLIC_DEPOSIT_TON || 'EQYourTONDepositAddressHere',
}

export function generateDepositReference(campaignId?: string): string {
  const suffix = campaignId
    ? campaignId.slice(0, 8).toUpperCase()
    : Date.now().toString(36).toUpperCase().slice(-6)
  return `RS-${suffix}`
}

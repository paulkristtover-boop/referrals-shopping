import { getRates, makeUniqueCryptoAmount, resolveDepositAddress } from '../_lib/chains.js'

/** GET ?usd=50&chain=trx → unique crypto amount for 15 min window */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()
  try {
    const usd = Number(req.query.usd || 0)
    const chain = String(req.query.chain || 'trx').toLowerCase()
    if (!usd || !['trx', 'sol', 'ton'].includes(chain)) {
      return res.status(400).json({ error: 'usd and chain=trx|sol|ton required' })
    }
    const rates = await getRates()
    const rate = rates[chain]
    const { amount, suffix } = makeUniqueCryptoAmount(usd, rate)
    const deposit_address = await resolveDepositAddress(chain)
    const expires_at = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    return res.json({
      chain,
      amount_usd: usd,
      rate_usd: rate,
      amount_crypto: amount,
      unique_suffix: suffix,
      deposit_address,
      expires_at,
      window_minutes: 15,
    })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}

import { getRates, makeUniqueCryptoAmount, resolveDepositAddress } from '../_lib/chains.js'

/** GET ?usd=50&chain=trx → unique crypto amount for 15 min window */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()
  try {
    // Client sends package price in NGN (query param still named usd for compatibility, or ngn)
    const ngn = Number(req.query.ngn || req.query.usd || 0)
    const chain = String(req.query.chain || 'trx').toLowerCase()
    if (!ngn || !['trx', 'sol', 'ton'].includes(chain)) {
      return res.status(400).json({ error: 'ngn (or usd) amount and chain=trx|sol|ton required' })
    }
    const ngnPerUsd = Number(process.env.NGN_PER_USD || process.env.VITE_NGN_PER_USD || 1600)
    const usd = ngn / (ngnPerUsd > 0 ? ngnPerUsd : 1600)
    const rates = await getRates()
    const rate = rates[chain]
    const { amount, suffix } = makeUniqueCryptoAmount(usd, rate)
    const deposit_address = await resolveDepositAddress(chain)
    const expires_at = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    return res.json({
      chain,
      amount_ngn: ngn,
      amount_usd: usd,
      ngn_per_usd: ngnPerUsd,
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

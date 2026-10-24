function approxEqual(a, b, eps = 1e-8) {
  return Math.abs(Number(a) - Number(b)) <= eps
}

export function makeUniqueCryptoAmount(usd, rateUsd) {
  const base = Number(usd) / Number(rateUsd)
  const suffix = 1 + Math.floor(Math.random() * 999)
  const amount = Math.round((base + suffix * 1e-6) * 1e6) / 1e6
  return { amount, suffix }
}

export async function getRates() {
  const fallback = {
    trx: Number(process.env.RATE_TRX_USD || 0.12),
    sol: Number(process.env.RATE_SOL_USD || 150),
    ton: Number(process.env.RATE_TON_USD || 5),
  }
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=tron,solana,the-open-network&vs_currencies=usd',
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return fallback
    const j = await res.json()
    return {
      trx: j.tron?.usd || fallback.trx,
      sol: j.solana?.usd || fallback.sol,
      ton: j['the-open-network']?.usd || fallback.ton,
    }
  } catch {
    return fallback
  }
}

export async function findTrxPayment(address, expectedAmount, sinceMs) {
  const key = process.env.TRONGRID_API_KEY || ''
  const headers = key ? { 'TRON-PRO-API-KEY': key } : {}
  const url = `https://api.trongrid.io/v1/accounts/${address}/transactions?only_to=true&limit=50&min_timestamp=${sinceMs}`
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(12000) })
  if (!res.ok) throw new Error(`TronGrid ${res.status}`)
  const data = await res.json()
  for (const tx of data.data || []) {
    const contract = tx.raw_data?.contract?.[0]
    if (!contract || contract.type !== 'TransferContract') continue
    const val = contract.parameter?.value
    if (!val) continue
    const trx = Number(val.amount) / 1e6
    if (approxEqual(trx, expectedAmount, 1e-6)) {
      return { hash: tx.txID || tx.transaction_id, amount: trx }
    }
  }
  return null
}

export async function findSolPayment(address, expectedAmount, sinceMs) {
  const helius = process.env.HELIUS_API_KEY
  const rpc =
    process.env.SOLANA_RPC_URL ||
    (helius ? `https://mainnet.helius-rpc.com/?api-key=${helius}` : 'https://api.mainnet-beta.solana.com')

  const sigRes = await fetch(rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getSignaturesForAddress',
      params: [address, { limit: 25 }],
    }),
    signal: AbortSignal.timeout(12000),
  })
  const sigJson = await sigRes.json()
  for (const s of sigJson.result || []) {
    const blockTime = (s.blockTime || 0) * 1000
    if (blockTime && blockTime < sinceMs) continue
    const txRes = await fetch(rpc, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTransaction',
        params: [s.signature, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }],
      }),
      signal: AbortSignal.timeout(12000),
    })
    const tx = (await txRes.json()).result
    if (!tx) continue
    for (const ix of tx.transaction?.message?.instructions || []) {
      if (ix.parsed?.type === 'transfer' && ix.parsed.info?.destination === address) {
        const sol = Number(ix.parsed.info.lamports || 0) / 1e9
        if (approxEqual(sol, expectedAmount, 1e-9)) {
          return { hash: s.signature, amount: sol }
        }
      }
    }
  }
  return null
}

export async function findTonPayment(address, expectedAmount, sinceMs) {
  const key = process.env.TONCENTER_API_KEY || ''
  const q = key ? `&api_key=${encodeURIComponent(key)}` : ''
  const url = `https://toncenter.com/api/v2/getTransactions?address=${encodeURIComponent(address)}&limit=30${q}`
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) })
  if (!res.ok) throw new Error(`TON Center ${res.status}`)
  const data = await res.json()
  for (const t of data.result || []) {
    const utime = (t.utime || 0) * 1000
    if (utime && utime < sinceMs) continue
    const inMsg = t.in_msg
    if (!inMsg || inMsg.source === '') continue
    const ton = Number(inMsg.value || 0) / 1e9
    if (approxEqual(ton, expectedAmount, 1e-9)) {
      return { hash: t.transaction_id?.hash || inMsg.hash || String(t.utime), amount: ton }
    }
  }
  return null
}

export async function detectPayment(chain, address, expectedAmount, createdAtIso) {
  const sinceMs = new Date(createdAtIso).getTime() - 60_000
  if (chain === 'trx') return findTrxPayment(address, expectedAmount, sinceMs)
  if (chain === 'sol') return findSolPayment(address, expectedAmount, sinceMs)
  if (chain === 'ton') return findTonPayment(address, expectedAmount, sinceMs)
  return null
}

export function depositFor(chain) {
  if (chain === 'trx') return process.env.DEPOSIT_TRX || process.env.VITE_DEPOSIT_TRX || ''
  if (chain === 'sol') return process.env.DEPOSIT_SOL || process.env.VITE_DEPOSIT_SOL || ''
  if (chain === 'ton') return process.env.DEPOSIT_TON || process.env.VITE_DEPOSIT_TON || ''
  return ''
}

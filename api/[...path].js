// Single Vercel Serverless Function router.
// Keeping the API behind one catch-all function makes the project deployable
// on Vercel Hobby's 12-function limit without changing the public API URLs.
import billsCatalog from '../server/api/bills-catalog.js'
import billsPay from '../server/api/bills-pay.js'
import billsStatus from '../server/api/bills-status.js'
import paymentCheck from '../server/api/payments/check.js'
import cryptoInit from '../server/api/payments/crypto-init.js'
import flutterwaveBanks from '../server/api/payments/flutterwave-banks.js'
import flutterwaveHealth from '../server/api/payments/flutterwave-health.js'
import flutterwaveInit from '../server/api/payments/flutterwave-init.js'
import flutterwaveTransfer from '../server/api/payments/flutterwave-transfer.js'
import flutterwaveVerify from '../server/api/payments/flutterwave-verify.js'
import flutterwaveWebhook from '../server/api/payments/flutterwave-webhook.js'
import paymentQuote from '../server/api/payments/quote.js'
import whatsappNotify from '../server/api/whatsapp/notify.js'

const routes = {
  'bills-catalog': billsCatalog,
  'bills-pay': billsPay,
  'bills-status': billsStatus,
  'payments/check': paymentCheck,
  'payments/crypto-init': cryptoInit,
  'payments/flutterwave-banks': flutterwaveBanks,
  'payments/flutterwave-health': flutterwaveHealth,
  'payments/flutterwave-init': flutterwaveInit,
  'payments/flutterwave-transfer': flutterwaveTransfer,
  'payments/flutterwave-verify': flutterwaveVerify,
  'payments/flutterwave-webhook': flutterwaveWebhook,
  'payments/quote': paymentQuote,
  'whatsapp/notify': whatsappNotify,
}

export default async function handler(req, res) {
  const pathname = new URL(req.url || '/', 'https://vercel.internal').pathname
  const route = decodeURIComponent(pathname).replace(/^\/api\/?/, '').replace(/\/$/, '')
  const target = routes[route]

  if (!target) return res.status(404).json({ error: 'API route not found' })
  return target(req, res)
}

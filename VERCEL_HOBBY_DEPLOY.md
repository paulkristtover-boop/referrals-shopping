# Vercel Hobby deployment

This project uses one Vercel Serverless Function entry point: `api/[...path].js`.

All API implementation modules live under `server/api/`, outside Vercel's function-discovery directory. The catch-all router maps the existing public API URLs to those handlers, preserving the current endpoint paths.

## Vercel project settings
- Framework preset: Vite
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `dist`
- Root directory: project root

Do not move implementation modules back under `api/`; doing so may cause Vercel to count them as separate functions.

## Public API paths preserved
- `/api/payments/check`
- `/api/payments/flutterwave-banks`
- `/api/payments/flutterwave-health`
- `/api/payments/flutterwave-init`
- `/api/payments/flutterwave-transfer`
- `/api/payments/flutterwave-verify`
- `/api/payments/flutterwave-webhook`
- `/api/payments/quote`
- `/api/whatsapp/notify`

After pushing, confirm that Vercel builds the commit containing `api/[...path].js` and `server/api/`.

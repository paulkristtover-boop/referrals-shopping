/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_DEPOSIT_TRX: string
  readonly VITE_DEPOSIT_SOL: string
  readonly VITE_DEPOSIT_TON: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

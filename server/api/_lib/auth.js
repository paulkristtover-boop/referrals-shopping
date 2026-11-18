import { createClient } from '@supabase/supabase-js'
import { adminClient } from './supabaseAdmin.js'

export async function authenticatedUser(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !anon) throw new Error('Supabase auth is not configured on the server.')
  const client = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } })
  const { data, error } = await client.auth.getUser()
  if (error || !data?.user) return null
  return data.user
}

export async function requireAdmin(req) {
  const user = await authenticatedUser(req)
  if (!user) return { user: null, admin: false }
  const sb = adminClient()
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle()
  return { user, admin: profile?.role === 'admin' }
}

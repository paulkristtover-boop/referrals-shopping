import { supabase, supabaseConfigured } from './supabase'

export type NotifType = 'info' | 'success' | 'warning' | 'payment' | 'support' | 'system'

export type AppNotification = {
  id: string
  user_id: string
  title: string
  body: string | null
  type: NotifType
  link: string | null
  read_at: string | null
  created_at: string
}

/** Insert a notification for a user (admin / service path via RPC). */
export async function notifyUser(params: {
  userId: string
  title: string
  body?: string
  type?: NotifType
  link?: string
}): Promise<string | null> {
  if (!supabaseConfigured || !params.userId || !params.title.trim()) return null
  try {
    const { data, error } = await supabase.rpc('notify_user', {
      p_user_id: params.userId,
      p_title: params.title.trim(),
      p_body: params.body ?? null,
      p_type: params.type ?? 'info',
      p_link: params.link ?? null,
    })
    if (error) {
      // Fallback direct insert when RPC missing (requires insert policy)
      const { data: row, error: insErr } = await supabase
        .from('notifications')
        .insert({
          user_id: params.userId,
          title: params.title.trim(),
          body: params.body ?? null,
          type: params.type ?? 'info',
          link: params.link ?? null,
        })
        .select('id')
        .single()
      if (insErr) return null
      return (row as { id: string })?.id ?? null
    }
    return (data as string) || null
  } catch {
    return null
  }
}

export async function fetchNotifications(limit = 30): Promise<AppNotification[]> {
  if (!supabaseConfigured) return []
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) return []
  return (data as AppNotification[]) || []
}

export async function markNotificationRead(id: string): Promise<void> {
  if (!supabaseConfigured) return
  await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id).is('read_at', null)
}

export async function markAllNotificationsRead(): Promise<void> {
  if (!supabaseConfigured) return
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null)
}

export function notifIcon(type: string): string {
  switch (type) {
    case 'success':
      return 'bi-check-circle-fill'
    case 'warning':
      return 'bi-exclamation-triangle-fill'
    case 'payment':
      return 'bi-cash-coin'
    case 'support':
      return 'bi-headset'
    case 'system':
      return 'bi-gear-fill'
    default:
      return 'bi-bell-fill'
  }
}

export function relativeTime(iso: string): string {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return ''
  const sec = Math.round((Date.now() - t) / 1000)
  if (sec < 45) return 'just now'
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`
  if (sec < 86400 * 7) return `${Math.floor(sec / 86400)}d ago`
  return new Date(iso).toLocaleDateString()
}

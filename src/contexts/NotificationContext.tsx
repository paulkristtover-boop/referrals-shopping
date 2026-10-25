import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase'
import { useAuth } from './AuthContext'

export type AppNotification = {
  id: string
  title: string
  body: string | null
  type: string
  link: string | null
  read_at: string | null
  created_at: string
}

type Ctx = {
  items: AppNotification[]
  unread: number
  loading: boolean
  refresh: () => Promise<void>
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
}

const NotificationContext = createContext<Ctx | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [items, setItems] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!supabaseConfigured || !user) {
      setItems([])
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
    setItems((data as AppNotification[]) || [])
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    void refresh()
    if (!supabaseConfigured || !user) return
    const channel = supabase
      .channel(`notif-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => {
          void refresh()
        }
      )
      .subscribe()
    const poll = setInterval(() => void refresh(), 45000)
    return () => {
      clearInterval(poll)
      void supabase.removeChannel(channel)
    }
  }, [user?.id, refresh])

  const markRead = async (id: string) => {
    if (!supabaseConfigured) return
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id)
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)))
  }

  const markAllRead = async () => {
    if (!supabaseConfigured || !user) return
    const now = new Date().toISOString()
    await supabase.from('notifications').update({ read_at: now }).eq('user_id', user.id).is('read_at', null)
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || now })))
  }

  const unread = items.filter((n) => !n.read_at).length

  return (
    <NotificationContext.Provider value={{ items, unread, loading, refresh, markRead, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const v = useContext(NotificationContext)
  if (!v) throw new Error('useNotifications outside provider')
  return v
}

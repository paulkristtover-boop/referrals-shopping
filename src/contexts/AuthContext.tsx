import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, supabaseConfigured } from '../lib/supabase'
import type { Profile } from '../lib/types'

type AuthCtx = {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthCtx | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = async () => {
    if (!supabaseConfigured || !user) {
      setProfile(null)
      return
    }
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile((data as Profile) || null)
  }

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      setUser(s?.user ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (user) void refreshProfile()
    else setProfile(null)
  }, [user?.id])

  const signOut = async () => {
    if (supabaseConfigured) await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  return (
    <Ctx.Provider value={{ user, session, profile, loading, refreshProfile, signOut }}>
      {children}
    </Ctx.Provider>
  )
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth outside provider')
  return v
}

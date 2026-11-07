import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, supabaseConfigured } from '../lib/supabase'
import type { Profile } from '../lib/types'
import { clearSessionKey, deviceLabelFromUA, getOrCreateSessionKey } from '../lib/session'

type AuthCtx = {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  refreshProfile: () => Promise<void>
  /** Local browser only */
  signOut: () => Promise<void>
  /** All devices (Supabase global) */
  signOutEverywhere: () => Promise<void>
  /** Other devices only */
  signOutOthers: () => Promise<void>
  touchSession: () => Promise<void>
}

const Ctx = createContext<AuthCtx | undefined>(undefined)

async function registerAppSession() {
  if (!supabaseConfigured) return
  const key = getOrCreateSessionKey()
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  await supabase.rpc('touch_app_session', {
    p_session_key: key,
    p_user_agent: ua,
    p_device_label: deviceLabelFromUA(ua),
  })
}

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
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    if (error) {
      console.warn('profile load', error.message)
      return
    }
    if (data) {
      setProfile(data as Profile)
      return
    }
    const { data: created, error: insErr } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email,
        full_name: (user.user_metadata as { full_name?: string })?.full_name ?? null,
      })
      .select('*')
      .single()
    if (!insErr && created) setProfile(created as Profile)
  }

  const touchSession = async () => {
    try {
      await registerAppSession()
    } catch {
      /* SQL not applied yet */
    }
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
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        void registerAppSession()
      }
      if (event === 'SIGNED_OUT') {
        clearSessionKey()
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (user) {
      void refreshProfile()
      void touchSession()
      // heartbeat every 5 min
      const id = window.setInterval(() => void touchSession(), 5 * 60 * 1000)
      return () => window.clearInterval(id)
    }
    setProfile(null)
  }, [user?.id])

  const signOut = async () => {
    if (supabaseConfigured) await supabase.auth.signOut({ scope: 'local' })
    clearSessionKey()
    setUser(null)
    setSession(null)
    setProfile(null)
  }

  const signOutEverywhere = async () => {
    if (supabaseConfigured) {
      try {
        await supabase.rpc('revoke_other_app_sessions')
      } catch {
        /* ignore */
      }
      await supabase.auth.signOut({ scope: 'global' })
    }
    clearSessionKey()
    setUser(null)
    setSession(null)
    setProfile(null)
  }

  const signOutOthers = async () => {
    if (!supabaseConfigured) return
    try {
      await supabase.rpc('revoke_other_app_sessions')
    } catch {
      /* ignore */
    }
    try {
      await supabase.auth.signOut({ scope: 'others' })
    } catch {
      /* older clients may not support others */
    }
    void touchSession()
  }

  return (
    <Ctx.Provider
      value={{
        user,
        session,
        profile,
        loading,
        refreshProfile,
        signOut,
        signOutEverywhere,
        signOutOthers,
        touchSession,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth outside provider')
  return v
}

import { useState, useEffect, useContext, createContext } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
    setLoading(false)
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signUp(email, password, displayName) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error

    // Check if this is the first user — make them admin
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })

    const role = count === 0 ? 'admin' : 'member'
    const avatarColors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6']
    const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)]

    await supabase.from('profiles').insert({
      id: data.user.id,
      display_name: displayName,
      role,
      avatar_color: avatarColor,
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  const value = { session, profile, loading, signIn, signUp, signOut }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react/only-export-components -- auth hook co-located with provider by design
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { recordDailyActivity } from '../lib/activityService'
import { fetchCurrentAdminRole, clearAdminRoleCache } from '../lib/adminRoleService'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [roleLoading, setRoleLoading] = useState(true)
  const [adminRole, setAdminRole] = useState(clearAdminRoleCache())

  const refreshAdminRole = useCallback(async (currentUser) => {
    if (!currentUser) {
      setAdminRole(clearAdminRoleCache())
      setRoleLoading(false)
      return
    }

    setRoleLoading(true)
    const role = await fetchCurrentAdminRole()
    setAdminRole(role)
    setRoleLoading(false)
  }, [])

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        console.error('Error getting session:', error.message)
      } else {
        const initialUser = session?.user ?? null
        setUser(initialUser)
        await refreshAdminRole(initialUser)
      }
      setLoading(false)
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const authedUser = session?.user ?? null
        setUser(authedUser)
        setLoading(false)
        refreshAdminRole(authedUser)

        if (authedUser && event === 'SIGNED_IN') {
          recordDailyActivity(authedUser.id).catch(error =>
            console.warn('Failed to record daily activity after OAuth:', error),
          )
        }
      },
    )

    return () => subscription.unsubscribe()
  }, [refreshAdminRole])

  const signUp = async (email, password) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })
      
      if (error) throw error
      
      // Record daily activity for successful sign-up with immediate session
      if (data.user && data.session) {
        recordDailyActivity(data.user.id).catch(error => 
          console.warn('Failed to record daily activity:', error)
        )
      }
      
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email, password) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) throw error
      
      // Record daily activity for successful sign-in (async, don't block response)
      if (data.user) {
        recordDailyActivity(data.user.id).catch(error => 
          console.warn('Failed to record daily activity:', error)
        )
      }
      
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setAdminRole(clearAdminRoleCache())
      setRoleLoading(false)
      return { error: null }
    } catch (error) {
      return { error }
    } finally {
      setLoading(false)
    }
  }

  const signInWithGoogle = async (redirectTo) => {
    setLoading(true)
    try {
      const options = {}
      if (redirectTo) {
        options.redirectTo = redirectTo
      } else if (typeof window !== 'undefined') {
        options.redirectTo = window.location.origin
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options,
      })
      if (error) throw error

      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (email, redirectTo) => {
    setLoading(true)
    try {
      const options = redirectTo ? { redirectTo } : undefined
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, options)
      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }

  const updateUserProfile = async (metadata) => {
    try {
      const { data, error } = await supabase.auth.updateUser({ data: metadata })
      if (error) throw error

      if (data?.user) {
        setUser(data.user)
      }

      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }


  const value = {
    user,
    loading,
    roleLoading,
    adminRole,
    refreshAdminRole,
    updateUserProfile,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

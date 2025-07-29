import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

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

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        console.error('Error getting session:', error.message)
      } else {
        setUser(session?.user ?? null)
      }
      setLoading(false)
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email, password) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })
      
      if (error) throw error
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
      return { error: null }
    } catch (error) {
      return { error }
    } finally {
      setLoading(false)
    }
  }

  const signInOrUp = async (email, password) => {
    setLoading(true)
    try {
      // First try to sign in
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        // If sign in fails with "Invalid login credentials", try sign up
        if (signInError.message === 'Invalid login credentials') {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
          })

          if (signUpError) throw signUpError

          // For new users, return success without attempting to sign in
          // They need to confirm their email first
          return { 
            data: signUpData, 
            error: null, 
            isNewUser: true,
            needsConfirmation: !signUpData.session // No session means they need to confirm email
          }
        } else if (signInError.message === 'Email not confirmed') {
          // Handle case where user exists but hasn't confirmed email
          return { 
            data: null, 
            error: { message: 'Please check your email and click the confirmation link before signing in.' }, 
            isNewUser: false,
            needsConfirmation: true
          }
        } else {
          throw signInError
        }
      }

      return { data: signInData, error: null, isNewUser: false, needsConfirmation: false }
    } catch (error) {
      return { data: null, error, isNewUser: false, needsConfirmation: false }
    } finally {
      setLoading(false)
    }
  }

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    signInOrUp,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
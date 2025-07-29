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
        // Handle different types of sign-in errors
        if (signInError.message === 'Invalid login credentials') {
          // This could be either wrong password OR user doesn't exist
          // Try to sign up to determine which case it is
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
          })

          if (signUpError) {
            // If signup fails, it means user exists but password was wrong
            if (signUpError.message?.includes('already registered') || 
                signUpError.message?.includes('already exists') ||
                signUpError.message?.includes('User already registered')) {
              return { 
                data: null, 
                error: { message: 'Incorrect password. Please try again.' }, 
                isNewUser: false,
                needsConfirmation: false
              }
            }
            // Other signup errors
            throw signUpError
          }

          // Signup succeeded, so this was a new user
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
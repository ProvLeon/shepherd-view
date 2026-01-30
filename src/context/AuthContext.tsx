import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js'

type UserRole = 'Admin' | 'Leader' | 'Shepherd' | null

interface AuthContextType {
  user: User | null
  role: UserRole
  isLoading: boolean
  isAuthenticated: boolean
  signOut: () => Promise<void>
  refreshRole: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<UserRole>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch user role directly from Supabase database with timeout
  const fetchUserRole = useCallback(async (userId: string): Promise<UserRole> => {
    try {
      console.log('🔄 Fetching role for user:', userId)

      const supabase = getSupabaseClient()

      // Create a promise that rejects after 5 seconds
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Role fetch timeout')), 5000)
      })

      // Race between the actual query and the timeout
      const roleQuery = supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()

      const { data, error } = await Promise.race([
        roleQuery,
        timeoutPromise
      ])

      if (error) {
        console.error('❌ Error fetching user role:', error.message, error.code)
        // If it's an auth error, user might not have access to users table
        // Default to null and let the app work with basic permissions
        return null
      }

      const userRole = (data?.role as UserRole) || null
      console.log('✅ User role fetched:', userRole)
      return userRole
    } catch (error: any) {
      console.error('❌ Error fetching user role:', error?.message || error)
      // Timeout or other error - return null but complete loading
      return null
    }
  }, [])

  useEffect(() => {
    let mounted = true
    const supabase = getSupabaseClient()

    // Safety timeout to prevent infinite loading (5 seconds)
    const timeoutId = setTimeout(() => {
      if (mounted && isLoading) {
        console.warn('⏱️ Auth initialization timeout - forcing loading to complete')
        setIsLoading(false)
      }
    }, 5000)

    const initializeAuth = async () => {
      try {
        console.log('🔐 Initializing auth...')
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('❌ Error getting session:', error.message)
          if (mounted) {
            setUser(null)
            setRole(null)
            setIsLoading(false)
          }
          return
        }

        if (!mounted) return

        setUser(session?.user ?? null)
        console.log('✅ Session user set:', session?.user?.email)

        if (session?.user) {
          console.log('📋 Fetching role for authenticated user...')
          const userRole = await fetchUserRole(session.user.id)
          if (mounted) {
            setRole(userRole)
            setIsLoading(false)
            console.log('✅ Auth initialization complete. Role:', userRole)
          }
        } else {
          console.log('ℹ️ No session, completing auth initialization')
          setRole(null)
          setIsLoading(false)
        }
      } catch (error) {
        console.error('❌ Auth initialization error:', error)
        if (mounted) {
          setUser(null)
          setRole(null)
          setIsLoading(false)
        }
      }
    }

    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, session: (Session | null)) => {
      if (!mounted) return

      console.log('🔄 Auth state changed:', _event)
      setUser(session?.user ?? null)

      try {
        if (session?.user) {
          console.log('📋 Auth state changed, fetching role for:', session.user.id)
          const userRole = await fetchUserRole(session.user.id)
          if (mounted) {
            setRole(userRole)
          }
        } else {
          console.log('ℹ️ Auth state changed: user logged out')
          setRole(null)
        }
      } catch (error) {
        console.error('❌ Error handling auth state change:', error)
        setRole(null)
      }
    })

    return () => {
      mounted = false
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [fetchUserRole])

  const signOut = async () => {
    try {
      const supabase = getSupabaseClient()
      await supabase.auth.signOut()
      setUser(null)
      setRole(null)
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const refreshRole = async () => {
    if (user) {
      const userRole = await fetchUserRole(user.id)
      setRole(userRole)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isLoading,
        isAuthenticated: !!user,
        signOut,
        refreshRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Role-based access helpers
export function useIsAdmin() {
  const { role } = useAuth()
  return role === 'Admin'
}

export function useIsLeader() {
  const { role } = useAuth()
  return role === 'Admin' || role === 'Leader'
}

export function useIsShepherd() {
  const { role } = useAuth()
  return role === 'Admin' || role === 'Leader' || role === 'Shepherd'
}

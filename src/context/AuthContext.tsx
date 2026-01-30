import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

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

    // Fetch user role from database - wrapped in useCallback to avoid dependency issues
    const fetchUserRole = useCallback(async (userId: string): Promise<UserRole> => {
        try {
            const supabase = getSupabaseClient()
            const { data, error } = await supabase
                .from('users')
                .select('role')
                .eq('id', userId)
                .single()

            if (error) {
                console.error('Error fetching user role:', error.message)
                return null
            }

            return (data?.role as UserRole) || null
        } catch (error) {
            console.error('Error fetching user role:', error)
            return null
        }
    }, [])

    useEffect(() => {
        let mounted = true
        const supabase = getSupabaseClient()

        const initializeAuth = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession()

                if (error) {
                    console.error('Error getting session:', error.message)
                    if (mounted) {
                        setUser(null)
                        setRole(null)
                        setIsLoading(false)
                    }
                    return
                }

                if (mounted) {
                    setUser(session?.user ?? null)

                    if (session?.user) {
                        const userRole = await fetchUserRole(session.user.id)
                        if (mounted) {
                            setRole(userRole)
                        }
                    }

                    setIsLoading(false)
                }
            } catch (error) {
                console.error('Auth initialization error:', error)
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
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (!mounted) return

            setUser(session?.user ?? null)

            if (session?.user) {
                const userRole = await fetchUserRole(session.user.id)
                if (mounted) {
                    setRole(userRole)
                }
            } else {
                setRole(null)
            }
        })

        return () => {
            mounted = false
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



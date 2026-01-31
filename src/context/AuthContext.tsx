import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

// Detect if we're running on the server
const isServer = typeof window === 'undefined'

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

    // Fetch user role from database
    const fetchUserRole = useCallback(async (userId: string): Promise<UserRole> => {
        try {
            const supabase = getSupabaseClient()
            if (!supabase) {
                console.warn('[AuthContext] Supabase client not available, skipping role fetch')
                return null
            }

            // const { data, error } = await supabase
            // Check localStorage cache first
            const cachedRole = localStorage.getItem(`user_role_${userId}`)
            if (cachedRole) {
                const role = cachedRole as UserRole
                // Return cached role immediately but still re-validate in background if needed
                // For now, trust cache to avoid timeout.
                // Or verify cache age.
                return role
            }

            const rolePromise = supabase
                .from('users')
                .select('role')
                .eq('id', userId)
                .single()

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Role fetch timeout')), 5000)
            )

            const { data, error } = await Promise.race([
                rolePromise,
                timeoutPromise as any,
            ])

            if (error) {
                console.warn('[AuthContext] Error fetching user role:', error.message)
                return null
            }

            const role = (data?.role as UserRole) || null

            if (role) {
                localStorage.setItem(`user_role_${userId}`, role)
            }

            return role

        } catch (error) {
            console.error('[AuthContext] Exception while fetching user role:', error instanceof Error ? error.message : String(error))
            return null
        }
    }, []) // Removed dependency array effectively as it has none

    // Initialize authentication
    useEffect(() => {
        let mounted = true
        let timeoutId: NodeJS.Timeout | null = null

        const initializeAuth = async () => {
            try {
                // console.log('[AuthContext] Starting auth initialization...')

                const supabase = getSupabaseClient()
                if (!supabase) {
                    console.warn('[AuthContext] Supabase not available, proceeding without auth')
                    if (mounted) {
                        setUser(null)
                        setRole(null)
                        setIsLoading(false)
                    }
                    return
                }

                // Get current session
                const { data: { session }, error } = await supabase.auth.getSession()

                if (error) {
                    console.warn('[AuthContext] Error getting session:', error.message)
                    if (mounted) {
                        setUser(null)
                        setRole(null)
                        setIsLoading(false)
                    }
                    return
                }

                if (!mounted) return

                // Set user from session
                const currentUser = session?.user || null
                setUser(currentUser)

                // Fetch role if user exists
                if (currentUser) {
                    // console.log('[AuthContext] User found, fetching role:', currentUser.email)
                    const userRole = await fetchUserRole(currentUser.id)
                    if (mounted) {
                        setRole(userRole || null)
                    }
                } else {
                    // console.log('[AuthContext] No user session found')
                    setRole(null)
                }

                if (mounted) {
                    setIsLoading(false)
                }
            } catch (error) {
                console.error('[AuthContext] Auth initialization error:', error)
                if (mounted) {
                    setUser(null)
                    setRole(null)
                    setIsLoading(false)
                }
            }
        }

        // Set a safety timeout to ensure loading state ends
        timeoutId = setTimeout(() => {
            // console.warn('[AuthContext] Auth initialization timeout - forcing completion')
            if (mounted) {
                // console.warn('[AuthContext] Setting isLoading to false due to timeout')
                setIsLoading(false)
            }
        }, 3000) // 3 second timeout

        // Start initialization
        initializeAuth()

        // Set up auth state change listener
        const setupSubscription = async () => {
            try {
                const supabase = getSupabaseClient()
                if (!supabase) {
                    // console.warn('[AuthContext] Supabase not available for subscription')
                    return undefined
                }

                // console.log('[AuthContext] Setting up auth state change listener')
                const {
                    data: { subscription },
                } = supabase.auth.onAuthStateChange(async (_event: string, session: any) => {
                    if (!mounted) return

                    // console.log('[AuthContext] Auth state changed:', _event)
                    const sessionUser = session?.user || null
                    setUser(sessionUser)

                    if (sessionUser) {
                        const userRole = await fetchUserRole(sessionUser.id)
                        if (mounted) {
                            setRole(userRole || null)
                        }
                    } else {
                        setRole(null)
                    }
                })

                return () => {
                    subscription?.unsubscribe()
                }
            } catch (error) {
                console.error('[AuthContext] Failed to set up auth subscription:', error)
                return undefined
            }
        }

        let unsubscribeFn: (() => void) | undefined

        setupSubscription().then((fn) => {
            unsubscribeFn = fn
        })

        // Cleanup
        return () => {
            mounted = false
            if (timeoutId) {
                clearTimeout(timeoutId)
            }
            if (unsubscribeFn) {
                unsubscribeFn()
            }
        }
    }, [fetchUserRole])

    const signOut = async () => {
        try {
            const supabase = getSupabaseClient()
            if (!supabase) {
                console.warn('[AuthContext] Supabase not available for sign out')
                return
            }

            await supabase.auth.signOut()
            setUser(null)
            setRole(null)
        } catch (error) {
            console.error('[AuthContext] Sign out error:', error)
        }
    }

    const refreshRole = async () => {
        if (user) {
            const userRole = await fetchUserRole(user.id)
            setRole(userRole || null)
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

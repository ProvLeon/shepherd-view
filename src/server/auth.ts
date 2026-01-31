import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'vinxi/http'

// Helper to create Supabase server client
export function createSupabaseServerClient() {
    const cookieStore = cookies()

    return createServerClient(
        process.env.VITE_SUPABASE_URL!,
        process.env.VITE_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return Object.entries(cookieStore).map(([name, value]) => ({
                        name,
                        value: value as string,
                    }))
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        cookieStore[name] = value
                    })
                },
            },
        }
    )
}

// Get current authenticated user with their role
export const getCurrentUser = createServerFn({ method: "GET" })
    .handler(async () => {
        try {
            const supabase = createSupabaseServerClient()
            const { data: { user }, error } = await supabase.auth.getUser()

            if (error || !user) {
                return null
            }

            // Get user profile from our database
            const [userProfile] = await db.select()
                .from(users)
                .where(eq(users.id, user.id))
                .limit(1)

            if (!userProfile) {
                // User exists in auth but not in our DB yet
                return {
                    id: user.id,
                    email: user.email,
                    role: null,
                    needsSetup: true,
                }
            }

            return {
                id: user.id,
                email: user.email,
                role: userProfile.role,
                memberId: userProfile.memberId,
                campId: userProfile.campId,
                needsSetup: false,
            }
        } catch (error) {
            console.error('Error getting current user:', error)
            return null
        }
    })

// Sign in with email and password
export const signIn = createServerFn({ method: "POST" })
    .handler(async ({ data }: { data: unknown }) => {
        const { email, password } = data as { email: string; password: string }

        try {
            const supabase = createSupabaseServerClient()
            const { data: authData, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) {
                return { success: false, message: error.message }
            }

            return { success: true, user: authData.user }
        } catch (error: any) {
            console.error('Error signing in:', error)
            return { success: false, message: error.message }
        }
    })

// Sign out
export const signOut = createServerFn({ method: "POST" })
    .handler(async () => {
        try {
            const supabase = createSupabaseServerClient()
            await supabase.auth.signOut()
            return { success: true }
        } catch (error: any) {
            console.error('Error signing out:', error)
            return { success: false, message: error.message }
        }
    })

// Create a new user account (Admin only)
export const createUserAccount = createServerFn({ method: "POST" })
    .handler(async ({ data }: { data: unknown }) => {
        const { email, password, role, memberId, campId } = data as {
            email: string
            password: string
            role: 'Admin' | 'Leader' | 'Shepherd'
            memberId?: string
            campId?: string
        }

        try {
            const supabase = createSupabaseServerClient()

            // Create auth user
            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
            })

            if (authError) {
                return { success: false, message: authError.message }
            }

            // Create user profile in our database
            const [newUser] = await db.insert(users).values({
                id: authData.user.id,
                email,
                role,
                memberId: memberId || null,
                campId: campId || null,
            }).returning()

            return { success: true, user: newUser }
        } catch (error: any) {
            console.error('Error creating user:', error)
            return { success: false, message: error.message }
        }
    })

// Get all users (Admin only)
export const getUsers = createServerFn({ method: "GET" })
    .handler(async () => {
        try {
            const allUsers = await db.select().from(users)
            return allUsers
        } catch (error) {
            console.error('Error fetching users:', error)
            return []
        }
    })

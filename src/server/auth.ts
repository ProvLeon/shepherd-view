import { createServerFn } from '@tanstack/react-start'
import { db } from '../db'
import { users } from '../db/schema'
import { eq } from 'drizzle-orm'
import { createServerClient } from '@supabase/ssr'

// Helper to create Supabase server client
function createSupabaseServerClient() {
  return createServerClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return []
        },
        setAll() {
          // No-op in server context
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
          firstName: null,
          lastName: null,
          role: null,
          needsSetup: true,
        }
      }

      return {
        id: user.id,
        email: user.email,
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
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

// Get current user with full permissions info
export const getCurrentUserWithPermissions = createServerFn({ method: "GET" })
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
        return null
      }

      return {
        id: user.id,
        email: user.email,
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
        role: userProfile.role,
        memberId: userProfile.memberId,
        campId: userProfile.campId,
        isAdmin: userProfile.role === 'Admin',
        isLeader: userProfile.role === 'Admin' || userProfile.role === 'Leader',
        isShepherd: userProfile.role === 'Admin' || userProfile.role === 'Leader' || userProfile.role === 'Shepherd',
      }
    } catch (error) {
      console.error('Error getting current user with permissions:', error)
      return null
    }
  })

// Check if current user is an admin
export const isAdmin = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const supabase = createSupabaseServerClient()
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user) {
        return false
      }

      const [userProfile] = await db.select()
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1)

      return userProfile?.role === 'Admin'
    } catch (error) {
      console.error('Error checking admin status:', error)
      return false
    }
  })

// Check if current user can access a specific camp
export const canAccessCamp = createServerFn({ method: "GET" })
  .inputValidator((data: { campId: string }) => data)
  .handler(async ({ data }) => {
    try {
      const supabase = createSupabaseServerClient()
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user) {
        return false
      }

      const [userProfile] = await db.select()
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1)

      // Admins can access all camps
      if (userProfile?.role === 'Admin') {
        return true
      }

      // Leaders and Shepherds can only access their assigned camp
      return userProfile?.campId === data.campId
    } catch (error) {
      console.error('Error checking camp access:', error)
      return false
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
        firstName: null,
        lastName: null,
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

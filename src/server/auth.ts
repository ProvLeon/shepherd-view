import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { db } from '../db'
import { users } from '../db/schema'
import { eq } from 'drizzle-orm'
import { createServerClient } from '@supabase/ssr'

// Helper to create Supabase server client with request cookies
function createSupabaseServerClient() {
  const request = getRequest()
  const cookieHeader = request.headers.get('cookie') || ''

  // Parse cookies from header
  const cookies = new Map<string, string>()
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=')
      if (name && value) {
        cookies.set(name, decodeURIComponent(value))
      }
    })
  }

  return createServerClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // Return cookies as array of name-value pairs
          return Array.from(cookies.entries()).map(([name, value]) => ({
            name,
            value,
          }))
        },
        setAll() {
          // No-op in server context during SSR
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

      if (error) {
        console.log('🔍 [getCurrentUser] Auth error:', error.message)
        return null
      }

      if (!user) {
        console.log('🔍 [getCurrentUser] No authenticated user found')
        return null
      }

      console.log('🔍 [getCurrentUser] Found authenticated user:', user.id)

      // Get user profile from our database
      const [userProfile] = await db.select()
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1)

      if (!userProfile) {
        console.log('🔍 [getCurrentUser] User profile not found in database, returning minimal user')
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

      console.log('✅ [getCurrentUser] Returning user profile:', {
        id: user.id,
        email: user.email,
        role: userProfile.role,
      })

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
      console.error('❌ [getCurrentUser] Error getting current user:', error)
      return null
    }
  })

// Get current user with full permissions info
// Alias for getCurrentUser (for use in route protection)
export const getCurrentUserFn = getCurrentUser

export const getCurrentUserWithPermissions = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const supabase = createSupabaseServerClient()
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user) {
        console.log('🔍 [getCurrentUserWithPermissions] No user or auth error')
        return null
      }

      // Get user profile from our database
      const [userProfile] = await db.select()
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1)

      if (!userProfile) {
        console.log('🔍 [getCurrentUserWithPermissions] User profile not found')
        return null
      }

      const result = {
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

      console.log('✅ [getCurrentUserWithPermissions] User permissions loaded:', {
        id: result.id,
        role: result.role,
        isAdmin: result.isAdmin,
      })

      return result
    } catch (error) {
      console.error('❌ [getCurrentUserWithPermissions] Error getting current user with permissions:', error)
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
        console.log('🔍 [isAdmin] No user found')
        return false
      }

      const [userProfile] = await db.select()
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1)

      const adminStatus = userProfile?.role === 'Admin'
      console.log(`🔍 [isAdmin] User ${user.id} admin status:`, adminStatus)

      return adminStatus
    } catch (error) {
      console.error('❌ [isAdmin] Error checking admin status:', error)
      return false
    }
  })

// Check if current user can access a specific camp
export const canAccessCamp = createServerFn({ method: "POST" })
  .inputValidator((data: { campId: string }) => data)
  .handler(async ({ data }) => {
    try {
      const supabase = createSupabaseServerClient()
      const { data: { user }, error } = await supabase.auth.getUser()

      if (error || !user) {
        console.log('🔍 [canAccessCamp] No user found')
        return false
      }

      const [userProfile] = await db.select()
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1)

      // Admins can access all camps
      if (userProfile?.role === 'Admin') {
        console.log(`✅ [canAccessCamp] Admin user ${user.id} can access camp ${data.campId}`)
        return true
      }

      // Check if user's camp matches the requested camp
      const hasAccess = userProfile?.campId === data.campId
      console.log(`🔍 [canAccessCamp] User ${user.id} camp access for ${data.campId}:`, hasAccess)

      return hasAccess
    } catch (error) {
      console.error('❌ [canAccessCamp] Error checking camp access:', error)
      return false
    }
  })

// Sign in with email and password
export const signIn = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: unknown }) => {
    const { email, password } = data as { email: string; password: string }

    try {
      console.log('🔍 [signIn] Attempting to sign in user:', email)

      const supabase = createSupabaseServerClient()
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error('❌ [signIn] Sign in error:', error.message)
        return { success: false, message: error.message }
      }

      console.log('✅ [signIn] User signed in successfully:', authData.user.id)

      return { success: true, user: authData.user }
    } catch (error: any) {
      console.error('❌ [signIn] Error signing in:', error)
      return { success: false, message: error.message }
    }
  })

// Sign out
export const signOut = createServerFn({ method: "POST" })
  .handler(async () => {
    try {
      console.log('🔍 [signOut] User signing out')

      const supabase = createSupabaseServerClient()
      await supabase.auth.signOut()

      console.log('✅ [signOut] User signed out successfully')

      return { success: true }
    } catch (error: any) {
      console.error('❌ [signOut] Error signing out:', error)
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

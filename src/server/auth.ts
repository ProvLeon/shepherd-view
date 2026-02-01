import { createServerFn } from '@tanstack/react-start'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { createSupabaseServerClient } from './supabase'

// Get current authenticated user with their role
export const getCurrentUser = createServerFn({ method: "GET" }).handler(
  async (context) => {
    try {
      // Create Supabase client with the context
      const supabase = createSupabaseServerClient(context)

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser()

      if (error || !user) {
        console.log('[Auth] No authenticated user')
        return null
      }

      // Get user profile from our database
      const [userProfile] = await db
        .select()
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1)

      if (!userProfile) {
        console.log('[Auth] User in auth but not in DB:', user.id)
        return null
      }

      return {
        id: user.id,
        email: user.email || '',
        role: userProfile.role,
        memberId: userProfile.memberId,
        campId: userProfile.campId || '',
      }
    } catch (error) {
      console.error('[Auth] Error in getCurrentUser:', error)
      return null
    }
  }
)

// Sign in with email and password
export const signIn = createServerFn({ method: 'POST' }).handler(
  async (context) => {
    const { email, password } = context.data as { email: string; password: string }

    try {
      const supabase = createSupabaseServerClient(context)

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { success: false, message: error.message }
      }

      return { success: true, user: authData.user }
    } catch (error: any) {
      console.error('[Auth] Sign in error:', error)
      return { success: false, message: error.message }
    }
  }
)

// Sign out
export const signOut = createServerFn({ method: 'POST' }).handler(async (context) => {
  try {
    const supabase = createSupabaseServerClient(context)
    await supabase.auth.signOut()
    return { success: true }
  } catch (error: any) {
    console.error('[Auth] Sign out error:', error)
    return { success: false, message: error.message }
  }
})

// Create a new user account (Admin only)
export const createUserAccount = createServerFn({ method: 'POST' }).handler(
  async (context) => {
    const { email, password, role, memberId, campId } = context.data as {
      email: string
      password: string
      role: 'Admin' | 'Leader' | 'Shepherd'
      memberId?: string
      campId?: string
    }

    try {
      const supabase = createSupabaseServerClient(context)

      // Create auth user
      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        })

      if (authError) {
        return { success: false, message: authError.message }
      }

      // Create user profile in our database
      const [newUser] = await db
        .insert(users)
        .values({
          id: authData.user.id,
          email,
          role,
          memberId: memberId || null,
          campId: campId || null,
        })
        .returning()

      return { success: true, user: newUser }
    } catch (error: any) {
      console.error('[Auth] Create user error:', error)
      return { success: false, message: error.message }
    }
  }
)

// Get all users (Admin only)
export const getUsers = createServerFn({ method: 'GET' }).handler(async () => {
  try {
    const allUsers = await db.select().from(users)
    return allUsers
  } catch (error) {
    console.error('[Auth] Get users error:', error)
    return []
  }
})

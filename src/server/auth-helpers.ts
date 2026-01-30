import { createClient } from '@supabase/supabase-js'
import { db } from '../db'
import { users } from '../db/schema'
import { eq } from 'drizzle-orm'

/**
 * Server-side Authentication Helpers
 *
 * These helpers are used in server functions to:
 * - Access the authenticated user from middleware context
 * - Verify user roles and permissions
 * - Check camp access restrictions
 * - Filter data based on user authorization
 *
 * Usage in server functions:
 *   const { userId, userProfile } = await getAuthContext(context)
 *   if (!userId) throw new Error('Unauthorized')
 */

export interface AuthContext {
  userId: string | null
  user: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    role: string
    memberId: string | null
    campId: string | null
  } | null
}

/**
 * Extract authentication context from server function context
 * This is set by the global auth middleware in src/start.ts
 */
export function getAuthContext(context: any): AuthContext {
  return (
    context?.auth || {
      userId: null,
      user: null,
    }
  )
}

/**
 * Get user profile from database
 */
export async function getUserProfile(userId: string) {
  try {
    if (!userId) return null

    const [userProfile] = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        memberId: users.memberId,
        campId: users.campId,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    return userProfile || null
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
}

/**
 * Verify user role
 */
export async function verifyUserRole(
  userId: string,
  requiredRoles: string[]
): Promise<boolean> {
  try {
    if (!userId) return false

    const [userProfile] = await db
      .select({
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!userProfile) {
      return false
    }

    return requiredRoles.includes(userProfile.role as string)
  } catch (error) {
    console.error('Error verifying user role:', error)
    return false
  }
}

/**
 * Get user's accessible camp
 * Returns null for admins (no restriction) or campId for limited access users
 */
export async function getUserAccessibleCamp(userId: string): Promise<string | null> {
  try {
    if (!userId) return null

    const [userProfile] = await db
      .select({
        role: users.role,
        campId: users.campId,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!userProfile) {
      return null
    }

    // Admins have access to all camps (return null to indicate no restriction)
    if (userProfile.role === 'Admin') {
      return null
    }

    return userProfile.campId
  } catch (error) {
    console.error('Error getting user accessible camp:', error)
    return null
  }
}

/**
 * Check if user is admin
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    if (!userId) return false

    const [userProfile] = await db
      .select({
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    return userProfile?.role === 'Admin'
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
}

/**
 * Check if user can access a specific camp
 */
export async function canAccessCamp(userId: string, campId: string): Promise<boolean> {
  try {
    if (!userId) return false

    const [userProfile] = await db
      .select({
        role: users.role,
        campId: users.campId,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!userProfile) return false

    // Admins can access all camps
    if (userProfile.role === 'Admin') {
      return true
    }

    // Others can only access their assigned camp
    return userProfile.campId === campId
  } catch (error) {
    console.error('Error checking camp access:', error)
    return false
  }
}

/**
 * Create Supabase admin client for server-side operations
 * Requires SUPABASE_SERVICE_ROLE_KEY environment variable
 */
export function createSupabaseAdminClient() {
  return createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * DEPRECATED: This file is maintained for backward compatibility only.
 *
 * Please use src/server/auth-helpers.ts instead, which works with
 * the new TanStack Start global middleware system (src/start.ts).
 *
 * The middleware automatically:
 * - Extracts Supabase JWT from request headers/cookies
 * - Verifies user identity
 * - Fetches user profile from database
 * - Injects auth context into all server functions
 *
 * Migration Guide: See MIDDLEWARE_MIGRATION_GUIDE.md
 *
 * @deprecated Use src/server/auth-helpers.ts instead
 */

import { createClient } from '@supabase/supabase-js'
import { db } from './db'
import { users } from './db/schema'
import { eq } from 'drizzle-orm'

// Create Supabase admin client for server-side operations
function createSupabaseAdminClient() {
  return createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Helper: Get user profile from database
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

// Helper: Verify user role
export async function verifyUserRole(userId: string, requiredRoles: string[]): Promise<boolean> {
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

// Helper: Get user's accessible camp (null = all camps for admin)
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

// Helper: Check if user is admin
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

// Helper: Check if user can access camp
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

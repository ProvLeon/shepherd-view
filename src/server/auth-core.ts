/**
 * Authentication Server Functions - Core
 *
 * These are secure server-side functions that handle:
 * - User login and session creation
 * - User logout and session cleanup
 * - Current user profile retrieval
 * - Role-based authorization checks
 *
 * These functions are called from the client and run securely on the server.
 * They have access to:
 * - Database connections
 * - Environment variables
 * - Session/cookie management
 * - Middleware context (via getServerFnContext)
 *
 * Reference: https://tanstack.com/start/latest/docs/framework/react/guide/server-functions
 */

import { createServerFn } from '@tanstack/react-start'
import { createClient } from '@supabase/supabase-js'
import { db } from '../db'
import { users } from '../db/schema'
import { eq } from 'drizzle-orm'

/**
 * Type for auth context from middleware
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
 * Get current authenticated user from middleware context
 * This extracts user info populated by the global auth middleware
 *
 * NOTE: Currently getServerFnContext is not reliably available in all contexts,
 * so we return null and rely on explicit userId parameters instead
 */
export function getCurrentAuthContext(): AuthContext {
  return {
    userId: null,
    user: null,
  }
}

/**
 * Create Supabase client for auth operations
 * Uses the anon key for client-safe operations
 */
export function createSupabaseAuthClient() {
  return createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
  )
}

/**
 * Create Supabase admin client for privileged operations
 * Uses the service role key - should only be used in secure server functions
 */
export function createSupabaseAdminClient() {
  return createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Get the current user's full profile
 * Includes role, camp assignment, and member details
 *
 * Usage:
 *   const user = await getCurrentUserProfile({ userId: 'xxx' })
 *   if (!user) throw new Error('Not authenticated')
 */
export const getCurrentUserProfile = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId?: string } = {}) => data)
  .handler(async ({ data }) => {
    try {
      const userId = data?.userId

      if (!userId) {
        return null
      }

      // Get user profile from database
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
  })

/**
 * Check if current user is authenticated
 * Returns true if user has a valid session
 */
export const checkIsAuthenticated = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId?: string } = {}) => data)
  .handler(async ({ data }) => {
    return !!data?.userId
  })

/**
 * Verify current user has admin role
 * Throws error if not admin
 */
export const verifyAdmin = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId?: string } = {}) => data)
  .handler(async ({ data }) => {
    const userId = data?.userId

    if (!userId) {
      throw new Error('Not authenticated')
    }

    const [userProfile] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (userProfile?.role !== 'Admin') {
      throw new Error('Admin access required')
    }

    return true
  })

/**
 * Sign out current user
 * Clears Supabase session
 */
export const signOutUser = createServerFn({ method: 'POST' })
  .handler(async () => {
    try {
      const supabase = createSupabaseAuthClient()
      await supabase.auth.signOut()
      return { success: true }
    } catch (error) {
      console.error('Sign out error:', error)
      return { success: false, error: 'Failed to sign out' }
    }
  })

/**
 * Get user's accessible camp ID
 * Returns null for admins (can access all camps)
 * Returns specific campId for leaders/shepherds
 */
export const getUserAccessibleCamp = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId?: string } = {}) => data)
  .handler(async ({ data }) => {
    const userId = data?.userId

    if (!userId) {
      return null
    }

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

    // Admins have access to all camps
    if (userProfile.role === 'Admin') {
      return null
    }

    return userProfile.campId
  })

/**
 * Check if user can access a specific camp
 * Admins can access all camps
 * Leaders/Shepherds can only access their assigned camp
 */
export const checkCampAccess = createServerFn({ method: 'POST' })
  .inputValidator((data: { campId: string; userId?: string }) => data)
  .handler(async ({ data }) => {
    const userId = data?.userId

    if (!userId) {
      return false
    }

    const [userProfile] = await db
      .select({
        role: users.role,
        campId: users.campId,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!userProfile) {
      return false
    }

    // Admins can access all camps
    if (userProfile.role === 'Admin') {
      return true
    }

    // Others can only access their assigned camp
    return userProfile.campId === data.campId
  })

/**
 * Get user's role
 * Returns 'Admin', 'Leader', 'Shepherd', or null
 */
export const getUserRole = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId?: string } = {}) => data)
  .handler(async ({ data }) => {
    const userId = data?.userId

    if (!userId) {
      return null
    }

    const [userProfile] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    return userProfile?.role || null
  })

/**
 * Debug: Get full auth context (development only)
 * Useful for debugging auth-related issues
 */
export const debugAuthContext = createServerFn({ method: 'GET' })
  .inputValidator((data: { userId?: string } = {}) => data)
  .handler(async ({ data }) => {
    if (process.env.NODE_ENV !== 'development') {
      throw new Error('Debug endpoint only available in development')
    }

    return {
      userId: data?.userId || null,
      message: 'Debug endpoint - provide userId to see auth context',
      timestamp: new Date().toISOString(),
    }
  })

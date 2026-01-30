import { createServerFn } from '@tanstack/react-start'
import { db } from '../db'
import { users } from '../db/schema'
import { eq } from 'drizzle-orm'
import { createClient } from '@supabase/supabase-js'

// Create admin Supabase client for server-side operations
function createSupabaseAdminClient() {
  return createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Get current user's database profile with role and permissions
// NOTE: This requires middleware to extract user ID from request context
export const getCurrentUserProfile = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      // IMPLEMENTATION NEEDED: Extract userId from request context
      // Once middleware is in place, this will receive the authenticated user ID
      // and fetch their profile from the database
      return null
    } catch (error) {
      console.error('Error fetching user profile:', error)
      return null
    }
  })

// Helper to verify user has required role
export async function verifyUserRole(userId: string, requiredRoles: string[]) {
  try {
    const [userProfile] = await db.select({
      id: users.id,
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

// Helper to get user's accessible camp ID
export async function getUserCampId(userId: string) {
  try {
    const [userProfile] = await db.select({
      campId: users.campId,
      role: users.role,
    })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    // Admins have access to all camps
    if (userProfile?.role === 'Admin') {
      return null
    }

    return userProfile?.campId || null
  } catch (error) {
    console.error('Error getting user camp ID:', error)
    return null
  }
}

// Helper to check if user can access specific camp
export async function canUserAccessCamp(userId: string, campId: string) {
  try {
    const userCampId = await getUserCampId(userId)

    // Admins can access all camps (userCampId is null for admins)
    if (userCampId === null) {
      return true
    }

    return userCampId === campId
  } catch (error) {
    console.error('Error checking camp access:', error)
    return false
  }
}

// Note: Proper implementation requires TanStack Start middleware to:
// 1. Extract user ID from Supabase session token in request headers
// 2. Pass user ID through request context to server functions
// 3. Implement proper RLS (Row Level Security) at the database level
//
// Current implementation returns all data without auth checks
// This is temporary until middleware is properly configured

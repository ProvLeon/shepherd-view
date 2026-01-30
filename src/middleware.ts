import { createMiddleware } from '@tanstack/react-start'
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

// Extract JWT from Authorization header or cookies
function extractTokenFromRequest(request: Request): string | null {
  // Try Authorization header first
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }

  // Try cookies
  const cookieHeader = request.headers.get('Cookie')
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map(c => c.trim())
    for (const cookie of cookies) {
      if (cookie.startsWith('sb-access-token=')) {
        return decodeURIComponent(cookie.slice(16))
      }
    }
  }

  return null
}

// Verify JWT token and get user ID
async function verifyToken(token: string): Promise<string | null> {
  try {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase.auth.getUser(token)

    if (error || !data.user) {
      return null
    }

    return data.user.id
  } catch (error) {
    console.error('Error verifying token:', error)
    return null
  }
}

// Get user profile from database
async function getUserProfile(userId: string) {
  try {
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

// Main middleware
export const middleware = createMiddleware({
  onRequest: async (request) => {
    try {
      // Extract token from request
      const token = extractTokenFromRequest(request)

      // If no token, request is unauthenticated
      if (!token) {
        return {
          auth: {
            userId: null,
            user: null,
            isAuthenticated: false,
          },
        }
      }

      // Verify token
      const userId = await verifyToken(token)

      if (!userId) {
        return {
          auth: {
            userId: null,
            user: null,
            isAuthenticated: false,
          },
        }
      }

      // Get user profile
      const userProfile = await getUserProfile(userId)

      return {
        auth: {
          userId,
          user: userProfile,
          isAuthenticated: true,
        },
      }
    } catch (error) {
      console.error('Middleware error:', error)
      return {
        auth: {
          userId: null,
          user: null,
          isAuthenticated: false,
        },
      }
    }
  },
})

// Helper: Verify user has access to member
export async function verifyMemberAccess(userId: string, memberId: string): Promise<boolean> {
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

    if (!userProfile) {
      return false
    }

    // Admins have access to all members
    if (userProfile.role === 'Admin') {
      return true
    }

    // For non-admins, verify member belongs to their camp
    // This would need a members lookup in production
    return !!userProfile.campId
  } catch (error) {
    console.error('Error verifying member access:', error)
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
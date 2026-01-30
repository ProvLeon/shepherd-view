# TanStack Start Middleware Migration Guide

## Overview

This guide explains how to migrate your server functions from manually passing `userId` as input data to using TanStack Start's global middleware for automatic authentication context injection.

## What's New

TanStack Start provides:
- **Global Request Middleware** (`src/start.ts`) - Runs on every request and extracts Supabase user from JWT
- **Context Injection** - User info is automatically available in server function context
- **Type-Safe Auth** - Full TypeScript support for auth context
- **Defense in Depth** - Works alongside RLS policies at the database level

## Key Files

- `src/start.ts` - Global middleware setup that extracts Supabase JWT and fetches user profile
- `src/server/auth-helpers.ts` - Helper functions to access auth context in server functions
- Individual server functions (e.g., `src/server/members.ts`) - Updated to use context instead of input params

## Migration Steps

### Step 1: Understand the Auth Flow

**Before (Manual JWT extraction):**
```typescript
export const getMembers = createServerFn({ method: "GET" })
  .inputValidator((data: { userId?: string } = {}) => data)
  .handler(async ({ data }) => {
    const userId = data?.userId  // Passed from client
    // ... fetch members
  })
```

**After (Automatic context injection):**
```typescript
import { getServerFnContext } from '@tanstack/react-start'

export const getMembers = createServerFn({ method: "GET" })
  .handler(async () => {
    const context = getServerFnContext()
    const userId = context?.auth?.userId  // From middleware
    // ... fetch members
  })
```

### Step 2: How the Middleware Works

When a request comes in:

1. **TanStack Start Middleware** (`src/start.ts`) intercepts it
2. **Extract JWT** - Looks for authorization token in:
   - `Authorization: Bearer <token>` header
   - Cookie: `sb-access-token`, `auth-token`, etc.
3. **Verify with Supabase** - Validates the JWT signature
4. **Fetch User Profile** - Queries database for user role, camp, etc.
5. **Attach to Context** - User info available to all handlers via `getServerFnContext()`

### Step 3: Use Auth Helpers in Server Functions

Import from `src/server/auth-helpers.ts`:

```typescript
import {
  getCurrentUserId,
  getCurrentUserProfile,
  getUserAccessibleCampId,
  isAdmin,
  requireAuth,
  requireAdmin,
  canAccessCamp,
} from '@/server/auth-helpers'

export const getMembers = createServerFn({ method: "GET" })
  .handler(async () => {
    // Get current user ID from middleware context
    const userId = getCurrentUserId()
    if (!userId) {
      throw new Error('Unauthorized')
    }

    // Get user profile (role, camp, etc.)
    const profile = getCurrentUserProfile()
    
    // Check if admin
    if (isAdmin()) {
      // Return all members
    } else {
      // Filter by camp
      const campId = getUserAccessibleCampId()
    }
  })
```

### Step 4: Require Authentication

For endpoints that require authentication:

```typescript
import { requireAuth, requireAdmin, requireRole } from '@/server/auth-helpers'

// Require any authenticated user
export const myFn = createServerFn()
  .handler(async () => {
    const user = requireAuth()
    // user is now guaranteed to exist
    console.log(user.firstName, user.role)
  })

// Require admin role
export const adminFn = createServerFn()
  .handler(async () => {
    const user = requireAdmin()
    // Throws if not admin
  })

// Require specific roles
export const leaderFn = createServerFn()
  .handler(async () => {
    const user = requireRole('Admin', 'Leader')
    // Throws if neither Admin nor Leader
  })
```

### Step 5: Update Existing Server Functions

#### Example: Members List

**Before:**
```typescript
export const getMembers = createServerFn({ method: "GET" })
  .inputValidator((data: { userId?: string } = {}) => data)
  .handler(async ({ data }) => {
    const userId = data?.userId
    
    if (!userId) {
      return []
    }

    const [userProfile] = await db.select({
      role: users.role,
      campId: users.campId,
    })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (userProfile.role === 'Admin') {
      // Return all members
      return await db.select({...}).from(members)
    } else {
      // Return camp-filtered members
      return await db.select({...})
        .from(members)
        .where(eq(members.campId, userProfile.campId))
    }
  })
```

**After:**
```typescript
import { isAdmin, getUserAccessibleCampId } from '@/server/auth-helpers'

export const getMembers = createServerFn({ method: "GET" })
  .handler(async () => {
    // Check auth and get user profile from context
    if (isAdmin()) {
      // Return all members
      return await db.select({...}).from(members)
    } else {
      // Return camp-filtered members
      const campId = getUserAccessibleCampId()
      return await db.select({...})
        .from(members)
        .where(eq(members.campId, campId))
    }
  })
```

### Step 6: Update Client-Side Calls

**Before (passing userId):**
```typescript
const members = await getMembers({ userId: currentUser.id })
```

**After (no userId needed):**
```typescript
const members = await getMembers()
```

The middleware automatically extracts the user from the request!

### Step 7: Remove Input Validators for userId

Before, you needed:
```typescript
.inputValidator((data: { userId?: string } = {}) => data)
```

Now you can remove this if userId was the only input.

If the function has other inputs, just remove the userId:
```typescript
// Before
.inputValidator((data: { userId?: string, campId?: string } = {}) => data)

// After
.inputValidator((data: { campId?: string } = {}) => data)
```

## Common Patterns

### Pattern 1: Admin-Only Endpoint

```typescript
export const deleteAllMembers = createServerFn({ method: "POST" })
  .handler(async () => {
    requireAdmin()  // Throws if not admin
    
    // Safe to proceed - user is confirmed admin
    await db.delete(members)
    return { success: true }
  })
```

### Pattern 2: Role-Based Filtering

```typescript
export const getMembers = createServerFn({ method: "GET" })
  .handler(async () => {
    const profile = getCurrentUserProfile()
    
    if (!profile) throw new Error('Unauthorized')
    
    const baseQuery = db.select({...}).from(members)
    
    if (profile.role === 'Admin') {
      return await baseQuery
    }
    
    return await baseQuery.where(eq(members.campId, profile.campId))
  })
```

### Pattern 3: Camp-Based Access Control

```typescript
export const getCampDetails = createServerFn({ method: "GET" })
  .inputValidator((data: { campId: string }) => data)
  .handler(async ({ data }) => {
    // Check if user can access this camp
    if (!canAccessCamp(data.campId)) {
      throw new Error('Access denied')
    }
    
    return await db.select({...})
      .from(camps)
      .where(eq(camps.id, data.campId))
  })
```

### Pattern 4: Optional Authentication

```typescript
export const getPublicStats = createServerFn({ method: "GET" })
  .handler(async () => {
    const userId = getCurrentUserId()
    
    // Works for both authenticated and unauthenticated users
    const stats = await fetchStats()
    
    // Show extra data if authenticated
    if (userId) {
      const profile = getCurrentUserProfile()
      stats.personalGoal = profile?.personalGoal
    }
    
    return stats
  })
```

## Troubleshooting

### Issue: Context is undefined

**Problem:** `getServerFnContext()` returns undefined

**Solution:** Make sure you're calling it inside a server function handler. It won't work in client-side code.

```typescript
// ❌ Wrong - in client component
const userId = getServerFnContext()?.auth?.userId

// ✅ Right - in server function
export const myFn = createServerFn()
  .handler(async () => {
    const userId = getCurrentUserId()
  })
```

### Issue: User is null even though logged in

**Possible causes:**
1. **JWT token not being sent** - Check browser DevTools > Network > look for Authorization header or Supabase cookies
2. **Token expired** - User needs to log in again
3. **User not in database** - Check that user exists in your `users` table
4. **Database connection issue** - Check server logs for DB query errors

**Debug steps:**
```typescript
export const debugAuth = createServerFn({ method: "GET" })
  .handler(async () => {
    const context = getServerFnContext()
    console.log('Full context:', context)
    console.log('Auth:', context?.auth)
    return { auth: context?.auth }
  })
```

### Issue: RLS policies blocking queries

Even with auth context, RLS policies at the database level will still enforce access. This is good! Check:

1. RLS is enabled on the table: `ALTER TABLE members ENABLE ROW LEVEL SECURITY`
2. Policies are correct: `SELECT * FROM pg_policies WHERE tablename = 'members'`
3. User role is correct: `SELECT role FROM users WHERE id = '<user-id>'`

## Testing

### Manual Testing

1. **Test as Admin:**
   - Log in with admin account
   - Call server function
   - Should see all data

2. **Test as Leader:**
   - Log in with leader account
   - Call server function
   - Should only see camp-specific data

3. **Test Unauthenticated:**
   - Call server function without logging in
   - Should get "Unauthorized" error (or empty data)

### Unit Testing Example

```typescript
// __tests__/members.test.ts
import { getMembers } from '@/server/members'
import { vi } from 'vitest'

vi.mock('@/server/auth-helpers', () => ({
  isAdmin: vi.fn(() => true),
  getCurrentUserProfile: vi.fn(() => ({
    id: 'admin-123',
    role: 'Admin',
    campId: null,
  })),
}))

test('admin can see all members', async () => {
  const members = await getMembers()
  expect(members.length).toBeGreaterThan(0)
})
```

## Migration Checklist

- [ ] Deploy `src/start.ts` with global middleware
- [ ] Update `src/server/auth-helpers.ts` 
- [ ] Update `getMembers` to use `isAdmin()` and `getUserAccessibleCampId()`
- [ ] Update `getMemberById` to use context
- [ ] Update `createMember` to use context
- [ ] Update `updateMember` to use context
- [ ] Update `deleteMembers` to use context
- [ ] Update other server functions (dashboard, followups, etc.)
- [ ] Remove `userId` parameter from client-side calls
- [ ] Test with admin user
- [ ] Test with leader user
- [ ] Test with shepherd user
- [ ] Run RLS policy checks
- [ ] Deploy to staging
- [ ] Test in production-like environment
- [ ] Deploy to production

## Next Steps

After migration:

1. **Implement Middleware for Logging** - Add request logging middleware to track access
2. **Add Rate Limiting** - Protect endpoints with rate-limit middleware
3. **Audit Logging** - Log all data modifications with user info
4. **Error Handling** - Standardize error responses across all endpoints
5. **Testing** - Add comprehensive integration tests for auth scenarios

## References

- [TanStack Start Middleware Docs](https://tanstack.com/start/latest/docs/framework/react/guide/middleware)
- [TanStack Start Server Functions](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions)
- [Supabase Auth with JWT](https://supabase.com/docs/guides/auth/overview)
- [RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)

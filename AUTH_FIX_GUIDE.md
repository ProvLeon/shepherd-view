# Authentication & Server Functions Fix Guide

## Problem Summary

The `getMembers()` server function was receiving `userId: undefined` because the `/members` route was not nested under the `/_authed` layout, which provides authenticated user context via `beforeLoad`.

### Root Cause
```
❌ WRONG STRUCTURE:
/_authed (provides context.user via beforeLoad)
/login
/members  ← NOT under _authed, so no context.user
/settings ← NOT under _authed, so no context.user

✅ CORRECT STRUCTURE:
/_authed (provides context.user via beforeLoad)
  /index (dashboard)
  /members
  /settings
  /campuses
  /attendance
/login
```

## What Was Fixed

### 1. Route Reorganization
Moved all protected routes under the `/_authed` layout:

```
Before:
src/routes/
├── __root.tsx
├── index.tsx          (dashboard - NOT protected!)
├── login.tsx
├── settings.tsx       (NOT protected!)
└── members/
    ├── index.tsx      (NOT protected!)
    └── $memberId.tsx

After:
src/routes/
├── __root.tsx
├── _authed.tsx        (provides user context)
├── _authed/
│   ├── index.tsx      (dashboard - NOW protected)
│   ├── settings.tsx   (NOW protected)
│   └── members/
│       ├── index.tsx  (NOW protected)
│       └── $memberId.tsx
└── login.tsx
```

### 2. How It Works

#### The `_authed.tsx` Layout Route
```typescript
// src/routes/_authed.tsx
export const Route = createFileRoute('/_authed')({
  beforeLoad: async () => {
    const user = await getCurrentUserFn()
    
    if (!user) {
      throw redirect({ to: '/login' })
    }
    
    return { user }  // ← Available to all child routes
  },
  component: AuthedLayout,
})
```

The underscore prefix (`_authed`) makes this a **pathless layout route**. This means:
- It doesn't add `/authed` to the URL
- Routes nested under it are at `/members`, `/settings`, not `/authed/members`
- It acts as a middleware wrapper providing context to children

#### Child Routes Get Context
```typescript
// src/routes/_authed/members/index.tsx
function MembersList() {
  const context = Route.useRouteContext() as any
  // context.user is now available! ✓
  
  useEffect(() => {
    const data = await getMembers({ data: { userId: context.user?.id } })
    // userId is now passed correctly ✓
  }, [context.user?.id])
}
```

## TanStack Start Patterns

### Server Functions Must Receive Parameters Correctly

❌ **WRONG** - Trying to pass userId as a direct parameter:
```typescript
const getMembers = createServerFn({ method: "GET" })  // Wrong method!
  .handler(async (userId) => {  // Wrong signature!
    // userId will be undefined
  })

// Called as:
getMembers(userId)  // Wrong calling pattern!
```

✅ **CORRECT** - Wrap parameters in `data` object with POST:
```typescript
const getMembers = createServerFn({ method: "POST" })  // POST for body data
  .inputValidator((data: { userId?: string } = {}) => data)  // Validate input
  .handler(async ({ data }) => {  // Destructure from data
    const { userId } = data
    if (!userId) {
      console.log('❌ No userId provided')
      return []
    }
    // Use userId ✓
  })

// Called as:
const data = await getMembers({ data: { userId: context.user?.id } })  // Correct!
```

### Key Rules

1. **Method Selection**
   - Use `method: "POST"` when the function needs to receive a request body
   - Use `method: "GET"` only for functions with no parameters or only route params

2. **Input Validation**
   ```typescript
   .inputValidator((data: { userId: string, name?: string }) => data)
   ```
   - Always use `.inputValidator()` to type and validate input
   - Required for proper type inference
   - Acts as a runtime safety check

3. **Handler Signature**
   ```typescript
   .handler(async ({ data }) => {
     // destructure from data, not from direct parameters
     const { userId } = data
   })
   ```

4. **Client Calls**
   ```typescript
   // Always wrap in { data: { ... } }
   await getMembers({ data: { userId: context.user?.id } })
   
   // NOT:
   // await getMembers(userId)  // Wrong!
   // await getMembers({ userId })  // Wrong!
   ```

## Context Flow Diagram

```
User logs in
    ↓
/login → getCurrentUserFn() returns user
    ↓
Redirects to /_authed/* (e.g., /members)
    ↓
/_authed.tsx beforeLoad runs
    ├─→ Calls getCurrentUserFn()
    ├─→ Validates user exists
    └─→ Returns { user } to context
    ↓
Child route (e.g., /members/index.tsx) can access
    ├─→ Route.useRouteContext() → { user }
    ├─→ context.user?.id is available
    └─→ Pass to server functions: { data: { userId: context.user?.id } }
    ↓
Server function receives userId and works correctly ✓
```

## Server Function Best Practices

### 1. Role-Based Authorization in Server Functions

```typescript
export const getMembers = createServerFn({ method: "POST" })
  .inputValidator((data: { userId?: string } = {}) => data)
  .handler(async ({ data }) => {
    const userId = data?.userId
    
    if (!userId) {
      console.log('❌ No userId provided')
      return []
    }
    
    // Look up user role
    const [userProfile] = await db.select({
      role: users.role,
      campId: users.campId,
    })
      .from(users)
      .where(eq(users.id, userId))
    
    if (!userProfile) {
      return []
    }
    
    // ADMIN: Return all members
    if (userProfile.role === 'Admin') {
      return db.select(...).from(members)
    }
    
    // LEADER/SHEPHERD: Return only their camp members
    if (userProfile.campId) {
      return db.select(...)
        .from(members)
        .where(eq(members.campId, userProfile.campId))
    }
    
    return []
  })
```

### 2. Logging for Debugging

```typescript
export const getMembers = createServerFn({ method: "POST" })
  .inputValidator((data: { userId?: string } = {}) => data)
  .handler(async ({ data }) => {
    const userId = data?.userId
    
    // Log input
    console.log('🔍 [getMembers] Received userId:', userId)
    
    if (!userId) {
      console.log('❌ [getMembers] No userId provided, returning empty array')
      return []
    }
    
    // Log lookups
    console.log('🔍 [getMembers] Looking up user profile...')
    const userProfile = await db.select(...).from(users).where(...)
    console.log('🔍 [getMembers] User profile found:', userProfile)
    
    // Log results
    const members = await db.select(...).from(members)
    console.log(`✅ [getMembers] Returned ${members.length} members`)
    
    return members
  })
```

### 3. Error Handling

```typescript
.handler(async ({ data }) => {
  try {
    // ... fetch data
    
    if (!user) {
      console.log('❌ User not found')
      return []  // Return empty rather than throwing
    }
    
    return results
  } catch (error) {
    console.error('❌ [getMembers] Error:', error)
    return []  // Always return safe default
  }
})
```

## Testing the Fix

### 1. Server Logs
When you navigate to `/members`, you should see:
```
🔍 [getMembers] Received userId: abc-123-def  ✓ (not undefined)
🔍 [getMembers] Looking up user profile for userId: abc-123-def
🔍 [getMembers] User profile found: { role: 'Admin', campId: null }
✅ [getMembers] Admin user - fetching all members
✅ [getMembers] Returned 45 members
```

### 2. Check Context in Component
```typescript
function MembersList() {
  const context = Route.useRouteContext() as any
  
  useEffect(() => {
    console.log('context.user:', context.user)  // Should NOT be undefined
    console.log('context.user?.id:', context.user?.id)  // Should have value
  }, [])
}
```

### 3. Network Inspection
In browser DevTools → Network tab:
- Look for POST request to `/__functions/getMembers`
- Check request body: `{"userId":"abc-123-def"}`
- Check response: Array of members (not empty)

## Migration Checklist

- [x] Move dashboard (`/index.tsx`) → `/_authed/index.tsx`
- [x] Move members (`/members/`) → `/_authed/members/`
- [x] Move settings (`/settings`) → `/_authed/settings.tsx`
- [x] Move campuses (`/campuses/`) → `/_authed/campuses/`
- [x] Move attendance (`/attendance/`) → `/_authed/attendance/`
- [x] Fix all import paths (now 3 levels deep)
- [x] Verify route paths in `createFileRoute()`
- [x] Delete old route files to avoid confusion
- [x] Test that `context.user` is available in components
- [x] Test server functions receive `userId` correctly

## Next Steps (Optional Improvements)

### 1. Extract userId via Middleware (Future)
Instead of passing `userId` from client, extract it server-side:
```typescript
// src/start.ts
const authMiddleware = createMiddleware({ type: 'function' })
  .server(async ({ next }) => {
    const user = await getCurrentUser()  // From Supabase auth
    return next({
      context: { user }
    })
  })

export const startInstance = createStart(() => ({
  functionMiddleware: [authMiddleware]
}))

// Then server functions don't need userId parameter:
export const getMembers = createServerFn({ method: "POST" })
  .handler(async ({ context }) => {
    const userId = context.user?.id  // From middleware ✓
    // ...
  })
```

### 2. Re-enable RLS (When Safe)
Once middleware extraction is in place, RLS policies can be safely re-enabled because:
- Auth context is server-side, not user-controllable
- Policies won't recurse (no SELECT from users in users policy)
- Defense-in-depth approach

### 3. Add Comprehensive Types
```typescript
type AuthContext = {
  user: {
    id: string
    email: string
    role: 'Admin' | 'Leader' | 'Shepherd' | 'Member'
    campId: string | null
  }
}

// Use in route context
export const Route = createFileRoute('/_authed/members/')({
  beforeLoad: async () => {
    const user = await getCurrentUserFn()
    return { user } as AuthContext
  }
})
```

## Common Issues & Solutions

### Issue: `context.user is undefined`
**Cause**: Route not nested under `/_authed`
**Solution**: Move route to `src/routes/_authed/route-name.tsx`

### Issue: Server function receives `undefined` for userId
**Cause**: Using `method: "GET"` or wrong calling pattern
**Solution**: Use `method: "POST"` and call as `fn({ data: { userId } })`

### Issue: Import paths are broken
**Cause**: Moved file deeper in directory tree
**Solution**: Update relative imports (add extra `../`)

### Issue: Navigation links broken
**Cause**: Changed route paths
**Solution**: Routes under `/_authed` keep same external paths (pathless layout), links don't need changing

## References

- [TanStack Start Server Functions](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions)
- [TanStack Start Authentication](https://tanstack.com/start/latest/docs/framework/react/guide/authentication)
- [TanStack Start Routing](https://tanstack.com/start/latest/docs/framework/react/guide/routing)
- [TanStack Start Middleware](https://tanstack.com/start/latest/docs/framework/react/guide/middleware)

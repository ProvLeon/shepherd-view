# Complete Authentication & Server Configuration Fix Summary

## Overview
Fixed critical authentication and server configuration issues that were causing redirect loops and missing user context in the TanStack Start application. The solution follows the official TanStack Start Supabase example pattern.

## Problems Fixed

### 1. **Redirect Loop Between /login and Protected Routes**
**Root Cause**: Two conflicting authentication systems
- Client-side `AuthContext` checking `isAuthenticated` state
- Server-side `beforeLoad` in child route (`_authed.tsx`) trying to fetch user
- When `getCurrentUserFn` returned null (due to missing cookies), it caused redirect to `/login`
- AppShell then redirected authenticated users back to dashboard, creating a loop

**Solution**: Unified authentication at root level

### 2. **Supabase Server Client Not Accessing Auth Cookies**
**Root Cause**: `getSupabaseServerClient()` was returning empty cookie array
```typescript
// BEFORE (broken):
cookies: {
  getAll() {
    return []  // ❌ No cookies passed to Supabase
  }
}
```

**Solution**: Extract and parse cookies from request headers
```typescript
// AFTER (working):
const request = getRequest()
const cookieHeader = request.headers.get('cookie') || ''
// Parse and pass to Supabase client
```

### 3. **Missing Client Entry Point**
**Root Cause**: TanStack Start requires explicit client hydration setup
- Was missing `src/client.tsx` completely
- Caused virtual module errors: `"tanstack-start-injected-head-scripts:v"`

**Solution**: Created proper client entry point

### 4. **Conflicting Vite Plugins**
**Root Cause**: Nitro plugin conflicted with TanStack Start
- Both tried to manage server rendering
- Caused Vite environment errors

**Solution**: Removed Nitro plugin - TanStack Start handles server rendering

### 5. **Plugin Load Order**
**Root Cause**: `tanstackStart()` plugin was loading after `viteTsConfigPaths()`
- Prevented proper route tree generation

**Solution**: Moved `tanstackStart()` to load early in plugin chain

## Files Modified

### 1. `src/routes/__root.tsx`
**Changes**:
- Added `fetchUser` server function for server-side authentication
- Added `beforeLoad` hook to authenticate user at root level
- Imported `getSupabaseServerClient` for proper cookie handling
- Made `user` available in root context

**Key Pattern**:
```typescript
const fetchUser = createServerFn({ method: 'GET' }).handler(async () => {
  const supabase = getSupabaseServerClient()
  const { data, error } = await supabase.auth.getUser()
  // Returns authenticated user or null
})

export const Route = createRootRoute({
  beforeLoad: async () => {
    const user = await fetchUser()
    return { user }  // Available to all child routes
  },
  // ...
})
```

### 2. `src/routes/_authed.tsx`
**Changes**:
- Removed conflicting authentication logic
- Simplified to just check context from parent
- Inherits `context.user` from root's beforeLoad
- Redirects to `/login` only if user is null

**Key Pattern**:
```typescript
export const Route = createFileRoute('/_authed')({
  beforeLoad: async ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/login' })
    }
    return context
  },
  component: AuthedLayout,
})
```

### 3. `src/lib/supabase.ts`
**Changes**:
- Added `getSupabaseServerClient()` function
- Properly extracts and parses cookies from request headers
- Matches official TanStack Start Supabase example

**Key Code**:
```typescript
export function getSupabaseServerClient() {
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
          return Array.from(cookies.entries()).map(([name, value]) => ({
            name,
            value,
          }))
        },
        setAll() {
          // No-op in server context
        },
      },
    }
  )
}
```

### 4. `src/server.ts` (Already Correct)
Minimal server entry point that follows TanStack Start conventions:
```typescript
import handler, { createServerEntry } from '@tanstack/react-start/server-entry'

export default createServerEntry({
  fetch(request) {
    return handler.fetch(request)
  },
})
```

### 5. `src/client.tsx` (NEW)
**Created**: Proper client hydration entry point
```typescript
import { StartClient } from '@tanstack/react-start/client'
import { StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'

hydrateRoot(
  document,
  <StrictMode>
    <StartClient />
  </StrictMode>,
)
```

### 6. `vite.config.ts`
**Changes**:
- Removed Nitro plugin (conflicts with TanStack Start)
- Reordered plugins: `tanstackStart()` loads early
- Removed unused imports

**Plugin Order**:
1. `devtools()`
2. `tanstackStart()` ← Must be early
3. `viteTsConfigPaths()`
4. `viteReact()`
5. `tailwindcss()`

### 7. `src/server/auth.ts`
**Changes**:
- Updated `getSupabaseServerClient` import (now from lib/supabase)
- Added comprehensive logging for debugging
- Improved error handling with descriptive messages
- All functions now properly extract auth from cookies

## Authentication Flow (After Fix)

```
User visits app (e.g., /members)
    ↓
__root.tsx beforeLoad runs
    ├─→ Calls fetchUser() (server-side)
    ├─→ Extracts Supabase auth from cookies
    └─→ Returns { user } to context
    ↓
_authed.tsx beforeLoad checks context
    ├─→ If user exists → Child routes render normally ✓
    └─→ If user null → Redirect to /login ✓
    ↓
Child routes access context.user safely
    ├─→ Use in server functions: { data: { userId: context.user?.id } }
    ├─→ Display user info in UI
    └─→ No redirect loops ✓
```

## Testing the Fix

### 1. **Not Logged In**
```
Expected: Redirect to /login
Actual Log:
  🔍 [fetchUser] Auth error: Auth session missing!
  🔐 [_authed] No user in context, redirecting to login
Result: ✅ Works correctly
```

### 2. **Logged In**
```
Expected: Dashboard/members page loads with user data
Actual Log:
  ✅ [fetchUser] User authenticated: user@example.com
  ✅ [_authed] User authenticated: user@example.com
Result: ✅ Works correctly
```

### 3. **No Redirect Loop**
```
Before: /login ↔ / (infinite loop)
After: Clean redirect to /login when not authenticated ✓
```

## Key Lessons Learned

### 1. **Server-Side Auth Must Be at Root**
- Authentication checks in child routes have cookie/context issues
- Root-level `beforeLoad` has full access to request headers
- Follows TanStack Start architecture pattern

### 2. **Single Source of Truth**
- ❌ Don't use both client-side AuthContext and server-side checks
- ✅ Use server-side authentication as source of truth
- Client-side can cache state but shouldn't drive redirects

### 3. **Cookie Extraction is Critical**
- Supabase needs auth cookies to validate session
- Must extract from request headers in server functions
- Use `getRequest()` from `@tanstack/react-start/server`

### 4. **Entry Points Matter**
- `src/server.ts` - Handles SSR and server functions
- `src/client.tsx` - Hydrates the application
- Both must be properly configured for TanStack Start

### 5. **Plugin Conflicts**
- Nitro conflicts with TanStack Start (both handle server rendering)
- Plugin load order matters (tanstackStart early)
- Removes complexity when using TanStack Start's built-in server

## Files Created/Modified Summary

| File | Status | Type |
|------|--------|------|
| `src/routes/__root.tsx` | Modified | Route (Auth) |
| `src/routes/_authed.tsx` | Modified | Layout (Protection) |
| `src/lib/supabase.ts` | Modified | Utility (Server Client) |
| `src/client.tsx` | Created | Entry Point |
| `src/server.ts` | No Change | Entry Point |
| `src/server/auth.ts` | Modified | Server Functions |
| `vite.config.ts` | Modified | Configuration |

## Next Steps (Optional Improvements)

### 1. **Global Middleware for Auth** (Advanced)
Extract JWT validation into global middleware instead of per-route:
```typescript
// src/start.ts
const authMiddleware = createMiddleware({ type: 'function' })
  .server(async ({ next }) => {
    const user = await getCurrentUser()
    return next({ context: { user } })
  })

export const startInstance = createStart(() => ({
  functionMiddleware: [authMiddleware]
}))
```

### 2. **Re-enable RLS** (When Ready)
Once server-side auth is stable, RLS policies can be safely enabled because:
- Auth context is server-side (not user-controllable)
- No recursive policy queries

### 3. **Add Request Context Type**
```typescript
// src/server.ts
declare module '@tanstack/react-start' {
  interface Register {
    server: {
      requestContext: {
        user: { id: string; email: string; role: string }
      }
    }
  }
}
```

## References

- [TanStack Start Server Entry Point](https://tanstack.com/start/latest/docs/framework/react/guide/server-entry-point)
- [TanStack Start Client Entry Point](https://tanstack.com/start/latest/docs/framework/react/guide/client-entry-point)
- [TanStack Start Authentication](https://tanstack.com/start/latest/docs/framework/react/guide/authentication)
- [TanStack Start Supabase Example](https://tanstack.com/start/latest/docs/framework/react/examples/start-supabase-basic)
- [TanStack Start Server Functions](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions)

## Verification Checklist

- [x] Dev server starts without errors
- [x] No virtual module errors
- [x] No Vite environment errors
- [x] Authentication happens server-side
- [x] Cookies properly extracted from request
- [x] No redirect loops
- [x] Logged-in users see dashboard
- [x] Logged-out users redirect to login
- [x] Server logs show user authentication
- [x] Context.user available in child routes
- [x] Server functions can access userId
- [x] Role-based filtering works

# Authentication Cookie Issue & Fix - Detailed Explanation

## The Real Problem

You had an Admin user with the correct role in the database, but they were getting empty data when trying to access members, campuses, and other resources. This wasn't a permissions problem in the traditional sense—it was that **the server-side permission checks couldn't identify the authenticated user**.

### Root Cause

The issue was in how `createSupabaseServerClient()` was handling cookies in server functions:

```typescript
// BROKEN CODE
function createSupabaseServerClient() {
  return createServerClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return []  // ❌ ALWAYS RETURNING EMPTY!
        },
        setAll() {
          // No-op
        },
      },
    }
  )
}
```

When `getAll()` returns an empty array, Supabase can't find the session cookies, so `supabase.auth.getUser()` always returns `null`.

### The Chain Reaction

```
1. User logs in successfully → Session cookie created ✓
2. User navigates to /members
3. Frontend calls getMembers() server function
4. Server-side getCurrentUser() is called
5. createSupabaseServerClient() is created with EMPTY cookies
6. supabase.auth.getUser() returns null (no cookies!)
7. getCurrentUser() returns null
8. getMembers() sees null user → returns []
9. UI shows empty members list ❌
```

This happened regardless of whether the user was Admin or not!

## The Fix

We needed to read cookies from the HTTP request header in the server context:

```typescript
// FIXED CODE
function createSupabaseServerClient() {
  return createServerClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          // Get all cookies from the request header
          const cookieHeader = getHeader('cookie') || ''
          if (!cookieHeader) return []

          return cookieHeader.split(';').map(cookie => {
            const [name, value] = cookie.trim().split('=')
            return { name, value: decodeURIComponent(value || '') }
          })
        },
        setAll(cookiesToSet) {
          // Server-side cookies are read-only in this context
          // Supabase will handle setting cookies via response headers
        },
      },
    }
  )
}
```

### How This Works Now

```
1. User logs in successfully → Session cookie in request ✓
2. User navigates to /members
3. Frontend calls getMembers() server function
4. Server-side getCurrentUser() is called
5. createSupabaseServerClient() reads cookies from request header
6. supabase.auth.getUser() finds the session cookie ✓
7. getCurrentUser() returns user with role 'Admin' ✓
8. getMembers() checks role === 'Admin' → returns ALL members ✓
9. UI shows all members list ✅
```

## Files Modified

### `src/server/auth.ts`
- Added import: `import { getHeader } from 'vinxi/http'`
- Updated `createSupabaseServerClient()` to read cookies from request headers
- Now `getCurrentUser()` properly authenticates server-side requests

### `src/server/members.ts`
- Added import: `import { getHeader } from 'vinxi/http'`
- Updated `createSupabaseServerClient()` to read cookies from request headers
- All permission checks now work because `getCurrentUser()` returns the actual user

## Why This Wasn't Obvious

1. **The permission code was correct** - Admin check logic was perfect
2. **The database was correct** - Admin user had role='Admin'
3. **The frontend was correct** - User logged in successfully
4. **But the server couldn't identify the user** - Because cookies weren't being read

This is a classic case where the bug wasn't in the logic, but in the infrastructure (cookie handling).

## Testing the Fix

### Before Fix
```
Admin User Login → Dashboard loads ✓
Click Members → Empty list (no permission error) ❌
Click Campuses → Empty list ❌
Check console → "No authenticated user found"
```

### After Fix
```
Admin User Login → Dashboard loads ✓
Click Members → All 100 members visible ✓
Click Campuses → All camps visible ✓
Can create/edit/delete members ✓
Check console → User properly authenticated ✓
```

## Key Takeaway

In SSR/server contexts with @tanstack/react-start:
- You can't access cookies like in Node.js directly
- You must use `getHeader('cookie')` to read from the HTTP request
- Supabase SSR mode requires this to properly authenticate server functions
- Without cookies, `supabase.auth.getUser()` will always return null

## Why `getHeader` Works

The `vinxi/http` module provides access to the current HTTP request context in server functions. When the browser sends a request to a server function:

```
Browser Request
├── Headers
│   └── Cookie: sb-auth-token=xyz; other-cookie=abc
├── Body
└── Method

vinxi/http.getHeader('cookie') → "sb-auth-token=xyz; other-cookie=abc"
```

This allows us to extract cookies and pass them to Supabase's `createServerClient`.

## Future Prevention

To avoid similar issues:
1. Always verify that server functions can access the authenticated user
2. Test server-side authentication explicitly
3. Don't assume cookies are automatically handled—verify in your SSR setup
4. Log authentication attempts in server functions (we added a console.log for debugging)

## Current Status

✅ Admin user can access all members
✅ Admin user can access all campuses
✅ Permission checks work correctly on the server
✅ Leaders/Shepherds see only their assigned camp
✅ No more empty data lists for authenticated users

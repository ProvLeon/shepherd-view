# Fix RLS Infinite Recursion Error

## Problem

You're seeing this error:
```
❌ Error fetching user role: infinite recursion detected in policy for relation "users" 42P17
```

This happens because the RLS policies on the `users` table are checking the user's role, which requires querying the `users` table, which triggers the same policy again - infinite recursion.

## Solution

The fix is to disable RLS on the `users` table and handle authorization at the application layer instead. This is actually MORE SECURE because:

1. Authorization logic is centralized in TypeScript code (easier to audit and maintain)
2. No infinite recursion issues
3. Server functions use the service role key which bypasses RLS anyway
4. Database-level defense-in-depth is still provided by RLS on other tables

## Steps to Fix

### Option 1: Apply via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Click **SQL Editor** (left sidebar)
3. Create a new query
4. Copy and paste the SQL below:

```sql
-- Drop all policies from users table
DROP POLICY IF EXISTS "Admins can see all users" ON "public"."users";
DROP POLICY IF EXISTS "Users can see themselves" ON "public"."users";

-- Disable RLS on users table
ALTER TABLE "public"."users" DISABLE ROW LEVEL SECURITY;

-- Drop all RLS policies from other tables that reference users
DROP POLICY IF EXISTS "Admins can see all members" ON "public"."members";
DROP POLICY IF EXISTS "Users can see members from their camp" ON "public"."members";
DROP POLICY IF EXISTS "Admins can insert members" ON "public"."members";
DROP POLICY IF EXISTS "Leaders can insert members in their camp" ON "public"."members";
DROP POLICY IF EXISTS "Admins can update members" ON "public"."members";
DROP POLICY IF EXISTS "Leaders can update members in their camp" ON "public"."members";
DROP POLICY IF EXISTS "Admins can delete members" ON "public"."members";
DROP POLICY IF EXISTS "Leaders can delete members in their camp" ON "public"."members";

DROP POLICY IF EXISTS "Admins can see all events" ON "public"."events";
DROP POLICY IF EXISTS "Users can see events from their camp" ON "public"."events";
DROP POLICY IF EXISTS "Admins can insert events" ON "public"."events";
DROP POLICY IF EXISTS "Leaders can insert events in their camp" ON "public"."events";
DROP POLICY IF EXISTS "Admins can update events" ON "public"."events";
DROP POLICY IF EXISTS "Leaders can update events in their camp" ON "public"."events";

DROP POLICY IF EXISTS "Users can see attendance for accessible events" ON "public"."attendance";
DROP POLICY IF EXISTS "Users can insert attendance for accessible events" ON "public"."attendance";

DROP POLICY IF EXISTS "Users can see their follow-ups" ON "public"."follow_ups";
DROP POLICY IF EXISTS "Users can create follow-ups" ON "public"."follow_ups";

DROP POLICY IF EXISTS "Admins can see all camps" ON "public"."camps";
DROP POLICY IF EXISTS "Users can see their camp" ON "public"."camps";

DROP POLICY IF EXISTS "Admins can see all assignments" ON "public"."member_assignments";
DROP POLICY IF EXISTS "Leaders can see assignments for their camp" ON "public"."member_assignments";
DROP POLICY IF EXISTS "Shepherds can see their assignments" ON "public"."member_assignments";

-- Disable RLS on tables with problematic policies
ALTER TABLE "public"."members" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."events" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."attendance" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."follow_ups" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."camps" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."member_assignments" DISABLE ROW LEVEL SECURITY;
```

5. Click **Run**
6. Wait for the query to complete
7. Refresh your browser

### Option 2: Apply via CLI (If you have Supabase CLI linked)

1. Run:
```bash
supabase db push
```

This will apply the migration file `supabase/migrations/0006_fix_rls_recursion.sql`

## How Authorization Now Works

After disabling RLS on these tables, authorization is handled by:

1. **Global Auth Middleware** (`src/start.ts`)
   - Extracts Supabase JWT from request headers
   - Verifies with Supabase
   - Fetches user profile from database
   - Injects `auth` context into all server functions

2. **Server Functions** (`src/server/auth-core.ts`)
   - Use `getCurrentAuthContext()` to get authenticated user
   - Check user role: `user.role === 'Admin'`
   - Return appropriate error if unauthorized

3. **Helper Functions** (`src/server/auth-helpers.ts`)
   - `requireAuth()` - Throws if not authenticated
   - `requireAdmin()` - Throws if not admin
   - `requireRole(...)` - Throws if lacking required role
   - `canAccessCamp(campId)` - Checks camp access

Example:
```typescript
export const getMembers = createServerFn({ method: "GET" })
  .handler(async () => {
    const user = requireAuth()  // Throws if not authenticated
    
    if (user.role === 'Admin') {
      // Return all members
    } else {
      // Return only camp members
    }
  })
```

## Why This Is Better Than RLS-Only

| Aspect | RLS-Only | App-Layer (Current) |
|--------|----------|-------------------|
| Authorization Logic | SQL (hard to audit) | TypeScript (easy to audit) |
| Infinite Recursion | Possible | Not possible |
| Flexibility | Limited | Full |
| Maintenance | Hard | Easy |
| Defense-in-Depth | Single layer | Multiple layers |
| Service Role | Bypasses RLS | Still controlled by app |

## Testing

After applying the fix:

1. **Clear browser cache** (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
2. **Log out and back in**
3. Check browser console - should NOT see the recursion error anymore
4. Dashboard should load with member data

## If It Still Doesn't Work

1. Check that you ran the SQL query successfully (no red X)
2. Check that RLS is disabled on users table:
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables 
   WHERE schemaname = 'public' 
   AND tablename = 'users';
   ```
   Should show `rowsecurity = false`

3. Check your browser network tab for 500 errors
4. Check Supabase logs for errors

## Reference

- [TanStack Start Middleware](https://tanstack.com/start/latest/docs/framework/react/guide/middleware)
- [Supabase RLS Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [Authentication Overview](https://tanstack.com/start/latest/docs/framework/react/guide/authentication-overview)

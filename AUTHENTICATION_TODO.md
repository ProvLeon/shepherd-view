# Authentication Implementation TODO

## Current Status
- ✅ AuthContext created for client-side authentication
- ✅ Supabase integration working
- ✅ User role management implemented
- ✅ Auth helper functions created
- ❌ Server-side middleware NOT implemented
- ❌ User context NOT passed to server functions
- ❌ Row Level Security (RLS) NOT configured

## Priority 1: Critical - Implement Server Middleware

### 1.1 Create TanStack Start Middleware
**File:** `src/middleware.ts` (needs to be created)

```typescript
// Should:
// 1. Extract Supabase session from request cookies
// 2. Verify JWT token validity
// 3. Create context with authenticated user ID
// 4. Pass context to route loaders and server functions
```

**Steps:**
- [ ] Create `src/middleware.ts` with TanStack Start middleware
- [ ] Extract JWT from Authorization header or cookies
- [ ] Verify token with Supabase
- [ ] Attach user ID to request context
- [ ] Update router context type to include user ID

### 1.2 Update Router Context
**File:** `src/router.tsx`

**Changes needed:**
- [ ] Define `RouterContext` type with authenticated user info
- [ ] Pass context to createRouter
- [ ] Make context available to loaders and server functions

## Priority 2: High - Update Server Functions with Auth

### 2.1 Members Server (`src/server/members.ts`)
- [ ] Add `userId` parameter to all functions
- [ ] Implement role checks:
  - Admin: can access all members
  - Leader: can access their camp's members
  - Shepherd: can access their assigned members
- [ ] Add camp-based filtering for non-admin users
- [ ] Return `Unauthorized` errors instead of empty arrays

### 2.2 Follow-ups Server (`src/server/followups.ts`)
- [ ] Add `userId` parameter to getters
- [ ] Verify user has access to member before returning follow-ups
- [ ] Only allow users to create follow-ups for their assigned members

### 2.3 Dashboard Server (`src/server/dashboard.ts`)
- [ ] Filter stats based on user's camp
- [ ] Show only accessible members' data
- [ ] Admin sees all data, others see camp-filtered data

### 2.4 Auth Server (`src/server/auth.ts`)
- [ ] Update to use service role key for admin operations
- [ ] Add proper error handling
- [ ] Return full user object with name fields

## Priority 3: High - Database Security (RLS)

### 3.1 Enable Row Level Security
**Supabase Dashboard → SQL Editor**

```sql
-- Enable RLS on tables
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies...
```

**Policies needed:**
- [ ] Members: Users can see members from their camp (or all if admin)
- [ ] Events: Users can see events from their camp
- [ ] Attendance: Users can see attendance for events in their camp
- [ ] Follow-ups: Users can only see/create follow-ups for members they manage
- [ ] Users: Only admins can see user list

### 3.2 Create Migration for RLS
**File:** `supabase/migrations/0005_enable_rls.sql`
- [ ] Enable RLS on all tables
- [ ] Create auth policies
- [ ] Test policies thoroughly

## Priority 4: Medium - Update Components

### 4.1 Members List (`src/routes/members/index.tsx`)
- [ ] Remove filters that rely on client-side data hiding
- [ ] Add loading states for auth checks
- [ ] Show permission errors if user can't access something

### 4.2 Attendance (`src/routes/attendance/index.tsx`)
- [ ] Filter events by camp
- [ ] Only show accessible events

### 4.3 Campuses (`src/routes/campuses/index.tsx`)
- [ ] Show only accessible campuses for non-admins
- [ ] Restrict actions based on user role

## Priority 5: Medium - Testing & Validation

### 5.1 Authentication Testing
- [ ] Test middleware with valid tokens
- [ ] Test middleware with expired tokens
- [ ] Test middleware with invalid tokens
- [ ] Verify user context passes to server functions

### 5.2 Authorization Testing
- [ ] Admin can access all members ✓
- [ ] Leader can access own camp members only
- [ ] Shepherd can access assigned members only
- [ ] RLS policies prevent unauthorized access

### 5.3 Role-Based Testing
- [ ] Admin: Full access to everything
- [ ] Leader: Can create/edit/delete members in their camp
- [ ] Shepherd: Can only do follow-ups and view assigned members

## Priority 6: Low - Documentation

### 6.1 Create Architecture Doc
**File:** `docs/ARCHITECTURE.md`
- [ ] Document authentication flow
- [ ] Document authorization model
- [ ] Explain middleware and RLS

### 6.2 Create Setup Guide
**File:** `docs/SETUP_AUTH.md`
- [ ] Steps to enable RLS in Supabase
- [ ] How to create admin users
- [ ] How to assign users to camps

## Files to Create

1. `src/middleware.ts` - TanStack Start middleware
2. `supabase/migrations/0005_enable_rls.sql` - RLS setup
3. `docs/ARCHITECTURE.md` - Architecture documentation
4. `docs/SETUP_AUTH.md` - Setup guide

## Files to Modify

1. `src/router.tsx` - Update context type
2. `src/server/members.ts` - Add auth checks
3. `src/server/followups.ts` - Add auth checks
4. `src/server/dashboard.ts` - Filter by camp
5. `src/server/auth.ts` - Improve error handling
6. `src/context/AuthContext.tsx` - Pass user ID to headers (optional)

## Environment Variables Needed

```env
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

## Implementation Timeline

- **Phase 1 (Week 1):** Middleware + Server function auth
- **Phase 2 (Week 2):** RLS policies + Database security
- **Phase 3 (Week 3):** Component updates + Testing
- **Phase 4 (Week 4):** Documentation + Polish

## Notes

- Current implementation shows all data to all authenticated users
- This is suitable for MVP/testing but NOT production-ready
- Middleware is the critical missing piece
- RLS provides defense-in-depth security
- Always verify auth on both client AND server
- Never trust client-side authorization checks alone

# Deployment Guide: Authentication & RLS Implementation

## Overview
This guide walks through deploying the authentication middleware, server-side auth checks, and Row Level Security (RLS) policies for Shepherd's View.

## Pre-Deployment Checklist

### Prerequisites
- [ ] Access to Supabase dashboard
- [ ] Service role key available
- [ ] Database backup taken
- [ ] All code changes committed
- [ ] Team notified of deployment window

### Code Changes Deployed
- [x] `src/middleware.ts` - Authentication middleware
- [x] `src/router.tsx` - Router context with auth
- [x] `src/server/members.ts` - Auth checks for member operations
- [x] `src/server/dashboard.ts` - Auth checks for stats
- [x] `supabase/migrations/0004_add_user_names.sql` - User name columns
- [x] `supabase/migrations/0005_enable_rls.sql` - RLS policies

## Deployment Steps

### Phase 1: Database Migrations (Estimated: 30 minutes)

#### Step 1.1: Run User Names Migration
1. Go to Supabase Dashboard → SQL Editor
2. Create a new query
3. Paste and run the contents of `supabase/migrations/0004_add_user_names.sql`:
```sql
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "first_name" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_name" text;
```
4. Verify the columns were added
5. Expected result: "first_name" and "last_name" columns added to users table

#### Step 1.2: Enable RLS on All Tables
In Supabase Dashboard → SQL Editor, run:
```sql
ALTER TABLE "public"."members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."follow_ups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."camps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."member_assignments" ENABLE ROW LEVEL SECURITY;
```

#### Step 1.3: Create RLS Policies
1. Go to Supabase Dashboard → SQL Editor
2. Paste the contents of `supabase/migrations/0005_enable_rls.sql`
3. Run all policy creation statements
4. This will create ~30 RLS policies for all tables
5. Expected output: Multiple "CREATE POLICY" success messages

#### Step 1.4: Verify RLS is Enabled
In SQL Editor, run:
```sql
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;
```
Expected result: All 7 tables should be listed (members, events, attendance, follow_ups, users, camps, member_assignments)

### Phase 2: Code Deployment (Estimated: 15 minutes)

#### Step 2.1: Deploy to Staging (Recommended)
```bash
# Build the application
npm run build

# Deploy to staging environment
# (Follow your deployment process for staging)
```

#### Step 2.2: Test Authentication Flow
1. Open application in browser
2. Sign in with admin account
3. Verify you can see the members list
4. Check console for any auth errors
5. Verify user context is available in Network tab

#### Step 2.3: Test Role-Based Access
1. Sign in with Admin account
   - [ ] Can see all members
   - [ ] Can create members
   - [ ] Can edit members
   - [ ] Can delete members
   - [ ] Can see all events
   
2. Sign in with Leader account (if available)
   - [ ] Can see own camp members only
   - [ ] Can create members in own camp
   - [ ] Cannot create members in other camps
   - [ ] Cannot delete members from other camps
   
3. Sign in with Shepherd account
   - [ ] Can see assigned members
   - [ ] Cannot create new members
   - [ ] Cannot edit member details
   - [ ] Can create follow-ups

#### Step 2.4: Test RLS Policies
In Supabase Dashboard → SQL Editor, test policies:

```sql
-- Test 1: Admin can see all members
SELECT * FROM members LIMIT 1;

-- Test 2: Switch to non-admin user context
-- (Use Supabase auth context switcher)
SELECT * FROM members LIMIT 1;
-- Expected: Only their camp's members
```

### Phase 3: Production Deployment (Estimated: 30 minutes)

#### Step 3.1: Create Backup
```bash
# Backup your production database
# In Supabase Dashboard → Database → Backups
# Create a manual backup before proceeding
```

#### Step 3.2: Deploy to Production
```bash
# Deploy code to production
# (Follow your deployment process)
```

#### Step 3.3: Run Migrations in Production
Same steps as Phase 1, but in production Supabase project

#### Step 3.4: Monitor for Errors
1. Watch error tracking dashboard
2. Monitor user sign-ins
3. Check database query logs
4. Look for RLS policy violations in logs

#### Step 3.5: Verify Production
1. Test in production with test accounts
2. Check member visibility by role
3. Verify follow-up creation works
4. Test data filtering

### Phase 4: Rollback Plan (If Needed)

If something goes wrong:

#### Option 1: Disable RLS (Quick Fix)
```sql
ALTER TABLE members DISABLE ROW LEVEL SECURITY;
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE camps DISABLE ROW LEVEL SECURITY;
ALTER TABLE member_assignments DISABLE ROW LEVEL SECURITY;
```

#### Option 2: Revert Code Changes
```bash
git revert <commit-hash>
npm run build
# Redeploy previous version
```

#### Option 3: Restore from Backup
Use Supabase backup restore feature to roll back database changes

## Testing Checklist

### Unit Tests
- [ ] Auth middleware extracts user correctly
- [ ] Role verification functions work
- [ ] Camp access checking works
- [ ] User profile fetching works

### Integration Tests
- [ ] Complete login flow works
- [ ] Members list shows correct data by role
- [ ] RLS policies enforce restrictions
- [ ] Cannot access cross-camp data

### Manual Testing
- [ ] Admin sees all members
- [ ] Leader sees camp members only
- [ ] Shepherd sees assigned members only
- [ ] Unauthenticated users get redirected
- [ ] Expired tokens are rejected
- [ ] Invalid tokens are rejected

### Performance Testing
- [ ] Page load times acceptable
- [ ] Database queries efficient
- [ ] No N+1 queries
- [ ] RLS policies don't cause slowdowns

## Troubleshooting

### Issue: Users can't see any members
**Solution:**
1. Check if user has a campId assigned
2. Verify RLS policies are enabled
3. Check middleware is extracting user correctly
4. Review database query logs

### Issue: RLS policy error when querying
**Solution:**
1. Verify all required tables have RLS enabled
2. Check policy syntax is correct
3. Verify auth.uid() is working
4. Test policy in SQL editor

### Issue: Middleware not extracting user
**Solution:**
1. Check Authorization header is present
2. Verify token is valid
3. Check Supabase admin client is configured
4. Review middleware logs

### Issue: Users seeing other camp's data
**Solution:**
1. Verify RLS policies are created correctly
2. Check camp assignment is correct
3. Verify user role in database
4. Test policies with specific users

## Post-Deployment

### Monitoring
1. Set up alerts for RLS policy violations
2. Monitor authentication failures
3. Track query performance
4. Watch for unauthorized access attempts

### Documentation
- [ ] Update API documentation
- [ ] Create user guide for new users
- [ ] Document role permissions
- [ ] Update deployment runbooks

### Team Communication
- [ ] Notify team of changes
- [ ] Provide training on new permissions model
- [ ] Document any breaking changes
- [ ] Set up support for questions

## Verification Commands

### Check RLS Status
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'members';
```

### Test User Access
```sql
-- Run as specific user
SELECT * FROM members;
-- Should only return their camp's members

SELECT * FROM events;
-- Should only return accessible events
```

### Check User Profiles
```sql
SELECT id, email, first_name, last_name, role, camp_id 
FROM users 
WHERE id = '<user-id>';
```

## Success Criteria

- ✅ All RLS policies created successfully
- ✅ Users can authenticate and see dashboard
- ✅ Admin sees all members
- ✅ Leader sees camp members only
- ✅ Shepherd sees assigned members only
- ✅ No unauthorized data access
- ✅ Performance is acceptable
- ✅ Error rate is normal
- ✅ User feedback is positive

## Estimated Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Database migrations | 30 min | Ready |
| Code deployment | 15 min | Ready |
| Testing | 30 min | Ready |
| Production deployment | 30 min | Ready |
| Monitoring | Ongoing | Ongoing |
| **Total** | **~2 hours** | **Ready** |

## Support

If you encounter issues:
1. Check troubleshooting section
2. Review logs in Supabase dashboard
3. Test policies in SQL editor
4. Consult AUTHENTICATION_TODO.md
5. Reach out to team leads

## Sign-Off

**Deployment Date:** _______________
**Deployed By:** _______________
**Reviewed By:** _______________
**Status:** ⬜ Not Started | 🟡 In Progress | 🟢 Complete | 🔴 Rolled Back

**Notes:**
_______________________________________________________________________

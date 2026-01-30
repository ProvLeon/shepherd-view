# TODO Checklist for Shepherd's View

## ✅ Completed
- [x] Fix members list not showing data
- [x] Add firstName and lastName to users table
- [x] Create authentication helper functions
- [x] Create authenticated hooks
- [x] Document authentication implementation plan
- [x] Remove hardcoded phone numbers from dashboard
- [x] Remove hardcoded action items from dashboard
- [x] Fix migration errors (DROP CASCADE)

## 🔴 Critical - Do First

### Phase 1: Middleware Implementation (1-2 hours)
- [ ] Create `src/middleware.ts` file
  - [ ] Extract Supabase session from cookies
  - [ ] Verify JWT token validity
  - [ ] Attach userId to request context
  - [ ] Handle unauthenticated requests
  
- [ ] Update `src/router.tsx`
  - [ ] Define RouterContext type with auth info
  - [ ] Add context to createRouter config
  - [ ] Test middleware is working

- [ ] Test middleware
  - [ ] Verify authenticated requests pass userId
  - [ ] Verify unauthenticated requests fail
  - [ ] Check context available in loaders

### Phase 2: Add Auth to Server Functions (4-6 hours)
- [ ] Update `src/server/members.ts`
  - [ ] Add userId parameter to all functions
  - [ ] Check user exists and is authenticated
  - [ ] For Admin: return all members
  - [ ] For Leader/Shepherd: filter by campId
  - [ ] Return proper error responses
  - [ ] Test each role has correct access

- [ ] Update `src/server/dashboard.ts`
  - [ ] Filter stats based on user's camp
  - [ ] Only show accessible members' data
  - [ ] Verify user can access requested camp

- [ ] Update `src/server/followups.ts`
  - [ ] Add userId parameter
  - [ ] Verify user can access member before returning followups
  - [ ] Only allow creating followups for assigned members

- [ ] Update `src/server/auth.ts`
  - [ ] Use service role key for admin operations
  - [ ] Improve error handling
  - [ ] Return complete user object

### Phase 3: Database Row Level Security (2-3 hours)
- [ ] Create `supabase/migrations/0005_enable_rls.sql`
  - [ ] Enable RLS on members table
  - [ ] Enable RLS on events table
  - [ ] Enable RLS on attendance table
  - [ ] Enable RLS on follow_ups table
  - [ ] Enable RLS on users table
  
- [ ] Create members RLS policy
  - [ ] Admins can select all members
  - [ ] Leaders/Shepherds see their camp only
  
- [ ] Create events RLS policy
  - [ ] Admins can select all events
  - [ ] Others see their camp events only
  
- [ ] Create attendance RLS policy
  - [ ] Users see attendance for accessible events
  
- [ ] Create follow_ups RLS policy
  - [ ] Users only see their own/assigned followups
  
- [ ] Create users RLS policy
  - [ ] Only admins can view user list
  
- [ ] Run migration in Supabase
  - [ ] Test policies with each role
  - [ ] Verify no unauthorized access

## 🟠 High Priority

### Phase 4: Component Updates (3-4 hours)
- [ ] Update members page (`src/routes/members/index.tsx`)
  - [ ] Remove client-side filtering
  - [ ] Add permission error handling
  - [ ] Update loading states for auth
  - [ ] Test with each role

- [ ] Update attendance page (`src/routes/attendance/index.tsx`)
  - [ ] Filter events by user's camp
  - [ ] Only show accessible events
  - [ ] Test with non-admin users

- [ ] Update campuses page (`src/routes/campuses/index.tsx`)
  - [ ] Show only accessible campuses for non-admins
  - [ ] Restrict actions based on user role
  - [ ] Test with each role

- [ ] Update dashboard (`src/routes/index.tsx`)
  - [ ] Verify stats are correct for each role
  - [ ] Test camp filtering works

### Phase 5: Update Scripts (1 hour)
- [ ] Update `scripts/create_admin.js`
  - [ ] Add firstName and lastName input prompts
  - [ ] Store name when creating admin user
  - [ ] Test script runs without errors

### Phase 6: Testing & Validation (2-3 hours)
- [ ] Authentication Testing
  - [ ] Test middleware with valid tokens
  - [ ] Test middleware with expired tokens
  - [ ] Test middleware with invalid tokens
  - [ ] Verify user context passes to server functions
  
- [ ] Authorization Testing
  - [ ] Admin can access all members
  - [ ] Leader can access own camp members only
  - [ ] Shepherd can access assigned members only
  - [ ] RLS policies prevent unauthorized access
  
- [ ] Role-Based Testing
  - [ ] Admin: Full access to everything
  - [ ] Leader: Can create/edit/delete members in their camp
  - [ ] Shepherd: Can only do follow-ups and view assigned members
  
- [ ] Integration Testing
  - [ ] Test complete user flow for each role
  - [ ] Test edge cases (deleted members, etc)
  - [ ] Test performance with large datasets

## 🟡 Medium Priority

### Documentation
- [ ] Create `docs/ARCHITECTURE.md`
  - [ ] Document authentication flow
  - [ ] Document authorization model
  - [ ] Explain middleware and RLS
  
- [ ] Create `docs/SETUP_AUTH.md`
  - [ ] Steps to enable RLS in Supabase
  - [ ] How to create admin users
  - [ ] How to assign users to camps
  
- [ ] Create `docs/API.md`
  - [ ] Document all server function signatures
  - [ ] List required parameters
  - [ ] Document error responses

### Performance Optimization
- [ ] Add database indexes for common queries
  - [ ] Index on campId for filtering
  - [ ] Index on userId for lookups
  - [ ] Composite indexes for complex queries
  
- [ ] Add caching where appropriate
  - [ ] Cache user roles
  - [ ] Cache camp assignments
  
- [ ] Optimize database queries
  - [ ] Use eager loading for relationships
  - [ ] Avoid N+1 queries

## 🟢 Low Priority

### Polish & Future Features
- [ ] Add audit logging for all operations
- [ ] Implement user activity dashboard
- [ ] Add email notifications
- [ ] Create user management UI
- [ ] Add two-factor authentication
- [ ] Implement API rate limiting
- [ ] Add request validation schemas

## 📋 Database Migrations Needed

### Already Created
- [x] `0000_bizarre_paibok.sql` - Initial schema
- [x] `0001_flaky_shape.sql` - Additional columns
- [x] `0002_wooden_leopardon.sql` - Settings table
- [x] `0003_panoramic_masque.sql` - Follow-ups and users tables
- [x] `0004_add_user_names.sql` - User firstName/lastName

### Need to Create
- [ ] `0005_enable_rls.sql` - Row Level Security policies
- [ ] `0006_add_indexes.sql` - Database indexes (if needed)

## 🔧 Environment Setup

### Required Environment Variables
```
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
DATABASE_URL=<your-database-url>
```

### Pre-Implementation Checklist
- [ ] All env vars configured
- [ ] Database migrations run
- [ ] Supabase project created
- [ ] Auth enabled in Supabase

## 📊 Testing Checklist

### Unit Tests Needed
- [ ] Auth helper functions
- [ ] Role verification functions
- [ ] Camp access checking
- [ ] User profile fetching

### Integration Tests Needed
- [ ] Complete login flow
- [ ] Data access by role
- [ ] RLS policy enforcement
- [ ] Cross-camp access denial

### E2E Tests Needed
- [ ] Admin workflow
- [ ] Leader workflow
- [ ] Shepherd workflow
- [ ] Unauthenticated access denial

## 🚀 Deployment Checklist

### Before Production
- [ ] All tests passing
- [ ] RLS policies tested
- [ ] Performance benchmarks met
- [ ] Security audit passed
- [ ] Documentation complete
- [ ] Backup strategy in place
- [ ] Monitoring configured
- [ ] Error tracking enabled
- [ ] Rate limiting active
- [ ] CORS properly configured

### Production Release
- [ ] Database backup taken
- [ ] Migrations tested on staging
- [ ] Feature flags for rollback
- [ ] Zero-downtime deployment plan
- [ ] Monitoring dashboards ready
- [ ] Support documentation updated

## 📚 Reference Documents

### To Read First
1. `QUICK_REFERENCE.md` - Overview of changes
2. `AUTHENTICATION_TODO.md` - Detailed implementation guide
3. `IMPLEMENTATION_SUMMARY.md` - Progress tracking

### For Implementation
1. `src/server/auth-helpers.ts` - Available helper functions
2. `src/hooks/useAuthenticatedFn.ts` - Available hooks
3. `src/context/AuthContext.tsx` - Auth context usage

### For Testing
1. Create test files in `src/__tests__/`
2. Test auth functions first
3. Then test components
4. Finally test RLS policies

## 🎯 Success Criteria

When implementation is complete:
- ✅ Admins see all members across all camps
- ✅ Leaders see only their camp's members
- ✅ Shepherds see only assigned members
- ✅ Server functions verify every request
- ✅ RLS prevents direct database access
- ✅ Follow-ups show who performed them
- ✅ Users have full names, not just emails
- ✅ All operations properly secured
- ✅ Comprehensive tests passing
- ✅ Documentation is complete

## 📞 Questions to Answer

Before implementation, clarify:
- [ ] Should RLS be enabled immediately or gradually?
- [ ] What roles need audit logging?
- [ ] Should deleted members be soft or hard deleted?
- [ ] Are there performance requirements?
- [ ] How many concurrent users expected?
- [ ] What's the data retention policy?

## ⏱️ Time Estimate

| Phase | Time | Status |
|-------|------|--------|
| 1. Middleware | 1-2 hrs | ⏳ Not Started |
| 2. Server Auth | 4-6 hrs | ⏳ Not Started |
| 3. RLS Setup | 2-3 hrs | ⏳ Not Started |
| 4. Components | 3-4 hrs | ⏳ Not Started |
| 5. Testing | 2-3 hrs | ⏳ Not Started |
| 6. Documentation | 1-2 hrs | ⏳ Not Started |
| **Total** | **13-20 hrs** | **13% Done** |

## Notes

- Keep commits small and focused
- Test after each phase
- Document as you go
- Run migrations on staging first
- Have a rollback plan
- Monitor errors in production

**Last Updated:** Today
**Status:** Phase 0 Complete - Ready for Phase 1
**Next Step:** Create middleware file

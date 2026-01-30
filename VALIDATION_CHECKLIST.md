# Authentication Fix Validation Checklist

## Route Structure ✓
- [x] `/members` route moved to `/_authed/members/`
- [x] `/members/$memberId` moved to `/_authed/members/$memberId`
- [x] `/settings` moved to `/_authed/settings`
- [x] `/index` (dashboard) moved to `/_authed/index`
- [x] `/login` remains at root (public)
- [x] `/_authed.tsx` provides `beforeLoad` with user context

## Import Paths ✓
- [x] `/_authed/members/index.tsx` imports use `../../../` for server/components
- [x] `/_authed/members/$memberId.tsx` imports use `../../../` for server/components
- [x] `/_authed/settings.tsx` imports use `../../` for server/components
- [x] `/_authed/index.tsx` imports use `../../` for server/components

## Server Functions ✓
- [x] `getMembers` uses `method: "POST"` (not GET)
- [x] `getMembers` has `.inputValidator((data: { userId?: string }) => data)`
- [x] `getMembers` handler destructures `({ data })`
- [x] `getMembers` includes logging: `console.log('🔍 [getMembers] Received userId:', userId)`
- [x] Server function validates `userId` exists before proceeding

## Client Calls ✓
- [x] `getMembers()` called as `getMembers({ data: { userId: context.user?.id } })`
- [x] Components use `Route.useRouteContext()` to get `context.user`
- [x] `context.user` is checked before passing to server functions

## Testing Steps

### Step 1: Check Browser Console
```
Navigate to http://localhost:3000
You should be redirected to /login if not authenticated
```

### Step 2: Login & Check Context
```
Login with a test account
Navigate to /members
In browser console, open DevTools → Network tab
Look for POST request to `/__functions/getMembers`
Request body should include: {"userId":"actual-user-id"}
NOT: {"userId":undefined} or {"userId":null}
```

### Step 3: Check Server Logs
```
In terminal running `npm run dev`:
🔍 [getMembers] Received userId: abc-123-def  ← Should show real UUID
🔍 [getMembers] Looking up user profile for userId: abc-123-def
✅ [getMembers] Returned X members  ← Should show count > 0 for admin
```

### Step 4: Verify Members Display
```
Navigate to /members
Should see table of members populated
Should NOT see "returning empty array" in logs
```

### Step 5: Test Role-Based Access
```
Test as Admin user:
- Should see all members from all camps
- Console should log: "Admin user - fetching all members"

Test as Leader/Shepherd user:
- Should see only members from their camp
- Console should log: "Leader/Shepherd user - fetching members for campId: xyz"

Test as regular Member (no camp assigned):
- Should see empty members list
- Console should log: "User has no campId assigned"
```

### Step 6: Verify Navigation
```
- Dashboard link to /members should work
- Settings page should load correctly
- All links should navigate without errors
```

### Step 7: Test Export Feature
```
Go to Settings page
Click "Export to CSV"
Should export all members based on user role
```

## Expected Log Output

### SUCCESS (Admin User)
```
LOG /src/server/members.ts:26:7 - 🔍 [getMembers] Received userId: 550e8400-e29b-41d4-a716-446655440000
LOG /src/server/members.ts:29:9 - 🔍 [getMembers] Looking up user profile for userId: 550e8400-e29b-41d4-a716-446655440000
LOG /src/server/members.ts:36:9 - 🔍 [getMembers] User profile found: { role: 'Admin', campId: null }
LOG /src/server/members.ts:40:9 - ✅ [getMembers] Admin user - fetching all members
LOG /src/server/members.ts:62:9 - ✅ [getMembers] Returned 45 members
```

### SUCCESS (Leader User)
```
LOG /src/server/members.ts:26:7 - 🔍 [getMembers] Received userId: 550e8400-e29b-41d4-a716-446655440001
LOG /src/server/members.ts:29:9 - 🔍 [getMembers] Looking up user profile for userId: 550e8400-e29b-41d4-a716-446655440001
LOG /src/server/members.ts:36:9 - 🔍 [getMembers] User profile found: { role: 'Leader', campId: 'camp-123' }
LOG /src/server/members.ts:70:9 - ✅ [getMembers] Leader/Shepherd user - fetching members for campId: camp-123
LOG /src/server/members.ts:86:9 - ✅ [getMembers] Returned 12 members for camp camp-123
```

## Troubleshooting

### Problem: Still seeing `userId: undefined`
```
CHECKLIST:
- [ ] Are you on a route under /_authed? (check browser URL: /members not /authed/members)
- [ ] Did you reload the page after changes?
- [ ] Is `getCurrentUserFn()` returning a user? (check _authed.tsx beforeLoad logs)
- [ ] Are you passing userId correctly? (should be { data: { userId: context.user?.id } })
```

### Problem: Import errors
```
CHECKLIST:
- [ ] Did you copy import path updates?
- [ ] Are relative paths correct? (count the ../ based on file depth)
- [ ] Did you delete old route files to avoid confusion?
- [ ] Run `npm run dev` to rebuild routes
```

### Problem: Blank members page
```
CHECKLIST:
- [ ] Check server logs for error messages
- [ ] Check browser DevTools Network tab for failed request
- [ ] Verify user has members in database
- [ ] Check user role and campId are correct in database
```

## Success Criteria

✅ All of the following must be true:

1. **Route Structure**: All protected routes are under `/_authed` layout
2. **Context Available**: `context.user` is available in all protected routes
3. **userId Passed**: Server functions receive actual userId, not undefined
4. **Logging Works**: Console shows correct user role and member counts
5. **Members Display**: Members table populates with correct data
6. **Role Access**: Different users see appropriate data (admin sees all, leaders see their camp)
7. **No Errors**: No console errors or failed requests
8. **Navigation Works**: All links navigate without issues

## Checklist Completion

- [ ] Route structure verified (find src/routes -type f -name "*.tsx" | grep _authed)
- [ ] Import paths updated and no "module not found" errors
- [ ] Server functions accept POST method and use inputValidator
- [ ] Client calls wrap parameters in { data: { userId } }
- [ ] Login flow works correctly
- [ ] Dashboard loads and shows stats
- [ ] Members page loads and displays table
- [ ] Settings page accessible and works
- [ ] Admin user sees all members
- [ ] Leader user sees only their camp members
- [ ] Server logs show correct userId (not undefined)
- [ ] No TypeScript errors: `npm run build` succeeds
- [ ] All tests pass or manual testing complete

## Sign Off

When all items above are verified, you can consider the authentication fix complete:

**Date Fixed**: ___________
**Tested By**: ___________
**Status**: ✅ COMPLETE / ⏳ IN PROGRESS / ❌ ISSUES FOUND

**Notes**:
```
[Add any observations or remaining issues here]
```

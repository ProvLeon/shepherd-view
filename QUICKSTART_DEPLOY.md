# Quick Start: Deploy Authentication in 30 Minutes

## What You Need
- Access to Supabase dashboard
- This file
- Coffee ☕

## Step 1: Database Migration (10 minutes)

### 1.1 Add User Name Fields
Go to **Supabase Dashboard → SQL Editor** and run:

```sql
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "first_name" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_name" text;
```

Expected: ✅ Success - 2 columns added

### 1.2 Enable Row Level Security

Run all of these in one go:

```sql
ALTER TABLE "public"."members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."follow_ups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."camps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."member_assignments" ENABLE ROW LEVEL SECURITY;
```

Expected: ✅ Success - 7 tables now have RLS enabled

### 1.3 Create RLS Policies

Copy the entire contents of `supabase/migrations/0005_enable_rls.sql` and paste it into SQL Editor.

Run it all.

Expected: ✅ Success - ~30 policies created

### 1.4 Verify RLS is Working

Run this verification query:

```sql
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true;
```

Expected result:
```
attendance
camps
events
follow_ups
members
member_assignments
users
```

If all 7 tables appear, you're ✅ GOOD TO GO!

---

## Step 2: Code Deployment (5 minutes)

### 2.1 Deploy New Code
```bash
npm run build
# Deploy to your environment (Vercel, Railway, etc.)
```

### 2.2 Test It Works

1. Open the app in browser
2. Sign in as admin
3. Go to Members page
4. Should see all members ✅

If members appear: **YOU'RE DONE! 🎉**

---

## Step 3: Verify Each Role (15 minutes)

### Test Admin Account
- [ ] Can see all members
- [ ] Can create members
- [ ] Can see all events
- [ ] Dashboard shows all data

### Test Leader Account (Optional)
- [ ] Can see own camp members only
- [ ] Cannot see other camps' data

### Test Shepherd Account (Optional)
- [ ] Can see assigned members
- [ ] Cannot create members
- [ ] Can create follow-ups

---

## If Something Goes Wrong

### Members Not Showing?
1. Check you're logged in
2. Check admin user has a role in database
3. Verify migrations ran successfully

### RLS Errors?
1. Go back to Step 1.4 and verify all 7 tables have RLS
2. If not, run the ENABLE statements again

### Need to Undo?

Disable RLS temporarily:
```sql
ALTER TABLE members DISABLE ROW LEVEL SECURITY;
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE camps DISABLE ROW LEVEL SECURITY;
ALTER TABLE member_assignments DISABLE ROW LEVEL SECURITY;
```

---

## What Was Added

✅ User first_name and last_name columns  
✅ Row Level Security on 7 tables  
✅ ~30 security policies  
✅ Server-side auth checks  
✅ Type-safe authentication  

---

## Success Looks Like

- ✅ No errors in browser console
- ✅ Members page loads quickly
- ✅ All members appear for admin
- ✅ No "unauthorized" messages
- ✅ Database shows RLS enabled

---

## Time Spent

- SQL migrations: ~10 min
- Code deployment: ~5 min
- Testing: ~15 min
- **Total: ~30 minutes** ⏱️

---

## Next (Optional)

Once deployed, you can:
1. Read `DEPLOY_AUTH_CHANGES.md` for full details
2. Implement TanStack Start middleware for better auth
3. Test with different user roles
4. Set up monitoring and alerts

---

## Emergency Contacts

If stuck:
- Check `STATUS_REPORT.md` for full status
- Check `DEPLOY_AUTH_CHANGES.md` troubleshooting section
- Check database logs in Supabase dashboard

---

**Estimated Time:** 30 minutes  
**Difficulty:** Easy ✅  
**Risk Level:** Low 🟢  
**Go-NoGo:** ✅ GO

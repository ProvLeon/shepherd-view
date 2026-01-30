# 🚀 Database Migration Guide - Final Step

## ⚠️ CRITICAL: You MUST Complete This Step

The authentication system is ready, but the database tables don't exist yet. Follow these instructions to create them.

## Option 1: Manual SQL (Recommended - Fastest)

### Step 1: Get the Migration SQL

The migration file is already generated at:
```
supabase/migrations/0003_panoramic_masque.sql
```

### Step 2: Apply to Supabase

1. Go to your Supabase project: https://app.supabase.com
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy and paste the entire contents of `supabase/migrations/0003_panoramic_masque.sql`
5. Click "Run"

### What Gets Created

The migration will create:
- ✅ `users` table (id, email, role, member_id, camp_id, created_at)
- ✅ `follow_ups` table (id, member_id, user_id, type, notes, outcome, scheduled_at, completed_at, created_at)
- ✅ `member_assignments` table (id, member_id, shepherd_id, assigned_at)
- ✅ Enums: `user_role` (Admin, Leader, Shepherd), `follow_up_type`, `follow_up_outcome`, `category`
- ✅ Add columns to `events` table (camp_id, created_by_id)
- ✅ Add column to `members` table (category)
- ✅ All foreign key relationships

## Option 2: Using Drizzle Kit (If Supabase CLI installed)

If you have Supabase CLI installed:

```bash
supabase db push
```

This will push the migration to your linked Supabase project.

## Option 3: Direct PostgreSQL Connection

If you have `psql` installed and your Supabase connection string:

```bash
psql $DATABASE_URL < supabase/migrations/0003_panoramic_masque.sql
```

## Next: Add Admin User

After the migration completes successfully:

```bash
node scripts/create_admin.js
```

This will:
1. Create the user in Supabase Auth
2. Add them to the `users` table with Admin role
3. Setup everything automatically

When prompted:
- Email: `providence.leonard@gmail.com`
- Password: Your secure password

## Verify Success

### Check 1: Tables Exist

In Supabase SQL Editor, run:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see:
- attendance
- camps
- events
- follow_ups
- members
- member_assignments
- settings
- users ✅

### Check 2: User Exists

```sql
SELECT id, email, role FROM users;
```

You should see your admin user with `role = 'Admin'`

### Check 3: Enums Exist

```sql
SELECT typname FROM pg_type WHERE typtype = 'e';
```

You should see `user_role` enum with values: Admin, Leader, Shepherd

## Test Authentication

1. Refresh your browser
2. Login with your admin credentials
3. Check the console - you should see:
   ```
   🔐 Initializing auth...
   ✅ Session user set: providence.leonard@gmail.com
   📋 Fetching role for authenticated user...
   🔄 Fetching role for user: [your-user-id]
   ✅ User role fetched: Admin
   ✅ Auth initialization complete. Role: Admin
   ```

4. Verify the UI:
   - ✅ No loading timeout
   - ✅ Role badge shows "Admin" with shield icon
   - ✅ Sidebar shows ALL 5 routes:
     - Dashboard
     - Members
     - Attendance
     - Campuses
     - Settings

## Troubleshooting

### If migration fails with "already exists" error
Some tables already exist. That's okay - Drizzle will skip them.

### If you see "Cannot read properties of undefined" error
This is a Drizzle Kit issue. Use Option 1 (Manual SQL) instead.

### If user creation fails
Make sure:
1. The `users` table was created successfully
2. Your Supabase credentials are correct in `.env`
3. The user doesn't already exist in Supabase Auth

### If auth still doesn't work after migration
1. Verify the user ID in Supabase Auth matches the ID in the `users` table
2. Check that the role is exactly `'Admin'` (case-sensitive)
3. Clear browser cache and refresh
4. Check browser console for specific error messages

## Commands Summary

```bash
# 1. Generate and push migrations (may have Drizzle Kit issue)
pnpm run db:push

# 2. View database in visual editor
pnpm run db:studio

# 3. Create admin user
node scripts/create_admin.js

# 4. Test
# Login and verify in browser console
```

## What Happens Next

Once complete:
- ✅ Authentication works instantly
- ✅ Admin has full access to all features
- ✅ Role-based access control is active
- ✅ All data operations work
- ✅ Server-side permission checks enforce security

## Status

- Code fixes: ✅ COMPLETE
- Database schema: ✅ DEFINED
- Migrations: ✅ GENERATED
- **Next**: Apply migration (THIS STEP)
- Then: Create admin user
- Finally: Test and deploy

**DO NOT skip this step.** Without these tables, the application cannot function.

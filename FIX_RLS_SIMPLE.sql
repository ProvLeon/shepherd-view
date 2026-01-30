-- SIMPLE FIX: Disable RLS on users table to fix infinite recursion error
-- Run this in Supabase SQL Editor

-- Drop the problematic policies
DROP POLICY IF EXISTS "Admins can see all users" ON "public"."users";
DROP POLICY IF EXISTS "Users can see themselves" ON "public"."users";

-- Disable RLS on users table
ALTER TABLE "public"."users" DISABLE ROW LEVEL SECURITY;

-- Verify it worked
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'users';

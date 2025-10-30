# Fix Admin Dashboard - Error Fetching Users

## Problem
The admin dashboard is showing "❌ Error fetching users: [object Object]" error.

## Solution Steps

### Step 1: Check Error Details
The error logging has been improved. Now when you reload the admin dashboard, check your console/logs for detailed error information:
- Error code
- Error message
- Error details
- Error hint

This will help identify the exact issue.

### Step 2: Ensure Admin RLS Policies Are Set
Run this SQL in your Supabase SQL Editor:

```sql
-- Fix RLS policies for admin users
-- This ensures admins can update user profiles, including granting admin privileges

-- Add a policy to allow admins to update any user profile
CREATE POLICY "admin_update_all_profiles"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND is_admin = true
  )
);

-- Verify all policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'user_profiles' AND schemaname = 'public'
ORDER BY policyname;
```

### Step 3: Verify Your Admin Status
Run this SQL to check if you're an admin:

```sql
-- Check if captainigweh12@gmail.com is an admin
SELECT id, email, full_name, is_admin 
FROM public.user_profiles 
WHERE email = 'captainigweh12@gmail.com';
```

If `is_admin` is `false` or `null`, run:

```sql
-- Make captainigweh12@gmail.com an admin
UPDATE public.user_profiles 
SET is_admin = true 
WHERE email = 'captainigweh12@gmail.com';
```

### Step 4: Check if There Are Users in the Database
Run this SQL:

```sql
-- Count total users
SELECT COUNT(*) as total_users FROM public.user_profiles;

-- List all users
SELECT id, email, full_name, username, is_admin, created_at 
FROM public.user_profiles 
ORDER BY created_at DESC 
LIMIT 10;
```

### Step 5: Test the Query Manually
Run the exact query that the admin dashboard uses:

```sql
-- Test the admin dashboard query
SELECT 
  id,
  email,
  full_name,
  username,
  subscription_tier,
  is_admin,
  created_at,
  level,
  total_points,
  streak
FROM public.user_profiles
ORDER BY created_at DESC;
```

If this works in SQL but fails in the app, it's likely an RLS policy issue.

### Step 6: Common Issues and Solutions

#### Issue 1: No users in the database
**Solution**: Sign up a few test users first.

#### Issue 2: RLS policies blocking the query
**Solution**: The policies created in Step 2 should fix this. The `select_all_authenticated` policy from `FIX_INFINITE_RECURSION_RLS.sql` allows all authenticated users to view all profiles.

#### Issue 3: Missing columns
**Solution**: Run this to check if all columns exist:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_profiles'
ORDER BY ordinal_position;
```

If any columns are missing (like `level`, `total_points`, `streak`), add them:

```sql
-- Add missing columns if needed
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0;
```

### Step 7: Reload and Check
1. After running the SQL fixes, reload your app
2. Sign in with `captainigweh12@gmail.com`
3. Open the admin dashboard from the side menu
4. Check the console for detailed error logs
5. Report back the specific error details if the issue persists

## What Changed in the Code
- Improved error logging in `app/admin.tsx` to show detailed error information instead of `[object Object]`
- The error will now display: code, message, details, and hint

## Next Steps
Once you run these SQL commands and reload the app, the detailed error logs will help us identify and fix the exact issue.

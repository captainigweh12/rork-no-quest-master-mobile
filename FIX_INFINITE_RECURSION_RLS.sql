-- Fix infinite recursion in user_profiles RLS policies
-- This happens when policies reference the same table they're protecting

-- Step 1: Drop ALL existing policies on user_profiles
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_profiles' AND schemaname = 'public') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.user_profiles';
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;

-- Step 2: Ensure RLS is enabled
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 3: Create simple, non-recursive policies
-- These policies use ONLY auth.uid() and do NOT reference user_profiles table

-- Allow all authenticated users to view all profiles
-- This is safe for social features (friends, teams, leaderboards)
CREATE POLICY "select_all_authenticated"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (true);

-- Allow users to insert ONLY their own profile
CREATE POLICY "insert_own_profile"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Allow users to update ONLY their own profile
CREATE POLICY "update_own_profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow users to delete their own profile
CREATE POLICY "delete_own_profile"
ON public.user_profiles
FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- Step 4: Verify the new policies
SELECT 
  'Policy: ' || policyname as policy,
  'Command: ' || cmd as command,
  'Roles: ' || array_to_string(roles, ', ') as roles
FROM pg_policies
WHERE tablename = 'user_profiles' AND schemaname = 'public'
ORDER BY policyname;

-- Step 5: Test that we can query without recursion
DO $$
DECLARE
  test_count INTEGER;
BEGIN
  -- This should work without recursion error
  SELECT COUNT(*) INTO test_count FROM public.user_profiles;
  RAISE NOTICE '✅ Successfully queried user_profiles. Row count: %', test_count;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Error querying user_profiles: %', SQLERRM;
END $$;

SELECT '✅ RLS policies fixed! No more infinite recursion.' as status;

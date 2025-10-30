-- Fix RLS policies for admin users
-- This ensures admins can update user profiles, including granting admin privileges

-- Step 1: Add a policy to allow admins to update any user profile
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

-- Step 2: Verify all policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_profiles' AND schemaname = 'public'
ORDER BY policyname;

SELECT '✅ Admin RLS policies created!' as status;

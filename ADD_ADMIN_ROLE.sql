-- Add admin role to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Make captainigweh12@gmail.com an admin
UPDATE public.user_profiles
SET is_admin = TRUE
WHERE email = 'captainigweh12@gmail.com';

-- If the user doesn't exist yet, you can also update by matching against auth.users
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Find the user ID from auth.users
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'captainigweh12@gmail.com';
  
  IF admin_user_id IS NOT NULL THEN
    -- Update or insert the admin flag
    UPDATE public.user_profiles
    SET is_admin = TRUE
    WHERE id = admin_user_id;
    
    RAISE NOTICE '✅ Admin privileges granted to captainigweh12@gmail.com';
  ELSE
    RAISE NOTICE '⚠️ User captainigweh12@gmail.com not found in auth.users';
  END IF;
END $$;

-- Add RLS policy for admin dashboard access
CREATE POLICY "Admins can view all profiles" ON public.user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Create an index for better admin query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_admin ON public.user_profiles(is_admin) WHERE is_admin = TRUE;

-- Verify admin was set
SELECT 
  up.id,
  up.email,
  up.full_name,
  up.is_admin,
  au.email as auth_email
FROM public.user_profiles up
JOIN auth.users au ON up.id = au.id
WHERE up.is_admin = TRUE OR au.email = 'captainigweh12@gmail.com';

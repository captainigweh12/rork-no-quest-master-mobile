-- Add avatar_url to user_profiles table if it doesn't exist
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Verify the column was added
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles' 
    AND column_name = 'avatar_url'
  ) THEN
    RAISE NOTICE 'avatar_url column exists in user_profiles table';
  ELSE
    RAISE EXCEPTION 'avatar_url column was not added to user_profiles table';
  END IF;
END $$;

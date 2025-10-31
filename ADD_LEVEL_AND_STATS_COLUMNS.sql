-- Add level, total_points, and streak columns to user_profiles table
-- Run this in your Supabase SQL Editor

-- Add the missing columns
ALTER TABLE public.user_profiles 
  ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1 NOT NULL,
  ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0 NOT NULL;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_level ON public.user_profiles(level);
CREATE INDEX IF NOT EXISTS idx_user_profiles_total_points ON public.user_profiles(total_points);

-- Update existing users to have default values if they have NULL
UPDATE public.user_profiles 
SET 
  level = COALESCE(level, 1),
  total_points = COALESCE(total_points, 0),
  streak = COALESCE(streak, 0)
WHERE level IS NULL OR total_points IS NULL OR streak IS NULL;

-- Verify the columns were added
DO $$
DECLARE
  level_exists BOOLEAN;
  points_exists BOOLEAN;
  streak_exists BOOLEAN;
BEGIN
  -- Check if columns exist
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles' 
    AND column_name = 'level'
  ) INTO level_exists;
  
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles' 
    AND column_name = 'total_points'
  ) INTO points_exists;
  
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles' 
    AND column_name = 'streak'
  ) INTO streak_exists;
  
  RAISE NOTICE 'Column verification:';
  RAISE NOTICE '- level column exists: %', level_exists;
  RAISE NOTICE '- total_points column exists: %', points_exists;
  RAISE NOTICE '- streak column exists: %', streak_exists;
  
  IF level_exists AND points_exists AND streak_exists THEN
    RAISE NOTICE '✅ All required columns have been added successfully!';
  ELSE
    RAISE WARNING '⚠️ Some columns may be missing. Please review.';
  END IF;
END $$;

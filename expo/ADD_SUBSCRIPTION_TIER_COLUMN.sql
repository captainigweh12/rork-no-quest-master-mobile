-- Add subscription_tier column to user_profiles table
-- Run this in your Supabase SQL Editor

-- Add the subscription_tier column if it doesn't exist
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free' 
CHECK (subscription_tier IN ('free', 'pro', 'hero', 'team'));

-- Update any existing NULL values to 'free'
UPDATE public.user_profiles 
SET subscription_tier = 'free' 
WHERE subscription_tier IS NULL;

-- Add subscription_expires_at column if it doesn't exist
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE;

-- Add daily_challenges_used column if it doesn't exist
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS daily_challenges_used INTEGER DEFAULT 0;

-- Verify the columns were added
DO $$
DECLARE
  subscription_tier_exists BOOLEAN;
  subscription_expires_at_exists BOOLEAN;
  daily_challenges_used_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles' 
    AND column_name = 'subscription_tier'
  ) INTO subscription_tier_exists;
  
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles' 
    AND column_name = 'subscription_expires_at'
  ) INTO subscription_expires_at_exists;
  
  SELECT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles' 
    AND column_name = 'daily_challenges_used'
  ) INTO daily_challenges_used_exists;
  
  RAISE NOTICE 'Column verification:';
  RAISE NOTICE '- subscription_tier exists: %', subscription_tier_exists;
  RAISE NOTICE '- subscription_expires_at exists: %', subscription_expires_at_exists;
  RAISE NOTICE '- daily_challenges_used exists: %', daily_challenges_used_exists;
  
  IF subscription_tier_exists AND subscription_expires_at_exists AND daily_challenges_used_exists THEN
    RAISE NOTICE '✅ All subscription columns added successfully!';
  ELSE
    RAISE WARNING '⚠️ Some columns may be missing. Please review.';
  END IF;
END $$;

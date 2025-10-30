-- Fix the auth trigger to use user_profiles table
-- Run this in your Supabase SQL Editor

-- Drop the existing function and trigger
DROP TRIGGER IF EXISTS on_auth_user_created_profiles ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_profile();

-- Create the correct function that inserts into user_profiles
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created_profiles
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_profile();

-- Verify the setup
DO $$
BEGIN
  -- Check if function exists
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'handle_new_user_profile'
  ) THEN
    RAISE NOTICE '✅ Function handle_new_user_profile created successfully';
  ELSE
    RAISE WARNING '❌ Function handle_new_user_profile NOT found';
  END IF;

  -- Check if trigger exists
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created_profiles'
  ) THEN
    RAISE NOTICE '✅ Trigger on_auth_user_created_profiles created successfully';
  ELSE
    RAISE WARNING '❌ Trigger on_auth_user_created_profiles NOT found';
  END IF;

  -- Check if user_profiles table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles'
  ) THEN
    RAISE NOTICE '✅ Table user_profiles exists';
  ELSE
    RAISE WARNING '❌ Table user_profiles does NOT exist';
  END IF;
END $$;

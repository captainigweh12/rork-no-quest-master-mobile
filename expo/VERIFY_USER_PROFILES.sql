-- Verification script to check user_profiles table configuration
-- Run this in your Supabase SQL Editor to diagnose issues

-- 1. Check if the table exists and its name
SELECT 
  'Table Check' as check_type,
  table_name,
  CASE 
    WHEN table_name = 'user_profiles' THEN '✅ Correct table name'
    WHEN table_name = 'profiles' THEN '❌ Old table name - needs rename'
    ELSE '⚠️ Unknown table'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name IN ('profiles', 'user_profiles');

-- 2. Check table structure
SELECT 
  'Column Check' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 3. Check RLS status
SELECT 
  'RLS Check' as check_type,
  relname as table_name,
  CASE 
    WHEN relrowsecurity = true THEN '✅ RLS Enabled'
    ELSE '❌ RLS Disabled'
  END as status
FROM pg_class
WHERE relname = 'user_profiles' AND relnamespace = 'public'::regnamespace;

-- 4. Check RLS policies
SELECT 
  'Policy Check' as check_type,
  policyname as policy_name,
  cmd as command,
  qual as using_expression,
  with_check as check_expression
FROM pg_policies
WHERE tablename = 'user_profiles';

-- 5. Check indexes
SELECT 
  'Index Check' as check_type,
  indexname as index_name,
  indexdef as definition
FROM pg_indexes
WHERE tablename = 'user_profiles';

-- 6. Check foreign key constraints referencing this table
SELECT 
  'Foreign Key Check' as check_type,
  tc.table_name as referencing_table,
  kcu.column_name as referencing_column,
  ccu.table_name as referenced_table,
  ccu.column_name as referenced_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND (ccu.table_name = 'user_profiles' OR tc.table_name = 'user_profiles');

-- 7. Check triggers
SELECT 
  'Trigger Check' as check_type,
  trigger_name,
  event_manipulation as event,
  action_statement as action
FROM information_schema.triggers
WHERE event_object_table = 'user_profiles';

-- 8. Sample data (if any exists)
SELECT 
  'Data Check' as check_type,
  COUNT(*) as total_rows,
  COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as rows_with_email,
  COUNT(CASE WHEN username IS NOT NULL THEN 1 END) as rows_with_username
FROM public.user_profiles;

-- 9. Check auth.users trigger
SELECT 
  'Auth Trigger Check' as check_type,
  trigger_name,
  event_manipulation as event,
  action_statement as action
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND event_object_schema = 'auth'
  AND trigger_name LIKE '%user%';

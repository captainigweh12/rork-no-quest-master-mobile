-- ================================================================
-- Complete Database Verification Script
-- Run this to check what's missing in your Supabase database
-- ================================================================

-- Check all required tables exist
SELECT 
  t.table_name,
  CASE WHEN t.table_name IS NOT NULL THEN '✓ EXISTS' ELSE '✗ MISSING' END as status,
  CASE WHEN pt.rowsecurity THEN '✓ RLS ENABLED' ELSE '✗ RLS DISABLED' END as rls_status
FROM (
  VALUES 
    ('user_profiles'),
    ('friends'),
    ('friend_invites'),
    ('quests'),
    ('quest_invites'),
    ('quest_progress'),
    ('place_queue'),
    ('chat_messages'),
    ('notifications')
) AS required_tables(table_name)
LEFT JOIN information_schema.tables t 
  ON t.table_schema = 'public' 
  AND t.table_name = required_tables.table_name
LEFT JOIN pg_tables pt 
  ON pt.schemaname = 'public' 
  AND pt.tablename = required_tables.table_name
ORDER BY required_tables.table_name;

-- Check RLS policies for critical tables
SELECT 
  schemaname,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'user_profiles',
    'friends', 
    'friend_invites',
    'quests',
    'notifications'
  )
GROUP BY schemaname, tablename
ORDER BY tablename;

-- Check required functions exist
SELECT 
  n.nspname as schema,
  p.proname as function_name,
  '✓ EXISTS' as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'handle_new_user',
    'accept_friend_invite',
    'update_updated_at_column'
  )
ORDER BY p.proname;

-- Check foreign key relationships for friends table
SELECT
  tc.table_schema, 
  tc.table_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('friends', 'friend_invites')
ORDER BY tc.table_name, kcu.column_name;

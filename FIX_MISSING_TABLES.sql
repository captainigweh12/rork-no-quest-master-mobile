-- ================================================================
-- Fix for missing tables: friend_invites
-- Run this SQL in your Supabase SQL editor
-- ================================================================

-- First, check if tables exist
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('friends', 'friend_invites', 'user_profiles');

-- ================================================================
-- 1. Create friend_invites table (if missing)
-- ================================================================
CREATE TABLE IF NOT EXISTS public.friend_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE NOT NULL,
  email TEXT,
  used BOOLEAN DEFAULT FALSE,
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

-- ================================================================
-- 2. Enable RLS on friend_invites
-- ================================================================
ALTER TABLE public.friend_invites ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- 3. Create RLS policies for friend_invites
-- ================================================================

-- Drop existing policies first (in case we're re-running)
DROP POLICY IF EXISTS "friend_invites_select" ON public.friend_invites;
DROP POLICY IF EXISTS "friend_invites_insert" ON public.friend_invites;
DROP POLICY IF EXISTS "friend_invites_update" ON public.friend_invites;

-- Users can view invites they created
CREATE POLICY "friend_invites_select"
ON public.friend_invites
FOR SELECT
USING (
  auth.uid() = inviter_id 
  OR auth.uid() = used_by
  OR NOT used  -- Anyone can view unused invites (to accept them)
);

-- Users can create their own invites
CREATE POLICY "friend_invites_insert"
ON public.friend_invites
FOR INSERT
WITH CHECK (auth.uid() = inviter_id);

-- Anyone can update invites (to mark as used when accepting)
CREATE POLICY "friend_invites_update"
ON public.friend_invites
FOR UPDATE
USING (true)
WITH CHECK (true);

-- ================================================================
-- 4. Create index for better performance
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_friend_invites_code ON public.friend_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_friend_invites_inviter ON public.friend_invites(inviter_id);

-- ================================================================
-- 5. Create the accept_friend_invite function (if missing)
-- ================================================================
CREATE OR REPLACE FUNCTION public.accept_friend_invite(invite_code_param TEXT)
RETURNS UUID AS $$
DECLARE
  invite_record RECORD;
  friendship_id UUID;
  current_user_id UUID;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get the invite
  SELECT * INTO invite_record
  FROM public.friend_invites
  WHERE invite_code = invite_code_param
    AND used = FALSE
    AND expires_at > NOW();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invite code';
  END IF;
  
  -- Can't accept your own invite
  IF invite_record.inviter_id = current_user_id THEN
    RAISE EXCEPTION 'Cannot accept your own invite';
  END IF;
  
  -- Mark invite as used
  UPDATE public.friend_invites
  SET used = TRUE, used_by = current_user_id
  WHERE id = invite_record.id;
  
  -- Create friendship from inviter to accepter
  INSERT INTO public.friends (user_id, friend_id, status)
  VALUES (invite_record.inviter_id, current_user_id, 'accepted')
  ON CONFLICT (user_id, friend_id) DO UPDATE
  SET status = 'accepted'
  RETURNING id INTO friendship_id;
  
  -- Create reverse friendship (accepter to inviter)
  INSERT INTO public.friends (user_id, friend_id, status)
  VALUES (current_user_id, invite_record.inviter_id, 'accepted')
  ON CONFLICT (user_id, friend_id) DO UPDATE
  SET status = 'accepted';
  
  -- Create notification for inviter
  INSERT INTO public.notifications (user_id, type, title, message, related_id)
  VALUES (
    invite_record.inviter_id,
    'friend_request',
    'New Friend!',
    'Someone accepted your friend invite!',
    friendship_id
  );
  
  RETURN friendship_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- 6. Force PostgREST schema cache reload
-- ================================================================
-- This helps PostgREST recognize the new table immediately
COMMENT ON TABLE public.friend_invites IS 'Table for friend invite links';

-- ================================================================
-- 7. Verify everything was created
-- ================================================================
SELECT 
  'friend_invites table' as item,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'friend_invites'
  ) THEN '✓ EXISTS' ELSE '✗ MISSING' END as status
UNION ALL
SELECT 
  'friend_invites RLS enabled' as item,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename = 'friend_invites' 
      AND rowsecurity = true
  ) THEN '✓ ENABLED' ELSE '✗ DISABLED' END as status
UNION ALL
SELECT 
  'friend_invites policies' as item,
  COUNT(*)::text || ' policies' as status
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'friend_invites'
UNION ALL
SELECT 
  'accept_friend_invite function' as item,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'accept_friend_invite'
  ) THEN '✓ EXISTS' ELSE '✗ MISSING' END as status;

-- ================================================================
-- QUICK FIX: Create friend_invites table
-- Copy and paste this entire script into Supabase SQL Editor and run it
-- ================================================================

-- Create the table
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

-- Enable Row Level Security
ALTER TABLE public.friend_invites ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "friend_invites_select" ON public.friend_invites
  FOR SELECT USING (auth.uid() = inviter_id OR auth.uid() = used_by OR NOT used);

CREATE POLICY "friend_invites_insert" ON public.friend_invites
  FOR INSERT WITH CHECK (auth.uid() = inviter_id);

CREATE POLICY "friend_invites_update" ON public.friend_invites
  FOR UPDATE USING (true) WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_friend_invites_code ON public.friend_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_friend_invites_inviter ON public.friend_invites(inviter_id);

-- Create accept function
CREATE OR REPLACE FUNCTION public.accept_friend_invite(invite_code_param TEXT)
RETURNS UUID AS $$
DECLARE
  invite_record RECORD;
  friendship_id UUID;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO invite_record FROM public.friend_invites
  WHERE invite_code = invite_code_param AND used = FALSE AND expires_at > NOW();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invite code';
  END IF;
  
  IF invite_record.inviter_id = current_user_id THEN
    RAISE EXCEPTION 'Cannot accept your own invite';
  END IF;
  
  UPDATE public.friend_invites
  SET used = TRUE, used_by = current_user_id
  WHERE id = invite_record.id;
  
  INSERT INTO public.friends (user_id, friend_id, status)
  VALUES (invite_record.inviter_id, current_user_id, 'accepted')
  ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'accepted'
  RETURNING id INTO friendship_id;
  
  INSERT INTO public.friends (user_id, friend_id, status)
  VALUES (current_user_id, invite_record.inviter_id, 'accepted')
  ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'accepted';
  
  INSERT INTO public.notifications (user_id, type, title, message, related_id)
  VALUES (invite_record.inviter_id, 'friend_request', 'New Friend!', 
          'Someone accepted your friend invite!', friendship_id);
  
  RETURN friendship_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Force cache reload
COMMENT ON TABLE public.friend_invites IS 'Table for friend invite links';

-- Verify
SELECT 'friend_invites table created successfully!' as result;

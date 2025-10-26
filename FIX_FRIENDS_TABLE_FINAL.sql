-- ============================================================
-- FINAL FIX FOR FRIENDS TABLE
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Drop existing friends table if it exists (clean slate)
DROP TABLE IF EXISTS public.friends CASCADE;

-- 2. Create friends table with CORRECT foreign keys to user_profiles
CREATE TABLE public.friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- 3. Create index for performance
CREATE INDEX idx_friends_user_id ON public.friends(user_id);
CREATE INDEX idx_friends_friend_id ON public.friends(friend_id);
CREATE INDEX idx_friends_status ON public.friends(status);

-- 4. Create updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_friends_updated_at ON public.friends;
CREATE TRIGGER trg_friends_updated_at
  BEFORE UPDATE ON public.friends
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Enable Row Level Security
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies
DROP POLICY IF EXISTS "friends_select" ON public.friends;
CREATE POLICY "friends_select" ON public.friends
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

DROP POLICY IF EXISTS "friends_insert" ON public.friends;
CREATE POLICY "friends_insert" ON public.friends
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "friends_update" ON public.friends;
CREATE POLICY "friends_update" ON public.friends
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);

DROP POLICY IF EXISTS "friends_delete" ON public.friends;
CREATE POLICY "friends_delete" ON public.friends
  FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- 7. Force PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- 8. Verify table exists
SELECT 
  schemaname, 
  tablename, 
  tableowner 
FROM pg_tables 
WHERE tablename = 'friends';

-- Expected output: one row with public.friends

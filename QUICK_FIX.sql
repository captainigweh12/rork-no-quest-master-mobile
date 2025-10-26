-- QUICK FIX for "Could not find table 'public.friends'" error
-- Run this SQL in your Supabase SQL Editor if you just need to add the friends table

-- 1. Check if friends table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'friends'
);

-- 2. If it doesn't exist, create it (this is safe to run multiple times)
CREATE TABLE IF NOT EXISTS public.friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT friends_unique_pair UNIQUE (user_id, friend_id)
);

-- 3. Enable RLS
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- 4. Add RLS Policies
DROP POLICY IF EXISTS "Users can view their friends" ON public.friends;
CREATE POLICY "Users can view their friends" ON public.friends
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

DROP POLICY IF EXISTS "Users can insert friend requests" ON public.friends;
CREATE POLICY "Users can insert friend requests" ON public.friends
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update friend requests" ON public.friends;
CREATE POLICY "Users can update friend requests" ON public.friends
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);

DROP POLICY IF EXISTS "Users can delete friend relationships" ON public.friends;
CREATE POLICY "Users can delete friend relationships" ON public.friends
  FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- 5. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON public.friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON public.friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_friends_status ON public.friends(status);

-- 6. Add updated_at trigger
CREATE OR REPLACE FUNCTION public.update_friends_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_friends_updated_at ON public.friends;
CREATE TRIGGER trigger_friends_updated_at
  BEFORE UPDATE ON public.friends
  FOR EACH ROW
  EXECUTE FUNCTION public.update_friends_updated_at();

-- 7. Verify the table was created successfully
SELECT 
  table_name,
  (SELECT COUNT(*) FROM public.friends) as row_count
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'friends';

-- Done! The friends table is now ready to use.

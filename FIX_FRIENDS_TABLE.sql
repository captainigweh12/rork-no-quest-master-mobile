-- ========================================
-- FIX: Create friends table with proper schema
-- ========================================
-- Run this in Supabase SQL Editor: https://app.supabase.com/project/YOUR_PROJECT/sql

-- Step 1: Ensure user_profiles table exists first
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  level INTEGER DEFAULT 1,
  current_xp INTEGER DEFAULT 0,
  xp_to_next_level INTEGER DEFAULT 100,
  total_points INTEGER DEFAULT 0,
  total_rejections INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create friends table (MUST reference user_profiles, not auth.users)
CREATE TABLE IF NOT EXISTS public.friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- Step 3: Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

-- Step 4: RLS Policies for user_profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.user_profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.user_profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Step 5: RLS Policies for friends
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

-- Step 6: Add indexes
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON public.friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON public.friends(friend_id);

-- Step 7: Add updated_at trigger for friends
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_friends_updated_at ON public.friends;
CREATE TRIGGER update_friends_updated_at
  BEFORE UPDATE ON public.friends
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Step 8: Add trigger to auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 9: Verify tables exist
DO $$ 
BEGIN 
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'friends') THEN
    RAISE NOTICE '✅ SUCCESS: friends table created and ready!';
  ELSE
    RAISE EXCEPTION '❌ ERROR: friends table was not created';
  END IF;
END $$;

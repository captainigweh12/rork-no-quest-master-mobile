-- ==============================================
-- Rejection Hero - Supabase Database Setup
-- ==============================================
-- Run this in your Supabase SQL Editor to create all tables
-- https://app.supabase.com/project/YOUR_PROJECT/sql

-- 1. Users table (extends Supabase auth.users)
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

-- 2. Friends table
CREATE TABLE IF NOT EXISTS public.friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  friend_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- 3. Friend invites table (for invite links)
CREATE TABLE IF NOT EXISTS public.friend_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE NOT NULL,
  email TEXT,
  used BOOLEAN DEFAULT FALSE,
  used_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- 4. Quests table
CREATE TABLE IF NOT EXISTS public.quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('daily', 'weekly', 'special')),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'extreme')),
  points INTEGER NOT NULL,
  xp INTEGER NOT NULL,
  min_no_required INTEGER DEFAULT 3,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  icon TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  location_address TEXT,
  is_from_friend BOOLEAN DEFAULT FALSE,
  sender_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Quest invites table (for sending quests to friends)
CREATE TABLE IF NOT EXISTS public.quest_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID REFERENCES public.quests(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE
);

-- 6. Quest progress table
CREATE TABLE IF NOT EXISTS public.quest_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id UUID REFERENCES public.quests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  no_count INTEGER DEFAULT 0,
  yes_count INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(quest_id, user_id)
);

-- 7. Place queue table (for map functionality)
CREATE TABLE IF NOT EXISTS public.place_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  quest_id UUID REFERENCES public.quests(id) ON DELETE CASCADE,
  place_name TEXT NOT NULL,
  place_address TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 8. Chat messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('quest_invite', 'friend_request', 'quest_completed', 'chat_message')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  related_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==============================================
-- Enable Row Level Security
-- ==============================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quest_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quest_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.place_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- RLS Policies for user_profiles
-- ==============================================
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.user_profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.user_profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ==============================================
-- RLS Policies for friends
-- ==============================================
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

-- ==============================================
-- RLS Policies for friend_invites
-- ==============================================
DROP POLICY IF EXISTS "Users can view their invites" ON public.friend_invites;
CREATE POLICY "Users can view their invites" ON public.friend_invites
  FOR SELECT USING (auth.uid() = inviter_id OR auth.uid() = used_by);

DROP POLICY IF EXISTS "Users can create invites" ON public.friend_invites;
CREATE POLICY "Users can create invites" ON public.friend_invites
  FOR INSERT WITH CHECK (auth.uid() = inviter_id);

DROP POLICY IF EXISTS "Anyone can update invite usage" ON public.friend_invites;
CREATE POLICY "Anyone can update invite usage" ON public.friend_invites
  FOR UPDATE USING (true);

-- ==============================================
-- RLS Policies for quests
-- ==============================================
DROP POLICY IF EXISTS "Users can view their own quests" ON public.quests;
CREATE POLICY "Users can view their own quests" ON public.quests
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create quests" ON public.quests;
CREATE POLICY "Users can create quests" ON public.quests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their quests" ON public.quests;
CREATE POLICY "Users can update their quests" ON public.quests
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their quests" ON public.quests;
CREATE POLICY "Users can delete their quests" ON public.quests
  FOR DELETE USING (auth.uid() = user_id);

-- ==============================================
-- RLS Policies for quest_invites
-- ==============================================
DROP POLICY IF EXISTS "Users can view quest invites they sent or received" ON public.quest_invites;
CREATE POLICY "Users can view quest invites they sent or received" ON public.quest_invites
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can send quest invites" ON public.quest_invites;
CREATE POLICY "Users can send quest invites" ON public.quest_invites
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can update quest invites they received" ON public.quest_invites;
CREATE POLICY "Users can update quest invites they received" ON public.quest_invites
  FOR UPDATE USING (auth.uid() = receiver_id);

-- ==============================================
-- RLS Policies for quest_progress
-- ==============================================
DROP POLICY IF EXISTS "Users can view their quest progress" ON public.quest_progress;
CREATE POLICY "Users can view their quest progress" ON public.quest_progress
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their quest progress" ON public.quest_progress;
CREATE POLICY "Users can insert their quest progress" ON public.quest_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their quest progress" ON public.quest_progress;
CREATE POLICY "Users can update their quest progress" ON public.quest_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- ==============================================
-- RLS Policies for place_queue
-- ==============================================
DROP POLICY IF EXISTS "Users can view their place queue" ON public.place_queue;
CREATE POLICY "Users can view their place queue" ON public.place_queue
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can add to their place queue" ON public.place_queue;
CREATE POLICY "Users can add to their place queue" ON public.place_queue
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their place queue" ON public.place_queue;
CREATE POLICY "Users can update their place queue" ON public.place_queue
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete from their place queue" ON public.place_queue;
CREATE POLICY "Users can delete from their place queue" ON public.place_queue
  FOR DELETE USING (auth.uid() = user_id);

-- ==============================================
-- RLS Policies for chat_messages
-- ==============================================
DROP POLICY IF EXISTS "Users can view messages they sent or received" ON public.chat_messages;
CREATE POLICY "Users can view messages they sent or received" ON public.chat_messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can send messages" ON public.chat_messages;
CREATE POLICY "Users can send messages" ON public.chat_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can update messages they received" ON public.chat_messages;
CREATE POLICY "Users can update messages they received" ON public.chat_messages
  FOR UPDATE USING (auth.uid() = receiver_id);

-- ==============================================
-- RLS Policies for notifications
-- ==============================================
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
CREATE POLICY "Users can view their notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can create notifications" ON public.notifications;
CREATE POLICY "Anyone can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;
CREATE POLICY "Users can update their notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- ==============================================
-- Create indexes for better performance
-- ==============================================
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON public.friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON public.friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_quests_user_id ON public.quests(user_id);
CREATE INDEX IF NOT EXISTS idx_quest_invites_receiver_id ON public.quest_invites(receiver_id);
CREATE INDEX IF NOT EXISTS idx_quest_progress_quest_id ON public.quest_progress(quest_id);
CREATE INDEX IF NOT EXISTS idx_place_queue_user_id ON public.place_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver_id ON public.chat_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- ==============================================
-- Function to automatically create user profile on signup
-- ==============================================
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

-- ==============================================
-- Trigger to create user profile on signup
-- ==============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================
-- Function to update updated_at timestamp
-- ==============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- Trigger for friends table
-- ==============================================
DROP TRIGGER IF EXISTS update_friends_updated_at ON public.friends;
CREATE TRIGGER update_friends_updated_at
  BEFORE UPDATE ON public.friends
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ==============================================
-- Function to handle friend invite acceptance
-- ==============================================
CREATE OR REPLACE FUNCTION public.accept_friend_invite(invite_code_param TEXT)
RETURNS UUID AS $$
DECLARE
  invite_record RECORD;
  friendship_id UUID;
BEGIN
  SELECT * INTO invite_record
  FROM public.friend_invites
  WHERE invite_code = invite_code_param
    AND used = FALSE
    AND expires_at > NOW();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invite code';
  END IF;
  
  UPDATE public.friend_invites
  SET used = TRUE, used_by = auth.uid()
  WHERE id = invite_record.id;
  
  INSERT INTO public.friends (user_id, friend_id, status)
  VALUES (invite_record.inviter_id, auth.uid(), 'accepted')
  RETURNING id INTO friendship_id;
  
  INSERT INTO public.friends (user_id, friend_id, status)
  VALUES (auth.uid(), invite_record.inviter_id, 'accepted');
  
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

-- ==============================================
-- Success Message
-- ==============================================
DO $$ 
BEGIN 
  RAISE NOTICE 'Database setup complete! All tables, policies, and functions have been created.';
END $$;

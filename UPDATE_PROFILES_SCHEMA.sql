-- Add avatar_url and subscription_tier to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'hero', 'team')),
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS daily_challenges_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_challenge_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create storage bucket for profile pictures
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: anyone can view avatars
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Storage policy: users can upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policy: users can update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policy: users can delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Function to reset daily challenges counter
CREATE OR REPLACE FUNCTION public.reset_daily_challenges()
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET daily_challenges_used = 0,
      last_challenge_reset = NOW()
  WHERE last_challenge_reset < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job to reset daily challenges (if pg_cron is available)
-- SELECT cron.schedule('reset-daily-challenges', '0 0 * * *', 'SELECT public.reset_daily_challenges()');

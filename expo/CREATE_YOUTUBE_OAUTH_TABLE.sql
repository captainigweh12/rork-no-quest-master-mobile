-- =====================================================
-- YouTube OAuth Token Storage
-- =====================================================
-- This table securely stores YouTube OAuth tokens for users
-- Tokens are used to authenticate YouTube API requests
-- =====================================================

-- Create youtube_oauth_tokens table
CREATE TABLE IF NOT EXISTS public.youtube_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  scope TEXT,
  channel_id TEXT,
  channel_title TEXT,
  channel_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.youtube_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own tokens
CREATE POLICY "Users can view their own YouTube tokens"
  ON public.youtube_oauth_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own YouTube tokens"
  ON public.youtube_oauth_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own YouTube tokens"
  ON public.youtube_oauth_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own YouTube tokens"
  ON public.youtube_oauth_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_youtube_oauth_user ON public.youtube_oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_youtube_oauth_channel ON public.youtube_oauth_tokens(channel_id);

-- =====================================================
-- Extend live_streams table for YouTube integration
-- =====================================================

-- Add YouTube-specific fields to existing live_streams table
ALTER TABLE public.live_streams 
ADD COLUMN IF NOT EXISTS youtube_broadcast_id TEXT,
ADD COLUMN IF NOT EXISTS youtube_stream_id TEXT,
ADD COLUMN IF NOT EXISTS youtube_stream_key TEXT,
ADD COLUMN IF NOT EXISTS youtube_stream_url TEXT,
ADD COLUMN IF NOT EXISTS youtube_watch_url TEXT,
ADD COLUMN IF NOT EXISTS youtube_rtmp_url TEXT,
ADD COLUMN IF NOT EXISTS stream_platform TEXT DEFAULT 'daily',
ADD COLUMN IF NOT EXISTS privacy_status TEXT DEFAULT 'public',
ADD COLUMN IF NOT EXISTS scheduled_start_time TIMESTAMP WITH TIME ZONE;

-- Add check constraint for stream_platform
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'live_streams_platform_check'
  ) THEN
    ALTER TABLE public.live_streams 
    ADD CONSTRAINT live_streams_platform_check 
    CHECK (stream_platform IN ('daily', 'youtube', 'videosdk'));
  END IF;
END $$;

-- Add check constraint for privacy_status
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'live_streams_privacy_check'
  ) THEN
    ALTER TABLE public.live_streams 
    ADD CONSTRAINT live_streams_privacy_check 
    CHECK (privacy_status IN ('public', 'unlisted', 'private'));
  END IF;
END $$;

-- Create indexes for YouTube fields
CREATE INDEX IF NOT EXISTS idx_live_streams_youtube_broadcast ON public.live_streams(youtube_broadcast_id) WHERE youtube_broadcast_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_live_streams_platform ON public.live_streams(stream_platform);
CREATE INDEX IF NOT EXISTS idx_live_streams_scheduled ON public.live_streams(scheduled_start_time) WHERE scheduled_start_time IS NOT NULL;

-- =====================================================
-- Function to update updated_at timestamp
-- =====================================================

CREATE OR REPLACE FUNCTION update_youtube_oauth_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_youtube_oauth_updated_at ON public.youtube_oauth_tokens;
CREATE TRIGGER trigger_youtube_oauth_updated_at
BEFORE UPDATE ON public.youtube_oauth_tokens
FOR EACH ROW
EXECUTE FUNCTION update_youtube_oauth_updated_at();

-- =====================================================
-- Function to check if token is expired
-- =====================================================

CREATE OR REPLACE FUNCTION is_youtube_token_expired(token_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  token_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT expires_at INTO token_expires_at
  FROM public.youtube_oauth_tokens
  WHERE id = token_id;
  
  IF token_expires_at IS NULL THEN
    RETURN TRUE;
  END IF;
  
  RETURN NOW() >= token_expires_at;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Function to get user's YouTube token if valid
-- =====================================================

CREATE OR REPLACE FUNCTION get_valid_youtube_token(p_user_id UUID)
RETURNS TABLE (
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  channel_id TEXT,
  is_expired BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.access_token,
    t.refresh_token,
    t.expires_at,
    t.channel_id,
    (NOW() >= t.expires_at) as is_expired
  FROM public.youtube_oauth_tokens t
  WHERE t.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Comments for documentation
-- =====================================================

COMMENT ON TABLE public.youtube_oauth_tokens IS 'Stores YouTube OAuth 2.0 tokens for authenticated users';
COMMENT ON COLUMN public.youtube_oauth_tokens.access_token IS 'OAuth access token for YouTube API requests';
COMMENT ON COLUMN public.youtube_oauth_tokens.refresh_token IS 'OAuth refresh token to obtain new access tokens';
COMMENT ON COLUMN public.youtube_oauth_tokens.expires_at IS 'Timestamp when the access token expires';
COMMENT ON COLUMN public.youtube_oauth_tokens.channel_id IS 'YouTube channel ID associated with the token';
COMMENT ON COLUMN public.youtube_oauth_tokens.channel_url IS 'Full URL to the YouTube channel';

COMMENT ON COLUMN public.live_streams.youtube_broadcast_id IS 'YouTube broadcast ID for live streams';
COMMENT ON COLUMN public.live_streams.youtube_stream_id IS 'YouTube stream ID for RTMP ingestion';
COMMENT ON COLUMN public.live_streams.youtube_stream_key IS 'RTMP stream key for broadcasting';
COMMENT ON COLUMN public.live_streams.youtube_rtmp_url IS 'Full RTMP URL for streaming';
COMMENT ON COLUMN public.live_streams.youtube_watch_url IS 'Public watch URL for the live stream';
COMMENT ON COLUMN public.live_streams.stream_platform IS 'Platform used for streaming (daily, youtube, videosdk)';
COMMENT ON COLUMN public.live_streams.privacy_status IS 'YouTube privacy status (public, unlisted, private)';
COMMENT ON COLUMN public.live_streams.scheduled_start_time IS 'Scheduled start time for the stream';

-- =====================================================
-- Grant permissions (if needed)
-- =====================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant permissions on youtube_oauth_tokens table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.youtube_oauth_tokens TO authenticated;

-- Grant permissions on live_streams table (should already exist)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_streams TO authenticated;

-- =====================================================
-- Verification queries
-- =====================================================

-- Verify table creation
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'youtube_oauth_tokens'
  ) THEN
    RAISE NOTICE 'Table youtube_oauth_tokens created successfully';
  ELSE
    RAISE EXCEPTION 'Failed to create youtube_oauth_tokens table';
  END IF;
END $$;

-- Verify columns added to live_streams
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'live_streams'
    AND column_name = 'youtube_broadcast_id'
  ) THEN
    RAISE NOTICE 'YouTube columns added to live_streams successfully';
  ELSE
    RAISE EXCEPTION 'Failed to add YouTube columns to live_streams';
  END IF;
END $$;

-- =====================================================
-- Sample queries for testing
-- =====================================================

-- Check if user has valid YouTube token
-- SELECT * FROM get_valid_youtube_token('user-uuid-here');

-- Get all YouTube-enabled streams
-- SELECT * FROM public.live_streams WHERE stream_platform = 'youtube';

-- Get expired tokens that need refresh
-- SELECT user_id, channel_id, expires_at 
-- FROM public.youtube_oauth_tokens 
-- WHERE expires_at < NOW();

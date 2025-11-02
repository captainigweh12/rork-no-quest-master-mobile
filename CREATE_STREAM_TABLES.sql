-- Create live_streams table
CREATE TABLE IF NOT EXISTS public.live_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  streamer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  quest_id TEXT,
  quest_title TEXT,
  thumbnail_url TEXT,
  viewer_count INTEGER DEFAULT 0,
  is_live BOOLEAN DEFAULT true,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create stream_viewers table
CREATE TABLE IF NOT EXISTS public.stream_viewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(stream_id, user_id)
);

-- Create stream_messages table (for live chat)
CREATE TABLE IF NOT EXISTS public.stream_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_live_streams_is_live ON public.live_streams(is_live) WHERE is_live = true;
CREATE INDEX IF NOT EXISTS idx_live_streams_streamer ON public.live_streams(streamer_id);
CREATE INDEX IF NOT EXISTS idx_stream_viewers_stream ON public.stream_viewers(stream_id);
CREATE INDEX IF NOT EXISTS idx_stream_viewers_user ON public.stream_viewers(user_id);
CREATE INDEX IF NOT EXISTS idx_stream_messages_stream ON public.stream_messages(stream_id);

-- Enable Row Level Security
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stream_viewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stream_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for live_streams
CREATE POLICY "Anyone can view live streams"
  ON public.live_streams FOR SELECT
  USING (is_live = true);

CREATE POLICY "Users can insert their own streams"
  ON public.live_streams FOR INSERT
  WITH CHECK (auth.uid() = streamer_id);

CREATE POLICY "Users can update their own streams"
  ON public.live_streams FOR UPDATE
  USING (auth.uid() = streamer_id);

CREATE POLICY "Users can delete their own streams"
  ON public.live_streams FOR DELETE
  USING (auth.uid() = streamer_id);

-- RLS Policies for stream_viewers
CREATE POLICY "Anyone can view stream viewers"
  ON public.stream_viewers FOR SELECT
  USING (true);

CREATE POLICY "Users can join streams"
  ON public.stream_viewers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave streams"
  ON public.stream_viewers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their viewer record"
  ON public.stream_viewers FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for stream_messages
CREATE POLICY "Anyone can view stream messages"
  ON public.stream_messages FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can send messages"
  ON public.stream_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages"
  ON public.stream_messages FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update viewer count
CREATE OR REPLACE FUNCTION update_stream_viewer_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.live_streams
    SET viewer_count = viewer_count + 1
    WHERE id = NEW.stream_id;
  ELSIF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.left_at IS NOT NULL) THEN
    UPDATE public.live_streams
    SET viewer_count = GREATEST(0, viewer_count - 1)
    WHERE id = COALESCE(NEW.stream_id, OLD.stream_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update viewer count
DROP TRIGGER IF EXISTS trigger_update_viewer_count ON public.stream_viewers;
CREATE TRIGGER trigger_update_viewer_count
AFTER INSERT OR UPDATE OR DELETE ON public.stream_viewers
FOR EACH ROW
EXECUTE FUNCTION update_stream_viewer_count();

-- Function to auto-end streams after inactivity
CREATE OR REPLACE FUNCTION auto_end_inactive_streams()
RETURNS void AS $$
BEGIN
  UPDATE public.live_streams
  SET is_live = false,
      ended_at = NOW()
  WHERE is_live = true
    AND started_at < NOW() - INTERVAL '6 hours';
END;
$$ LANGUAGE plpgsql;

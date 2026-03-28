-- Fix RLS policies for live_streams table
-- The issue is that the INSERT policy requires streamer_id = auth.uid()
-- but the insert doesn't always include streamer_id

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view live streams" ON public.live_streams;
DROP POLICY IF EXISTS "Users can insert their own streams" ON public.live_streams;
DROP POLICY IF EXISTS "Users can update their own streams" ON public.live_streams;
DROP POLICY IF EXISTS "Users can delete their own streams" ON public.live_streams;

-- Recreate policies with better error handling

-- Anyone can view live streams
CREATE POLICY "Anyone can view live streams"
  ON public.live_streams FOR SELECT
  USING (is_live = true);

-- Authenticated users can insert streams (we'll set streamer_id via trigger)
CREATE POLICY "Authenticated users can insert streams"
  ON public.live_streams FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own streams
CREATE POLICY "Users can update their own streams"
  ON public.live_streams FOR UPDATE
  USING (auth.uid() = streamer_id);

-- Users can delete their own streams
CREATE POLICY "Users can delete their own streams"
  ON public.live_streams FOR DELETE
  USING (auth.uid() = streamer_id);

-- Create a trigger to automatically set streamer_id if not provided
CREATE OR REPLACE FUNCTION set_streamer_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.streamer_id IS NULL THEN
    NEW.streamer_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_set_streamer_id ON public.live_streams;
CREATE TRIGGER trigger_set_streamer_id
BEFORE INSERT ON public.live_streams
FOR EACH ROW
EXECUTE FUNCTION set_streamer_id();

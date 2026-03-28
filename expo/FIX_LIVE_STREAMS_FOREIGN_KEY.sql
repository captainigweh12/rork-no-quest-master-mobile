-- Fix foreign key relationship for live_streams table
-- The issue: streamer_id references auth.users but we need to join with user_profiles

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE public.live_streams
DROP CONSTRAINT IF EXISTS live_streams_streamer_id_fkey;

-- Step 2: Add new foreign key constraint to user_profiles
ALTER TABLE public.live_streams
ADD CONSTRAINT live_streams_streamer_id_fkey
FOREIGN KEY (streamer_id)
REFERENCES public.user_profiles(id)
ON DELETE CASCADE;

-- Step 3: Update the INSERT RLS policy to work with user_profiles
DROP POLICY IF EXISTS "Authenticated users can insert streams" ON public.live_streams;
DROP POLICY IF EXISTS "Users can insert their own streams" ON public.live_streams;

CREATE POLICY "Users can insert their own streams"
  ON public.live_streams FOR INSERT
  WITH CHECK (auth.uid() = streamer_id);

-- Step 4: Ensure indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_live_streams_streamer ON public.live_streams(streamer_id);

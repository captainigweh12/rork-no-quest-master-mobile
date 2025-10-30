-- Add username field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Create index for username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Update existing users to have a default username (based on email)
UPDATE public.profiles 
SET username = SPLIT_PART(email, '@', 1) || '_' || substr(id::text, 1, 8)
WHERE username IS NULL;

-- Add comment
COMMENT ON COLUMN public.profiles.username IS 'Unique username for the user, can be set during onboarding or in profile settings';

-- Fix the teams table RLS policy for INSERT
-- The current policy is correct but we need to ensure it works properly

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can create teams" ON public.teams;

-- Recreate with a more explicit policy
CREATE POLICY "Users can create teams" ON public.teams
  FOR INSERT 
  WITH CHECK (
    auth.uid() IS NOT NULL AND 
    auth.uid() = owner_id
  );

-- Also ensure the trigger function has proper permissions
-- Recreate the trigger function with SECURITY DEFINER to bypass RLS during trigger execution
CREATE OR REPLACE FUNCTION public.handle_new_team()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert the owner as a team member with owner role
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_team_created ON public.teams;
CREATE TRIGGER on_team_created
  AFTER INSERT ON public.teams
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_team();

-- Verify the policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'teams';

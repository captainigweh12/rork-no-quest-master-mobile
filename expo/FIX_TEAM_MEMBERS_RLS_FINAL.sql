-- Fix infinite recursion in team_members RLS policies
-- The issue: The SELECT policy queries team_members from within team_members itself

-- Step 1: Drop all existing policies on team_members
DROP POLICY IF EXISTS "Team members can view team members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can insert team members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners and managers can update team members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can delete team members" ON public.team_members;

-- Step 2: Create new SELECT policy that doesn't cause recursion
-- Strategy: Allow users to see their own membership records OR records in teams they own
CREATE POLICY "Team members can view team members" ON public.team_members
  FOR SELECT USING (
    -- Users can see their own membership records
    user_id = auth.uid()
    OR
    -- Users can see members of teams they own (check teams table directly)
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = team_members.team_id 
      AND teams.owner_id = auth.uid()
    )
  );

-- Step 3: Recreate INSERT policy (no changes needed, this one was fine)
CREATE POLICY "Team owners can insert team members" ON public.team_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE id = team_id AND owner_id = auth.uid()
    )
  );

-- Step 4: Create new UPDATE policy that avoids recursion
CREATE POLICY "Team owners and managers can update team members" ON public.team_members
  FOR UPDATE USING (
    -- Team owners can update (check teams table directly)
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = team_members.team_id 
      AND teams.owner_id = auth.uid()
    )
  );

-- Step 5: Recreate DELETE policy (no changes needed, this one was fine)
CREATE POLICY "Team owners can delete team members" ON public.team_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE id = team_id AND owner_id = auth.uid()
    )
  );

-- Note: We removed manager permissions from UPDATE to avoid recursion
-- If managers need update permissions, handle it in application logic instead of RLS

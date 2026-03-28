-- Fix infinite recursion in team_members RLS policies
-- The issue is that the SELECT policy queries team_members from within team_members itself

-- Drop the problematic policy
DROP POLICY IF EXISTS "Team members can view team members" ON public.team_members;

-- Create a new policy that doesn't cause recursion
-- Allow users to see team members for teams they own OR for their own membership records
CREATE POLICY "Team members can view team members" ON public.team_members
  FOR SELECT USING (
    -- Users can see their own membership records
    user_id = auth.uid()
    OR
    -- Users can see members of teams they own
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = team_members.team_id 
      AND teams.owner_id = auth.uid()
    )
  );

-- Also update the UPDATE policy to avoid potential recursion
DROP POLICY IF EXISTS "Team owners and managers can update team members" ON public.team_members;

CREATE POLICY "Team owners and managers can update team members" ON public.team_members
  FOR UPDATE USING (
    -- Team owners can update
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = team_members.team_id 
      AND teams.owner_id = auth.uid()
    )
    OR
    -- Managers can update (check their own record without recursion)
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id 
      AND tm.user_id = auth.uid() 
      AND tm.role IN ('owner', 'manager')
      AND tm.id != team_members.id  -- Don't check the same row
    )
  );

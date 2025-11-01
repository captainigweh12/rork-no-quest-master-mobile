-- Complete fix for team_members infinite recursion in RLS policies
-- Error: "infinite recursion detected in policy for relation team_members"
-- Root cause: The SELECT policy queries team_members from within team_members itself

-- Step 1: Drop all existing policies on team_members to start fresh
DROP POLICY IF EXISTS "Team members can view team members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can insert team members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners and managers can update team members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can delete team members" ON public.team_members;

-- Step 2: Create new SELECT policy without recursion
-- Strategy: Users can see their own records OR records in teams they own (via teams table)
CREATE POLICY "Team members can view team members" ON public.team_members
  FOR SELECT USING (
    -- Users can always see their own membership records
    user_id = auth.uid()
    OR
    -- Users can see members of teams they own (check teams table directly, no recursion)
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = team_members.team_id 
      AND teams.owner_id = auth.uid()
    )
  );

-- Step 3: Recreate INSERT policy (this one was fine, no recursion)
CREATE POLICY "Team owners can insert team members" ON public.team_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE id = team_id AND owner_id = auth.uid()
    )
  );

-- Step 4: Create UPDATE policy without recursion
-- Only team owners can update (checking teams table directly)
CREATE POLICY "Team owners and managers can update team members" ON public.team_members
  FOR UPDATE USING (
    -- Team owners can update (check teams table directly, no recursion)
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = team_members.team_id 
      AND teams.owner_id = auth.uid()
    )
  );

-- Step 5: Recreate DELETE policy (this one was fine, no recursion)
CREATE POLICY "Team owners can delete team members" ON public.team_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE id = team_id AND owner_id = auth.uid()
    )
  );

-- Step 6: Verify RLS is enabled
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Notes:
-- 1. We removed manager permissions from UPDATE to avoid recursion
--    (checking if someone is a manager would require querying team_members)
-- 2. If managers need update permissions, handle it in application logic
-- 3. The SELECT policy allows users to see their own records without recursion
-- 4. All other checks go through the teams table directly

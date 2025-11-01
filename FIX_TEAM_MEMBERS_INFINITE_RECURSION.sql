-- FINAL FIX for team_members infinite recursion
-- Error: "infinite recursion detected in policy for relation team_members"
-- Root cause: The SELECT policy on line 93-99 of CREATE_TEAMS_TABLES.sql queries 
-- team_members from within team_members itself

-- Step 1: Drop ALL existing policies on team_members
DROP POLICY IF EXISTS "Team members can view team members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can insert team members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners and managers can update team members" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can delete team members" ON public.team_members;

-- Step 2: Create SELECT policy WITHOUT recursion
-- Users can see:
-- 1. Their own membership records (direct check, no recursion)
-- 2. Members of teams they own (check via teams table, not team_members)
CREATE POLICY "Team members can view team members" ON public.team_members
  FOR SELECT USING (
    -- Users can always see their own membership records
    user_id = auth.uid()
    OR
    -- Users can see members of teams they own (NO recursion - check teams table)
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = team_members.team_id 
      AND teams.owner_id = auth.uid()
    )
  );

-- Step 3: Create INSERT policy (no recursion here)
CREATE POLICY "Team owners can insert team members" ON public.team_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE id = team_id AND owner_id = auth.uid()
    )
  );

-- Step 4: Create UPDATE policy WITHOUT recursion
-- Only team owners can update (check teams table directly)
CREATE POLICY "Team owners and managers can update team members" ON public.team_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = team_members.team_id 
      AND teams.owner_id = auth.uid()
    )
  );

-- Step 5: Create DELETE policy (no recursion here)
CREATE POLICY "Team owners can delete team members" ON public.team_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE id = team_id AND owner_id = auth.uid()
    )
  );

-- Step 6: Verify RLS is enabled
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Verification: Run this query to check the policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies 
-- WHERE tablename = 'team_members';

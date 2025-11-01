-- =========================================
-- FIX INFINITE RECURSION IN TEAM_MEMBERS RLS
-- =========================================

-- The issue: team_members SELECT policy was querying team_members itself,
-- creating infinite recursion.
-- Solution: Use a simpler approach that checks team ownership directly
-- or uses a security definer function to bypass RLS during checks.

-- 1) Drop all existing team_members policies
DROP POLICY IF EXISTS team_members_select_visible_to_members ON public.team_members;
DROP POLICY IF EXISTS team_members_insert_owner_or_manager_or_self_owner ON public.team_members;
DROP POLICY IF EXISTS team_members_update_owner_or_manager ON public.team_members;
DROP POLICY IF EXISTS team_members_delete_owner_or_manager ON public.team_members;

-- 2) Create a security definer function to check team membership
-- This function runs with elevated privileges and bypasses RLS
CREATE OR REPLACE FUNCTION public.is_team_member(check_team_id UUID, check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = check_team_id AND user_id = check_user_id
  );
END;
$$;

-- 3) Create a security definer function to check if user is team owner/manager
CREATE OR REPLACE FUNCTION public.is_team_owner_or_manager(check_team_id UUID, check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = check_team_id 
      AND user_id = check_user_id 
      AND role IN ('owner', 'manager')
  );
END;
$$;

-- 4) New SELECT policy - allows users to see team_members for teams they belong to
-- Uses the security definer function to avoid recursion
CREATE POLICY team_members_select_visible
ON public.team_members
FOR SELECT
TO authenticated
USING (
  -- User can see team members if they are a member of that team
  public.is_team_member(team_id, auth.uid())
  -- OR if they are the team owner (checked via teams table directly, no recursion)
  OR EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = team_members.team_id
      AND t.owner_id = auth.uid()
  )
);

-- 5) INSERT policy - owner can add themselves during team creation,
-- or owner/manager can add others
CREATE POLICY team_members_insert_by_owner_or_manager
ON public.team_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- Owner inserting themselves (during team creation via trigger)
  (
    user_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_members.team_id
        AND t.owner_id = auth.uid()
    )
  )
  -- OR owner/manager adding someone else
  OR public.is_team_owner_or_manager(team_id, auth.uid())
);

-- 6) UPDATE policy - only owner/manager can update roles
CREATE POLICY team_members_update_by_owner_or_manager
ON public.team_members
FOR UPDATE
TO authenticated
USING (public.is_team_owner_or_manager(team_id, auth.uid()))
WITH CHECK (public.is_team_owner_or_manager(team_id, auth.uid()));

-- 7) DELETE policy - only owner/manager can remove members
CREATE POLICY team_members_delete_by_owner_or_manager
ON public.team_members
FOR DELETE
TO authenticated
USING (public.is_team_owner_or_manager(team_id, auth.uid()));

-- 8) Now update other tables' policies to use the security definer function
-- This prevents them from also causing recursion

-- Teams policies (no changes needed, already don't reference team_members in problematic way)

-- Team tasks policies - update to use security definer function
DROP POLICY IF EXISTS team_tasks_select_members ON public.team_tasks;
CREATE POLICY team_tasks_select_members
ON public.team_tasks
FOR SELECT
TO authenticated
USING (
  public.is_team_member(team_id, auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = team_tasks.team_id
      AND t.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS team_tasks_insert_member_and_creator_is_self ON public.team_tasks;
CREATE POLICY team_tasks_insert_member_and_creator_is_self
ON public.team_tasks
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND public.is_team_member(team_id, auth.uid())
);

DROP POLICY IF EXISTS team_tasks_update_creator_or_manager ON public.team_tasks;
CREATE POLICY team_tasks_update_creator_or_manager
ON public.team_tasks
FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  OR public.is_team_owner_or_manager(team_id, auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = team_tasks.team_id
      AND t.owner_id = auth.uid()
  )
)
WITH CHECK (
  created_by = auth.uid()
  OR public.is_team_owner_or_manager(team_id, auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = team_tasks.team_id
      AND t.owner_id = auth.uid()
  )
);

-- Team task assignments - update to use security definer function
DROP POLICY IF EXISTS team_task_assignments_select_assignee_or_team ON public.team_task_assignments;
CREATE POLICY team_task_assignments_select_assignee_or_team
ON public.team_task_assignments
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.team_tasks tt
    WHERE team_task_assignments.team_task_id = tt.id
      AND public.is_team_member(tt.team_id, auth.uid())
  )
);

DROP POLICY IF EXISTS team_task_assignments_insert_self_or_manager ON public.team_task_assignments;
CREATE POLICY team_task_assignments_insert_self_or_manager
ON public.team_task_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  -- Self-assign if you are a member
  (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.team_tasks tt
      WHERE team_task_assignments.team_task_id = tt.id
        AND public.is_team_member(tt.team_id, auth.uid())
    )
  )
  -- OR manager/owner assigning
  OR EXISTS (
    SELECT 1
    FROM public.team_tasks tt
    WHERE team_task_assignments.team_task_id = tt.id
      AND public.is_team_owner_or_manager(tt.team_id, auth.uid())
  )
);

DROP POLICY IF EXISTS team_task_assignments_update_assignee_or_manager ON public.team_task_assignments;
CREATE POLICY team_task_assignments_update_assignee_or_manager
ON public.team_task_assignments
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.team_tasks tt
    WHERE team_task_assignments.team_task_id = tt.id
      AND public.is_team_owner_or_manager(tt.team_id, auth.uid())
  )
)
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.team_tasks tt
    WHERE team_task_assignments.team_task_id = tt.id
      AND public.is_team_owner_or_manager(tt.team_id, auth.uid())
  )
);

DROP POLICY IF EXISTS team_task_assignments_delete_assignee_or_manager ON public.team_task_assignments;
CREATE POLICY team_task_assignments_delete_assignee_or_manager
ON public.team_task_assignments
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.team_tasks tt
    WHERE team_task_assignments.team_task_id = tt.id
      AND public.is_team_owner_or_manager(tt.team_id, auth.uid())
  )
);

-- Team invites - update to use security definer function
DROP POLICY IF EXISTS team_invites_select_team_owner_or_member_or_invitee ON public.team_invites;
CREATE POLICY team_invites_select_team_owner_or_member_or_invitee
ON public.team_invites
FOR SELECT
TO authenticated
USING (
  public.is_team_member(team_id, auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = team_invites.team_id
      AND t.owner_id = auth.uid()
  )
  OR invitee_id = auth.uid()
);

DROP POLICY IF EXISTS team_invites_insert_owner_or_manager ON public.team_invites;
CREATE POLICY team_invites_insert_owner_or_manager
ON public.team_invites
FOR INSERT
TO authenticated
WITH CHECK (
  inviter_id = auth.uid()
  AND (
    public.is_team_owner_or_manager(team_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_invites.team_id
        AND t.owner_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS team_invites_update_inviter_owner_manager_or_invitee ON public.team_invites;
CREATE POLICY team_invites_update_inviter_owner_manager_or_invitee
ON public.team_invites
FOR UPDATE
TO authenticated
USING (
  inviter_id = auth.uid()
  OR invitee_id = auth.uid()
  OR public.is_team_owner_or_manager(team_id, auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = team_invites.team_id
      AND t.owner_id = auth.uid()
  )
)
WITH CHECK (
  inviter_id = auth.uid()
  OR invitee_id = auth.uid()
  OR public.is_team_owner_or_manager(team_id, auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = team_invites.team_id
      AND t.owner_id = auth.uid()
  )
);

-- Done! The recursion is now fixed by using security definer functions
-- that bypass RLS during membership checks.

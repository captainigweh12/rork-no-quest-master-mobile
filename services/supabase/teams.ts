import { supabase } from '@/lib/supabase';

/** =========================
 * Types (unchanged)
 * ========================= */
export interface Team {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'owner' | 'manager' | 'member';
  joined_at: string;
  user_profile?: {
    username: string;
    avatar_url: string | null;
    full_name: string | null;
  };
}

export interface TeamTask {
  id: string;
  team_id: string;
  created_by: string;
  title: string;
  description: string | null;
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  category: string | null;
  points: number;
  xp: number;
  min_no_required: number;
  duration_minutes: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by_profile?: {
    username: string;
    avatar_url: string | null;
  };
}

export interface TeamTaskAssignment {
  id: string;
  team_task_id: string;
  user_id: string;
  status: 'assigned' | 'in_progress' | 'completed' | 'failed';
  no_count: number;
  yes_count: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  team_task?: TeamTask;
  user_profile?: {
    username: string;
    avatar_url: string | null;
  };
}

export interface TeamInvite {
  id: string;
  team_id: string;
  inviter_id: string;
  invitee_email: string | null;
  invitee_id: string | null;
  invite_code: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  expires_at: string;
}

/** =========================
 * Internal helpers
 * ========================= */
async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user?.id) {
    console.error('[auth] requireUserId error:', error, data);
    throw new Error('User not authenticated');
  }
  return data.user.id;
}

function logAndThrow(label: string, err: any): never {
  try {
    console.error(`[${label}] Error:`, JSON.stringify(err, null, 2));
  } catch {
    console.error(`[${label}] Error:`, err);
  }
  throw err instanceof Error ? err : new Error(err?.message ?? String(err));
}

/** =========================
 * Teams
 * ========================= */

/**
 * Get all teams visible to the current user via RLS.
 * NOTE: We do NOT pre-query team_members; RLS already filters teams.
 */
export async function getUserTeams(): Promise<Team[]> {
  console.log('[getUserTeams] Fetching teams (RLS-scoped)');
  const { data, error } = await (supabase as any)
    .from('teams')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    logAndThrow('getUserTeams', error);
  }
  console.log('[getUserTeams] Found teams:', data?.length ?? 0);
  return data ?? [];
}

export async function getTeamById(teamId: string): Promise<Team | null> {
  console.log('[getTeamById] Fetching team:', teamId);
  const { data, error } = await (supabase as any)
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .single();

  if (error) logAndThrow('getTeamById', error);
  return data;
}

/**
 * Create a team using SECURITY DEFINER RPC that also inserts the owner membership.
 * Requires the SQL function: public.rpc_create_team(p_name text, p_description text)
 */
export async function createTeam(name: string, description: string | null): Promise<Team> {
  console.log('[createTeam] Creating via RPC:', { name, description });
  await requireUserId(); // ensure we have a session/JWT

  const { data, error } = await (supabase as any).rpc('rpc_create_team', {
    p_name: name,
    p_description: description,
  });

  if (error) logAndThrow('createTeam', error);
  console.log('[createTeam] Team created:', data?.id);
  return data as Team;
}

export async function updateTeam(
  teamId: string,
  updates: Partial<Pick<Team, 'name' | 'description' | 'avatar_url'>>
): Promise<Team> {
  console.log('[updateTeam] Updating team:', teamId, updates);

  const { data, error } = await (supabase as any)
    .from('teams')
    .update(updates as any)
    .eq('id', teamId)
    .select('*')
    .single();

  if (error) logAndThrow('updateTeam', error);
  return data as Team;
}

export async function deleteTeam(teamId: string): Promise<void> {
  console.log('[deleteTeam] Deleting team:', teamId);

  const { error } = await (supabase as any).from('teams').delete().eq('id', teamId);
  if (error) logAndThrow('deleteTeam', error);

  console.log('[deleteTeam] Team deleted');
}

/** =========================
 * Team Members
 * ========================= */

export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  console.log('[getTeamMembers] Fetching members for team:', teamId);

  // Keep your FK alias names; adjust if your constraint names differ
  const { data, error } = await supabase
    .from('team_members' as any)
    .select(
      `
      id, team_id, user_id, role, joined_at,
      user_profile:user_profiles!team_members_user_id_fkey (
        username,
        avatar_url,
        full_name
      )
    `
    )
    .eq('team_id', teamId)
    .order('joined_at', { ascending: true });

  if (error) logAndThrow('getTeamMembers', error);
  console.log('[getTeamMembers] Found members:', data?.length ?? 0);
  return (data ?? []) as TeamMember[];
}

export async function addTeamMember(
  teamId: string,
  userId: string,
  role: 'manager' | 'member' = 'member'
): Promise<TeamMember> {
  console.log('[addTeamMember] Adding member:', { teamId, userId, role });
  await requireUserId();

  const { data, error } = await supabase
    .from('team_members' as any)
    .insert({ team_id: teamId, user_id: userId, role } as any)
    .select('*')
    .single();

  if (error) logAndThrow('addTeamMember', error);
  console.log('[addTeamMember] Member added');
  return data as TeamMember;
}

export async function updateTeamMemberRole(
  teamId: string,
  userId: string,
  role: 'manager' | 'member'
): Promise<TeamMember> {
  console.log('[updateTeamMemberRole] Updating role:', { teamId, userId, role });

  const { data, error } = await supabase
    .from('team_members' as any)
    .update({ role } as any)
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error) logAndThrow('updateTeamMemberRole', error);
  return data as TeamMember;
}

export async function removeTeamMember(teamId: string, userId: string): Promise<void> {
  console.log('[removeTeamMember] Removing member:', { teamId, userId });

  const { error } = await supabase
    .from('team_members' as any)
    .delete()
    .eq('team_id', teamId)
    .eq('user_id', userId);

  if (error) logAndThrow('removeTeamMember', error);
  console.log('[removeTeamMember] Member removed');
}

/** =========================
 * Team Tasks
 * ========================= */

export async function getTeamTasks(teamId: string): Promise<TeamTask[]> {
  console.log('[getTeamTasks] Fetching tasks for team:', teamId);

  const { data, error } = await supabase
    .from('team_tasks' as any)
    .select(
      `
      id, team_id, created_by, title, description, difficulty, category,
      points, xp, min_no_required, duration_minutes, is_active, created_at, updated_at,
      created_by_profile:user_profiles!team_tasks_created_by_fkey (
        username, avatar_url
      )
    `
    )
    .eq('team_id', teamId)
    .order('created_at', { ascending: false });

  if (error) logAndThrow('getTeamTasks', error);
  console.log('[getTeamTasks] Found tasks:', data?.length ?? 0);
  return (data ?? []) as TeamTask[];
}

export async function createTeamTask(
  teamId: string,
  task: {
    title: string;
    description: string | null;
    difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
    category?: string | null;
    points?: number;
    xp?: number;
    min_no_required?: number;
    duration_minutes?: number | null;
  }
): Promise<TeamTask> {
  console.log('[createTeamTask] Creating task:', { teamId, task });
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from('team_tasks' as any)
    .insert({
      team_id: teamId,
      created_by: userId,
      title: task.title,
      description: task.description,
      difficulty: task.difficulty,
      category: task.category ?? null,
      points: task.points ?? 10,
      xp: task.xp ?? 10,
      min_no_required: task.min_no_required ?? 3,
      duration_minutes: task.duration_minutes ?? null,
    } as any)
    .select('*')
    .single();

  if (error) logAndThrow('createTeamTask', error);
  console.log('[createTeamTask] Task created:', (data as any)?.id);
  return data as TeamTask;
}

export async function updateTeamTask(
  taskId: string,
  updates: Partial<
    Pick<
      TeamTask,
      | 'title'
      | 'description'
      | 'difficulty'
      | 'category'
      | 'points'
      | 'xp'
      | 'min_no_required'
      | 'duration_minutes'
      | 'is_active'
    >
  >
): Promise<TeamTask> {
  console.log('[updateTeamTask] Updating task:', taskId, updates);

  const { data, error } = await supabase
    .from('team_tasks' as any)
    .update(updates as any)
    .eq('id', taskId)
    .select('*')
    .single();

  if (error) logAndThrow('updateTeamTask', error);
  return data as TeamTask;
}

export async function deleteTeamTask(taskId: string): Promise<void> {
  console.log('[deleteTeamTask] Deleting task:', taskId);

  const { error } = await (supabase as any).from('team_tasks').delete().eq('id', taskId);
  if (error) logAndThrow('deleteTeamTask', error);

  console.log('[deleteTeamTask] Task deleted');
}

/** =========================
 * Task Assignments
 * ========================= */

export async function assignTaskToMember(taskId: string, userId: string): Promise<TeamTaskAssignment> {
  console.log('[assignTaskToMember] Assigning task:', { taskId, userId });
  await requireUserId();

  const { data, error } = await supabase
    .from('team_task_assignments' as any)
    .insert({
      team_task_id: taskId,
      user_id: userId,
      status: 'assigned',
    } as any)
    .select('*')
    .single();

  if (error) logAndThrow('assignTaskToMember', error);
  console.log('[assignTaskToMember] Task assigned');
  return data as TeamTaskAssignment;
}

export async function getUserTeamTaskAssignments(userId: string): Promise<TeamTaskAssignment[]> {
  console.log('[getUserTeamTaskAssignments] Fetching assignments for user:', userId);

  const { data, error } = await supabase
    .from('team_task_assignments' as any)
    .select(
      `
      id, team_task_id, user_id, status, no_count, yes_count,
      started_at, completed_at, created_at,
      team_task:team_tasks!team_task_assignments_team_task_id_fkey (
        id, team_id, created_by, title, description, difficulty, category,
        points, xp, min_no_required, duration_minutes, is_active, created_at, updated_at,
        created_by_profile:user_profiles!team_tasks_created_by_fkey (
          username, avatar_url
        )
      )
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) logAndThrow('getUserTeamTaskAssignments', error);
  console.log('[getUserTeamTaskAssignments] Found assignments:', data?.length ?? 0);
  return (data ?? []) as TeamTaskAssignment[];
}

export async function updateTeamTaskAssignment(
  assignmentId: string,
  updates: Partial<Pick<TeamTaskAssignment, 'status' | 'no_count' | 'yes_count' | 'started_at' | 'completed_at'>>
): Promise<TeamTaskAssignment> {
  console.log('[updateTeamTaskAssignment] Updating assignment:', assignmentId, updates);

  const { data, error } = await supabase
    .from('team_task_assignments' as any)
    .update(updates as any)
    .eq('id', assignmentId)
    .select('*')
    .single();

  if (error) logAndThrow('updateTeamTaskAssignment', error);
  return data as TeamTaskAssignment;
}

/** =========================
 * Invites
 * ========================= */

export async function createTeamInvite(teamId: string, inviteeEmail?: string): Promise<TeamInvite> {
  const inviterId = await requireUserId();
  const inviteCode = `TEAM-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  console.log('[createTeamInvite] Creating invite:', { teamId, inviteCode, inviteeEmail });

  const { data, error } = await supabase
    .from('team_invites' as any)
    .insert({
      team_id: teamId,
      inviter_id: inviterId,
      invitee_email: inviteeEmail ?? null,
      invite_code: inviteCode,
    } as any)
    .select('*')
    .single();

  if (error) logAndThrow('createTeamInvite', error);
  console.log('[createTeamInvite] Invite created:', (data as any)?.id);
  return data as TeamInvite;
}

export async function acceptTeamInvite(inviteCode: string): Promise<TeamMember> {
  console.log('[acceptTeamInvite] Accepting invite:', inviteCode);
  const userId = await requireUserId();

  const { data: invite, error: inviteError } = await supabase
    .from('team_invites' as any)
    .select('*')
    .eq('invite_code', inviteCode)
    .eq('status', 'pending')
    .single();

  if (inviteError || !invite) {
    console.error('[acceptTeamInvite] Error fetching invite:', inviteError);
    throw new Error('Invalid or expired invite code');
  }

  const now = Date.now();
  const exp = new Date(invite.expires_at).getTime();
  if (Number.isFinite(exp) && exp < now) {
    throw new Error('This invite has expired');
  }

  // Add membership
  const { data: member, error: memberError } = await supabase
    .from('team_members' as any)
    .insert({
      team_id: invite.team_id,
      user_id: userId,
      role: 'member',
    } as any)
    .select('*')
    .single();

  if (memberError) logAndThrow('acceptTeamInvite.addMember', memberError);

  // Mark accepted
  const { error: updError } = await supabase
    .from('team_invites' as any)
    .update({ status: 'accepted', invitee_id: userId } as any)
    .eq('id', invite.id);

  if (updError) logAndThrow('acceptTeamInvite.updateInvite', updError);

  console.log('[acceptTeamInvite] Invite accepted');
  return member as TeamMember;
}

export async function getTeamAssignments(teamId: string): Promise<TeamTaskAssignment[]> {
  console.log('[getTeamAssignments] Fetching assignments for team:', teamId);

  const { data: tasks, error: tasksError } = await supabase
    .from('team_tasks' as any)
    .select('id')
    .eq('team_id', teamId);

  if (tasksError) logAndThrow('getTeamAssignments.fetchTasks', tasksError);
  if (!tasks || tasks.length === 0) return [];

  const taskIds = tasks.map((t) => t.id);

  const { data, error } = await supabase
    .from('team_task_assignments' as any)
    .select(
      `
      id, team_task_id, user_id, status, no_count, yes_count,
      started_at, completed_at, created_at,
      user_profile:user_profiles!team_task_assignments_user_id_fkey (
        username, avatar_url
      ),
      team_task:team_tasks!team_task_assignments_team_task_id_fkey (
        title, description, difficulty
      )
    `
    )
    .in('team_task_id', taskIds)
    .order('created_at', { ascending: false });

  if (error) logAndThrow('getTeamAssignments', error);
  console.log('[getTeamAssignments] Found assignments:', data?.length ?? 0);
  return (data ?? []) as TeamTaskAssignment[];
}

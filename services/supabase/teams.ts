import { supabase } from '@/lib/supabase';

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

export async function getUserTeams(userId: string): Promise<Team[]> {

  
  console.log('[getUserTeams] Fetching teams for user:', userId);
  
  const { data: teamMembers, error: memberError } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId);

  if (memberError) {
    console.error('[getUserTeams] Error fetching team memberships:', JSON.stringify(memberError, null, 2));
    console.error('[getUserTeams] Error details:', {
      message: memberError.message,
      details: memberError.details,
      hint: memberError.hint,
      code: memberError.code
    });
    return [];
  }

  if (!teamMembers || teamMembers.length === 0) {
    console.log('[getUserTeams] User is not a member of any teams');
    return [];
  }

  const teamIds = teamMembers.map((tm: { team_id: string }) => tm.team_id);

  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('*')
    .in('id', teamIds)
    .order('created_at', { ascending: false });

  if (teamsError) {
    console.error('[getUserTeams] Error fetching teams:', JSON.stringify(teamsError, null, 2));
    console.error('[getUserTeams] Error details:', {
      message: teamsError.message,
      details: teamsError.details,
      hint: teamsError.hint,
      code: teamsError.code
    });
    return [];
  }

  console.log('[getUserTeams] Found teams:', teams?.length || 0);
  return teams || [];
}

export async function getTeamById(teamId: string): Promise<Team | null> {

  
  console.log('[getTeamById] Fetching team:', teamId);
  
  const { data, error } = await supabase
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .single();

  if (error) {
    console.error('[getTeamById] Error:', error);
    throw error;
  }

  return data;
}

export async function createTeam(name: string, description: string | null): Promise<Team> {

  
  console.log('[createTeam] Creating team:', { name, description });
  
  const { data: userData, error: userError } = await supabase.auth.getUser();
  
  if (userError || !userData.user?.id) {
    console.error('[createTeam] Auth error:', JSON.stringify(userError, null, 2));
    console.error('[createTeam] User data:', userData);
    throw new Error('User not authenticated');
  }
  
  const { data, error } = await supabase
    .from('teams')
    .insert({
      name,
      description,
      owner_id: userData.user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('[createTeam] Error:', JSON.stringify(error, null, 2));
    console.error('[createTeam] Error details:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    throw error;
  }

  console.log('[createTeam] Team created:', data.id);
  return data;
}

export async function updateTeam(teamId: string, updates: Partial<Pick<Team, 'name' | 'description' | 'avatar_url'>>): Promise<Team> {

  
  console.log('[updateTeam] Updating team:', teamId, updates);
  
  const { data, error } = await supabase
    .from('teams')
    .update(updates)
    .eq('id', teamId)
    .select()
    .single();

  if (error) {
    console.error('[updateTeam] Error:', error);
    throw error;
  }

  return data;
}

export async function deleteTeam(teamId: string): Promise<void> {

  
  console.log('[deleteTeam] Deleting team:', teamId);
  
  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', teamId);

  if (error) {
    console.error('[deleteTeam] Error:', error);
    throw error;
  }

  console.log('[deleteTeam] Team deleted');
}

export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {

  
  console.log('[getTeamMembers] Fetching members for team:', teamId);
  
  const { data, error } = await supabase
    .from('team_members')
    .select(`
      *,
      user_profile:user_profiles!team_members_user_id_fkey (
        username,
        avatar_url,
        full_name
      )
    `)
    .eq('team_id', teamId)
    .order('joined_at', { ascending: true });

  if (error) {
    console.error('[getTeamMembers] Error:', error);
    throw error;
  }

  console.log('[getTeamMembers] Found members:', data?.length || 0);
  return data || [];
}

export async function addTeamMember(teamId: string, userId: string, role: 'manager' | 'member' = 'member'): Promise<TeamMember> {

  
  console.log('[addTeamMember] Adding member:', { teamId, userId, role });
  
  const { data, error } = await supabase
    .from('team_members')
    .insert({
      team_id: teamId,
      user_id: userId,
      role,
    })
    .select()
    .single();

  if (error) {
    console.error('[addTeamMember] Error:', error);
    throw error;
  }

  console.log('[addTeamMember] Member added');
  return data;
}

export async function updateTeamMemberRole(teamId: string, userId: string, role: 'manager' | 'member'): Promise<TeamMember> {

  
  console.log('[updateTeamMemberRole] Updating role:', { teamId, userId, role });
  
  const { data, error } = await supabase
    .from('team_members')
    .update({ role })
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('[updateTeamMemberRole] Error:', error);
    throw error;
  }

  return data;
}

export async function removeTeamMember(teamId: string, userId: string): Promise<void> {

  
  console.log('[removeTeamMember] Removing member:', { teamId, userId });
  
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('user_id', userId);

  if (error) {
    console.error('[removeTeamMember] Error:', error);
    throw error;
  }

  console.log('[removeTeamMember] Member removed');
}

export async function getTeamTasks(teamId: string): Promise<TeamTask[]> {

  
  console.log('[getTeamTasks] Fetching tasks for team:', teamId);
  
  const { data, error } = await supabase
    .from('team_tasks')
    .select(`
      *,
      created_by_profile:user_profiles!team_tasks_created_by_fkey (
        username,
        avatar_url
      )
    `)
    .eq('team_id', teamId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getTeamTasks] Error:', error);
    throw error;
  }

  console.log('[getTeamTasks] Found tasks:', data?.length || 0);
  return data || [];
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
  
  const { data, error } = await supabase
    .from('team_tasks')
    .insert({
      team_id: teamId,
      created_by: (await supabase.auth.getUser()).data.user?.id,
      title: task.title,
      description: task.description,
      difficulty: task.difficulty,
      category: task.category || null,
      points: task.points || 10,
      xp: task.xp || 10,
      min_no_required: task.min_no_required || 3,
      duration_minutes: task.duration_minutes || null,
    })
    .select()
    .single();

  if (error) {
    console.error('[createTeamTask] Error:', error);
    throw error;
  }

  console.log('[createTeamTask] Task created:', data.id);
  return data;
}

export async function updateTeamTask(
  taskId: string,
  updates: Partial<Pick<TeamTask, 'title' | 'description' | 'difficulty' | 'category' | 'points' | 'xp' | 'min_no_required' | 'duration_minutes' | 'is_active'>>
): Promise<TeamTask> {

  
  console.log('[updateTeamTask] Updating task:', taskId, updates);
  
  const { data, error } = await supabase
    .from('team_tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single();

  if (error) {
    console.error('[updateTeamTask] Error:', error);
    throw error;
  }

  return data;
}

export async function deleteTeamTask(taskId: string): Promise<void> {

  
  console.log('[deleteTeamTask] Deleting task:', taskId);
  
  const { error } = await supabase
    .from('team_tasks')
    .delete()
    .eq('id', taskId);

  if (error) {
    console.error('[deleteTeamTask] Error:', error);
    throw error;
  }

  console.log('[deleteTeamTask] Task deleted');
}

export async function assignTaskToMember(taskId: string, userId: string): Promise<TeamTaskAssignment> {

  
  console.log('[assignTaskToMember] Assigning task:', { taskId, userId });
  
  const { data, error } = await supabase
    .from('team_task_assignments')
    .insert({
      team_task_id: taskId,
      user_id: userId,
      status: 'assigned',
    })
    .select()
    .single();

  if (error) {
    console.error('[assignTaskToMember] Error:', error);
    throw error;
  }

  console.log('[assignTaskToMember] Task assigned');
  return data;
}

export async function getUserTeamTaskAssignments(userId: string): Promise<TeamTaskAssignment[]> {

  
  console.log('[getUserTeamTaskAssignments] Fetching assignments for user:', userId);
  
  const { data, error } = await supabase
    .from('team_task_assignments')
    .select(`
      *,
      team_task:team_tasks!team_task_assignments_team_task_id_fkey (
        *,
        created_by_profile:user_profiles!team_tasks_created_by_fkey (
          username,
          avatar_url
        )
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getUserTeamTaskAssignments] Error:', error);
    throw error;
  }

  console.log('[getUserTeamTaskAssignments] Found assignments:', data?.length || 0);
  return data || [];
}

export async function updateTeamTaskAssignment(
  assignmentId: string,
  updates: Partial<Pick<TeamTaskAssignment, 'status' | 'no_count' | 'yes_count' | 'started_at' | 'completed_at'>>
): Promise<TeamTaskAssignment> {

  
  console.log('[updateTeamTaskAssignment] Updating assignment:', assignmentId, updates);
  
  const { data, error } = await supabase
    .from('team_task_assignments')
    .update(updates)
    .eq('id', assignmentId)
    .select()
    .single();

  if (error) {
    console.error('[updateTeamTaskAssignment] Error:', error);
    throw error;
  }

  return data;
}

export async function createTeamInvite(teamId: string, inviteeEmail?: string): Promise<TeamInvite> {

  
  const inviteCode = `TEAM-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  
  console.log('[createTeamInvite] Creating invite:', { teamId, inviteCode, inviteeEmail });
  
  const { data, error } = await supabase
    .from('team_invites')
    .insert({
      team_id: teamId,
      inviter_id: (await supabase.auth.getUser()).data.user?.id,
      invitee_email: inviteeEmail || null,
      invite_code: inviteCode,
    })
    .select()
    .single();

  if (error) {
    console.error('[createTeamInvite] Error:', error);
    throw error;
  }

  console.log('[createTeamInvite] Invite created:', data.id);
  return data;
}

export async function acceptTeamInvite(inviteCode: string): Promise<TeamMember> {

  
  console.log('[acceptTeamInvite] Accepting invite:', inviteCode);
  
  const { data: invite, error: inviteError } = await supabase
    .from('team_invites')
    .select('*')
    .eq('invite_code', inviteCode)
    .eq('status', 'pending')
    .single();

  if (inviteError || !invite) {
    console.error('[acceptTeamInvite] Error fetching invite:', inviteError);
    throw new Error('Invalid or expired invite code');
  }

  const now = new Date();
  const expiresAt = new Date(invite.expires_at);
  if (expiresAt < now) {
    throw new Error('This invite has expired');
  }

  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) {
    throw new Error('User not authenticated');
  }

  const { data: member, error: memberError } = await supabase
    .from('team_members')
    .insert({
      team_id: invite.team_id,
      user_id: userId,
      role: 'member',
    })
    .select()
    .single();

  if (memberError) {
    console.error('[acceptTeamInvite] Error adding member:', memberError);
    throw memberError;
  }

  await supabase
    .from('team_invites')
    .update({ status: 'accepted', invitee_id: userId })
    .eq('id', invite.id);

  console.log('[acceptTeamInvite] Invite accepted');
  return member;
}

export async function getTeamAssignments(teamId: string): Promise<TeamTaskAssignment[]> {

  
  console.log('[getTeamAssignments] Fetching assignments for team:', teamId);
  
  const { data: tasks, error: tasksError } = await supabase
    .from('team_tasks')
    .select('id')
    .eq('team_id', teamId);

  if (tasksError) {
    console.error('[getTeamAssignments] Error fetching tasks:', tasksError);
    throw tasksError;
  }

  if (!tasks || tasks.length === 0) {
    return [];
  }

  const taskIds = tasks.map((t: { id: string }) => t.id);

  const { data, error } = await supabase
    .from('team_task_assignments')
    .select(`
      *,
      user_profile:user_profiles!team_task_assignments_user_id_fkey (
        username,
        avatar_url
      ),
      team_task:team_tasks!team_task_assignments_team_task_id_fkey (
        title,
        description,
        difficulty
      )
    `)
    .in('team_task_id', taskIds)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getTeamAssignments] Error:', error);
    throw error;
  }

  console.log('[getTeamAssignments] Found assignments:', data?.length || 0);
  return data || [];
}

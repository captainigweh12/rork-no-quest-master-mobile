import { supabase } from '@/lib/supabase';
import type { Friend, FriendInvite } from '@/types';

export async function searchUsers(query: string): Promise<Friend[]> {
  console.log('Searching users with query:', query);
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
    .limit(20);

  if (error) {
    console.error('Error searching users:', error);
    throw error;
  }

  return (data || []).map((user) => ({
    id: user.id,
    username: user.username,
    fullName: user.full_name,
    avatarUrl: user.avatar_url,
    level: user.level,
    currentXp: user.current_xp,
    xpToNextLevel: user.xp_to_next_level,
    totalPoints: user.total_points,
    totalRejections: user.total_rejections,
    streak: user.streak,
  }));
}

export async function getFriends(userId: string): Promise<Friend[]> {
  console.log('Getting friends for user:', userId);

  try {
    const { data: pairs, error: pairError } = await supabase
      .from('friends')
      .select('friend_id, status, created_at')
      .eq('user_id', userId)
      .eq('status', 'accepted');

    if (pairError) {
      console.error('Error getting friends:', pairError);
      if (
        pairError.message?.includes('Could not find the table') ||
        pairError.code === 'PGRST204' ||
        pairError.code === 'PGRST205'
      ) {
        console.log('Friends table not found or schema not loaded - returning empty array');
        return [];
      }
      throw new Error(pairError.message || 'Failed to fetch friends');
    }

    const ids = (pairs ?? []).map((p: any) => p.friend_id).filter(Boolean);
    if (ids.length === 0) {
      console.log('No friends found for user:', userId);
      return [];
    }

    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select(
        'id, username, full_name, avatar_url, level, current_xp, xp_to_next_level, total_points, total_rejections, streak'
      )
      .in('id', ids);

    if (profileError) {
      console.error('Error fetching friend profiles:', profileError);
      // If profiles table missing, still fail loudly so we can see the real issue
      throw new Error(profileError.message || 'Failed to fetch friend profiles');
    }

    const statusById = new Map<string, string>();
    (pairs ?? []).forEach((p: any) => statusById.set(p.friend_id, p.status));

    return (profiles ?? []).map((p: any) => ({
      id: p.id,
      username: p.username || 'Unknown',
      fullName: p.full_name ?? undefined,
      avatarUrl: p.avatar_url ?? undefined,
      level: p.level ?? 1,
      currentXp: p.current_xp ?? 0,
      xpToNextLevel: p.xp_to_next_level ?? 100,
      totalPoints: p.total_points ?? 0,
      totalRejections: p.total_rejections ?? 0,
      streak: p.streak ?? 0,
      friendshipStatus: (statusById.get(p.id) as Friend['friendshipStatus']) ?? 'accepted',
    }));
  } catch (err: any) {
    console.error('Exception in getFriends:', err);
    if (err?.message?.includes('Could not find the table') || err?.code === 'PGRST205') {
      console.log('Friends table not found - returning empty array');
      return [];
    }
    throw err;
  }
}

export async function sendFriendRequest(userId: string, friendId: string): Promise<void> {
  console.log('Sending friend request from', userId, 'to', friendId);
  
  const { error: friendError } = await supabase.from('friends').insert({
    user_id: userId,
    friend_id: friendId,
    status: 'pending',
  });

  if (friendError) {
    console.error('Error sending friend request:', friendError);
    throw friendError;
  }

  const { error: notificationError } = await supabase.from('notifications').insert({
    user_id: friendId,
    type: 'friend_request',
    title: 'New Friend Request',
    message: 'You have a new friend request!',
    related_id: userId,
  });

  if (notificationError) {
    console.error('Error creating notification:', notificationError);
  }
}

export async function acceptFriendRequest(requestId: string, userId: string, friendId: string): Promise<void> {
  console.log('Accepting friend request:', requestId);
  
  const { error: updateError } = await supabase
    .from('friends')
    .update({ status: 'accepted' })
    .eq('id', requestId);

  if (updateError) {
    console.error('Error accepting friend request:', updateError);
    throw updateError;
  }

  const { error: reverseError } = await supabase.from('friends').insert({
    user_id: userId,
    friend_id: friendId,
    status: 'accepted',
  });

  if (reverseError) {
    console.error('Error creating reverse friendship:', reverseError);
  }
}

export async function createFriendInvite(userId: string, email?: string): Promise<FriendInvite> {
  console.log('Creating friend invite for user:', userId);
  
  const inviteCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  const { data, error } = await supabase
    .from('friend_invites')
    .insert({
      inviter_id: userId,
      invite_code: inviteCode,
      email,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating friend invite:', error);
    throw error;
  }

  return {
    id: data.id,
    inviterId: data.inviter_id,
    inviteCode: data.invite_code,
    email: data.email,
    used: data.used,
    usedBy: data.used_by,
    createdAt: new Date(data.created_at),
    expiresAt: new Date(data.expires_at),
  };
}

export async function acceptFriendInvite(inviteCode: string): Promise<void> {
  console.log('Accepting friend invite:', inviteCode);
  
  const { error } = await supabase.rpc('accept_friend_invite', {
    invite_code_param: inviteCode,
  });

  if (error) {
    console.error('Error accepting friend invite:', error);
    throw error;
  }
}

import { supabase } from '@/lib/supabase';
import type { Friend, FriendInvite } from '@/types';

export async function searchUsers(query: string): Promise<Friend[]> {
  console.log('[Friends] Searching users with query:', query);
  
  if (!query || query.trim().length === 0) {
    return [];
  }

  const searchTerm = query.trim().toLowerCase();
  
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, username, full_name, avatar_url, level, total_points, streak')
      .or(`username.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`)
      .order('total_points', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[Friends] Search error:', error?.message ?? JSON.stringify(error));
      throw new Error(error.message);
    }

    console.log('[Friends] Search results:', data?.length || 0, 'users');

    return (data || []).map((user: any) => ({
      id: user.id,
      username: user.username,
      fullName: user.full_name || '',
      avatarUrl: user.avatar_url,
      level: user.level || 1,
      currentXp: 0,
      xpToNextLevel: 100,
      totalPoints: user.total_points || 0,
      totalRejections: 0,
      streak: user.streak || 0,
    }));
  } catch (error: any) {
    console.error('[Friends] searchUsers error:', error?.message ?? JSON.stringify(error));
    throw error;
  }
}

export async function getFriends(userId: string): Promise<Friend[]> {
  console.log('[Friends] Getting friends for user:', userId);
  
  try {
    // First get the friend IDs
    const { data: friendships, error: friendsError } = await supabase
      .from('friends')
      .select('friend_id')
      .eq('user_id', userId)
      .eq('status', 'accepted');

    if (friendsError) {
      console.error('[Friends] Get friends error:', friendsError?.message ?? JSON.stringify(friendsError));
      throw new Error(friendsError.message);
    }

    if (!friendships || friendships.length === 0) {
      console.log('[Friends] No friends found');
      return [];
    }

    const friendIds = friendships.map((f: any) => f.friend_id);

    // Then get the user profiles for those friends
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, username, full_name, avatar_url, level, total_points, streak')
      .in('id', friendIds);

    if (profilesError) {
      console.error('[Friends] Get profiles error:', profilesError?.message ?? JSON.stringify(profilesError));
      throw new Error(profilesError.message);
    }

    console.log('[Friends] Found', profiles?.length || 0, 'friends');

    return (profiles || []).map((profile: any) => ({
      id: profile.id,
      username: profile.username,
      fullName: profile.full_name || '',
      avatarUrl: profile.avatar_url,
      level: profile.level || 1,
      currentXp: 0,
      xpToNextLevel: 100,
      totalPoints: profile.total_points || 0,
      totalRejections: 0,
      streak: profile.streak || 0,
      friendshipStatus: 'accepted' as const,
    }));
  } catch (error: any) {
    console.error('[Friends] getFriends error:', error?.message ?? JSON.stringify(error));
    throw error;
  }
}

export async function recommendFriends(userId: string, limit: number = 10): Promise<Friend[]> {
  console.log('[Friends] Recommending friends for user:', userId, 'limit:', limit);
  
  try {
    const { data: currentUser, error: userError } = await supabase
      .from('user_profiles')
      .select('level, total_points')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('[Friends] Error fetching current user:', userError?.message ?? JSON.stringify(userError));
      throw new Error(userError.message);
    }

    const { data: existingFriends, error: friendsError } = await supabase
      .from('friends')
      .select('friend_id')
      .eq('user_id', userId);

    if (friendsError) {
      console.error('[Friends] Error fetching existing friends:', friendsError?.message ?? JSON.stringify(friendsError));
    }

    const friendIds = (existingFriends || []).map((f: any) => f.friend_id);
    friendIds.push(userId);

    const userLevel = (currentUser as any)?.level || 1;
    const minLevel = Math.max(1, userLevel - 3);
    const maxLevel = userLevel + 3;

    const { data: recommendations, error: recError } = await supabase
      .from('user_profiles')
      .select('id, username, full_name, avatar_url, level, total_points, streak')
      .not('id', 'in', `(${friendIds.join(',')})`)
      .gte('level', minLevel)
      .lte('level', maxLevel)
      .order('total_points', { ascending: false })
      .limit(limit);

    if (recError) {
      console.error('[Friends] Recommendations error:', recError?.message ?? JSON.stringify(recError));
      throw new Error(recError.message);
    }

    console.log('[Friends] Found', recommendations?.length || 0, 'recommendations');

    return (recommendations || []).map((user: any) => ({
      id: user.id,
      username: user.username,
      fullName: user.full_name || '',
      avatarUrl: user.avatar_url,
      level: user.level || 1,
      currentXp: 0,
      xpToNextLevel: 100,
      totalPoints: user.total_points || 0,
      totalRejections: 0,
      streak: user.streak || 0,
    }));
  } catch (error: any) {
    console.error('[Friends] recommendFriends error:', error?.message ?? JSON.stringify(error));
    throw error;
  }
}

export async function sendFriendRequest(userId: string, friendId: string): Promise<void> {
  console.log('[Friends] Sending friend request from', userId, 'to', friendId);
  
  try {
    const { error: existingError } = await supabase
      .from('friends')
      .select('id')
      .eq('user_id', userId)
      .eq('friend_id', friendId)
      .single();

    if (!existingError) {
      throw new Error('Friend request already exists');
    }

    const { error: insertError } = await supabase
      .from('friends')
      .insert({
        user_id: userId,
        friend_id: friendId,
        status: 'pending',
      });

    if (insertError) {
      console.error('[Friends] Send request error:', insertError?.message ?? JSON.stringify(insertError));
      throw new Error(insertError.message);
    }

    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: friendId,
        type: 'friend_request',
        title: 'New Friend Request',
        message: 'You have a new friend request!',
        related_id: userId,
      });

    if (notifError) {
      console.error('[Friends] Notification error:', notifError?.message ?? JSON.stringify(notifError));
    }

    console.log('[Friends] Friend request sent successfully');
  } catch (error: any) {
    console.error('[Friends] sendFriendRequest error:', error?.message ?? JSON.stringify(error));
    throw error;
  }
}

export async function acceptFriendRequest(requestId: string, userId: string, friendId: string): Promise<void> {
  console.log('[Friends] Accepting friend request:', requestId);
  
  try {
    const { error: updateError } = await supabase
      .from('friends')
      .update({ status: 'accepted' })
      .eq('user_id', friendId)
      .eq('friend_id', userId);

    if (updateError) {
      console.error('[Friends] Accept error:', updateError?.message ?? JSON.stringify(updateError));
      throw new Error(updateError.message);
    }

    const { error: insertError } = await supabase
      .from('friends')
      .insert({
        user_id: userId,
        friend_id: friendId,
        status: 'accepted',
      });

    if (insertError) {
      console.error('[Friends] Create reciprocal friendship error:', insertError?.message ?? JSON.stringify(insertError));
    }

    console.log('[Friends] Friend request accepted');
  } catch (error: any) {
    console.error('[Friends] acceptFriendRequest error:', error?.message ?? JSON.stringify(error));
    throw error;
  }
}

export async function createFriendInvite(userId: string, email?: string): Promise<FriendInvite> {
  console.log('[Friends] Creating friend invite for user:', userId);
  
  try {
    const inviteCode = Math.random().toString(36).substring(2, 15);
    
    const { data, error } = await supabase
      .from('friend_invites')
      .insert({
        inviter_id: userId,
        invite_code: inviteCode,
        email: email || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[Friends] Create invite error:', error?.message ?? JSON.stringify(error));
      throw new Error(error.message);
    }

    return {
      id: data.id,
      inviterId: data.inviter_id,
      inviteCode: data.invite_code,
      email: data.email,
      used: data.used,
      createdAt: new Date(data.created_at),
      expiresAt: new Date(data.expires_at),
    };
  } catch (error: any) {
    console.error('[Friends] createFriendInvite error:', error?.message ?? JSON.stringify(error));
    throw error;
  }
}

export async function acceptFriendInvite(inviteCode: string): Promise<void> {
  console.log('[Friends] Accepting friend invite:', inviteCode);
  
  try {
    const { error } = await supabase.rpc('accept_friend_invite', {
      invite_code_param: inviteCode,
    });

    if (error) {
      console.error('[Friends] Accept invite error:', error?.message ?? JSON.stringify(error));
      throw new Error(error.message);
    }

    console.log('[Friends] Friend invite accepted');
  } catch (error: any) {
    console.error('[Friends] acceptFriendInvite error:', error?.message ?? JSON.stringify(error));
    throw error;
  }
}

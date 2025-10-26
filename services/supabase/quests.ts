import { supabase } from '@/lib/supabase';
import type { Quest, QuestInvite, QuestProgress } from '@/types';

export async function getUserQuests(userId: string): Promise<Quest[]> {
  console.log('Getting quests for user:', userId);
  
  const { data, error } = await supabase
    .from('quests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error getting quests:', error);
    throw error;
  }

  return (data || []).map((quest) => ({
    id: quest.id,
    title: quest.title,
    description: quest.description,
    type: quest.type,
    difficulty: quest.difficulty,
    points: quest.points,
    xp: quest.xp,
    completed: quest.completed,
    completedAt: quest.completed_at ? new Date(quest.completed_at) : undefined,
    expiresAt: quest.expires_at ? new Date(quest.expires_at) : undefined,
    icon: quest.icon,
    minNoRequired: quest.min_no_required,
    durationMinutes: quest.duration_minutes,
    location: quest.location_lat && quest.location_lng ? {
      latitude: quest.location_lat,
      longitude: quest.location_lng,
      address: quest.location_address,
    } : undefined,
    isFromFriend: quest.is_from_friend,
    senderId: quest.sender_id,
    createdAt: new Date(quest.created_at),
    updatedAt: new Date(quest.updated_at),
  }));
}

export async function createQuest(userId: string, quest: Partial<Quest>): Promise<Quest> {
  console.log('Creating quest for user:', userId);
  
  const { data, error } = await supabase
    .from('quests')
    .insert({
      user_id: userId,
      title: quest.title,
      description: quest.description,
      type: quest.type || 'daily',
      difficulty: quest.difficulty || 'medium',
      points: quest.points || 100,
      xp: quest.xp || 50,
      min_no_required: quest.minNoRequired || 3,
      duration_minutes: quest.durationMinutes,
      icon: quest.icon || 'target',
      expires_at: quest.expiresAt?.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating quest:', error);
    throw error;
  }

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    type: data.type,
    difficulty: data.difficulty,
    points: data.points,
    xp: data.xp,
    completed: data.completed,
    icon: data.icon,
    minNoRequired: data.min_no_required,
    durationMinutes: data.duration_minutes,
    expiresAt: data.expires_at ? new Date(data.expires_at) : undefined,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

export async function sendQuestToFriend(senderId: string, receiverId: string, questId: string, message?: string): Promise<QuestInvite> {
  console.log('Sending quest from', senderId, 'to', receiverId);
  
  const { data, error } = await supabase
    .from('quest_invites')
    .insert({
      quest_id: questId,
      sender_id: senderId,
      receiver_id: receiverId,
      message,
    })
    .select()
    .single();

  if (error) {
    console.error('Error sending quest:', error);
    throw error;
  }

  const { error: notificationError } = await supabase.from('notifications').insert({
    user_id: receiverId,
    type: 'quest_invite',
    title: 'New Quest Received',
    message: 'You received a new quest from a friend!',
    related_id: data.id,
  });

  if (notificationError) {
    console.error('Error creating notification:', notificationError);
  }

  return {
    id: data.id,
    questId: data.quest_id,
    senderId: data.sender_id,
    receiverId: data.receiver_id,
    status: data.status,
    message: data.message,
    createdAt: new Date(data.created_at),
  };
}

export async function getQuestInvites(userId: string): Promise<QuestInvite[]> {
  console.log('Getting quest invites for user:', userId);
  
  const { data, error } = await supabase
    .from('quest_invites')
    .select(`
      *,
      quest:quests(*),
      sender:sender_id(username, avatar_url, level)
    `)
    .eq('receiver_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error getting quest invites:', error);
    throw error;
  }

  return (data || []).map((invite: any) => ({
    id: invite.id,
    questId: invite.quest_id,
    senderId: invite.sender_id,
    receiverId: invite.receiver_id,
    status: invite.status,
    message: invite.message,
    createdAt: new Date(invite.created_at),
    respondedAt: invite.responded_at ? new Date(invite.responded_at) : undefined,
    quest: invite.quest ? {
      id: invite.quest.id,
      title: invite.quest.title,
      description: invite.quest.description,
      type: invite.quest.type,
      difficulty: invite.quest.difficulty,
      points: invite.quest.points,
      xp: invite.quest.xp,
      completed: false,
      icon: invite.quest.icon,
      minNoRequired: invite.quest.min_no_required,
    } : undefined,
  }));
}

export async function acceptQuestInvite(inviteId: string, userId: string): Promise<Quest> {
  console.log('Accepting quest invite:', inviteId);
  
  const { data: invite, error: inviteError } = await supabase
    .from('quest_invites')
    .select('*, quest:quests(*)')
    .eq('id', inviteId)
    .single();

  if (inviteError) {
    console.error('Error getting quest invite:', inviteError);
    throw inviteError;
  }

  const { data: newQuest, error: questError } = await supabase
    .from('quests')
    .insert({
      user_id: userId,
      title: invite.quest.title,
      description: invite.quest.description,
      type: invite.quest.type,
      difficulty: invite.quest.difficulty,
      points: invite.quest.points,
      xp: invite.quest.xp,
      min_no_required: invite.quest.min_no_required,
      duration_minutes: invite.quest.duration_minutes,
      icon: invite.quest.icon,
      is_from_friend: true,
      sender_id: invite.sender_id,
    })
    .select()
    .single();

  if (questError) {
    console.error('Error creating quest from invite:', questError);
    throw questError;
  }

  const { error: updateError } = await supabase
    .from('quest_invites')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', inviteId);

  if (updateError) {
    console.error('Error updating quest invite:', updateError);
  }

  return {
    id: newQuest.id,
    title: newQuest.title,
    description: newQuest.description,
    type: newQuest.type,
    difficulty: newQuest.difficulty,
    points: newQuest.points,
    xp: newQuest.xp,
    completed: false,
    icon: newQuest.icon,
    minNoRequired: newQuest.min_no_required,
    durationMinutes: newQuest.duration_minutes,
    isFromFriend: true,
    senderId: newQuest.sender_id,
  };
}

export async function rejectQuestInvite(inviteId: string): Promise<void> {
  console.log('Rejecting quest invite:', inviteId);
  
  const { error } = await supabase
    .from('quest_invites')
    .update({ status: 'rejected', responded_at: new Date().toISOString() })
    .eq('id', inviteId);

  if (error) {
    console.error('Error rejecting quest invite:', error);
    throw error;
  }
}

export async function updateQuestProgress(questId: string, userId: string, noCount: number, yesCount: number): Promise<QuestProgress> {
  console.log('Updating quest progress:', questId);
  
  const { data, error } = await supabase
    .from('quest_progress')
    .upsert({
      quest_id: questId,
      user_id: userId,
      no_count: noCount,
      yes_count: yesCount,
    })
    .select()
    .single();

  if (error) {
    console.error('Error updating quest progress:', error);
    throw error;
  }

  return {
    id: data.id,
    questId: data.quest_id,
    userId: data.user_id,
    noCount: data.no_count,
    yesCount: data.yes_count,
    startedAt: new Date(data.started_at),
    completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
  };
}

export async function getQuestProgress(questId: string, userId: string): Promise<QuestProgress | null> {
  console.log('Getting quest progress:', questId);
  
  const { data, error } = await supabase
    .from('quest_progress')
    .select('*')
    .eq('quest_id', questId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error getting quest progress:', error);
    throw error;
  }

  return {
    id: data.id,
    questId: data.quest_id,
    userId: data.user_id,
    noCount: data.no_count,
    yesCount: data.yes_count,
    startedAt: new Date(data.started_at),
    completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
  };
}

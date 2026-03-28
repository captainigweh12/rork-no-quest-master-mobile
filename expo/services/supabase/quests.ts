import localStorageService from '@/lib/localStorage';
import type { Quest, QuestInvite, QuestProgress } from '@/types';

export async function getUserQuests(userId: string): Promise<Quest[]> {
  console.log('Getting quests for user:', userId);
  return (await localStorageService.getJSON<Quest[]>(`quests_${userId}`, [])) || [];
}

export async function createQuest(userId: string, quest: Partial<Quest>): Promise<Quest> {
  console.log('Creating quest for user:', userId);
  const key = `quests_${userId}`;
  const existing = (await localStorageService.getJSON<Quest[]>(key, [])) || [];
  const newQuest: Quest = {
    id: Date.now().toString(),
    userId,
    title: quest.title || 'Untitled Quest',
    description: quest.description || '',
    completed: false,
    createdAt: new Date().toISOString(),
    progress: 0,
  } as any;
  existing.push(newQuest);
  await localStorageService.setJSON(key, existing);
  return newQuest;
}

export async function sendQuestToFriend(senderId: string, receiverId: string, questId: string, message?: string): Promise<QuestInvite> {
  console.log('Sending quest from', senderId, 'to', receiverId);
  const key = `quest_invites_${receiverId}`;
  const invites = (await localStorageService.getJSON<QuestInvite[]>(key, [])) || [];
  const invite: QuestInvite = {
    id: Date.now().toString(),
    senderId,
    receiverId,
    questId,
    message: message || '',
    status: 'pending',
    createdAt: new Date().toISOString(),
  } as any;
  invites.push(invite);
  await localStorageService.setJSON(key, invites);
  return invite;
}

export async function getQuestInvites(userId: string): Promise<QuestInvite[]> {
  console.log('Getting quest invites for user:', userId);
  return (await localStorageService.getJSON<QuestInvite[]>(`quest_invites_${userId}`, [])) || [];
}

export async function acceptQuestInvite(inviteId: string, userId: string): Promise<Quest | null> {
  console.log('Accepting quest invite:', inviteId);
  const key = `quest_invites_${userId}`;
  const invites = (await localStorageService.getJSON<QuestInvite[]>(key, [])) || [];
  const found = invites.find(i => i.id === inviteId);
  if (found) {
    found.status = 'accepted';
    found.respondedAt = new Date();
    await localStorageService.setJSON(key, invites);
    const quests = (await localStorageService.getJSON<Quest[]>(`quests_${userId}`, [])) || [];
    return quests.find(q => q.id === found.questId) || null;
  }
  return null;
}

export async function rejectQuestInvite(inviteId: string, userId: string): Promise<void> {
  console.log('Rejecting quest invite:', inviteId);
  const key = `quest_invites_${userId}`;
  const invites = (await localStorageService.getJSON<QuestInvite[]>(key, [])) || [];
  const found = invites.find(i => i.id === inviteId);
  if (found) {
    found.status = 'rejected';
    found.respondedAt = new Date();
    await localStorageService.setJSON(key, invites);
  }
}

export async function updateQuestProgress(questId: string, userId: string, noCount: number, yesCount: number): Promise<QuestProgress> {
  console.log('Updating quest progress:', questId);
  const progressKey = 'questProgress';
  const progressMap = (await localStorageService.getJSON<Record<string, { noCount: number; yesCount: number; startedAt: string }>>(progressKey, {})) || {};
  const existing = progressMap[questId] || { noCount: 0, yesCount: 0, startedAt: new Date().toISOString() };
  const updated = {
    noCount: existing.noCount + noCount,
    yesCount: existing.yesCount + yesCount,
    startedAt: existing.startedAt,
  };
  progressMap[questId] = updated;
  await localStorageService.setJSON(progressKey, progressMap);
  const totalAttempts = updated.noCount + updated.yesCount;
  const progressPercent = totalAttempts === 0 ? 0 : Math.min(100, Math.round((updated.yesCount / totalAttempts) * 100));
  return {
    id: `${questId}_${userId}`,
    questId,
    userId,
    noCount: updated.noCount,
    yesCount: updated.yesCount,
    startedAt: new Date(updated.startedAt),
    completedAt: progressPercent >= 100 ? new Date() : undefined,
  };
}

export async function getQuestProgress(questId: string, userId: string): Promise<QuestProgress | null> {
  console.log('Getting quest progress:', questId);
  const progressMap = (await localStorageService.getJSON<Record<string, { noCount: number; yesCount: number; startedAt: string }>>('questProgress', {})) || {};
  const entry = progressMap[questId];
  if (!entry) return null;
  const totalAttempts = entry.noCount + entry.yesCount;
  const progressPercent = totalAttempts === 0 ? 0 : Math.min(100, Math.round((entry.yesCount / totalAttempts) * 100));
  return {
    id: `${questId}_${userId}`,
    questId,
    userId,
    noCount: entry.noCount,
    yesCount: entry.yesCount,
    startedAt: new Date(entry.startedAt),
    completedAt: progressPercent >= 100 ? new Date() : undefined,
  };
}

import { localStorageService } from '@/lib/localStorage';
import type { Quest, QuestInvite, QuestProgress } from '@/types';

export async function getUserQuests(userId: string): Promise<Quest[]> {
  console.log('Getting quests for user:', userId);
  return await localStorageService.getUserQuests(userId);
}

export async function createQuest(userId: string, quest: Partial<Quest>): Promise<Quest> {
  console.log('Creating quest for user:', userId);
  return await localStorageService.createQuest(userId, quest);
}

export async function sendQuestToFriend(senderId: string, receiverId: string, questId: string, message?: string): Promise<QuestInvite> {
  console.log('Sending quest from', senderId, 'to', receiverId);
  return await localStorageService.sendQuestToFriend(senderId, receiverId, questId, message);
}

export async function getQuestInvites(userId: string): Promise<QuestInvite[]> {
  console.log('Getting quest invites for user:', userId);
  return await localStorageService.getQuestInvites(userId);
}

export async function acceptQuestInvite(inviteId: string, userId: string): Promise<Quest> {
  console.log('Accepting quest invite:', inviteId);
  return await localStorageService.acceptQuestInvite(inviteId, userId);
}

export async function rejectQuestInvite(inviteId: string): Promise<void> {
  console.log('Rejecting quest invite:', inviteId);
  await localStorageService.rejectQuestInvite(inviteId);
}

export async function updateQuestProgress(questId: string, userId: string, noCount: number, yesCount: number): Promise<QuestProgress> {
  console.log('Updating quest progress:', questId);
  return await localStorageService.updateQuestProgress(questId, userId, noCount, yesCount);
}

export async function getQuestProgress(questId: string, userId: string): Promise<QuestProgress | null> {
  console.log('Getting quest progress:', questId);
  return await localStorageService.getQuestProgress(questId, userId);
}

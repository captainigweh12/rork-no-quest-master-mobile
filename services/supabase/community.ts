import { localStorageService } from '@/lib/localStorage';
import type { CommunityPost, CommunityPostJournal, CommunityPostQuest } from '@/types';

export async function shareJournal(params: {
  userId: string;
  username: string;
  avatarUrl?: string;
  journalId: string;
  title: string;
  notes?: string;
  skills?: string[];
  privacy: 'friends' | 'public';
}): Promise<CommunityPost> {
  const post: CommunityPost = {
    id: Date.now().toString(),
    userId: params.userId,
    username: params.username,
    avatarUrl: params.avatarUrl,
    createdAt: new Date(),
    content: {
      type: 'journal',
      journalId: params.journalId,
      title: params.title,
      notes: params.notes,
      skills: params.skills,
      privacy: params.privacy,
    } as CommunityPostJournal,
    likes: 0,
    comments: 0,
  };
  await localStorageService.addCommunityPost(post);
  return post;
}

export async function shareQuest(params: {
  userId: string;
  username: string;
  avatarUrl?: string;
  questId: string;
  title: string;
  description?: string;
}): Promise<CommunityPost> {
  const post: CommunityPost = {
    id: Date.now().toString(),
    userId: params.userId,
    username: params.username,
    avatarUrl: params.avatarUrl,
    createdAt: new Date(),
    content: {
      type: 'quest',
      questId: params.questId,
      title: params.title,
      description: params.description,
    } as CommunityPostQuest,
    likes: 0,
    comments: 0,
  };
  await localStorageService.addCommunityPost(post);
  return post;
}

export async function getFeed(userId: string) {
  return await localStorageService.getCommunityFeed(userId);
}

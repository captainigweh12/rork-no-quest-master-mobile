import { localStorageService } from '@/lib/localStorage';
import type { Friend, FriendInvite } from '@/types';

export async function searchUsers(query: string): Promise<Friend[]> {
  console.log('Searching users with query:', query);
  return await localStorageService.searchUsers(query);
}

export async function getFriends(userId: string): Promise<Friend[]> {
  console.log('Getting friends for user:', userId);
  return await localStorageService.getFriends(userId);
}

export async function sendFriendRequest(userId: string, friendId: string): Promise<void> {
  console.log('Sending friend request from', userId, 'to', friendId);
  await localStorageService.sendFriendRequest(userId, friendId);
}

export async function acceptFriendRequest(requestId: string, userId: string, friendId: string): Promise<void> {
  console.log('Accepting friend request:', requestId);
  await localStorageService.acceptFriendRequest(userId, friendId);
}

export async function createFriendInvite(userId: string, email?: string): Promise<FriendInvite> {
  console.log('Creating friend invite for user:', userId);
  return await localStorageService.createFriendInvite(userId, email);
}

export async function acceptFriendInvite(inviteCode: string): Promise<void> {
  console.log('Accepting friend invite:', inviteCode);
  const currentUser = await localStorageService.getCurrentUser();
  if (!currentUser) {
    throw new Error('Must be logged in to accept friend invites');
  }
  await localStorageService.acceptFriendInvite(inviteCode, currentUser.id);
}

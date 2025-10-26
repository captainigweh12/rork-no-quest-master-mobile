import { localStorageService } from '@/lib/localStorage';
import type { ChatMessage } from '@/types';

export async function sendMessage(senderId: string, receiverId: string, message: string): Promise<ChatMessage> {
  console.log('Sending message from', senderId, 'to', receiverId);
  return await localStorageService.sendMessage(senderId, receiverId, message);
}

export async function getMessages(userId: string, friendId: string): Promise<ChatMessage[]> {
  console.log('Getting messages between', userId, 'and', friendId);
  return await localStorageService.getMessages(userId, friendId);
}

export async function markMessagesAsRead(userId: string, friendId: string): Promise<void> {
  console.log('Marking messages as read');
  await localStorageService.markMessagesAsRead(userId, friendId);
}

export function subscribeToMessages(userId: string, friendId: string, callback: (message: ChatMessage) => void) {
  console.log('Subscribing to messages between', userId, 'and', friendId);
  return () => {};
}

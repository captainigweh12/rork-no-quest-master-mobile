import localStorageService from '@/lib/localStorage';
import type { ChatMessage } from '@/types';

// These chat helpers previously depended on richer localStorageService APIs.
// They are now stubbed to operate over primitive JSON storage keys for minimal functionality.

const messagesKey = (a: string, b: string) => `chat_${[a,b].sort().join('_')}`;

export async function sendMessage(senderId: string, receiverId: string, message: string): Promise<ChatMessage> {
  const key = messagesKey(senderId, receiverId);
  const existing = (await localStorageService.getJSON<ChatMessage[]>(key, [])) || [];
  const msg: ChatMessage = {
    id: Date.now().toString(),
    senderId,
    receiverId,
    message,
    createdAt: new Date().toISOString(),
    read: false,
  } as any;
  existing.push(msg);
  await localStorageService.setJSON(key, existing);
  return msg;
}

export async function getMessages(userId: string, friendId: string): Promise<ChatMessage[]> {
  const key = messagesKey(userId, friendId);
  return (await localStorageService.getJSON<ChatMessage[]>(key, [])) || [];
}

export async function markMessagesAsRead(userId: string, friendId: string): Promise<void> {
  const key = messagesKey(userId, friendId);
  const msgs = (await localStorageService.getJSON<ChatMessage[]>(key, [])) || [];
  msgs.forEach(m => { if (m.receiverId === userId) m.read = true; });
  await localStorageService.setJSON(key, msgs);
}

export function subscribeToMessages(_userId: string, _friendId: string, _callback: (message: ChatMessage) => void) {
  // Stub: real-time subscription would use websocket or Supabase channel
  return () => {};
}

import { supabase } from '@/lib/supabase';
import type { ChatMessage } from '@/types';

export async function sendMessage(senderId: string, receiverId: string, message: string): Promise<ChatMessage> {
  console.log('Sending message from', senderId, 'to', receiverId);
  
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      sender_id: senderId,
      receiver_id: receiverId,
      message,
    })
    .select()
    .single();

  if (error) {
    console.error('Error sending message:', error);
    throw error;
  }

  const { error: notificationError } = await supabase.from('notifications').insert({
    user_id: receiverId,
    type: 'chat_message',
    title: 'New Message',
    message: 'You have a new message!',
    related_id: data.id,
  });

  if (notificationError) {
    console.error('Error creating notification:', notificationError);
  }

  return {
    id: data.id,
    senderId: data.sender_id,
    receiverId: data.receiver_id,
    message: data.message,
    read: data.read,
    createdAt: new Date(data.created_at),
  };
}

export async function getMessages(userId: string, friendId: string): Promise<ChatMessage[]> {
  console.log('Getting messages between', userId, 'and', friendId);
  
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .or(
      `and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`
    )
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error getting messages:', error);
    throw error;
  }

  return (data || []).map((msg) => ({
    id: msg.id,
    senderId: msg.sender_id,
    receiverId: msg.receiver_id,
    message: msg.message,
    read: msg.read,
    createdAt: new Date(msg.created_at),
  }));
}

export async function markMessagesAsRead(userId: string, friendId: string): Promise<void> {
  console.log('Marking messages as read');
  
  const { error } = await supabase
    .from('chat_messages')
    .update({ read: true })
    .eq('sender_id', friendId)
    .eq('receiver_id', userId)
    .eq('read', false);

  if (error) {
    console.error('Error marking messages as read:', error);
    throw error;
  }
}

export function subscribeToMessages(userId: string, friendId: string, callback: (message: ChatMessage) => void) {
  console.log('Subscribing to messages between', userId, 'and', friendId);
  
  const subscription = supabase
    .channel('chat_messages')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `or(and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId}))`,
      },
      (payload) => {
        const msg = payload.new as any;
        callback({
          id: msg.id,
          senderId: msg.sender_id,
          receiverId: msg.receiver_id,
          message: msg.message,
          read: msg.read,
          createdAt: new Date(msg.created_at),
        });
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}

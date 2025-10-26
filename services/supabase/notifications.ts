import { supabase } from '@/lib/supabase';
import type { Notification } from '@/types';

export async function getNotifications(userId: string): Promise<Notification[]> {
  console.log('Getting notifications for user:', userId);
  
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error getting notifications:', error);
    throw error;
  }

  return (data || []).map((notif) => ({
    id: notif.id,
    userId: notif.user_id,
    type: notif.type,
    title: notif.title,
    message: notif.message,
    read: notif.read,
    relatedId: notif.related_id,
    createdAt: new Date(notif.created_at),
  }));
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  console.log('Marking notification as read:', notificationId);
  
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);

  if (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  console.log('Marking all notifications as read for user:', userId);
  
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
}

export function subscribeToNotifications(userId: string, callback: (notification: Notification) => void) {
  console.log('Subscribing to notifications for user:', userId);
  
  const subscription = supabase
    .channel('notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const notif = payload.new as any;
        callback({
          id: notif.id,
          userId: notif.user_id,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          read: notif.read,
          relatedId: notif.related_id,
          createdAt: new Date(notif.created_at),
        });
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}

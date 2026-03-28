import { supabase } from '@/lib/supabase';
import type { Notification } from '@/types';

export async function getNotifications(userId: string): Promise<Notification[]> {
  console.log('[Notifications] Getting notifications for user:', userId);
  
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[Notifications] Get notifications error:', error?.message ?? JSON.stringify(error));
      throw new Error(error.message);
    }

    return (data || []).map((notif: any) => ({
      id: notif.id,
      userId: notif.user_id,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      read: notif.read || false,
      relatedId: notif.related_id,
      createdAt: new Date(notif.created_at),
    }));
  } catch (error: any) {
    console.error('[Notifications] getNotifications error:', error?.message ?? JSON.stringify(error));
    return [];
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  console.log('[Notifications] Marking notification as read:', notificationId);
  
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('[Notifications] Mark as read error:', error?.message ?? JSON.stringify(error));
      throw new Error(error.message);
    }
  } catch (error: any) {
    console.error('[Notifications] markNotificationAsRead error:', error?.message ?? JSON.stringify(error));
    throw error;
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  console.log('[Notifications] Marking all notifications as read for user:', userId);
  
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.error('[Notifications] Mark all as read error:', error?.message ?? JSON.stringify(error));
      throw new Error(error.message);
    }
  } catch (error: any) {
    console.error('[Notifications] markAllNotificationsAsRead error:', error?.message ?? JSON.stringify(error));
    throw error;
  }
}

export function subscribeToNotifications(userId: string, callback: (notification: Notification) => void) {
  console.log('[Notifications] Subscribing to notifications for user:', userId);
  
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        console.log('[Notifications] New notification received:', payload);
        const notif = payload.new as any;
        callback({
          id: notif.id,
          userId: notif.user_id,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          read: notif.read || false,
          relatedId: notif.related_id,
          createdAt: new Date(notif.created_at),
        });
      }
    )
    .subscribe();

  return () => {
    console.log('[Notifications] Unsubscribing from notifications');
    channel.unsubscribe();
  };
}

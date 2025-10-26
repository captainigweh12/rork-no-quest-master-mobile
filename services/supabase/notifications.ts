import { localStorageService } from '@/lib/localStorage';
import type { Notification } from '@/types';

export async function getNotifications(userId: string): Promise<Notification[]> {
  console.log('Getting notifications for user:', userId);
  return await localStorageService.getNotifications(userId);
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  console.log('Marking notification as read:', notificationId);
  await localStorageService.markNotificationAsRead(notificationId);
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  console.log('Marking all notifications as read for user:', userId);
  await localStorageService.markAllNotificationsAsRead(userId);
}

export function subscribeToNotifications(userId: string, callback: (notification: Notification) => void) {
  console.log('Subscribing to notifications for user:', userId);
  return () => {};
}

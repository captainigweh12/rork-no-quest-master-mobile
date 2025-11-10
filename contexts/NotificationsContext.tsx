import { storage } from '@/lib/storage';
import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as notificationsService from '@/services/supabase/notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const [NotificationsProvider, useNotifications] = createContextHook(() => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [remindersEnabled, setRemindersEnabled] = useState<boolean>(false);

  const notificationsQuery = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as any[];
      return await notificationsService.getNotifications(user.id);
    },
    enabled: !!user?.id,
    refetchInterval: 10000,
  });

  const unreadCount = (notificationsQuery.data || []).filter((n: any) => !n.read).length;

  const registerForPushNotifications = useCallback(async (retryCount = 0) => {
    if (Platform.OS === 'web') {
      console.log('Push notifications not supported on web');
      return;
    }

    if (Platform.OS === 'android' && Constants.appOwnership === 'expo') {
      console.log('Skipping push registration: Expo Go on Android does not support remote push since SDK 53');
      setPermissionStatus('denied');
      return;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      setPermissionStatus(finalStatus as 'granted' | 'denied');

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }

      const projectId = (Constants?.expoConfig?.extra as any)?.eas?.projectId ?? (Constants?.manifestExtra as any)?.eas?.projectId;
      if (!projectId) {
        console.warn('No EAS projectId found in config. Skipping push token registration.');
        return;
      }

      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      console.log('Expo Push Token:', token);
      setExpoPushToken(token);
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      console.error('Error registering for push notifications:', errorMessage);
      
      if (errorMessage.includes('503') || errorMessage.includes('no healthy upstream')) {
        console.log('Expo push notification service temporarily unavailable');
        
        if (retryCount < 3) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
          console.log(`Retrying in ${delay}ms (attempt ${retryCount + 1}/3)...`);
          setTimeout(() => registerForPushNotifications(retryCount + 1), delay);
        } else {
          console.log('Max retries reached. Push notifications will be unavailable.');
        }
      } else {
        console.error('Unexpected error:', error);
      }
    }
  }, []);

  const scheduleDailyQuestReminder = useCallback(async () => {
    if (Platform.OS === 'web') {
      console.log('Scheduling not supported on web');
      return;
    }
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Time for today\'s Quest',
          body: 'Open the app and get your next challenge.',
        },
        trigger: { type: 'calendar', hour: 9, minute: 0, repeats: true } as Notifications.CalendarTriggerInput,
      });
      setRemindersEnabled(true);
  await storage.setItem('questReminders', 'enabled');
    } catch (e) {
      console.error('Failed to schedule reminder', e);
    }
  }, []);

  const disableDailyQuestReminder = useCallback(async () => {
    if (Platform.OS === 'web') {
      console.log('Scheduling not supported on web');
      setRemindersEnabled(false);
  await storage.setItem('questReminders', 'disabled');
      return;
    }
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      setRemindersEnabled(false);
  await storage.setItem('questReminders', 'disabled');
    } catch (e) {
      console.error('Failed to cancel reminders', e);
    }
  }, []);

  const ensurePermissionsAndEnable = useCallback(async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not available on web', 'Quest reminders are available on the mobile app.');
      return;
    }
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const res = await Notifications.requestPermissionsAsync();
      if (res.status !== 'granted') {
        Alert.alert('Enable Notifications', 'Please enable notifications in Settings to receive reminders.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]);
        return;
      }
    }
    await registerForPushNotifications();
    await scheduleDailyQuestReminder();
  }, [registerForPushNotifications, scheduleDailyQuestReminder]);

  useEffect(() => {
  storage.getItem('questReminders').then((v) => {
      const enabled = v === 'enabled';
      setRemindersEnabled(enabled);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (user?.id) {
      registerForPushNotifications();
    }
  }, [user?.id, registerForPushNotifications]);

  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification response:', response);
    });

    return () => {
      subscription.remove();
      responseSubscription.remove();
    };
  }, [user?.id, queryClient]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await notificationsService.markNotificationAsRead(notificationId);
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [user?.id, queryClient]);

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;
    try {
      await notificationsService.markAllNotificationsAsRead(user.id);
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [user?.id, queryClient]);

  const sendLocalNotification = useCallback(async (title: string, body: string, data?: any) => {
    if (Platform.OS === 'web') {
      console.log('Local notifications not supported on web');
      return;
    }
    try {
      await Notifications.scheduleNotificationAsync({
        content: { title, body, data },
        trigger: null,
      });
    } catch (error) {
      console.error('Error sending local notification:', error);
    }
  }, []);

  return useMemo(
    () => ({
      notifications: notificationsQuery.data || [],
      unreadCount,
      isLoading: notificationsQuery.isLoading,
      expoPushToken,
      permissionStatus,
      remindersEnabled,
      ensurePermissionsAndEnable,
      disableDailyQuestReminder,
      scheduleDailyQuestReminder,
      registerForPushNotifications,
      markAsRead,
      markAllAsRead,
      sendLocalNotification,
      refetch: notificationsQuery.refetch,
    }),
    [
      notificationsQuery.data,
      unreadCount,
      notificationsQuery.isLoading,
      expoPushToken,
      permissionStatus,
      remindersEnabled,
      ensurePermissionsAndEnable,
      disableDailyQuestReminder,
      scheduleDailyQuestReminder,
      registerForPushNotifications,
      markAsRead,
      markAllAsRead,
      sendLocalNotification,
      notificationsQuery.refetch,
    ]
  );
});

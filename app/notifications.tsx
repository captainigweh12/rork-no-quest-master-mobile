import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, UserPlus, Send, MessageCircle, Trophy, CheckCheck } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import type { Notification } from '@/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as friendsService from '@/services/supabase/friends';
import * as questsService from '@/services/supabase/quests';

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const { notifications, unreadCount, markAsRead, markAllAsRead, isLoading } = useNotifications();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const queryClient = useQueryClient();

  const styles = createStyles(theme.colors);

  const acceptFriendRequestMutation = useMutation({
    mutationFn: async ({ requestId, friendId }: { requestId: string; friendId: string }) => {
      if (!user?.id) throw new Error('User not authenticated');
      await friendsService.acceptFriendRequest(requestId, user.id, friendId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['friends', user?.id] });
      Alert.alert('Success', 'Friend request accepted!');
      const notification = notifications.find(n => n.relatedId === variables.friendId);
      if (notification) {
        markAsRead(notification.id);
      }
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to accept friend request');
    },
  });

  const acceptQuestMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      return await questsService.acceptQuestInvite(inviteId, user.id);
    },
    onSuccess: (_, inviteId) => {
      queryClient.invalidateQueries({ queryKey: ['quests', user?.id] });
      Alert.alert('Success', 'Quest accepted!');
      const notification = notifications.find(n => n.relatedId === inviteId);
      if (notification) {
        markAsRead(notification.id);
      }
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to accept quest');
    },
  });

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'friend_request':
        return <UserPlus size={24} color={theme.colors.primary} />;
      case 'quest_invite':
        return <Send size={24} color={theme.colors.warning} />;
      case 'chat_message':
        return <MessageCircle size={24} color={theme.colors.success} />;
      case 'quest_completed':
        return <Trophy size={24} color={theme.colors.primary} />;
      default:
        return <Send size={24} color={theme.colors.text} />;
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    switch (notification.type) {
      case 'friend_request':
        if (notification.relatedId) {
          Alert.alert(
            'Friend Request',
            'Accept this friend request?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Accept',
                onPress: () => {
                  acceptFriendRequestMutation.mutate({
                    requestId: notification.id,
                    friendId: notification.relatedId!,
                  });
                },
              },
            ]
          );
        }
        break;
      case 'quest_invite':
        if (notification.relatedId) {
          Alert.alert(
            'Quest Invite',
            'Accept this quest?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Accept',
                onPress: () => {
                  acceptQuestMutation.mutate(notification.relatedId!);
                },
              },
            ]
          );
        }
        break;
      case 'chat_message':
        router.back();
        break;
      default:
        break;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={[theme.colors.backgroundTertiary, theme.colors.background]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Notifications {unreadCount > 0 && `(${unreadCount})`}
        </Text>
        <View style={styles.headerActions}>
          {unreadCount > 0 && (
            <Pressable
              style={[styles.markAllButton, { backgroundColor: theme.colors.primary + '20' }]}
              onPress={markAllAsRead}
            >
              <CheckCheck size={18} color={theme.colors.primary} />
              <Text style={[styles.markAllText, { color: theme.colors.primary }]}>Mark all read</Text>
            </Pressable>
          )}
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <X size={24} color={theme.colors.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
      >
        {isLoading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 40 }} />
        ) : notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No Notifications</Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
              You&apos;re all caught up!
            </Text>
          </View>
        ) : (
          notifications.map((notification) => (
            <Pressable
              key={notification.id}
              style={[
                styles.notificationCard,
                {
                  backgroundColor: notification.read ? theme.colors.card : theme.colors.primary + '10',
                  borderColor: notification.read ? 'transparent' : theme.colors.primary + '30',
                  borderWidth: notification.read ? 0 : 1,
                },
              ]}
              onPress={() => handleNotificationPress(notification)}
            >
              <View style={[styles.iconContainer, { backgroundColor: theme.colors.backgroundSecondary }]}>
                {getNotificationIcon(notification.type)}
              </View>
              <View style={styles.notificationContent}>
                <Text style={[styles.notificationTitle, { color: theme.colors.text }]}>
                  {notification.title}
                </Text>
                <Text style={[styles.notificationMessage, { color: theme.colors.textSecondary }]}>
                  {notification.message}
                </Text>
                <Text style={[styles.notificationTime, { color: theme.colors.textSecondary }]}>
                  {formatNotificationTime(notification.createdAt)}
                </Text>
              </View>
              {!notification.read && (
                <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} />
              )}
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function formatNotificationTime(date: Date): string {
  const now = new Date();
  const notifDate = new Date(date);
  const diffMs = now.getTime() - notifDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return notifDate.toLocaleDateString();
}

function createStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 20,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '800' as const,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    markAllButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
    },
    markAllText: {
      fontSize: 13,
      fontWeight: '600' as const,
    },
    closeButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 60,
    },
    emptyTitle: {
      fontSize: 24,
      fontWeight: '700' as const,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 16,
    },
    notificationCard: {
      flexDirection: 'row',
      padding: 16,
      borderRadius: 16,
      marginBottom: 12,
      alignItems: 'flex-start',
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    notificationContent: {
      flex: 1,
    },
    notificationTitle: {
      fontSize: 16,
      fontWeight: '700' as const,
      marginBottom: 4,
    },
    notificationMessage: {
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 6,
    },
    notificationTime: {
      fontSize: 12,
    },
    unreadDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginLeft: 8,
      marginTop: 4,
    },
  });
}

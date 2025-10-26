import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Modal, Alert, Share } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, UserPlus, Send, X, Link as LinkIcon } from 'lucide-react-native';
import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Friend } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import * as friendsService from '@/services/supabase/friends';
import * as questsService from '@/services/supabase/quests';
import { useGame } from '@/contexts/GameContext';
import { Avatar } from '@/components/SafeImage';



export default function CommunityScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { quests } = useGame();
  const queryClient = useQueryClient();
  
  const activeQuest = useMemo(() => {
    return quests.find((q) => !q.completed && (q.source === 'user' || q.source === 'ai'));
  }, [quests]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [showSendQuest, setShowSendQuest] = useState(false);

  const styles = createStyles(theme.colors);

  const friendsQuery = useQuery({
    queryKey: ['friends', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      try {
        return await friendsService.getFriends(user.id);
      } catch (error: any) {
        console.error('Error getting friends:', error?.message || JSON.stringify(error));
        const errorMessage = typeof error === 'string' ? error : (error?.message || 'Failed to load friends');
        throw new Error(errorMessage);
      }
    },
    enabled: !!user?.id,
    retry: 1,
    staleTime: 30000,
  });

  const searchUsersQuery = useQuery({
    queryKey: ['searchUsers', searchQuery],
    queryFn: () => friendsService.searchUsers(searchQuery),
    enabled: searchQuery.length > 2 && showAddFriend,
  });

  const sendFriendRequestMutation = useMutation({
    mutationFn: (friendId: string) => friendsService.sendFriendRequest(user!.id, friendId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      Alert.alert('Success', 'Friend request sent!');
      setShowAddFriend(false);
      setSearchQuery('');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to send friend request');
    },
  });

  const createInviteMutation = useMutation({
    mutationFn: () => friendsService.createFriendInvite(user!.id),
    onSuccess: async (invite) => {
      const inviteLink = `rejectionhero://invite/${invite.inviteCode}`;
      try {
        await Share.share({
          message: `Join me on Rejection Hero! Use this link to add me as a friend: ${inviteLink}`,
          url: inviteLink,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
      setShowInviteModal(false);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to create invite');
    },
  });

  const sendQuestMutation = useMutation({
    mutationFn: ({ friendId, message }: { friendId: string; message?: string }) =>
      questsService.sendQuestToFriend(user!.id, friendId, activeQuest!.id, message),
    onSuccess: () => {
      Alert.alert('Success', 'Quest sent to friend!');
      setShowSendQuest(false);
      setSelectedFriend(null);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to send quest');
    },
  });

  const filteredFriends = useMemo(() => {
    if (!friendsQuery.data) return [];
    if (!searchQuery || showAddFriend) return friendsQuery.data;
    return friendsQuery.data.filter((friend) =>
      friend.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [friendsQuery.data, searchQuery, showAddFriend]);

  const searchResults = useMemo(() => {
    if (!searchUsersQuery.data) return [];
    const friendIds = new Set(friendsQuery.data?.map((f) => f.id) || []);
    return searchUsersQuery.data.filter((searchUser) => searchUser.id !== user?.id && !friendIds.has(searchUser.id));
  }, [searchUsersQuery.data, friendsQuery.data, user]);

  const handleSendQuest = (friend: Friend) => {
    if (!activeQuest) {
      Alert.alert('No Active Quest', 'You need an active quest to send to friends.');
      return;
    }
    setSelectedFriend(friend);
    setShowSendQuest(true);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={[theme.colors.backgroundTertiary, theme.colors.background]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Community</Text>
        <View style={styles.headerActions}>
          <Pressable
            style={[styles.iconButton, { backgroundColor: theme.colors.card }]}
            onPress={() => setShowInviteModal(true)}
          >
            <LinkIcon size={20} color={theme.colors.primary} />
          </Pressable>
          <Pressable
            style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => setShowAddFriend(true)}
          >
            <UserPlus size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add Friend</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
        <Search size={20} color={theme.colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.text }]}
          placeholder={showAddFriend ? "Search users to add..." : "Search friends..."}
          placeholderTextColor={theme.colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {showAddFriend && (
          <Pressable onPress={() => { setShowAddFriend(false); setSearchQuery(''); }}>
            <X size={20} color={theme.colors.textSecondary} />
          </Pressable>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
      >
        {showAddFriend ? (
          <>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Search Results</Text>
            {searchUsersQuery.isLoading ? (
              <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
            ) : searchQuery.length < 3 ? (
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                Type at least 3 characters to search
              </Text>
            ) : searchResults.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No users found</Text>
            ) : (
              searchResults.map((user) => (
                <View key={user.id} style={[styles.friendCard, { backgroundColor: theme.colors.card }]}>
                  <View style={styles.friendHeader}>
                    <Avatar
                      name={user.fullName || user.username}
                      imageUrl={user.avatarUrl}
                      size={56}
                    />
                    <View style={styles.friendInfo}>
                      <Text style={[styles.friendName, { color: theme.colors.text }]}>{user.username}</Text>
                      {user.fullName && (
                        <Text style={[styles.fullName, { color: theme.colors.textSecondary }]}>{user.fullName}</Text>
                      )}
                      <View style={styles.statsRow}>
                        <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>Lv {user.level}</Text>
                        <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>💎 {user.totalPoints}</Text>
                      </View>
                    </View>
                  </View>
                  <Pressable
                    style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
                    onPress={() => sendFriendRequestMutation.mutate(user.id)}
                    disabled={sendFriendRequestMutation.isPending}
                  >
                    {sendFriendRequestMutation.isPending ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <UserPlus size={16} color="#FFFFFF" />
                        <Text style={styles.actionButtonText}>Send Request</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              ))
            )}
          </>
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Your Friends</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
              {filteredFriends.length} friends
            </Text>

            {friendsQuery.isLoading ? (
              <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
            ) : filteredFriends.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No friends yet. Add some friends to start sharing quests!
              </Text>
            ) : (
              filteredFriends.map((friend) => (
                <View key={friend.id} style={[styles.friendCard, { backgroundColor: theme.colors.card }]}>
                  <View style={styles.friendHeader}>
                    <Avatar
                      name={friend.fullName || friend.username}
                      imageUrl={friend.avatarUrl}
                      size={56}
                    />
                    <View style={styles.friendInfo}>
                      <View style={styles.friendNameRow}>
                        <Text style={[styles.friendName, { color: theme.colors.text }]}>{friend.username}</Text>
                        <View style={[styles.rankBadge, { backgroundColor: theme.colors.primary + '20' }]}>
                          <Text style={[styles.rankText, { color: theme.colors.primary }]}>Lv {friend.level}</Text>
                        </View>
                      </View>
                      <View style={styles.statsRow}>
                        <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>💎 {friend.totalPoints}</Text>
                        <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>🎯 {friend.totalRejections}</Text>
                        <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>🔥 {friend.streak}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.actionsRow}>
                    <Pressable
                      style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
                      onPress={() => handleSendQuest(friend)}
                      disabled={!activeQuest}
                    >
                      <Send size={16} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Send Quest</Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={showInviteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Invite Friends</Text>
            <Text style={[styles.modalDescription, { color: theme.colors.textSecondary }]}>
              Share an invite link to add friends easily
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, { backgroundColor: theme.colors.backgroundSecondary }]}
                onPress={() => setShowInviteModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => createInviteMutation.mutate()}
                disabled={createInviteMutation.isPending}
              >
                {createInviteMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Create & Share</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showSendQuest} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Send Quest</Text>
            {selectedFriend && activeQuest && (
              <>
                <Text style={[styles.modalDescription, { color: theme.colors.textSecondary }]}>
                  Send &quot;{activeQuest.title}&quot; to {selectedFriend.username}?
                </Text>
                <View style={[styles.questPreview, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                  <Text style={[styles.questPreviewTitle, { color: theme.colors.text }]}>{activeQuest.title}</Text>
                  <Text style={[styles.questPreviewDesc, { color: theme.colors.textSecondary }]}>{activeQuest.description}</Text>
                  <View style={styles.questPreviewStats}>
                    <Text style={[styles.questPreviewStat, { color: theme.colors.primary }]}>+{activeQuest.xp} XP</Text>
                    <Text style={[styles.questPreviewStat, { color: theme.colors.primary }]}>+{activeQuest.points} pts</Text>
                  </View>
                </View>
              </>
            )}
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, { backgroundColor: theme.colors.backgroundSecondary }]}
                onPress={() => {
                  setShowSendQuest(false);
                  setSelectedFriend(null);
                }}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => {
                  if (selectedFriend) {
                    sendQuestMutation.mutate({ friendId: selectedFriend.id });
                  }
                }}
                disabled={sendQuestMutation.isPending}
              >
                {sendQuestMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Send</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
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
      gap: 10,
    },
    iconButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
    },
    addButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 20,
    },
    addButtonText: {
      fontSize: 14,
      fontWeight: '700' as const,
      color: '#FFFFFF',
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 20,
      marginBottom: 20,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 16,
      gap: 12,
      borderWidth: 1,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '700' as const,
      marginBottom: 4,
    },
    sectionSubtitle: {
      fontSize: 14,
      marginBottom: 16,
    },
    friendCard: {
      padding: 20,
      borderRadius: 20,
      marginBottom: 16,
    },
    friendHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      gap: 12,
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      fontSize: 24,
      fontWeight: '700' as const,
      color: '#FFFFFF',
    },
    friendInfo: {
      flex: 1,
    },
    fullName: {
      fontSize: 14,
      marginBottom: 4,
    },
    friendNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6,
    },
    friendName: {
      fontSize: 18,
      fontWeight: '700' as const,
    },
    rankBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    rankText: {
      fontSize: 11,
      fontWeight: '700' as const,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 16,
    },
    statText: {
      fontSize: 14,
      fontWeight: '600' as const,
    },
    emptyText: {
      fontSize: 16,
      textAlign: 'center',
      marginTop: 40,
    },
    errorContainer: {
      alignItems: 'center',
      marginTop: 40,
      gap: 16,
    },
    retryButton: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
    },
    retryButtonText: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: '#FFFFFF',
    },
    actionsRow: {
      flexDirection: 'row',
      gap: 12,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: 12,
    },
    actionButtonText: {
      fontSize: 14,
      fontWeight: '700' as const,
      color: '#FFFFFF',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      width: '100%',
      maxWidth: 400,
      borderRadius: 24,
      padding: 24,
    },
    modalTitle: {
      fontSize: 24,
      fontWeight: '800' as const,
      marginBottom: 8,
    },
    modalDescription: {
      fontSize: 16,
      marginBottom: 20,
      lineHeight: 22,
    },
    modalActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20,
    },
    modalButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalButtonText: {
      fontSize: 16,
      fontWeight: '700' as const,
    },
    questPreview: {
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      marginTop: 12,
    },
    questPreviewTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
      marginBottom: 8,
    },
    questPreviewDesc: {
      fontSize: 14,
      marginBottom: 12,
      lineHeight: 20,
    },
    questPreviewStats: {
      flexDirection: 'row',
      gap: 16,
    },
    questPreviewStat: {
      fontSize: 14,
      fontWeight: '700' as const,
    },
  });
}

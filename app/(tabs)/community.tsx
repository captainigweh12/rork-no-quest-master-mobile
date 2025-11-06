import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, Modal, Alert, Share, FlatList, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, UserPlus, Send, X, Link as LinkIcon, MessageCircle, Users2, Newspaper, PlusCircle, BookOpen, Sparkles, Lock, Users, Globe, ImagePlus } from 'lucide-react-native';
import { useState, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Friend } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import * as friendsService from '@/services/supabase/friends';
import * as questsService from '@/services/supabase/quests';
import * as communityService from '@/services/supabase/community';
import type { CommunityPost } from '@/types';
import { useGame } from '@/contexts/GameContext';
import { Avatar } from '@/components/SafeImage';
import { useJournals, type Skill, type JournalPrivacy } from '@/contexts/JournalsContext';
import { generateObject } from '@rork/toolkit-sdk';
import { z } from 'zod';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';

export default function CommunityScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { quests, profile } = useGame();
  const queryClient = useQueryClient();
  const router = useRouter();
  
  const activeQuest = useMemo(() => {
    return quests.find((q) => !q.completed && (q.source === 'user' || q.source === 'ai'));
  }, [quests]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [showSendQuest, setShowSendQuest] = useState(false);
  const [tab, setTab] = useState<'feed' | 'friends'>('feed');
  
  const [showCreateJournal, setShowCreateJournal] = useState(false);
  const [journalTitle, setJournalTitle] = useState('');
  const [journalNotes, setJournalNotes] = useState('');
  const [journalPrivacy, setJournalPrivacy] = useState<JournalPrivacy>('public');
  const [journalImages, setJournalImages] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSkillsModal, setShowSkillsModal] = useState(false);
  const [analyzedSkills, setAnalyzedSkills] = useState<Skill[]>([]);
  const [aiExplanation, setAiExplanation] = useState('');
  
  const { addJournal } = useJournals();

  const styles = createStyles(theme.colors);

  const feedQuery = useQuery({
    queryKey: ['communityFeed', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      try {
        return await communityService.getFeed(user.id);
      } catch (error: any) {
        console.error('Error loading feed:', error?.message || JSON.stringify(error));
        throw error;
      }
    },
    enabled: !!user?.id && tab === 'feed',
    staleTime: 15000,
  });

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
    queryFn: async () => {
      console.log('[Community] searchUsers queryFn', { searchQuery });
      const results = await friendsService.searchUsers(searchQuery);
      console.log('[Community] searchUsers results count:', results.length);
      return results;
    },
    enabled: searchQuery.length >= 1 && showAddFriend,
    staleTime: 15000,
  });

  const suggestionsQuery = useQuery({
    queryKey: ['friendSuggestionsInline', searchQuery],
    queryFn: async () => {
      if (!searchQuery) return [] as Friend[];
      try {
        const results = await friendsService.searchUsers(searchQuery);
        console.log('[Community] inline suggestions count:', results.length);
        return results;
      } catch (e: any) {
        console.error('[Community] inline suggestions error', e?.message || e);
        return [] as Friend[];
      }
    },
    enabled: !!searchQuery && !showAddFriend && tab === 'friends',
    staleTime: 10000,
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
      const inviteLink = `noquest://invite/${invite.inviteCode}`;
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
    const filtered = searchUsersQuery.data.filter((searchUser) => searchUser.id !== user?.id && !friendIds.has(searchUser.id));

    const q = (searchQuery || '').toLowerCase();
    const userLevel = profile?.level ?? 1;

    return filtered
      .map(u => ({
        u,
        startsWith: (u.username || '').toLowerCase().startsWith(q) || (u.fullName || '').toLowerCase().startsWith(q),
        includes: (u.username || '').toLowerCase().includes(q) || (u.fullName || '').toLowerCase().includes(q),
        levelDiff: Math.abs((u.level ?? 1) - userLevel),
      }))
      .sort((a, b) => {
        if (a.startsWith !== b.startsWith) return a.startsWith ? -1 : 1;
        if (a.includes !== b.includes) return a.includes ? -1 : 1;
        if (a.levelDiff !== b.levelDiff) return a.levelDiff - b.levelDiff;
        return (b.u.totalPoints ?? 0) - (a.u.totalPoints ?? 0);
      })
      .map(x => x.u);
  }, [searchUsersQuery.data, friendsQuery.data, user, searchQuery, profile?.level]);

  const recommendedUsersQuery = useQuery({
    queryKey: ['recommendedUsers', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      return await friendsService.recommendFriends(user.id, 10);
    },
    enabled: !!user?.id && showAddFriend,
    staleTime: 30000,
  });

  const recommendedUsers = useMemo(() => {
    if (!recommendedUsersQuery.data) return [];
    const friendIds = new Set(friendsQuery.data?.map((f) => f.id) || []);
    const userLevel = profile?.level ?? 1;
    
    return recommendedUsersQuery.data
      .filter((recUser) => recUser.id !== user?.id && !friendIds.has(recUser.id))
      .sort((a, b) => {
        const aLevelDiff = Math.abs(a.level - userLevel);
        const bLevelDiff = Math.abs(b.level - userLevel);
        if (aLevelDiff !== bLevelDiff) return aLevelDiff - bLevelDiff;
        return b.totalPoints - a.totalPoints;
      })
      .slice(0, 10);
  }, [recommendedUsersQuery.data, friendsQuery.data, user, profile?.level]);

  const handleSendQuest = (friend: Friend) => {
    if (!activeQuest) {
      Alert.alert('No Active Quest', 'You need an active quest to send to friends.');
      return;
    }
    setSelectedFriend(friend);
    setShowSendQuest(true);
  };

  const pickJournalImages = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission required', 'Please allow photo access to add images.');
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        selectionLimit: 4,
      });
      if (!result.canceled) {
        const uris = result.assets?.map(a => a.uri).filter(Boolean) as string[];
        setJournalImages(prev => [...prev, ...uris].slice(0, 8));
      }
    } catch (e) {
      console.error('pickImages error', e);
      Alert.alert('Image error', 'Could not pick images. Try again.');
    }
  };

  const handleAnalyzeJournal = async () => {
    if (!journalTitle.trim()) {
      Alert.alert('Add details', 'Please add what you did to log your win.');
      return;
    }
    
    setIsAnalyzing(true);
    
    try {
      const result = await generateObject({
        messages: [
          {
            role: 'user',
            content: `Analyze this personal growth journal entry and identify which skills the person developed. Consider their actions, challenges faced, and outcomes.

Entry: "${journalTitle.trim()}"
${journalNotes.trim() ? `\nContext: "${journalNotes.trim()}"` : ''}

Based on this entry, determine which of these skills they grew:
- Charisma (social skills, charm, communication)
- Intellect (learning, problem-solving, knowledge)
- Courage (facing fears, taking risks, boldness)
- Empathy (understanding others, compassion, emotional intelligence)
- Creativity (innovative thinking, artistic expression, imagination)
- Discipline (consistency, self-control, commitment)

Provide a brief encouraging explanation of the skills they developed and why.`
          }
        ],
        schema: z.object({
          skills: z.array(z.enum(['charisma', 'intellect', 'courage', 'empathy', 'creativity', 'discipline'])).describe('The skills that were developed'),
          explanation: z.string().describe('A brief encouraging explanation of the skills developed (2-3 sentences)')
        })
      });
      
      setAnalyzedSkills(result.skills);
      setAiExplanation(result.explanation);
      setShowCreateJournal(false);
      setShowSkillsModal(true);
    } catch (e) {
      console.error('AI analysis error:', e);
      Alert.alert('Analysis failed', 'Could not analyze your entry. Try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveJournal = async () => {
    try {
      const entry = await addJournal({ 
        title: journalTitle.trim(), 
        notes: journalNotes.trim() || undefined, 
        images: journalImages, 
        skills: analyzedSkills, 
        privacy: journalPrivacy 
      });
      
      if (journalPrivacy === 'friends' || journalPrivacy === 'public') {
        await communityService.shareJournal({
          userId: user!.id,
          username: user!.username || user!.email,
          avatarUrl: user!.avatarUrl,
          journalId: entry.id,
          title: entry.title,
          notes: entry.notes,
          skills: entry.skills,
          privacy: journalPrivacy === 'friends' ? 'friends' : 'public',
        });
        queryClient.invalidateQueries({ queryKey: ['communityFeed'] });
      }
      
      setJournalTitle('');
      setJournalNotes('');
      setJournalPrivacy('public');
      setJournalImages([]);
      setAnalyzedSkills([]);
      setAiExplanation('');
      setShowSkillsModal(false);
      
      Alert.alert('Success', 'Your journal was saved and shared!');
    } catch (e) {
      console.error('Save journal error:', e);
      Alert.alert('Save failed', 'Could not save your journal. Try again.');
    }
  };

  function labelForSkill(s: Skill): string {
    switch (s) {
      case 'charisma': return 'Charisma';
      case 'intellect': return 'Intellect';
      case 'courage': return 'Courage';
      case 'empathy': return 'Empathy';
      case 'creativity': return 'Creativity';
      case 'discipline': return 'Discipline';
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, zIndex: 1 }]}>
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
            testID="add-friend-open"
            style={[styles.addButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => setShowAddFriend(true)}
          >
            <UserPlus size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add Friend</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.tabsRow}>
        <Pressable onPress={() => setTab('feed')} style={[styles.tabButton, { backgroundColor: tab==='feed'? theme.colors.primary : theme.colors.card, borderColor: theme.colors.border }]} testID="community-tab-feed">
          <Newspaper size={16} color={tab==='feed'? '#FFFFFF' : theme.colors.textSecondary} />
          <Text style={[styles.tabButtonText, { color: tab==='feed'? '#FFFFFF' : theme.colors.text }]}>Feed</Text>
        </Pressable>
        <Pressable onPress={() => setTab('friends')} style={[styles.tabButton, { backgroundColor: tab==='friends'? theme.colors.primary : theme.colors.card, borderColor: theme.colors.border }]} testID="community-tab-friends">
          <Users2 size={16} color={tab==='friends'? '#FFFFFF' : theme.colors.textSecondary} />
          <Text style={[styles.tabButtonText, { color: tab==='friends'? '#FFFFFF' : theme.colors.text }]}>Friends</Text>
        </Pressable>
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

      {!showAddFriend && tab === 'friends' && searchQuery.length >= 1 && (
        <View style={{ paddingHorizontal: 20 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 4, gap: 8 }}
            testID="inline-suggestions-row"
          >
            {(suggestionsQuery.data ?? []).slice(0, 10).map((u) => (
              <Pressable
                key={u.id}
                onPress={() => {
                  setShowAddFriend(true);
                  setSearchQuery(u.username);
                }}
                style={[styles.suggestionChip, { backgroundColor: theme.colors.backgroundSecondary, borderColor: theme.colors.border }]}
                testID={`suggestion-${u.id}`}
              >
                <Avatar name={u.fullName || u.username} imageUrl={u.avatarUrl} size={20} />
                <Text style={[styles.suggestionText, { color: theme.colors.text }]}>{u.username}</Text>
              </Pressable>
            ))}
            {suggestionsQuery.isLoading && (
              <View style={[styles.suggestionChip, { backgroundColor: theme.colors.backgroundSecondary, borderColor: theme.colors.border }]}>                
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {tab === 'feed' ? (
        <FlatList
          data={feedQuery.data as CommunityPost[] | undefined}
          keyExtractor={(item) => item.id}
          refreshing={feedQuery.isFetching}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: ['communityFeed'] })}
          contentContainerStyle={[styles.feedContent, { paddingBottom: insets.bottom + 20 }]}
          initialNumToRender={6}
          windowSize={7}
          removeClippedSubviews={Platform.OS !== 'web'}
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={50}
          ListHeaderComponent={
            <View>
              <Text style={[styles.sectionTitle, { color: theme.colors.text, paddingHorizontal: 20 }]}>Community Feed</Text>              
              <Pressable 
                style={[styles.createPostButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                onPress={() => setShowCreateJournal(true)}
                testID="create-journal-button"
              >
                <Avatar name={user?.username || user?.email || 'U'} imageUrl={user?.avatarUrl} size={40} />
                <Text style={[styles.createPostText, { color: theme.colors.textSecondary }]}>Share your wins...</Text>
                <PlusCircle size={24} color={theme.colors.primary} />
              </Pressable>
            </View>
          }
          ListEmptyComponent={feedQuery.isLoading ? (
            <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 30 }} />
          ) : (
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary, paddingHorizontal: 20 }]}>No posts yet. Share a journal or quest!</Text>
          )}
          renderItem={({ item }) => (
            <View style={[styles.postCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>              
              <View style={styles.postHeader}>
                <Avatar name={item.username} imageUrl={item.avatarUrl} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.friendName, { color: theme.colors.text }]}>{item.username}</Text>
                  <Text style={[styles.postMeta, { color: theme.colors.textSecondary }]}>{new Date(item.createdAt).toLocaleString()}</Text>
                </View>
                <View style={[styles.pillBadge, { backgroundColor: theme.colors.primary + '20' }]}>                  
                  <Text style={[styles.pillBadgeText, { color: theme.colors.primary }]}>{item.content.type === 'journal' ? 'Journal' : 'Quest'}</Text>
                </View>
              </View>
              <View style={{ gap: 8 }}>
                <Text style={[styles.postTitle, { color: theme.colors.text }] }>
                  {item.content.title}
                </Text>
                {'notes' in item.content && item.content.notes ? (
                  <Text style={[styles.postBody, { color: theme.colors.textSecondary }]}>{item.content.notes}</Text>
                ) : null}
                {'description' in item.content && item.content.description ? (
                  <Text style={[styles.postBody, { color: theme.colors.textSecondary }]}>{item.content.description}</Text>
                ) : null}
                {item.content.type === 'journal' && item.content.skills && item.content.skills.length > 0 ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {item.content.skills.map((s, idx) => (
                      <View key={`${item.id}-${idx}`} style={[styles.postTag, { backgroundColor: theme.colors.backgroundTertiary }] }>
                        <Text style={[styles.postTagText, { color: theme.colors.textSecondary }]}>{s}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            </View>
          )}
        />
      ) : (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
      >
        {showAddFriend ? (
          <>
            {searchQuery.length >= 1 ? (
              <>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Search Results</Text>
                {searchUsersQuery.isLoading ? (
                  <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
                ) : searchResults.length === 0 ? (
                  <View style={{ paddingVertical: 20 }}>
                    <Text style={[styles.emptyText, { color: theme.colors.textSecondary, marginBottom: 8 }]}>No users found matching &quot;{searchQuery}&quot;</Text>
                    <Text style={[styles.emptyText, { color: theme.colors.textSecondary, fontSize: 14 }]}>Try searching with a different username</Text>
                  </View>
                ) : (
                  searchResults.map((searchUser) => (
                    <View key={searchUser.id} style={[styles.friendCard, { backgroundColor: theme.colors.card }]}>                  
                      <View style={styles.friendHeader}>
                        <Avatar
                          name={searchUser.fullName || searchUser.username}
                          imageUrl={searchUser.avatarUrl}
                          size={56}
                        />
                        <View style={styles.friendInfo}>
                          <Text style={[styles.friendName, { color: theme.colors.text }]}>{searchUser.username}</Text>
                          {searchUser.fullName && (
                            <Text style={[styles.fullName, { color: theme.colors.textSecondary }]}>{searchUser.fullName}</Text>
                          )}
                          <View style={styles.statsRow}>
                            <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>Lv {searchUser.level}</Text>
                            <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>💎 {searchUser.totalPoints}</Text>
                          </View>
                        </View>
                      </View>
                      <Pressable
                        style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
                        onPress={() => sendFriendRequestMutation.mutate(searchUser.id)}
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
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }} testID="recommended-header">
                  <Sparkles size={18} color={theme.colors.primary} />
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recommended for You</Text>
                </View>
                <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary, marginBottom: 16 }]}>Smart suggestions based on mutual friends, level and activity</Text>
                {recommendedUsersQuery.isError ? (
                  <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>Could not load recommendations. Pull to refresh.</Text>
                ) : recommendedUsersQuery.isLoading ? (
                  <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
                ) : recommendedUsers.length === 0 ? (
                  <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No recommendations available. Type to search users!</Text>
                ) : (
                  recommendedUsers.map((recUser) => (
                    <View key={recUser.id} style={[styles.friendCard, { backgroundColor: theme.colors.card }]}>                  
                      <View style={styles.friendHeader}>
                        <Avatar
                          name={recUser.fullName || recUser.username}
                          imageUrl={recUser.avatarUrl}
                          size={56}
                        />
                        <View style={styles.friendInfo}>
                          <View style={styles.friendNameRow}>
                            <Text style={[styles.friendName, { color: theme.colors.text }]}>{recUser.username}</Text>
                            {Math.abs(recUser.level - (profile?.level ?? 1)) <= 3 && (
                              <View style={[styles.recommendBadge, { backgroundColor: theme.colors.success + '20' }]}>                          
                                <Text style={[styles.recommendText, { color: theme.colors.success }]}>Similar Level</Text>
                              </View>
                            )}
                          </View>
                          {recUser.fullName && (
                            <Text style={[styles.fullName, { color: theme.colors.textSecondary }]}>{recUser.fullName}</Text>
                          )}
                          <View style={styles.statsRow}>
                            <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>Lv {recUser.level}</Text>
                            <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>💎 {recUser.totalPoints}</Text>
                            {recUser.streak > 0 && (
                              <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>🔥 {recUser.streak}</Text>
                            )}
                          </View>
                        </View>
                      </View>
                      <Pressable
                        style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
                        onPress={() => sendFriendRequestMutation.mutate(recUser.id)}
                        disabled={sendFriendRequestMutation.isPending}
                      >
                        {sendFriendRequestMutation.isPending ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <UserPlus size={16} color="#FFFFFF" />
                            <Text style={styles.actionButtonText}>Add Friend</Text>
                          </>
                        )}
                      </Pressable>
                    </View>
                  ))
                )}
              </>
            )}
          </>
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Your Friends</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>              {filteredFriends.length} friends
            </Text>

            {friendsQuery.isLoading ? (
              <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
            ) : filteredFriends.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>                No friends yet. Add some friends to start sharing quests!
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
                      style={[styles.actionButton, { backgroundColor: theme.colors.success }]}
                      onPress={() => {
                        router.push({
                          pathname: '/chat',
                          params: {
                            friendId: friend.id,
                            friendName: friend.username,
                            friendAvatar: friend.avatarUrl,
                          },
                        } as any);
                      }}
                    >
                      <MessageCircle size={16} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Chat</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.actionButton, { backgroundColor: theme.colors.primary, opacity: activeQuest ? 1 : 0.5 }]}
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
      )}

      <Modal visible={showInviteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Invite Friends</Text>
            <Text style={[styles.modalDescription, { color: theme.colors.textSecondary }]}>              Share an invite link to add friends easily
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
                <Text style={[styles.modalDescription, { color: theme.colors.textSecondary }]}>                  Send &quot;{activeQuest.title}&quot; to {selectedFriend.username}?
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

      <Modal visible={showCreateJournal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.createJournalModal, { backgroundColor: theme.colors.background }]}>            
            <View style={[styles.createJournalHeader, { borderBottomColor: theme.colors.border }]}>              
              <Text style={[styles.createJournalTitle, { color: theme.colors.text }]}>Create Journal Post</Text>
              <Pressable onPress={() => setShowCreateJournal(false)}>
                <X size={24} color={theme.colors.text} />
              </Pressable>
            </View>
            
            <ScrollView style={styles.createJournalBody} contentContainerStyle={{ padding: 16 }}>
              <Text style={[styles.journalLabel, { color: theme.colors.textSecondary }]}>What did you do?</Text>
              <TextInput
                style={[styles.journalInput, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                placeholder="e.g. Approached a stranger today, cold called 10 prospects"
                placeholderTextColor={theme.colors.textSecondary}
                value={journalTitle}
                onChangeText={setJournalTitle}
                testID="create-journal-title"
              />

              <Text style={[styles.journalLabel, { color: theme.colors.textSecondary }]}>Add photos (optional)</Text>
              <View style={styles.journalImagesRow}>
                <FlatList
                  horizontal
                  data={journalImages}
                  keyExtractor={(u, i) => `${u}-${i}`}
                  contentContainerStyle={{ gap: 8 }}
                  renderItem={({ item, index }) => (
                    <View style={[styles.journalImageWrap, { borderColor: theme.colors.border }]}>                      
                      <Image source={{ uri: item }} style={styles.journalImage} contentFit="cover" cachePolicy="memory-disk" />
                      <Pressable
                        onPress={() => setJournalImages(prev => prev.filter((_, i) => i !== index))}
                        style={[styles.removeJournalImageBtn, { backgroundColor: theme.colors.background + 'AA' }]}
                      >
                        <X size={14} color={theme.colors.text} />
                      </Pressable>
                    </View>
                  )}
                  ListFooterComponent={
                    <Pressable onPress={pickJournalImages} style={[styles.addJournalImageBtn, { borderColor: theme.colors.border }]}>                      
                      <ImagePlus size={20} color={theme.colors.textSecondary} />
                      <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>Add</Text>
                    </Pressable>
                  }
                />
              </View>

              <Text style={[styles.journalLabel, { color: theme.colors.textSecondary }]}>Add context (optional)</Text>
              <TextInput
                style={[styles.journalTextarea, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
                placeholder="What happened? How did it feel? What did you learn?"
                placeholderTextColor={theme.colors.textSecondary}
                value={journalNotes}
                onChangeText={setJournalNotes}
                multiline
                numberOfLines={4}
                testID="create-journal-notes"
              />

              <Text style={[styles.journalLabel, { color: theme.colors.textSecondary }]}>Privacy</Text>
              <View style={styles.privacyRow}>
                <Pressable
                  onPress={() => setJournalPrivacy('private')}
                  style={[styles.privacyBtn, { backgroundColor: journalPrivacy === 'private' ? theme.colors.primary : theme.colors.card, borderColor: theme.colors.border }]}
                >
                  <Lock size={16} color={journalPrivacy === 'private' ? '#FFFFFF' : theme.colors.textSecondary} />
                  <Text style={[styles.privacyBtnText, { color: journalPrivacy === 'private' ? '#FFFFFF' : theme.colors.text }]}>Private</Text>
                </Pressable>
                
                <Pressable
                  onPress={() => setJournalPrivacy('friends')}
                  style={[styles.privacyBtn, { backgroundColor: journalPrivacy === 'friends' ? theme.colors.primary : theme.colors.card, borderColor: theme.colors.border }]}
                >
                  <Users size={16} color={journalPrivacy === 'friends' ? '#FFFFFF' : theme.colors.textSecondary} />
                  <Text style={[styles.privacyBtnText, { color: journalPrivacy === 'friends' ? '#FFFFFF' : theme.colors.text }]}>Friends</Text>
                </Pressable>
                
                <Pressable
                  onPress={() => setJournalPrivacy('public')}
                  style={[styles.privacyBtn, { backgroundColor: journalPrivacy === 'public' ? theme.colors.primary : theme.colors.card, borderColor: theme.colors.border }]}
                >
                  <Globe size={16} color={journalPrivacy === 'public' ? '#FFFFFF' : theme.colors.textSecondary} />
                  <Text style={[styles.privacyBtnText, { color: journalPrivacy === 'public' ? '#FFFFFF' : theme.colors.text }]}>Public</Text>
                </Pressable>
              </View>
            </ScrollView>
            
            <View style={[styles.createJournalFooter, { borderTopColor: theme.colors.border }]}>              
              <Pressable
                onPress={handleAnalyzeJournal}
                style={[styles.createJournalSubmit, { backgroundColor: journalTitle.trim() ? theme.colors.primary : theme.colors.border, opacity: isAnalyzing ? 0.7 : 1 }]}
                disabled={!journalTitle.trim() || isAnalyzing}
                testID="submit-journal"
              >
                {isAnalyzing ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={styles.createJournalSubmitText}>Analyzing...</Text>
                  </View>
                ) : (
                  <>
                    <Sparkles size={18} color="#FFFFFF" />
                    <Text style={styles.createJournalSubmitText}>Create Post</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showSkillsModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.skillsModalContent, { backgroundColor: theme.colors.card }]}>            
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.primary + '20' }]}>                
                <Sparkles size={32} color={theme.colors.primary} />
              </View>
            </View>
            
            <Text style={[styles.skillsModalTitle, { color: theme.colors.text }]}>Skills You Grew</Text>
            
            <Text style={[styles.skillsModalExplanation, { color: theme.colors.textSecondary }]}>              {aiExplanation}
            </Text>
            
            <View style={styles.skillsContainer}>
              {analyzedSkills.map((s) => (
                <View key={s} style={[styles.skillChip, { backgroundColor: theme.colors.primary }]}>                  
                  <Text style={styles.skillChipText}>{labelForSkill(s)}</Text>
                </View>
              ))}
            </View>
            
            <View style={styles.skillsModalActions}>
              <Pressable
                onPress={() => {
                  setShowSkillsModal(false);
                  setShowCreateJournal(true);
                }}
                style={[styles.skillsModalButton, styles.skillsModalButtonSecondary, { borderColor: theme.colors.border }]}
              >
                <Text style={[styles.skillsModalButtonText, { color: theme.colors.text }]}>Edit</Text>
              </Pressable>
              
              <Pressable
                onPress={saveJournal}
                style={[styles.skillsModalButton, styles.skillsModalButtonPrimary, { backgroundColor: theme.colors.primary }]}
              >
                <Text style={[styles.skillsModalButtonText, { color: '#FFFFFF' }]}>Share Post</Text>
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
    tabsRow: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 20,
      marginBottom: 12,
    },
    tabButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 999,
      borderWidth: 1,
    },
    tabButtonText: {
      fontSize: 13,
      fontWeight: '800' as const,
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
    suggestionChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
    },
    suggestionText: {
      fontSize: 13,
      fontWeight: '700' as const,
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
    recommendBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    recommendText: {
      fontSize: 10,
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
    feedContent: {
      paddingHorizontal: 20,
      gap: 12,
    },
    postCard: {
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
      marginVertical: 8,
    },
    postHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 8,
    },
    postMeta: {
      fontSize: 12,
      fontWeight: '600' as const,
    },
    postTitle: {
      fontSize: 16,
      fontWeight: '800' as const,
      lineHeight: 22,
    },
    postBody: {
      fontSize: 14,
      lineHeight: 20,
    },
    postTag: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
    },
    postTagText: {
      fontSize: 12,
      fontWeight: '700' as const,
    },
    pillBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    },
    pillBadgeText: {
      fontSize: 11,
      fontWeight: '800' as const,
    },
    createPostButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginHorizontal: 20,
      marginVertical: 12,
      padding: 12,
      borderRadius: 16,
      borderWidth: 1,
    },
    createPostText: {
      flex: 1,
      fontSize: 16,
    },
    createJournalModal: {
      flex: 1,
      marginTop: 50,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
    },
    createJournalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
    },
    createJournalTitle: {
      fontSize: 20,
      fontWeight: '800' as const,
    },
    createJournalBody: {
      flex: 1,
    },
    journalLabel: {
      fontSize: 12,
      fontWeight: '700' as const,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      marginBottom: 8,
    },
    journalInput: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      marginBottom: 16,
    },
    journalTextarea: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      minHeight: 96,
      textAlignVertical: 'top' as const,
      marginBottom: 16,
    },
    journalImagesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    addJournalImageBtn: {
      width: 72,
      height: 72,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    journalImageWrap: {
      width: 72,
      height: 72,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
    },
    journalImage: {
      width: '100%',
      height: '100%',
    },
    removeJournalImageBtn: {
      position: 'absolute' as const,
      top: 4,
      right: 4,
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    privacyRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 16,
    },
    privacyBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: 12,
      borderWidth: 1,
    },
    privacyBtnText: {
      fontSize: 12,
      fontWeight: '700' as const,
    },
    createJournalFooter: {
      padding: 16,
      borderTopWidth: 1,
    },
    createJournalSubmit: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 14,
    },
    createJournalSubmitText: {
      color: '#FFFFFF',
      fontWeight: '800' as const,
      fontSize: 16,
    },
    skillsModalContent: {
      borderRadius: 24,
      padding: 24,
      width: '100%',
      maxWidth: 400,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    iconCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    skillsModalTitle: {
      fontSize: 24,
      fontWeight: '800' as const,
      textAlign: 'center',
      marginBottom: 12,
    },
    skillsModalExplanation: {
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center',
      marginBottom: 20,
    },
    skillsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 8,
      marginBottom: 24,
    },
    skillChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 999,
    },
    skillChipText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700' as const,
    },
    skillsModalActions: {
      flexDirection: 'row',
      gap: 12,
    },
    skillsModalButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
    },
    skillsModalButtonSecondary: {
      borderWidth: 1,
    },
    skillsModalButtonPrimary: {},
    skillsModalButtonText: {
      fontSize: 16,
      fontWeight: '700' as const,
    },
  });
}

import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, Shield, Users, TrendingUp, CheckCircle, ChevronLeft } from 'lucide-react-native';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  username: string;
  subscription_tier: string;
  is_admin: boolean;
  created_at: string;
  level: number;
  total_points: number;
  streak: number;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user?.isAdmin) {
      Alert.alert('Access Denied', 'You do not have admin privileges');
      router.back();
    }
  }, [user?.isAdmin, router]);

  const { data: users = [], refetch: refetchUsers, isLoading } = useQuery({
    queryKey: ['admin-users', searchQuery],
    queryFn: async () => {
      console.log('🔍 Fetching users for admin dashboard...');
      
      let query = supabase
        .from('user_profiles')
        .select(`
          id,
          email,
          full_name,
          username,
          subscription_tier,
          is_admin,
          created_at,
          level,
          total_points,
          streak
        `)
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.or(`email.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching users:', JSON.stringify(error, null, 2));
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error details:', error.details);
        console.error('❌ Error hint:', error.hint);
        throw error;
      }

      console.log('✅ Fetched users:', data?.length || 0);
      return data as UserProfile[];
    },
    enabled: user?.isAdmin === true,
  });

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      console.log('📊 Fetching admin stats...');
      
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, subscription_tier');

      if (profilesError) throw profilesError;

      const { data: quests, error: questsError } = await supabase
        .from('quests')
        .select('id, completed');

      if (questsError) throw questsError;

      const totalUsers = profiles?.length || 0;
      const paidUsers = profiles?.filter(p => p.subscription_tier !== 'free').length || 0;
      const totalQuests = quests?.length || 0;
      const completedQuests = quests?.filter(q => q.completed).length || 0;

      return {
        totalUsers,
        paidUsers,
        totalQuests,
        completedQuests,
      };
    },
    enabled: user?.isAdmin === true,
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<UserProfile> }) => {
      console.log('🔄 Updating user:', userId, updates);
      const { error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      console.log('✅ User updated successfully');
      refetchUsers();
    },
    onError: (error) => {
      console.error('❌ Error updating user:', error);
      Alert.alert('Error', 'Failed to update user');
    },
  });

  const handleToggleAdmin = (userId: string, currentStatus: boolean) => {
    Alert.alert(
      currentStatus ? 'Remove Admin' : 'Grant Admin',
      `Are you sure you want to ${currentStatus ? 'remove admin privileges from' : 'grant admin privileges to'} this user?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => updateUserMutation.mutate({ userId, updates: { is_admin: !currentStatus } }),
        },
      ]
    );
  };

  const handleUpdateSubscription = (userId: string, tier: string) => {
    Alert.alert(
      'Update Subscription',
      `Change subscription to ${tier}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => updateUserMutation.mutate({ userId, updates: { subscription_tier: tier } }),
        },
      ]
    );
  };

  if (!user?.isAdmin) {
    return null;
  }

  const styles = createStyles(theme.colors);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          title: 'Admin Dashboard',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.text,
        }}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            testID="admin-back-button"
            accessibilityRole="button"
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)/(home)' as any);
              }
            }}
            style={styles.backButton}
          >
            <ChevronLeft size={24} color={theme.colors.text} />
          </Pressable>
          <Shield size={32} color={theme.colors.primary} />
          <Text style={styles.title}>Admin Dashboard</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Users size={24} color={theme.colors.primary} />
            <Text style={styles.statValue}>{stats?.totalUsers || 0}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>

          <View style={styles.statCard}>
            <TrendingUp size={24} color={theme.colors.success} />
            <Text style={styles.statValue}>{stats?.paidUsers || 0}</Text>
            <Text style={styles.statLabel}>Paid Users</Text>
          </View>

          <View style={styles.statCard}>
            <CheckCircle size={24} color={theme.colors.primary} />
            <Text style={styles.statValue}>{stats?.totalQuests || 0}</Text>
            <Text style={styles.statLabel}>Total Quests</Text>
          </View>

          <View style={styles.statCard}>
            <CheckCircle size={24} color={theme.colors.success} />
            <Text style={styles.statValue}>{stats?.completedQuests || 0}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Search size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.usersSection}>
          <Text style={styles.sectionTitle}>Users ({users.length})</Text>
          
          {isLoading ? (
            <Text style={styles.loadingText}>Loading users...</Text>
          ) : (
            users.map((userItem) => (
              <View key={userItem.id} style={styles.userCard}>
                <View style={styles.userInfo}>
                  <View style={styles.userHeader}>
                    <Text style={styles.userName}>{userItem.full_name}</Text>
                    {userItem.is_admin && (
                      <View style={styles.adminBadge}>
                        <Shield size={12} color={theme.colors.background} />
                        <Text style={styles.adminBadgeText}>ADMIN</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.userEmail}>{userItem.email}</Text>
                  <Text style={styles.userUsername}>@{userItem.username}</Text>
                  
                  <View style={styles.userStats}>
                    <Text style={styles.userStat}>Level {userItem.level}</Text>
                    <Text style={styles.userStat}>•</Text>
                    <Text style={styles.userStat}>{userItem.total_points} pts</Text>
                    <Text style={styles.userStat}>•</Text>
                    <Text style={styles.userStat}>{userItem.streak} day streak</Text>
                  </View>

                  <View style={styles.subscriptionBadge}>
                    <Text style={styles.subscriptionText}>
                      {userItem.subscription_tier?.toUpperCase() || 'FREE'}
                    </Text>
                  </View>
                </View>

                <View style={styles.userActions}>
                  <Pressable
                    style={[styles.actionButton, userItem.is_admin && styles.actionButtonActive]}
                    onPress={() => handleToggleAdmin(userItem.id, userItem.is_admin)}
                  >
                    <Shield size={18} color={userItem.is_admin ? theme.colors.background : theme.colors.primary} />
                  </Pressable>

                  <Pressable
                    style={styles.actionButton}
                    onPress={() => {
                      Alert.alert(
                        'Update Subscription',
                        'Select subscription tier:',
                        [
                          { text: 'Free', onPress: () => handleUpdateSubscription(userItem.id, 'free') },
                          { text: 'Pro', onPress: () => handleUpdateSubscription(userItem.id, 'pro') },
                          { text: 'Hero', onPress: () => handleUpdateSubscription(userItem.id, 'hero') },
                          { text: 'Team', onPress: () => handleUpdateSubscription(userItem.id, 'team') },
                          { text: 'Cancel', style: 'cancel' },
                        ]
                      );
                    }}
                  >
                    <TrendingUp size={18} color={theme.colors.primary} />
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(colors: { background: string; backgroundSecondary: string; text: string; textSecondary: string; primary: string; success: string; border: string; }) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 16,
    },
    title: {
      fontSize: 28,
      fontWeight: '800' as const,
      color: colors.text,
      flex: 1,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.backgroundSecondary,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      paddingHorizontal: 20,
      marginBottom: 24,
    },
    statCard: {
      flex: 1,
      minWidth: '45%',
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
      gap: 8,
    },
    statValue: {
      fontSize: 32,
      fontWeight: '900' as const,
      color: colors.text,
    },
    statLabel: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: colors.textSecondary,
      textTransform: 'uppercase' as const,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginHorizontal: 20,
      marginBottom: 24,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      fontWeight: '500' as const,
    },
    usersSection: {
      paddingHorizontal: 20,
      paddingBottom: 40,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: colors.text,
      marginBottom: 16,
    },
    loadingText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center' as const,
      paddingVertical: 20,
    },
    userCard: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    userInfo: {
      flex: 1,
      gap: 6,
    },
    userHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 4,
    },
    userName: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: colors.text,
    },
    adminBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.primary,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    adminBadgeText: {
      fontSize: 10,
      fontWeight: '800' as const,
      color: colors.background,
    },
    userEmail: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '500' as const,
    },
    userUsername: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '600' as const,
    },
    userStats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 4,
    },
    userStat: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '500' as const,
    },
    subscriptionBadge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.primary + '20',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      marginTop: 8,
    },
    subscriptionText: {
      fontSize: 11,
      fontWeight: '800' as const,
      color: colors.primary,
    },
    userActions: {
      gap: 8,
      marginLeft: 12,
    },
    actionButton: {
      backgroundColor: colors.background,
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionButtonActive: {
      backgroundColor: colors.primary,
    },
  });
}

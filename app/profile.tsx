import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Modal, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, User, Award, Target, TrendingUp, Heart } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';

export default function ProfileScreen() {
  const { theme } = useTheme();
  const { profile } = useGame();
  const { user, updateRelationshipStatus, updateUsername } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useLocalization();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [isSavingUsername, setIsSavingUsername] = useState(false);

  const styles = createStyles(theme.colors);

  const handleRelationshipStatusChange = async (status: 'single' | 'married') => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await updateRelationshipStatus(status);
    } catch (error) {
      console.error('Failed to update relationship status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUsernameEdit = () => {
    setNewUsername(user?.username || '');
    setUsernameError('');
    setShowUsernameModal(true);
  };

  const handleUsernameSave = async () => {
    setUsernameError('');
    
    if (!newUsername.trim()) {
      setUsernameError('Please enter a username');
      return;
    }

    if (newUsername.trim().length < 3) {
      setUsernameError('Username must be at least 3 characters');
      return;
    }

    if (newUsername.trim() === user?.username) {
      setShowUsernameModal(false);
      return;
    }

    setIsSavingUsername(true);
    try {
      await updateUsername(newUsername.trim());
      setShowUsernameModal(false);
    } catch (error: any) {
      console.error('Failed to update username:', error);
      if (error?.message?.includes('duplicate') || error?.code === '23505') {
        setUsernameError('Username already taken. Please choose another one.');
      } else {
        setUsernameError('Failed to update username. Please try again.');
      }
    } finally {
      setIsSavingUsername(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={[theme.colors.backgroundTertiary, theme.colors.background]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{t('profile.title')}</Text>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <X size={24} color={theme.colors.text} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
      >
        <View style={[styles.profileCard, { backgroundColor: theme.colors.card }]}>
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.secondary]}
            style={styles.avatar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.avatarText}>{profile.name.charAt(0).toUpperCase()}</Text>
          </LinearGradient>

          <Text style={[styles.profileName, { color: theme.colors.text }]}>{profile.name}</Text>
          {user?.username ? (
            <Pressable onPress={handleUsernameEdit} style={styles.usernameContainer}>
              <Text style={[styles.username, { color: theme.colors.textSecondary }]}>@{user.username}</Text>
            </Pressable>
          ) : (
            <Pressable onPress={handleUsernameEdit} style={[styles.addUsernameButton, { backgroundColor: theme.colors.primary + '20' }]}>
              <Text style={[styles.addUsernameText, { color: theme.colors.primary }]}>Add Username</Text>
            </Pressable>
          )}
          <View style={[styles.levelBadge, { backgroundColor: theme.colors.primary + '20' }]}>
            <Text style={[styles.levelText, { color: theme.colors.primary }]}>{t('profile.level')} {profile.level}</Text>
          </View>
        </View>

        <View style={[styles.statsGrid, { backgroundColor: theme.colors.card }]}>
          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
              <Target size={24} color={theme.colors.primary} />
            </View>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>{profile.totalRejections}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{t('profile.totalRejections')}</Text>
          </View>

          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: theme.colors.warning + '20' }]}>
              <Award size={24} color={theme.colors.warning} />
            </View>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>{profile.totalPoints}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{t('profile.totalPoints')}</Text>
          </View>

          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: theme.colors.error + '20' }]}>
              <TrendingUp size={24} color={theme.colors.error} />
            </View>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>{profile.streak}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{t('profile.dayStreak')}</Text>
          </View>

          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: theme.colors.success + '20' }]}>
              <User size={24} color={theme.colors.success} />
            </View>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>{profile.currentXP}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{t('profile.currentXP')}</Text>
          </View>
        </View>

        <View style={[styles.progressCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.progressTitle, { color: theme.colors.text }]}>{t('profile.levelProgress')}</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressBarTrack, { backgroundColor: theme.colors.backgroundSecondary }]}>
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: `${(profile.currentXP / profile.xpToNextLevel) * 100}%` }]}
              />
            </View>
          </View>
          <Text style={[styles.progressText, { color: theme.colors.textSecondary }]}>
            {profile.currentXP} / {profile.xpToNextLevel} {t('profile.xpToLevel')} {profile.level + 1}
          </Text>
        </View>

        <View style={[styles.relationshipCard, { backgroundColor: theme.colors.card }]}>
          <View style={styles.relationshipHeader}>
            <Heart size={24} color={theme.colors.primary} />
            <Text style={[styles.relationshipTitle, { color: theme.colors.text }]}>{t('profile.relationshipStatus')}</Text>
          </View>
          <Text style={[styles.relationshipDescription, { color: theme.colors.textSecondary }]}>
            {t('profile.relationshipDescription')}
          </Text>
          <View style={styles.relationshipButtons}>
            <Pressable
              onPress={() => handleRelationshipStatusChange('single')}
              disabled={isUpdating}
              style={[
                styles.relationshipButton,
                user?.relationshipStatus === 'single' 
                  ? { backgroundColor: theme.colors.primary }
                  : { backgroundColor: theme.colors.backgroundSecondary }
              ]}
            >
              <Text
                style={[
                  styles.relationshipButtonText,
                  user?.relationshipStatus === 'single'
                    ? { color: '#FFFFFF' }
                    : { color: theme.colors.textSecondary }
                ]}
              >
                {t('profile.single')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handleRelationshipStatusChange('married')}
              disabled={isUpdating}
              style={[
                styles.relationshipButton,
                user?.relationshipStatus === 'married'
                  ? { backgroundColor: theme.colors.primary }
                  : { backgroundColor: theme.colors.backgroundSecondary }
              ]}
            >
              <Text
                style={[
                  styles.relationshipButtonText,
                  user?.relationshipStatus === 'married'
                    ? { color: '#FFFFFF' }
                    : { color: theme.colors.textSecondary }
                ]}
              >
                {t('profile.married')}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showUsernameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUsernameModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setShowUsernameModal(false)}
        >
          <Pressable 
            style={[styles.modalContent, { backgroundColor: theme.colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Edit Username</Text>
            <Text style={[styles.modalDescription, { color: theme.colors.textSecondary }]}>
              Choose a unique username for your profile
            </Text>
            
            <TextInput
              value={newUsername}
              onChangeText={setNewUsername}
              placeholder="Enter username"
              placeholderTextColor={theme.colors.textSecondary}
              style={[styles.modalInput, { 
                backgroundColor: theme.colors.background, 
                borderColor: theme.colors.border, 
                color: theme.colors.text 
              }]}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />

            {usernameError ? (
              <View style={[styles.modalError, { backgroundColor: theme.colors.error + '20' }]}>
                <Text style={[styles.modalErrorText, { color: theme.colors.error }]}>{usernameError}</Text>
              </View>
            ) : null}

            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setShowUsernameModal(false)}
                style={[styles.modalButton, { backgroundColor: theme.colors.backgroundSecondary }]}
                disabled={isSavingUsername}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleUsernameSave}
                style={[styles.modalButton, styles.modalButtonPrimary, { backgroundColor: theme.colors.primary }]}
                disabled={isSavingUsername}
              >
                {isSavingUsername ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Save</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
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
      gap: 20,
    },
    profileCard: {
      padding: 32,
      borderRadius: 24,
      alignItems: 'center',
    },
    avatar: {
      width: 100,
      height: 100,
      borderRadius: 50,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    avatarText: {
      fontSize: 40,
      fontWeight: '700' as const,
      color: '#FFFFFF',
    },
    profileName: {
      fontSize: 28,
      fontWeight: '700' as const,
      marginBottom: 12,
    },
    levelBadge: {
      paddingHorizontal: 20,
      paddingVertical: 8,
      borderRadius: 16,
    },
    levelText: {
      fontSize: 16,
      fontWeight: '700' as const,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: 20,
      borderRadius: 24,
      gap: 20,
    },
    statItem: {
      width: '45%',
      alignItems: 'center',
      gap: 8,
    },
    statIconContainer: {
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
    },
    statValue: {
      fontSize: 24,
      fontWeight: '700' as const,
    },
    statLabel: {
      fontSize: 12,
      textAlign: 'center',
    },
    progressCard: {
      padding: 24,
      borderRadius: 24,
    },
    progressTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
      marginBottom: 16,
    },
    progressBar: {
      marginBottom: 12,
    },
    progressBarTrack: {
      height: 12,
      borderRadius: 6,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 6,
    },
    progressText: {
      fontSize: 14,
      textAlign: 'center',
    },
    relationshipCard: {
      padding: 24,
      borderRadius: 24,
    },
    relationshipHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 8,
    },
    relationshipTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
    },
    relationshipDescription: {
      fontSize: 14,
      marginBottom: 20,
      lineHeight: 20,
    },
    relationshipButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    relationshipButton: {
      flex: 1,
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    relationshipButtonText: {
      fontSize: 16,
      fontWeight: '600' as const,
    },
    usernameContainer: {
      marginBottom: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    username: {
      fontSize: 16,
      fontWeight: '600' as const,
    },
    addUsernameButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 12,
      marginBottom: 8,
    },
    addUsernameText: {
      fontSize: 14,
      fontWeight: '600' as const,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      width: '100%',
      maxWidth: 400,
      borderRadius: 24,
      padding: 24,
      gap: 16,
    },
    modalTitle: {
      fontSize: 24,
      fontWeight: '700' as const,
    },
    modalDescription: {
      fontSize: 14,
      lineHeight: 20,
    },
    modalInput: {
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
    },
    modalError: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
    },
    modalErrorText: {
      fontSize: 14,
      fontWeight: '600' as const,
      textAlign: 'center',
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
    },
    modalButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalButtonPrimary: {
      minHeight: 48,
    },
    modalButtonText: {
      fontSize: 16,
      fontWeight: '700' as const,
    },
  });
}

import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useGame } from '@/contexts/GameContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, User, Award, Target, TrendingUp } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const { theme } = useTheme();
  const { profile } = useGame();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const styles = createStyles(theme.colors);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={[theme.colors.backgroundTertiary, theme.colors.background]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Profile</Text>
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
          <View style={[styles.levelBadge, { backgroundColor: theme.colors.primary + '20' }]}>
            <Text style={[styles.levelText, { color: theme.colors.primary }]}>Level {profile.level}</Text>
          </View>
        </View>

        <View style={[styles.statsGrid, { backgroundColor: theme.colors.card }]}>
          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
              <Target size={24} color={theme.colors.primary} />
            </View>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>{profile.totalRejections}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Total Rejections</Text>
          </View>

          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: theme.colors.warning + '20' }]}>
              <Award size={24} color={theme.colors.warning} />
            </View>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>{profile.totalPoints}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Total Points</Text>
          </View>

          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: theme.colors.error + '20' }]}>
              <TrendingUp size={24} color={theme.colors.error} />
            </View>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>{profile.streak}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Day Streak</Text>
          </View>

          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: theme.colors.success + '20' }]}>
              <User size={24} color={theme.colors.success} />
            </View>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>{profile.currentXP}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Current XP</Text>
          </View>
        </View>

        <View style={[styles.progressCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.progressTitle, { color: theme.colors.text }]}>Level Progress</Text>
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
            {profile.currentXP} / {profile.xpToNextLevel} XP to Level {profile.level + 1}
          </Text>
        </View>
      </ScrollView>
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
  });
}

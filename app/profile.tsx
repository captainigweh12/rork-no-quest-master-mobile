import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, SafeImage } from '@/components/SafeImage';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Settings, Shield, Sparkles, Users as UsersIcon, BookOpenText, Swords, Award } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ProfileTab = 'Quests' | 'Journals' | 'About';

interface AchievementBadge {
  id: string;
  title: string;
  iconUrl: string;
}

interface GroupItem {
  id: string;
  name: string;
  avatarUrl: string;
}

export default function ProfileScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<ProfileTab>('Quests');
  const tabs = useMemo<ProfileTab[]>(() => ['Quests', 'Journals', 'About'], []);

  const underlineX = useRef(new Animated.Value(0)).current;

  const onTabPress = (index: number, key: ProfileTab) => {
    Animated.spring(underlineX, { toValue: index, useNativeDriver: false, speed: 16, bounciness: 8 }).start();
    setTab(key);
  };

  const achievements = useMemo<AchievementBadge[]>(() => [
    { id: 'a1', title: 'Streak 7', iconUrl: 'https://images.unsplash.com/photo-1606813907291-76a7207a7411?q=80&w=512&auto=format&fit=crop' },
    { id: 'a2', title: 'Explorer', iconUrl: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?q=80&w=512&auto=format&fit=crop' },
    { id: 'a3', title: 'Contributor', iconUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=512&auto=format&fit=crop' },
  ], []);

  const groups = useMemo<GroupItem[]>(() => [
    { id: 'g1', name: 'NoQuest Devs', avatarUrl: 'https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?q=80&w=256&auto=format&fit=crop' },
    { id: 'g2', name: 'Morning Crew', avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=256&auto=format&fit=crop' },
    { id: 'g3', name: 'Trail Blazers', avatarUrl: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?q=80&w=256&auto=format&fit=crop' },
    { id: 'g4', name: 'Writers', avatarUrl: 'https://images.unsplash.com/photo-1521575107034-e0fa0b594529?q=80&w=256&auto=format&fit=crop' },
  ], []);

  return (
    <ErrorBoundary>
      <ScrollView
        style={{ flex: 1, backgroundColor: theme.colors.background }}
        contentContainerStyle={[styles.contentContainer, { paddingTop: Math.max(0, insets.top - 8), paddingBottom: 24 + Math.max(8, Math.min(insets.bottom, 24)) }]}
        testID="profile-scroll"
      >
        <View style={{ height: Math.max(0, insets.top - 8) }} testID="safe-top" />
        <View style={[styles.hero, { backgroundColor: theme.colors.surfaceElevated }]}
          testID="profile-hero"
        >
          <View style={styles.heroTopRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.onlineDot} />
              <Text style={[styles.onlineText, { color: theme.colors.textSecondary }]}>Online</Text>
            </View>
            <Pressable onPress={() => router.push('/settings')} accessibilityRole="button" testID="btn-settings">
              <Settings color={theme.colors.text} size={22} />
            </Pressable>
          </View>

          <View style={styles.avatarRow}>
            <Avatar
              name={user?.fullName}
              imageUrl={user?.avatarUrl}
              size={88}
              testID="profile-avatar"
            />
            {user?.isAdmin ? (
              <View style={[styles.adminBadge, { backgroundColor: theme.colors.accentViolet }]}
                testID="badge-admin"
              >
                <Shield size={14} color="#0B0A0F" />
                <Text style={styles.adminLabel}>Admin</Text>
              </View>
            ) : null}
            <View style={[styles.levelPill, { backgroundColor: theme.colors.warning }]} testID="pill-level">
              <Text style={styles.levelText}>LV. {(user?.subscriptionTier ? 78 : 1)}</Text>
            </View>
          </View>

          <Text style={[styles.displayName, { color: theme.colors.text }]} numberOfLines={1} testID="display-name">
            {(user?.username || user?.fullName || 'Adventurer').toUpperCase()}
          </Text>

          <View style={styles.metricsRow}>
            <Metric label="Quests" value="38" />
            <Metric label="Followers" value="87.8K" />
            <Metric label="Following" value="526" />
          </View>

          <View style={[styles.tabsBar, { backgroundColor: theme.colors.card }]} testID="profile-tabs">
            {tabs.map((t, i) => (
              <Pressable key={t} onPress={() => onTabPress(i, t)} style={styles.tabItem} accessibilityRole="tab" testID={`tab-${t.toLowerCase()}`}>
                <Text style={[styles.tabLabel, { color: tab === t ? theme.colors.primary : theme.colors.textSecondary }]}>{t}</Text>
              </Pressable>
            ))}
            <Animated.View
              style={[styles.tabUnderline, { left: underlineX.interpolate({ inputRange: [0, 1, 2], outputRange: ['6%', '38%', '70%'] }), backgroundColor: theme.colors.primary }]}
            />
          </View>
        </View>

        <View style={{ paddingHorizontal: 18, paddingTop: 12 }}>
          {tab === 'Quests' && (
            <View>
              <SectionHeader title="Featured Quests" icon={<Swords size={18} color={theme.colors.text} />} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {sampleCards.map((c) => (
                  <QuestCard key={c.id} title={c.title} imageUrl={c.imageUrl} themeColor={theme.colors.primary} />
                ))}
              </ScrollView>
            </View>
          )}

          {tab === 'Journals' && (
            <View>
              <SectionHeader title="Recent Journals" icon={<BookOpenText size={18} color={theme.colors.text} />} />
              <View style={{ gap: 12 }}>
                {sampleJournals.map((j) => (
                  <JournalRow key={j.id} title={j.title} excerpt={j.excerpt} coverUrl={j.coverUrl} />
                ))}
              </View>
            </View>
          )}

          {tab === 'About' && (
            <View>
              <SectionHeader title="About" icon={<Sparkles size={18} color={theme.colors.text} />} />
              <Text style={[styles.aboutText, { color: theme.colors.textSecondary }]}>

                Adventurer. Builder. Always shipping. Coffee-fueled and quest-driven.
              </Text>
            </View>
          )}

          <View style={{ height: 18 }} />

          <SectionHeader title={`Achievements (${achievements.length})`} icon={<Award size={18} color={theme.colors.text} />} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }} testID="achievements-row">
            {achievements.map((a) => (
              <View key={a.id} style={[styles.badgeItem, { backgroundColor: theme.colors.card }]}
                accessibilityLabel={a.title}
              >
                <SafeImage uri={a.iconUrl} style={styles.badgeImage} />
                <Text style={[styles.badgeLabel, { color: theme.colors.textSecondary }]} numberOfLines={1}>{a.title}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={{ height: 18 }} />

          <SectionHeader title={`Groups (${groups.length})`} icon={<UsersIcon size={18} color={theme.colors.text} />} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }} testID="groups-row">
            {groups.map((g) => (
              <View key={g.id} style={styles.groupItem}>
                <SafeImage uri={g.avatarUrl} style={styles.groupAvatar} />
                <Text style={[styles.groupName, { color: theme.colors.textSecondary }]} numberOfLines={1}>{g.name}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={{ height: 32 }} />
        </View>
      </ScrollView>
    </ErrorBoundary>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric} testID={`metric-${label.toLowerCase()}`}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function SectionHeader({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <View>{icon as any}</View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
    </View>
  );
}

function QuestCard({ title, imageUrl, themeColor }: { title: string; imageUrl: string; themeColor: string }) {
  return (
    <View style={[styles.questCard, { borderColor: themeColor }]}>
      <SafeImage uri={imageUrl} style={styles.questCover} />
      <Text style={styles.questTitle} numberOfLines={1}>{title}</Text>
    </View>
  );
}

function JournalRow({ title, excerpt, coverUrl }: { title: string; excerpt: string; coverUrl: string }) {
  return (
    <View style={styles.journalRow}>
      <SafeImage uri={coverUrl} style={styles.journalCover} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.journalTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.journalExcerpt} numberOfLines={2}>{excerpt}</Text>
      </View>
    </View>
  );
}

const sampleCards = [
  { id: 'q1', title: 'Call of Duty Mission', imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=512&auto=format&fit=crop' },
  { id: 'q2', title: 'Fortnite Night', imageUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?q=80&w=512&auto=format&fit=crop' },
  { id: 'q3', title: 'The Abyss', imageUrl: 'https://images.unsplash.com/photo-1542751110-97427bbecf20?q=80&w=512&auto=format&fit=crop' },
  { id: 'q4', title: 'Origins', imageUrl: 'https://images.unsplash.com/photo-1520975922324-c2c2948110f8?q=80&w=512&auto=format&fit=crop' },
];

const sampleJournals = [
  { id: 'j1', title: 'Leveling Focus', excerpt: 'Woke up early, crushed the dailies, and planned the weekly arc...', coverUrl: 'https://images.unsplash.com/photo-1520975922324-c2c2948110f8?q=80&w=256&auto=format&fit=crop' },
  { id: 'j2', title: 'Guild Standup', excerpt: 'Synced with the team and aligned on the new questline...', coverUrl: 'https://images.unsplash.com/photo-1520975619010-2f8ab8d78f04?q=80&w=256&auto=format&fit=crop' },
];

const styles = StyleSheet.create({
  contentContainer: { },
  hero: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' },
  onlineText: { fontSize: 12, fontWeight: '700' as const },
  avatarRow: { alignItems: 'center', marginTop: 12 },
  levelPill: { position: 'absolute', right: 0, top: 4, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  levelText: { fontSize: 12, fontWeight: '800' as const, color: '#0B0A0F' },
  adminBadge: { position: 'absolute', left: 0, top: 4, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
  adminLabel: { color: '#0B0A0F', fontWeight: '800' as const, fontSize: 12 },
  displayName: { textAlign: 'center', marginTop: 12, fontSize: 22, letterSpacing: 1, fontWeight: '900' as const },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12 },
  metric: { alignItems: 'center', minWidth: 90 },
  metricValue: { fontSize: 18, fontWeight: '900' as const, color: '#FFD166' },
  metricLabel: { fontSize: 12, opacity: 0.7 },
  tabsBar: { marginTop: 14, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, position: 'relative', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tabItem: { flex: 1, alignItems: 'center' },
  tabLabel: { fontSize: 13, fontWeight: '800' as const },
  tabUnderline: { position: 'absolute', bottom: 6, width: '24%', height: 3, borderRadius: 3 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 12 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontWeight: '900' as const, fontSize: 16 },

  questCard: { width: 140, height: 170, borderRadius: 16, overflow: 'hidden', borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.02)' },
  questCover: { width: '100%', height: 130 },
  questTitle: { paddingHorizontal: 10, paddingVertical: 8, fontWeight: '800' as const, fontSize: 12 },

  journalRow: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.02)' },
  journalCover: { width: 56, height: 56, borderRadius: 12 },
  journalTitle: { fontWeight: '900' as const, fontSize: 14 },
  journalExcerpt: { fontSize: 12, opacity: 0.7 },
  aboutText: { fontSize: 13, lineHeight: 18 },

  badgeItem: { width: 88, alignItems: 'center', paddingVertical: 10, borderRadius: 14 },
  badgeImage: { width: 48, height: 48, borderRadius: 24, marginBottom: 6 },
  badgeLabel: { fontSize: 11, fontWeight: '700' as const },

  groupItem: { width: 96, alignItems: 'center', gap: 6 },
  groupAvatar: { width: 64, height: 64, borderRadius: 14 },
  groupName: { fontSize: 11, fontWeight: '700' as const, textAlign: 'center' },
});

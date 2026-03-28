import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useJournals, type Skill } from '@/contexts/JournalsContext';
import { Stack } from 'expo-router';
import { LineChart, Trophy, Sparkles } from 'lucide-react-native';

const skillMeta: Record<Skill, { label: string; color: string }> = {
  charisma: { label: 'Charisma', color: '#F59E0B' },
  intellect: { label: 'Intellect', color: '#3B82F6' },
  courage: { label: 'Courage', color: '#10B981' },
  empathy: { label: 'Empathy', color: '#EC4899' },
  creativity: { label: 'Creativity', color: '#8B5CF6' },
  discipline: { label: 'Discipline', color: '#22D3EE' },
};

export default function GrowthScreen() {
  const { theme } = useTheme();
  const { journals } = useJournals();

  const stats = useMemo(() => {
    const counts: Record<Skill, number> = {
      charisma: 0, intellect: 0, courage: 0, empathy: 0, creativity: 0, discipline: 0,
    };
    for (const j of journals) {
      for (const s of j.skills) counts[s] += 1;
    }
    const total = journals.length;
    const bySkill = (Object.keys(counts) as Skill[]).map((s) => {
      const count = counts[s];
      const level = Math.floor(count / 5) + 1;
      const nextLevelAt = level * 5;
      const progress = Math.min(1, count / nextLevelAt);
      return { key: s, count, level, progress, nextLevelAt };
    }).sort((a, b) => b.count - a.count);
    return { counts, total, bySkill };
  }, [journals]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}
      testID="growth-screen">
      <Stack.Screen options={{ title: 'Growth', headerShown: true, headerStyle: { backgroundColor: theme.colors.background }, headerTitleStyle: { color: theme.colors.text } }} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <View style={[styles.hero, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <LineChart size={20} color={theme.colors.primary} />
            <Text style={[styles.heroTitle, { color: theme.colors.text }]}>Skill Progress</Text>
          </View>
          <Text style={{ color: theme.colors.textSecondary }}>{stats.total} journals logged</Text>
        </View>

        {stats.bySkill.map((s) => {
          const meta = skillMeta[s.key];
          return (
            <View key={s.key} style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} testID={`growth-card-${s.key}`}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{meta.label}</Text>
                <View style={[styles.levelPill, { backgroundColor: meta.color + '20' }]}>
                  <Trophy size={14} color={meta.color} />
                  <Text style={[styles.levelText, { color: meta.color }]}>Lvl {s.level}</Text>
                </View>
              </View>

              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${Math.round(s.progress * 100)}%`, backgroundColor: meta.color }]} />
              </View>
              <View style={styles.rowBetween}>
                <Text style={{ color: theme.colors.textSecondary }}>{s.count} actions</Text>
                <Text style={{ color: theme.colors.textSecondary }}>{Math.floor(s.progress * 100)}% to L{ s.level + 1 }</Text>
              </View>
            </View>
          );
        })}

        <View style={[styles.tip, { backgroundColor: theme.colors.backgroundTertiary }]}>
          <Sparkles size={16} color={theme.colors.secondary} />
          <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>Tip: Log different skills to unlock balanced growth.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroTitle: { fontSize: 18, fontWeight: '800' as const },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '800' as const },
  progressBar: { height: 10, backgroundColor: '#FFFFFF20', borderRadius: 999, overflow: 'hidden', marginTop: 12 },
  progressFill: { height: 10, borderRadius: 999 },
  levelPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  levelText: { fontSize: 12, fontWeight: '800' as const },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  tip: { flexDirection: 'row', gap: 8, alignItems: 'center', padding: 12, borderRadius: 12, marginTop: 8 },
  tipText: { fontSize: 12 }
});

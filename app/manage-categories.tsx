import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useCategories } from '@/contexts/CategoriesContext';
import { Check, Plus, X } from 'lucide-react-native';

export default function ManageCategories() {
  const { theme } = useTheme();
  const { all, selectedIds, toggle } = useCategories();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const styles = createStyles(theme.colors);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 8 }]} testID="manage-categories-container">
      <Stack.Screen options={{ title: 'Categories', headerShown: true }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Your main menu</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Default shows Entrepreneurship, Dating, Sales, Confidence. Add more anytime.</Text>

        <View style={styles.grid}>
          {all.map((c) => {
            const active = selectedIds.includes(c.id);
            return (
              <Pressable
                key={c.id}
                onPress={() => toggle(c.id)}
                style={({ pressed }) => [styles.card, { borderColor: theme.colors.border, backgroundColor: active ? theme.colors.primary + '22' : theme.colors.card, opacity: pressed ? 0.9 : 1 }]}
                testID={`toggle-category-${c.id}`}
              >
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{c.title}</Text>
                  {active ? <Check size={18} color={theme.colors.primary} /> : <Plus size={18} color={theme.colors.textSecondary} />}
                </View>
                <View style={[styles.pill, { backgroundColor: c.color }]}>
                  <Text style={styles.pillText}>Select</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable onPress={() => router.back()} style={[styles.closeBtn, { backgroundColor: theme.colors.primary }]} testID="close-manage-categories">
          <X size={18} color="#fff" />
          <Text style={styles.closeText}>Done</Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1 },
    content: { padding: 20, gap: 12 },
    title: { fontSize: 20, fontWeight: '800' as const },
    subtitle: { fontSize: 12 },
    grid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 12 },
    card: { width: '48%', padding: 14, borderRadius: 12, borderWidth: 1 },
    cardHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, marginBottom: 10 },
    cardTitle: { fontSize: 14, fontWeight: '700' as const },
    pill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
    pillText: { color: '#fff', fontWeight: '800' as const, fontSize: 10 },
    footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.border },
    closeBtn: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' as const, gap: 8 },
    closeText: { color: '#fff', fontWeight: '800' as const },
  });
}

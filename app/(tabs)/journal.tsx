import { View, Text, StyleSheet, TextInput, Pressable, Animated, FlatList, Platform, Alert } from 'react-native';
import { useRef, useState, useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useJournals, type Skill } from '@/contexts/JournalsContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookOpen, Check, X } from 'lucide-react-native';
import { Stack } from 'expo-router';

export default function JournalScreen() {
  const { theme } = useTheme();
  const { journals, addJournal, removeJournal, isLoading } = useJournals();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [skills, setSkills] = useState<Skill[]>([]);
  const scale = useRef(new Animated.Value(1)).current;

  const allSkills: Skill[] = ['charisma', 'intellect', 'courage', 'empathy', 'creativity', 'discipline'];

  const isValid = useMemo(() => title.trim().length > 0 && skills.length > 0, [title, skills]);

  const handleToggleSkill = (s: Skill) => {
    setSkills(prev => (prev.includes(s) ? prev.filter(i => i !== s) : [...prev, s]));
  };

  const submit = async () => {
    if (!isValid) {
      Alert.alert('Add details', 'Please add a short title and pick at least one skill developed.');
      return;
    }
    try {
      await addJournal({ title: title.trim(), notes: notes.trim() || undefined, skills });
      setTitle('');
      setNotes('');
      setSkills([]);
      Animated.sequence([
        Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      ]).start();
    } catch (e) {
      Alert.alert('Save failed', 'Could not save your journal. Try again.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}
      testID="journal-screen">
      <Stack.Screen options={{ title: 'Journal', headerShown: true, headerStyle: { backgroundColor: theme.colors.background }, headerTitleStyle: { color: theme.colors.text } }} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <BookOpen size={24} color={theme.colors.primary} />
        <Text style={[styles.title, { color: theme.colors.text }]}>Log a Freeform Win</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Not a quest — your own initiative.</Text>
      </View>

      <View style={styles.form}>
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>What did you do?</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
          placeholder="e.g. Approached a girl today, talked to 5 strangers"
          placeholderTextColor={theme.colors.textSecondary}
          value={title}
          onChangeText={setTitle}
          testID="journal-title-input"
        />

        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Add context (optional)</Text>
        <TextInput
          style={[styles.textarea, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
          placeholder="What happened? How did it feel? What did you learn?"
          placeholderTextColor={theme.colors.textSecondary}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
          testID="journal-notes-input"
        />

        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Skills you grew</Text>
        <View style={styles.chipsRow}>
          {allSkills.map((s) => {
            const selected = skills.includes(s);
            return (
              <Pressable key={s} onPress={() => handleToggleSkill(s)}
                style={[styles.chip, { backgroundColor: selected ? theme.colors.primary : theme.colors.backgroundSecondary, borderColor: selected ? theme.colors.primary : theme.colors.border }]}
                testID={`skill-chip-${s}`}>
                <Text style={[styles.chipText, { color: selected ? '#FFFFFF' : theme.colors.text }]}>{labelForSkill(s)}</Text>
              </Pressable>
            );
          })}
        </View>

        <Animated.View style={{ transform: [{ scale }] }}>
          <Pressable
            onPress={submit}
            style={[styles.submit, { backgroundColor: isValid ? theme.colors.primary : theme.colors.border }]}
            testID="journal-submit"
          >
            <Text style={styles.submitText}>{isValid ? 'Save Journal' : 'Add title + skills'}</Text>
          </Pressable>
        </Animated.View>
      </View>

      <View style={styles.listHeader}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent Journals</Text>
        <Text style={{ color: theme.colors.textSecondary }}>{isLoading ? 'Loading…' : `${journals.length}`}</Text>
      </View>

      <FlatList
        data={journals}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]} testID={`journal-item-${item.id}`}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{item.title}</Text>
              <Pressable onPress={() => removeJournal(item.id)} accessibilityRole="button" testID={`remove-journal-${item.id}`}>
                <X size={18} color={theme.colors.textSecondary} />
              </Pressable>
            </View>
            {item.notes ? (
              <Text style={[styles.cardNotes, { color: theme.colors.textSecondary }]}>{item.notes}</Text>
            ) : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {item.skills.map((s) => (
                <View key={`${item.id}-${s}`} style={[styles.tag, { backgroundColor: theme.colors.backgroundTertiary }]}> 
                  <Text style={[styles.tagText, { color: theme.colors.textSecondary }]}>{labelForSkill(s)}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.cardDate, { color: theme.colors.textSecondary }]}>{new Date(item.createdAt).toLocaleString()}</Text>
          </View>
        )}
        ListEmptyComponent={!isLoading ? (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Text style={{ color: theme.colors.textSecondary }}>No journals yet. Log your first win!</Text>
          </View>
        ) : null}
      />
    </View>
  );
}

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

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, gap: 6 },
  title: { fontSize: 22, fontWeight: '800' as const },
  subtitle: { fontSize: 14 },
  form: { padding: 16, gap: 12 },
  label: { fontSize: 12, fontWeight: '700' as const, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  textarea: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, minHeight: 96, textAlignVertical: 'top' as const },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '700' as const },
  submit: { marginTop: 8, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  submitText: { color: '#FFFFFF', fontWeight: '800' as const, fontSize: 16 },
  listHeader: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '800' as const },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '800' as const },
  cardNotes: { marginTop: 6, fontSize: 14, lineHeight: 20 },
  tag: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  tagText: { fontSize: 12, fontWeight: '700' as const },
  cardDate: { marginTop: 8, fontSize: 11 }
});

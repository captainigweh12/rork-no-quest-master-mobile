import { View, Text, StyleSheet, TextInput, Pressable, Animated, FlatList, Alert, Modal, ActivityIndicator } from 'react-native';
import { useRef, useState, useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useJournals, type Skill, type JournalPrivacy } from '@/contexts/JournalsContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookOpen, X, Sparkles, Lock, Users, Globe, Share2 } from 'lucide-react-native';
import { Stack } from 'expo-router';
import { generateObject } from '@rork/toolkit-sdk';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import * as communityService from '@/services/supabase/community';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function JournalScreen() {
  const { theme } = useTheme();
  const { journals, addJournal, removeJournal, isLoading } = useJournals();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [privacy, setPrivacy] = useState<JournalPrivacy>('private');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [showSkillsModal, setShowSkillsModal] = useState<boolean>(false);
  const [analyzedSkills, setAnalyzedSkills] = useState<Skill[]>([]);
  const [aiExplanation, setAiExplanation] = useState<string>('');
  const scale = useRef(new Animated.Value(1)).current;

  const isValid = useMemo(() => title.trim().length > 0, [title]);

  const submit = async () => {
    if (!isValid) {
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

Entry: "${title.trim()}"
${notes.trim() ? `\nContext: "${notes.trim()}"` : ''}

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
      await addJournal({ title: title.trim(), notes: notes.trim() || undefined, skills: analyzedSkills, privacy });
      setTitle('');
      setNotes('');
      setPrivacy('private');
      setAnalyzedSkills([]);
      setAiExplanation('');
      setShowSkillsModal(false);
      Animated.sequence([
        Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      ]).start();
    } catch {
      Alert.alert('Save failed', 'Could not save your journal. Try again.');
    }
  };

  const shareMutation = useMutation({
    mutationFn: async (journalId: string) => {
      const j = journals.find(j => j.id === journalId);
      if (!user?.id || !j) throw new Error('Missing user or journal');
      if (j.privacy === 'private') throw new Error('Private journals cannot be shared');
      await communityService.shareJournal({
        userId: user.id,
        username: user.username || user.email,
        avatarUrl: user.avatarUrl,
        journalId: j.id,
        title: j.title,
        notes: j.notes,
        skills: j.skills,
        privacy: j.privacy === 'friends' ? 'friends' : 'public',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communityFeed'] });
      Alert.alert('Shared', 'Your journal was shared to the community feed.');
    },
    onError: (e: any) => {
      Alert.alert('Share failed', e?.message || 'Could not share this journal.');
    }
  });

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

        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Privacy</Text>
        <View style={styles.privacyRow}>
          <Pressable
            onPress={() => setPrivacy('private')}
            style={[styles.privacyOption, { backgroundColor: privacy === 'private' ? theme.colors.primary : theme.colors.card, borderColor: theme.colors.border }]}
            testID="privacy-private"
          >
            <Lock size={18} color={privacy === 'private' ? '#FFFFFF' : theme.colors.textSecondary} />
            <Text style={[styles.privacyText, { color: privacy === 'private' ? '#FFFFFF' : theme.colors.text }]}>Private</Text>
          </Pressable>
          
          <Pressable
            onPress={() => setPrivacy('friends')}
            style={[styles.privacyOption, { backgroundColor: privacy === 'friends' ? theme.colors.primary : theme.colors.card, borderColor: theme.colors.border }]}
            testID="privacy-friends"
          >
            <Users size={18} color={privacy === 'friends' ? '#FFFFFF' : theme.colors.textSecondary} />
            <Text style={[styles.privacyText, { color: privacy === 'friends' ? '#FFFFFF' : theme.colors.text }]}>Friends</Text>
          </Pressable>
          
          <Pressable
            onPress={() => setPrivacy('public')}
            style={[styles.privacyOption, { backgroundColor: privacy === 'public' ? theme.colors.primary : theme.colors.card, borderColor: theme.colors.border }]}
            testID="privacy-public"
          >
            <Globe size={18} color={privacy === 'public' ? '#FFFFFF' : theme.colors.textSecondary} />
            <Text style={[styles.privacyText, { color: privacy === 'public' ? '#FFFFFF' : theme.colors.text }]}>Public</Text>
          </Pressable>
        </View>

        <Animated.View style={{ transform: [{ scale }] }}>
          <Pressable
            onPress={submit}
            style={[styles.submit, { backgroundColor: isValid ? theme.colors.primary : theme.colors.border, opacity: isAnalyzing ? 0.7 : 1 }]}
            disabled={!isValid || isAnalyzing}
            testID="journal-submit"
          >
            {isAnalyzing ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.submitText}>Analyzing...</Text>
              </View>
            ) : (
              <Text style={styles.submitText}>{isValid ? 'Submit' : 'Add what you did'}</Text>
            )}
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
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{item.title}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  {item.privacy === 'private' && <Lock size={12} color={theme.colors.textSecondary} />}
                  {item.privacy === 'friends' && <Users size={12} color={theme.colors.textSecondary} />}
                  {item.privacy === 'public' && <Globe size={12} color={theme.colors.textSecondary} />}
                  <Text style={[styles.privacyBadge, { color: theme.colors.textSecondary }]}>
                    {item.privacy.charAt(0).toUpperCase() + item.privacy.slice(1)}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {(item.privacy === 'friends' || item.privacy === 'public') && (
                  <Pressable
                    onPress={() => shareMutation.mutate(item.id)}
                    accessibilityRole="button"
                    testID={`share-journal-${item.id}`}
                    style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Share2 size={18} color={theme.colors.primary} />
                  </Pressable>
                )}
                <Pressable onPress={() => removeJournal(item.id)} accessibilityRole="button" testID={`remove-journal-${item.id}`}>
                  <X size={18} color={theme.colors.textSecondary} />
                </Pressable>
              </View>
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

      <Modal
        visible={showSkillsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSkillsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.primary + '20' }]}>
                <Sparkles size={32} color={theme.colors.primary} />
              </View>
            </View>
            
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Skills You Grew</Text>
            
            <Text style={[styles.modalExplanation, { color: theme.colors.textSecondary }]}>
              {aiExplanation}
            </Text>
            
            <View style={styles.modalSkillsContainer}>
              {analyzedSkills.map((s) => (
                <View key={s} style={[styles.modalSkillChip, { backgroundColor: theme.colors.primary }]}>
                  <Text style={styles.modalSkillText}>{labelForSkill(s)}</Text>
                </View>
              ))}
            </View>
            
            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setShowSkillsModal(false)}
                style={[styles.modalButton, styles.modalButtonSecondary, { borderColor: theme.colors.border }]}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>Cancel</Text>
              </Pressable>
              
              <Pressable
                onPress={saveJournal}
                style={[styles.modalButton, styles.modalButtonPrimary, { backgroundColor: theme.colors.primary }]}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Save Journal</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  submit: { marginTop: 8, paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: '#FFFFFF', fontWeight: '800' as const, fontSize: 16 },
  listHeader: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '800' as const },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '800' as const },
  cardNotes: { marginTop: 6, fontSize: 14, lineHeight: 20 },
  tag: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  tagText: { fontSize: 12, fontWeight: '700' as const },
  cardDate: { marginTop: 8, fontSize: 11 },
  privacyRow: { flexDirection: 'row', gap: 8 },
  privacyOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1 },
  privacyText: { fontSize: 13, fontWeight: '700' as const },
  privacyBadge: { fontSize: 11, fontWeight: '600' as const },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
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
  modalTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    textAlign: 'center',
    marginBottom: 12,
  },
  modalExplanation: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalSkillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  modalSkillChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  modalSkillText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700' as const,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonSecondary: {
    borderWidth: 1,
  },
  modalButtonPrimary: {},
  modalButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
});

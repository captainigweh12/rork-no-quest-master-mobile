import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLocalization } from '@/contexts/LocalizationContext';
import { useCategories } from '@/contexts/CategoriesContext';

export default function OnboardingScreen() {
  const { prefs, update } = useOnboarding();
  const { theme } = useTheme();
  const { user, updateRelationshipStatus, updateUsername } = useAuth();
  const { t } = useLocalization();
  const { all, selectedIds, toggle } = useCategories();
  const router = useRouter();

  const [username, setUsername] = useState<string>(user?.username || '');
  const [goal, setGoal] = useState<string>(prefs.goal ?? '');
  const [personality, setPersonality] = useState<'introvert' | 'extrovert' | 'ambivert'>(prefs.personality ?? 'ambivert');
  const [preferredTime, setPreferredTime] = useState<'morning' | 'afternoon' | 'evening' | 'anytime'>(prefs.preferredTime ?? 'anytime');
  const [dailyQuests, setDailyQuests] = useState<string>(String(prefs.dailyQuests ?? 2));
  const [relationshipStatus, setRelationshipStatus] = useState<'single' | 'married'>(user?.relationshipStatus || 'single');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [error, setError] = useState<string>('');

  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);

  const handleContinue = async () => {
    setError('');

    if (page === 1) {
      if (!username.trim()) {
        setError('Please enter a username');
        return;
      }
      if (username.trim().length < 3) {
        setError('Username must be at least 3 characters');
        return;
      }
      setPage(2);
      return;
    }

    const parsedDaily = Math.max(1, Math.min(10, Number.isNaN(Number(dailyQuests)) ? 2 : Number(dailyQuests)));
    setIsSaving(true);
    try {
      await updateUsername(username.trim());
      await updateRelationshipStatus(relationshipStatus);
      await update({
        goal: goal.trim() || prefs.goal,
        personality,
        preferredTime,
        dailyQuests: parsedDaily,
        completed: true,
      });
      router.replace('/(tabs)/(home)');
    } catch (e: any) {
      console.error('Onboarding save failed:', JSON.stringify(e, null, 2));
      console.error('Error details:', e?.message || e?.code || 'Unknown error');
      console.error('Full error object:', e);
      if (e?.message?.includes('duplicate') || e?.code === '23505') {
        setError('Username already taken. Please choose another one.');
      } else {
        setError(`Failed to save. ${e?.message || 'Please try again.'}`);
      }
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.wrapper} testID="onboarding-container">
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={[theme.colors.backgroundTertiary, theme.colors.background]}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>

      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>{t('onboarding.title')}</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>{t('onboarding.subtitle')}</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Username *</Text>
          <Text style={[styles.fieldDescription, { color: theme.colors.textSecondary }]}>Choose a unique username for your profile</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="Enter username"
            placeholderTextColor={theme.colors.textSecondary}
            style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
            autoCapitalize="none"
            autoCorrect={false}
            testID="onboarding-username"
          />
        </View>

        {error ? (
          <View style={[styles.errorContainer, { backgroundColor: theme.colors.error + '20' }]}>
            <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{t('onboarding.goal')}</Text>
          <TextInput
            value={goal}
            onChangeText={setGoal}
            placeholder={prefs.goal}
            placeholderTextColor={theme.colors.textSecondary}
            style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
            testID="onboarding-goal"
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{t('onboarding.personality')}</Text>
          <View style={styles.segmentRow}>
            {(['introvert','ambivert','extrovert'] as const).map(opt => (
              <Pressable
                key={opt}
                onPress={() => setPersonality(opt)}
                style={[styles.segment, { borderColor: theme.colors.border, backgroundColor: personality === opt ? theme.colors.primary : theme.colors.card }]}
                testID={`onboarding-personality-${opt}`}
              >
                <Text style={[styles.segmentText, { color: personality === opt ? '#FFFFFF' : theme.colors.text }]}>
                  {t(`onboarding.${opt}`)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{t('onboarding.preferredTime')}</Text>
          <View style={styles.segmentRow}>
            {(['morning','afternoon','evening','anytime'] as const).map(opt => (
              <Pressable
                key={opt}
                onPress={() => setPreferredTime(opt)}
                style={[styles.segment, { borderColor: theme.colors.border, backgroundColor: preferredTime === opt ? theme.colors.primary : theme.colors.card }]}
                testID={`onboarding-time-${opt}`}
              >
                <Text style={[styles.segmentText, { color: preferredTime === opt ? '#FFFFFF' : theme.colors.text }]}>
                  {t(`onboarding.${opt}`)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{t('onboarding.dailyQuests')}</Text>
          <TextInput
            value={dailyQuests}
            onChangeText={setDailyQuests}
            keyboardType={Platform.select({ web: 'numeric', default: 'number-pad' }) as any}
            style={[styles.input, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, color: theme.colors.text }]}
            testID="onboarding-daily"
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>{t('onboarding.relationshipStatus')}</Text>
          <Text style={[styles.fieldDescription, { color: theme.colors.textSecondary }]}>{t('onboarding.relationshipDescription')}</Text>
          <View style={styles.segmentRow}>
            {(['single', 'married'] as const).map(opt => (
              <Pressable
                key={opt}
                onPress={() => setRelationshipStatus(opt)}
                style={[styles.segment, { borderColor: theme.colors.border, backgroundColor: relationshipStatus === opt ? theme.colors.primary : theme.colors.card }]}
                testID={`onboarding-relationship-${opt}`}
              >
                <Text style={[styles.segmentText, { color: relationshipStatus === opt ? '#FFFFFF' : theme.colors.text }]}>
                  {t(`onboarding.${opt}`)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <Pressable
        onPress={handleContinue}
        style={[styles.cta, { backgroundColor: theme.colors.primary, opacity: isSaving ? 0.7 : 1 }]}
        disabled={isSaving}
        testID="onboarding-continue"
      >
        {isSaving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.ctaText}>{t('onboarding.continue')}</Text>
        )}
      </Pressable>
      <Pressable
        onPress={() => router.push('/manage-categories' as any)}
        style={[styles.cta, { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border }]}
        testID="onboarding-open-categories"
      >
        <Text style={[styles.ctaText, { color: theme.colors.text }]}>Choose categories (optional)</Text>
      </Pressable>
      </SafeAreaView>
    </View>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    wrapper: { flex: 1 },
    container: { flex: 1, paddingHorizontal: 20 },
    header: { gap: 6, marginBottom: 20 },
    title: { fontSize: 24, fontWeight: '800' as const },
    subtitle: { fontSize: 14 },
    form: { gap: 16, flex: 1 },
    field: { gap: 8 },
    fieldDescription: { fontSize: 12, lineHeight: 16, marginTop: -4 },
    label: { fontSize: 12, fontWeight: '700' as const, letterSpacing: 0.4 },
    input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
    segmentRow: { flexDirection: 'row' as const, gap: 8 },
    segment: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
    segmentText: { fontSize: 14, fontWeight: '700' as const },
    errorContainer: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
    errorText: { fontSize: 14, fontWeight: '600' as const, textAlign: 'center' },
    cta: { marginBottom: 24, paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    ctaText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' as const },
  });
}

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLocalization } from '@/contexts/LocalizationContext';

export default function OnboardingScreen() {
  const { prefs, update } = useOnboarding();
  const { theme } = useTheme();
  const { user, updateRelationshipStatus } = useAuth();
  const { t } = useLocalization();

  const [goal, setGoal] = useState<string>(prefs.goal ?? '');
  const [personality, setPersonality] = useState<'introvert' | 'extrovert' | 'ambivert'>(prefs.personality ?? 'ambivert');
  const [preferredTime, setPreferredTime] = useState<'morning' | 'afternoon' | 'evening' | 'anytime'>(prefs.preferredTime ?? 'anytime');
  const [dailyQuests, setDailyQuests] = useState<string>(String(prefs.dailyQuests ?? 2));
  const [relationshipStatus, setRelationshipStatus] = useState<'single' | 'married'>(user?.relationshipStatus || 'single');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const styles = useMemo(() => createStyles(theme.colors), [theme.colors]);

  const handleContinue = async () => {
    const parsedDaily = Math.max(1, Math.min(10, Number.isNaN(Number(dailyQuests)) ? 2 : Number(dailyQuests)));
    setIsSaving(true);
    try {
      await updateRelationshipStatus(relationshipStatus);
      await update({ 
        goal: goal.trim() || prefs.goal, 
        personality, 
        preferredTime, 
        dailyQuests: parsedDaily,
        completed: true 
      });
    } catch (e) {
      console.error('Onboarding save failed', e);
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
    cta: { marginBottom: 24, paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    ctaText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' as const },
  });
}

import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Modal, ActivityIndicator, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useGame } from '@/contexts/GameContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Sparkles, Heart, Briefcase, Flame, Map } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import type { QuestDifficulty } from '@/types';
import type { CategoryId } from '@/services/questAI';
import * as Haptics from 'expo-haptics';
import React from "react";

export default function CreateQuestScreen() {
  const { theme } = useTheme();
  const { addAIQuest, addCustomQuest } = useGame();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [showAIModal, setShowAIModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null);
  const [generatingQuest, setGeneratingQuest] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customMinNo, setCustomMinNo] = useState('3');
  const [durationAmount, setDurationAmount] = useState('1');
  const [durationUnit, setDurationUnit] = useState<'minutes' | 'hours' | 'days'>('hours');

  const styles = createStyles(theme.colors);

  const handleSelectCategory = useCallback((category: CategoryId) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedCategory(category);
    setShowCategoryModal(false);
    setShowAIModal(true);
  }, []);

  const handleGenerateAI = useCallback(
    async (difficulty: QuestDifficulty) => {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setGeneratingQuest(true);
      try {
        await addAIQuest(difficulty, false, undefined, selectedCategory || undefined);
        setShowAIModal(false);
        setSelectedCategory(null);
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        if (router.canGoBack()) {
          router.back();
        } else {
          router.push('/(tabs)/(home)' as any);
        }
      } catch (error) {
        console.error('Failed to generate quest:', error);
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      } finally {
        setGeneratingQuest(false);
      }
    },
    [addAIQuest, router, selectedCategory]
  );

  const handleCreateCustom = useCallback(() => {
    if (!customTitle.trim()) {
      return;
    }

    try {
      const durationInMinutes = {
        minutes: parseInt(durationAmount) || 1,
        hours: (parseInt(durationAmount) || 1) * 60,
        days: (parseInt(durationAmount) || 1) * 60 * 24,
      }[durationUnit];

      addCustomQuest({
        title: customTitle,
        description: customDescription,
        minNoRequired: parseInt(customMinNo) || 3,
        durationMinutes: durationInMinutes,
      });

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      if (router.canGoBack()) {
        router.back();
      } else {
        router.push('/(tabs)/(home)' as any);
      }
    } catch (error) {
      console.error('Error creating custom quest:', error);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  }, [customTitle, customDescription, customMinNo, durationAmount, durationUnit, addCustomQuest, router]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={[theme.colors.backgroundTertiary, theme.colors.background]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Add New Quest</Text>
        <Pressable 
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.push('/(tabs)/(home)' as any);
            }
          }} 
          style={styles.closeButton}
        >
          <X size={24} color={theme.colors.text} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
      >
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Choose how to create your quest
        </Text>

        <Pressable
          style={[styles.optionCard, { backgroundColor: theme.colors.card }]}
          onPress={() => setShowCategoryModal(true)}
        >
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.secondary]}
            style={styles.optionGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.optionContent}>
              <View style={styles.optionIconContainer}>
                <Sparkles size={32} color="#FFFFFF" />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Generate with AI</Text>
                <Text style={styles.optionDescription}>Let Ben create an action quest for you</Text>
              </View>
            </View>
          </LinearGradient>
        </Pressable>

        <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

        <View style={[styles.customSection, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.customTitle, { color: theme.colors.text }]}>Create Custom Quest</Text>
          <Text style={[styles.customSubtitle, { color: theme.colors.textSecondary }]}>
            Design your own challenge
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
              Quest Action <Text style={{ color: theme.colors.error }}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.backgroundSecondary, color: theme.colors.text, borderColor: theme.colors.border }]}
              placeholder="Ask 10 strangers for directions"
              placeholderTextColor={theme.colors.textSecondary}
              value={customTitle}
              onChangeText={setCustomTitle}
            />
            <Text style={[styles.inputHint, { color: theme.colors.textSecondary }]}>
              Make it a simple action statement
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Description (optional)</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: theme.colors.backgroundSecondary, color: theme.colors.text, borderColor: theme.colors.border }]}
              placeholder="Additional details about the quest..."
              placeholderTextColor={theme.colors.textSecondary}
              value={customDescription}
              onChangeText={setCustomDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Minimum NOs Required</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.backgroundSecondary, color: theme.colors.text, borderColor: theme.colors.border }]}
              placeholder="3"
              placeholderTextColor={theme.colors.textSecondary}
              value={customMinNo}
              onChangeText={setCustomMinNo}
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.text }]}>Time Duration</Text>
            <View style={styles.durationContainer}>
              <TextInput
                style={[styles.durationInput, { backgroundColor: theme.colors.backgroundSecondary, color: theme.colors.text, borderColor: theme.colors.border }]}
                placeholder="1"
                placeholderTextColor={theme.colors.textSecondary}
                value={durationAmount}
                onChangeText={setDurationAmount}
                keyboardType="number-pad"
              />
              <View style={styles.durationButtons}>
                <Pressable
                  style={[styles.durationButton, { backgroundColor: durationUnit === 'minutes' ? theme.colors.primary : theme.colors.backgroundSecondary, borderColor: theme.colors.border }]}
                  onPress={() => setDurationUnit('minutes')}
                >
                  <Text style={[styles.durationButtonText, { color: durationUnit === 'minutes' ? '#FFFFFF' : theme.colors.text }]}>Minutes</Text>
                </Pressable>
                <Pressable
                  style={[styles.durationButton, { backgroundColor: durationUnit === 'hours' ? theme.colors.primary : theme.colors.backgroundSecondary, borderColor: theme.colors.border }]}
                  onPress={() => setDurationUnit('hours')}
                >
                  <Text style={[styles.durationButtonText, { color: durationUnit === 'hours' ? '#FFFFFF' : theme.colors.text }]}>Hours</Text>
                </Pressable>
                <Pressable
                  style={[styles.durationButton, { backgroundColor: durationUnit === 'days' ? theme.colors.primary : theme.colors.backgroundSecondary, borderColor: theme.colors.border }]}
                  onPress={() => setDurationUnit('days')}
                >
                  <Text style={[styles.durationButtonText, { color: durationUnit === 'days' ? '#FFFFFF' : theme.colors.text }]}>Days</Text>
                </Pressable>
              </View>
            </View>
          </View>

          <Pressable
            style={[styles.createButton, { backgroundColor: theme.colors.primary, opacity: !customTitle.trim() ? 0.5 : 1 }]}
            onPress={handleCreateCustom}
            disabled={!customTitle.trim()}
          >
            <Text style={styles.createButtonText}>Create Quest</Text>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={showCategoryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Choose Category</Text>
              <Pressable onPress={() => setShowCategoryModal(false)}>
                <X size={24} color={theme.colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={[styles.modalDescription, { color: theme.colors.textSecondary }]}>
              Select a category for your rejection quest
            </Text>

            <View style={styles.categoryButtons}>
              <CategoryButton
                label="Dating"
                icon={Heart}
                color="#EF4444"
                onPress={() => handleSelectCategory('dating')}
              />
              <CategoryButton
                label="Business"
                icon={Briefcase}
                color="#3B82F6"
                onPress={() => handleSelectCategory('business')}
              />
              <CategoryButton
                label="Confidence"
                icon={Flame}
                color="#F59E0B"
                onPress={() => handleSelectCategory('mindset')}
              />
              <CategoryButton
                label="Adventure"
                icon={Map}
                color="#10B981"
                onPress={() => handleSelectCategory('adventure')}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showAIModal}
        transparent
        animationType="fade"
        onRequestClose={() => !generatingQuest && setShowAIModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Generate AI Quest</Text>
              <Pressable
                onPress={() => {
                  setShowAIModal(false);
                  setShowCategoryModal(true);
                }}
                disabled={generatingQuest}
              >
                <X size={24} color={theme.colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={[styles.modalDescription, { color: theme.colors.textSecondary }]}>
              Choose a difficulty level for your AI-generated rejection quest
            </Text>

            <View style={styles.difficultyButtons}>
              <DifficultyButton
                label="Easy"
                color="#10B981"
                onPress={() => handleGenerateAI('easy')}
                disabled={generatingQuest}
              />
              <DifficultyButton
                label="Medium"
                color="#F59E0B"
                onPress={() => handleGenerateAI('medium')}
                disabled={generatingQuest}
              />
              <DifficultyButton
                label="Hard"
                color="#EF4444"
                onPress={() => handleGenerateAI('hard')}
                disabled={generatingQuest}
              />
              <DifficultyButton
                label="Extreme"
                color="#8B5CF6"
                onPress={() => handleGenerateAI('extreme')}
                disabled={generatingQuest}
              />
            </View>

            {generatingQuest && (
              <View style={styles.generatingContainer}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={[styles.generatingText, { color: theme.colors.textSecondary }]}>
                  Generating your quest...
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

interface CategoryButtonProps {
  label: string;
  icon: React.ComponentType<any>;
  color: string;
  onPress: () => void;
}

function CategoryButton({ label, icon: Icon, color, onPress }: CategoryButtonProps) {
  const buttonStyles = StyleSheet.create({
    button: {
      borderRadius: 16,
      overflow: 'hidden',
    },
    inner: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingVertical: 18,
      paddingHorizontal: 20,
      backgroundColor: `${color}20`,
      gap: 12,
    },
    text: {
      fontSize: 18,
      fontWeight: '700' as const,
      color,
      flex: 1,
    },
  });

  return (
    <Pressable style={buttonStyles.button} onPress={onPress}>
      <View style={buttonStyles.inner}>
        <Icon size={28} color={color} />
        <Text style={buttonStyles.text}>{label}</Text>
      </View>
    </Pressable>
  );
}

interface DifficultyButtonProps {
  label: string;
  color: string;
  onPress: () => void;
  disabled: boolean;
}

function DifficultyButton({ label, color, onPress, disabled }: DifficultyButtonProps) {
  const buttonStyles = StyleSheet.create({
    button: {
      borderRadius: 12,
      overflow: 'hidden',
      opacity: disabled ? 0.5 : 1,
    },
    inner: {
      paddingVertical: 14,
      alignItems: 'center' as const,
      backgroundColor: `${color}20`,
    },
    text: {
      fontSize: 16,
      fontWeight: '700' as const,
      color,
    },
  });

  return (
    <Pressable
      style={buttonStyles.button}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={buttonStyles.inner}>
        <Text style={buttonStyles.text}>{label}</Text>
      </View>
    </Pressable>
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
    },
    subtitle: {
      fontSize: 16,
      marginBottom: 24,
    },
    optionCard: {
      borderRadius: 20,
      overflow: 'hidden',
      marginBottom: 24,
    },
    optionGradient: {
      padding: 24,
    },
    optionContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    optionIconContainer: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    optionTextContainer: {
      flex: 1,
    },
    optionTitle: {
      fontSize: 22,
      fontWeight: '700' as const,
      color: '#FFFFFF',
      marginBottom: 4,
    },
    optionDescription: {
      fontSize: 15,
      color: 'rgba(255, 255, 255, 0.9)',
    },
    divider: {
      height: 1,
      marginVertical: 24,
    },
    customSection: {
      padding: 24,
      borderRadius: 20,
    },
    customTitle: {
      fontSize: 22,
      fontWeight: '700' as const,
      marginBottom: 4,
    },
    customSubtitle: {
      fontSize: 15,
      marginBottom: 24,
    },
    inputGroup: {
      marginBottom: 20,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '600' as const,
      marginBottom: 8,
    },
    input: {
      height: 50,
      borderRadius: 12,
      paddingHorizontal: 16,
      fontSize: 16,
      borderWidth: 1,
    },
    textArea: {
      minHeight: 100,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      borderWidth: 1,
    },
    inputHint: {
      fontSize: 12,
      marginTop: 6,
    },
    createButton: {
      height: 50,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 8,
    },
    createButtonText: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: '#FFFFFF',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    modalContent: {
      borderRadius: 24,
      padding: 24,
      width: '100%',
      maxWidth: 400,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: '700' as const,
    },
    modalDescription: {
      fontSize: 14,
      marginBottom: 24,
      lineHeight: 20,
    },
    categoryButtons: {
      gap: 14,
    },
    difficultyButtons: {
      gap: 12,
    },
    difficultyButton: {
      borderRadius: 12,
      overflow: 'hidden',
    },
    difficultyButtonInner: {
      paddingVertical: 14,
      alignItems: 'center',
    },
    difficultyButtonText: {
      fontSize: 16,
      fontWeight: '700' as const,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    generatingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 20,
    },
    generatingText: {
      fontSize: 14,
    },
    durationContainer: {
      gap: 12,
    },
    durationInput: {
      height: 50,
      borderRadius: 12,
      paddingHorizontal: 16,
      fontSize: 16,
      borderWidth: 1,
    },
    durationButtons: {
      flexDirection: 'row' as const,
      gap: 8,
    },
    durationButton: {
      flex: 1,
      height: 44,
      borderRadius: 12,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      borderWidth: 1,
    },
    durationButtonText: {
      fontSize: 14,
      fontWeight: '600' as const,
    },
  });
}

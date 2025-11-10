// Type-checked
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Modal, Platform, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useGame } from '@/contexts/GameContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { QuestLoadingModal } from '@/components/QuestLoadingModal';
import { X, Sparkles, Heart, Briefcase, Flame, Map, Send } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useState, useCallback, useRef, useEffect } from 'react';
import type { QuestDifficulty } from '@/types';
import type { CategoryId } from '@/services/questAI';
import * as Haptics from 'expo-haptics';
import { useRorkAgent, createRorkTool } from '@rork/toolkit-sdk';
import { z } from 'zod';
import React from "react";

export default function CreateQuestScreen() {
  const { theme } = useTheme();
  const { addAIQuest, addCustomQuest } = useGame();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [showAIModal, setShowAIModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null);
  const [generatingQuest, setGeneratingQuest] = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
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
    setShowChatModal(true);
  }, []);

  const agentResult = useRorkAgent({
    tools: {
      createQuest: createRorkTool({
        description: 'Create a rejection quest for the user based on the conversation',
        zodSchema: z.object({
          difficulty: z.enum(['easy', 'medium', 'hard', 'extreme']).describe('The difficulty level'),
          customRequest: z.string().optional().describe('Any custom requirements from the user'),
        }),
  async execute(input: { difficulty: 'easy' | 'medium' | 'hard' | 'extreme'; customRequest?: string }) {
          console.log('[AI] Creating quest with input:', input);
          setShowChatModal(false);
          setShowLoadingModal(true);
          try {
            await addAIQuest(input.difficulty as QuestDifficulty, false, undefined, selectedCategory || undefined);
            setSelectedCategory(null);
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            if (router.canGoBack()) {
              router.replace('/(tabs)/(home)?focus=1' as any);
            } else {
              router.push('/(tabs)/(home)?focus=1' as any);
            }
            return 'Quest created successfully!';
          } catch (error) {
            console.error('Failed to generate quest:', error);
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
            return `Error: ${error instanceof Error ? error.message : 'Failed to create quest'}`;
          } finally {
            setShowLoadingModal(false);
          }
        },
      }),
    },
  });

  const messages = agentResult.messages as Array<{ role: 'user' | 'assistant' | string; parts: Array<any> }>;
  const sendMessage = agentResult.sendMessage;
  const isGenerating = agentResult.error ? false : messages.some((m: { parts: Array<any> }) => 
    m.parts.some((p: any) => p.type === 'tool' && (p.state === 'input-streaming' || p.state === 'input-available'))
  );

  useEffect(() => {
    if (showChatModal && messages.length === 0) {
      const categoryName = selectedCategory || 'general';
      const initialMessage = `You are Ben, a friendly quest creator assistant. Ask only one short, simple question at a time. Keep it conversational. Do not use bold or asterisks. Wait for my reply before asking anything else. After you understand, create the quest with the tool.\n\nI want to create a ${categoryName} rejection quest. Start by asking your first short question.`;
      sendMessage(initialMessage);
    }
  }, [showChatModal, messages.length, selectedCategory, sendMessage]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleGenerateAI = useCallback(
    async (difficulty: QuestDifficulty) => {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setGeneratingQuest(true);
      setShowAIModal(false);
      setShowLoadingModal(true);
      try {
        await addAIQuest(difficulty, false, undefined, selectedCategory || undefined);
        setSelectedCategory(null);
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        if (router.canGoBack()) {
          router.replace('/(tabs)/(home)?focus=1' as any);
        } else {
          router.push('/(tabs)/(home)?focus=1' as any);
        }
      } catch (error) {
        console.error('Failed to generate quest:', error);
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      } finally {
        setGeneratingQuest(false);
        setShowLoadingModal(false);
      }
    },
    [addAIQuest, router, selectedCategory]
  );

  const handleSendMessage = useCallback(() => {
    if (chatInput.trim()) {
      sendMessage(chatInput);
      setChatInput('');
    }
  }, [chatInput, sendMessage]);

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
              router.replace('/(tabs)/(home)?focus=1' as any);
            } else {
              router.push('/(tabs)/(home)?focus=1' as any);
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
        visible={showChatModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowChatModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.chatModalContent, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Create Quest with Ben</Text>
              <Pressable onPress={() => {
                setShowChatModal(false);
                setShowCategoryModal(true);
              }}>
                <X size={24} color={theme.colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView 
              ref={scrollViewRef}
              style={styles.chatMessages}
              contentContainerStyle={styles.chatMessagesContent}
            >
              {messages.map((message: any, index: number) => (
                <View key={index} style={styles.messageContainer}>
                  {message.parts.map((part: any, partIndex: number) => {
                    if (part.type === 'text') {
                      return (
                        <View
                          key={`${index}-${partIndex}`}
                          style={[
                            styles.messageBubble,
                            message.role === 'user' 
                              ? { backgroundColor: theme.colors.primary, alignSelf: 'flex-end' }
                              : { backgroundColor: theme.colors.backgroundSecondary, alignSelf: 'flex-start' }
                          ]}
                        >
                          <Text style={[
                            styles.messageText,
                            { color: message.role === 'user' ? '#FFFFFF' : theme.colors.text }
                          ]}>
                            {part.text}
                          </Text>
                        </View>
                      );
                    } else if (part.type === 'tool') {
                      if (part.state === 'input-streaming' || part.state === 'input-available') {
                        return (
                          <View key={`${index}-${partIndex}`} style={styles.toolMessage}>
                            <ActivityIndicator size="small" color={theme.colors.primary} />
                            <Text style={[styles.toolText, { color: theme.colors.textSecondary }]}>
                              Creating your quest...
                            </Text>
                          </View>
                        );
                      }
                    }
                    return null;
                  })}
                </View>
              ))}
              {isGenerating && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                </View>
              )}
            </ScrollView>

            <View style={[styles.chatInputContainer, { backgroundColor: theme.colors.backgroundSecondary }]}>
              <TextInput
                style={[styles.chatInput, { color: theme.colors.text }]}
                placeholder="Type your message..."
                placeholderTextColor={theme.colors.textSecondary}
                value={chatInput}
                onChangeText={setChatInput}
                onSubmitEditing={handleSendMessage}
                editable={!isGenerating}
              />
              <Pressable 
                onPress={handleSendMessage}
                disabled={!chatInput.trim() || isGenerating}
                style={[
                  styles.sendButton,
                  { backgroundColor: theme.colors.primary },
                  (!chatInput.trim() || isGenerating) && { opacity: 0.5 }
                ]}
              >
                <Send size={20} color="#FFFFFF" />
              </Pressable>
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


          </View>
        </View>
      </Modal>

      <QuestLoadingModal visible={showLoadingModal} />
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
    chatModalContent: {
      borderRadius: 24,
      width: '100%',
      maxWidth: 500,
      maxHeight: '80%',
      flex: 1,
    },
    chatMessages: {
      flex: 1,
    },
    chatMessagesContent: {
      padding: 16,
      gap: 12,
    },
    messageContainer: {
      width: '100%',
    },
    messageBubble: {
      maxWidth: '80%',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 16,
      marginVertical: 4,
    },
    messageText: {
      fontSize: 15,
      lineHeight: 20,
    },
    toolMessage: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
      paddingVertical: 8,
    },
    toolText: {
      fontSize: 14,
      fontStyle: 'italic' as const,
    },
    loadingContainer: {
      alignItems: 'center' as const,
      paddingVertical: 12,
    },
    chatInputContainer: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      padding: 12,
      gap: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    chatInput: {
      flex: 1,
      fontSize: 15,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    sendButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
  });
}

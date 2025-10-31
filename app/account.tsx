import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Modal, ActivityIndicator, Alert, Platform, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useTheme } from '@/contexts/ThemeContext';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, User, Award, Target, TrendingUp, Heart, Camera, Upload, Sparkles, Edit3, Moon, Sun, Bell, Shield, Globe, ChevronRight, Crown } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';
import { pickImage, takePhoto, generateAIAvatar, uploadAvatar } from '@/services/avatarService';
import { useSubscription } from '@/contexts/SubscriptionContext';

const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
];

export default function AccountScreen() {
  const { theme, themeMode, toggleTheme } = useTheme();
  const { profile } = useGame();
  const { user, updateRelationshipStatus, updateUsername, updateAvatarUrl, updatePreferredLanguage } = useAuth();
  const { tier, isSubscriptionActive } = useSubscription();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useLocalization();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [isSavingUsername, setIsSavingUsername] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showAIPromptModal, setShowAIPromptModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const styles = createStyles(theme.colors);

  const selectedLanguage = LANGUAGES.find(lang => lang.code === (user?.preferredLanguage || 'en')) || LANGUAGES[0];

  const handleRelationshipStatusChange = async (status: 'single' | 'married') => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await updateRelationshipStatus(status);
    } catch (error) {
      console.error('Failed to update relationship status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUsernameEdit = () => {
    setNewUsername(user?.username || '');
    setUsernameError('');
    setShowUsernameModal(true);
  };

  const handleUsernameSave = async () => {
    setUsernameError('');
    if (!newUsername.trim()) {
      setUsernameError('Please enter a username');
      return;
    }
    if (newUsername.trim().length < 3) {
      setUsernameError('Username must be at least 3 characters');
      return;
    }
    if (newUsername.trim() === user?.username) {
      setShowUsernameModal(false);
      return;
    }
    setIsSavingUsername(true);
    try {
      await updateUsername(newUsername.trim());
      setShowUsernameModal(false);
    } catch (error: any) {
      console.error('Failed to update username:', error);
      if (error?.message?.includes('duplicate') || error?.code === '23505') {
        setUsernameError('Username already taken. Please choose another one.');
      } else {
        setUsernameError('Failed to update username. Please try again.');
      }
    } finally {
      setIsSavingUsername(false);
    }
  };

  const handlePickImage = async () => {
    setShowAvatarModal(false);
    try {
      const imageUri = await pickImage();
      if (imageUri && user?.id) {
        setIsUploadingAvatar(true);
        const avatarUrl = await uploadAvatar(user.id, imageUri);
        await updateAvatarUrl(avatarUrl);
      }
    } catch (error: any) {
      if (Platform.OS === 'web') {
        alert(error?.message || 'Failed to upload image');
      } else {
        Alert.alert('Error', error?.message || 'Failed to upload image');
      }
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleTakePhoto = async () => {
    setShowAvatarModal(false);
    try {
      const imageUri = await takePhoto();
      if (imageUri && user?.id) {
        setIsUploadingAvatar(true);
        const avatarUrl = await uploadAvatar(user.id, imageUri);
        await updateAvatarUrl(avatarUrl);
      }
    } catch (error: any) {
      if (Platform.OS === 'web') {
        alert(error?.message || 'Failed to upload image');
      } else {
        Alert.alert('Error', error?.message || 'Failed to upload image');
      }
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleGenerateAI = () => {
    setShowAvatarModal(false);
    setAiPrompt('');
    setShowAIPromptModal(true);
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim() || !user?.id) return;
    setShowAIPromptModal(false);
    setIsUploadingAvatar(true);
    try {
      const base64Image = await generateAIAvatar(aiPrompt.trim());
      const avatarUrl = await uploadAvatar(user.id, base64Image);
      await updateAvatarUrl(avatarUrl);
    } catch (error: any) {
      if (Platform.OS === 'web') {
        alert(error?.message || 'Failed to generate AI avatar');
      } else {
        Alert.alert('Error', error?.message || 'Failed to generate AI avatar');
      }
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleLanguageSelect = async (languageCode: string) => {
    try {
      await updatePreferredLanguage(languageCode);
      setShowLanguageModal(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update language');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]} testID="account-screen">
      <LinearGradient colors={[theme.colors.backgroundTertiary, theme.colors.background]} style={StyleSheet.absoluteFillObject} />

      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Account</Text>
        <Pressable onPress={() => router.back()} style={styles.closeButton} testID="account-close">
          <X size={24} color={theme.colors.text} />
        </Pressable>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}>
        <View style={[styles.profileCard, { backgroundColor: theme.colors.card }]}>
          <Pressable onPress={() => setShowAvatarModal(true)} style={styles.avatarContainer} testID="account-avatar">
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatar} contentFit="cover" />
            ) : (
              <LinearGradient colors={[theme.colors.primary, theme.colors.secondary]} style={styles.avatar} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Text style={styles.avatarText}>{profile.name.charAt(0).toUpperCase()}</Text>
              </LinearGradient>
            )}
            <View style={[styles.editAvatarBadge, { backgroundColor: theme.colors.primary }]}>
              {isUploadingAvatar ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Edit3 size={16} color="#FFFFFF" />}
            </View>
          </Pressable>

          <Text style={[styles.profileName, { color: theme.colors.text }]}>{profile.name}</Text>
          {user?.username ? (
            <Pressable onPress={handleUsernameEdit} style={styles.usernameContainer}>
              <Text style={[styles.username, { color: theme.colors.textSecondary }]}>@{user.username}</Text>
            </Pressable>
          ) : (
            <Pressable onPress={handleUsernameEdit} style={[styles.addUsernameButton, { backgroundColor: theme.colors.primary + '20' }]}
              testID="account-add-username">
              <Text style={[styles.addUsernameText, { color: theme.colors.primary }]}>Add Username</Text>
            </Pressable>
          )}
          <View style={[styles.levelBadge, { backgroundColor: theme.colors.primary + '20' }]}> 
            <Text style={[styles.levelText, { color: theme.colors.primary }]}>{t('profile.level')} {profile.level}</Text>
          </View>
        </View>

        <View style={[styles.statsGrid, { backgroundColor: theme.colors.card }]}> 
          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: theme.colors.primary + '20' }]}>
              <Target size={24} color={theme.colors.primary} />
            </View>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>{profile.totalRejections}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{t('profile.totalRejections')}</Text>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: theme.colors.warning + '20' }]}>
              <Award size={24} color={theme.colors.warning} />
            </View>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>{profile.totalPoints}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{t('profile.totalPoints')}</Text>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: theme.colors.error + '20' }]}>
              <TrendingUp size={24} color={theme.colors.error} />
            </View>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>{profile.streak}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{t('profile.dayStreak')}</Text>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: theme.colors.success + '20' }]}>
              <User size={24} color={theme.colors.success} />
            </View>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>{profile.currentXP}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{t('profile.currentXP')}</Text>
          </View>
        </View>

        <View style={[styles.progressCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.progressTitle, { color: theme.colors.text }]}>{t('profile.levelProgress')}</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressBarTrack, { backgroundColor: theme.colors.backgroundSecondary }]}>
              <LinearGradient colors={[theme.colors.primary, theme.colors.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: `${(profile.currentXP / profile.xpToNextLevel) * 100}%` }]} />
            </View>
          </View>
          <Text style={[styles.progressText, { color: theme.colors.textSecondary }]}>
            {profile.currentXP} / {profile.xpToNextLevel} {t('profile.xpToLevel')} {profile.level + 1}
          </Text>
        </View>

        <View style={[styles.relationshipCard, { backgroundColor: theme.colors.card }]}>
          <View style={styles.relationshipHeader}>
            <Heart size={24} color={theme.colors.primary} />
            <Text style={[styles.relationshipTitle, { color: theme.colors.text }]}>{t('profile.relationshipStatus')}</Text>
          </View>
          <Text style={[styles.relationshipDescription, { color: theme.colors.textSecondary }]}>{t('profile.relationshipDescription')}</Text>
          <View style={styles.relationshipButtons}>
            <Pressable onPress={() => handleRelationshipStatusChange('single')} disabled={isUpdating}
              style={[styles.relationshipButton, user?.relationshipStatus === 'single' ? { backgroundColor: theme.colors.primary } : { backgroundColor: theme.colors.backgroundSecondary }]}>
              <Text style={[styles.relationshipButtonText, user?.relationshipStatus === 'single' ? { color: '#FFFFFF' } : { color: theme.colors.textSecondary }]}>
                {t('profile.single')}
              </Text>
            </Pressable>
            <Pressable onPress={() => handleRelationshipStatusChange('married')} disabled={isUpdating}
              style={[styles.relationshipButton, user?.relationshipStatus === 'married' ? { backgroundColor: theme.colors.primary } : { backgroundColor: theme.colors.backgroundSecondary }]}>
              <Text style={[styles.relationshipButtonText, user?.relationshipStatus === 'married' ? { color: '#FFFFFF' } : { color: theme.colors.textSecondary }]}>
                {t('profile.married')}
              </Text>
            </Pressable>
          </View>
        </View>

        {tier === 'free' ? (
          <Pressable style={[styles.upgradeCard, { backgroundColor: theme.colors.primary }]} onPress={() => router.push('/subscription')} testID="account-upgrade">
            <View style={styles.upgradeContent}>
              <Crown size={32} color="#FFFFFF" />
              <View style={styles.upgradeText}>
                <Text style={styles.upgradeTitle}>Upgrade to Pro</Text>
                <Text style={styles.upgradeDescription}>Unlock unlimited challenges & more</Text>
              </View>
            </View>
            <ChevronRight size={24} color="#FFFFFF" />
          </Pressable>
        ) : (
          isSubscriptionActive && (
            <View style={[styles.subscriptionBadge, { backgroundColor: theme.colors.card }]}>
              <Crown size={20} color={theme.colors.primary} />
              <Text style={[styles.subscriptionText, { color: theme.colors.text }]}>
                {tier.charAt(0).toUpperCase() + tier.slice(1)} Member
              </Text>
              <Pressable onPress={() => router.push('/subscription')}>
                <Text style={[styles.manageLink, { color: theme.colors.primary }]}>Manage</Text>
              </Pressable>
            </View>
          )
        )}

        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('settings.appearance')}</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              {themeMode === 'dark' ? <Moon size={20} color={theme.colors.text} /> : <Sun size={20} color={theme.colors.text} />}
              <View>
                <Text style={[styles.settingLabel, { color: theme.colors.text }]}>{t('settings.theme')}</Text>
                <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                  {themeMode === 'dark' ? t('settings.darkMode') : t('settings.lightMode')}
                </Text>
              </View>
            </View>
            <Switch value={themeMode === 'dark'} onValueChange={toggleTheme} trackColor={{ false: theme.colors.border, true: theme.colors.primary }} thumbColor="#FFFFFF" />
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('settings.preferences')}</Text>
          <Pressable style={styles.settingRow} onPress={() => setShowLanguageModal(true)}>
            <View style={styles.settingLeft}>
              <Globe size={20} color={theme.colors.text} />
              <View>
                <Text style={[styles.settingLabel, { color: theme.colors.text }]}>{t('settings.language')}</Text>
                <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                  {selectedLanguage.nativeName}
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color={theme.colors.textSecondary} />
          </Pressable>
        </View>

        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('settings.notifications')}</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Bell size={20} color={theme.colors.text} />
              <View>
                <Text style={[styles.settingLabel, { color: theme.colors.text }]}>{t('settings.questReminders')}</Text>
                <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                  {t('settings.questRemindersDesc')}
                </Text>
              </View>
            </View>
            <Switch value={false} trackColor={{ false: theme.colors.border, true: theme.colors.primary }} thumbColor="#FFFFFF" />
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('settings.legal')}</Text>
          <Pressable style={styles.settingRow} onPress={() => router.push('/disclaimer' as any)}>
            <View style={styles.settingLeft}>
              <Shield size={20} color={theme.colors.text} />
              <View>
                <Text style={[styles.settingLabel, { color: theme.colors.text }]}>{t('settings.safetyGuidelines')}</Text>
                <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                  {t('settings.safetyGuidelinesDesc')}
                </Text>
              </View>
            </View>
          </Pressable>
        </View>

        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('settings.account')}</Text>

        </View>
      </ScrollView>

      <Modal visible={showAIPromptModal} transparent animationType="fade" onRequestClose={() => setShowAIPromptModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowAIPromptModal(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: theme.colors.card }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Generate AI Avatar</Text>
            <Text style={[styles.modalDescription, { color: theme.colors.textSecondary }]}>Describe what you want your avatar to look like</Text>
            <TextInput value={aiPrompt} onChangeText={setAiPrompt} placeholder="e.g., young professional, glasses, smiling" placeholderTextColor={theme.colors.textSecondary}
              style={[styles.modalInput, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text, minHeight: 80 }]} multiline autoFocus />
            <View style={styles.modalButtons}>
              <Pressable onPress={() => setShowAIPromptModal(false)} style={[styles.modalButton, { backgroundColor: theme.colors.backgroundSecondary }]}>
                <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleAIGenerate} style={[styles.modalButton, styles.modalButtonPrimary, { backgroundColor: theme.colors.primary }]} disabled={!aiPrompt.trim()}>
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Generate</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showAvatarModal} transparent animationType="fade" onRequestClose={() => setShowAvatarModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowAvatarModal(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: theme.colors.card }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Change Profile Picture</Text>
            <Pressable onPress={handleGenerateAI} style={[styles.avatarOption, { backgroundColor: theme.colors.primary + '20' }]}> 
              <Sparkles size={24} color={theme.colors.primary} />
              <View style={styles.avatarOptionText}>
                <Text style={[styles.avatarOptionTitle, { color: theme.colors.text }]}>Generate with AI</Text>
                <Text style={[styles.avatarOptionDescription, { color: theme.colors.textSecondary }]}>Create a custom avatar using AI</Text>
              </View>
            </Pressable>
            <Pressable onPress={handlePickImage} style={[styles.avatarOption, { backgroundColor: theme.colors.backgroundSecondary }]}>
              <Upload size={24} color={theme.colors.text} />
              <View style={styles.avatarOptionText}>
                <Text style={[styles.avatarOptionTitle, { color: theme.colors.text }]}>Upload from Gallery</Text>
                <Text style={[styles.avatarOptionDescription, { color: theme.colors.textSecondary }]}>Choose an existing photo</Text>
              </View>
            </Pressable>
            {Platform.OS !== 'web' && (
              <Pressable onPress={handleTakePhoto} style={[styles.avatarOption, { backgroundColor: theme.colors.backgroundSecondary }]}>
                <Camera size={24} color={theme.colors.text} />
                <View style={styles.avatarOptionText}>
                  <Text style={[styles.avatarOptionTitle, { color: theme.colors.text }]}>Take a Photo</Text>
                  <Text style={[styles.avatarOptionDescription, { color: theme.colors.textSecondary }]}>Use your camera</Text>
                </View>
              </Pressable>
            )}
            <Pressable onPress={() => setShowAvatarModal(false)} style={[styles.modalButton, { backgroundColor: theme.colors.backgroundSecondary, marginTop: 16 }]}>
              <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showUsernameModal} transparent animationType="fade" onRequestClose={() => setShowUsernameModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowUsernameModal(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: theme.colors.card }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Edit Username</Text>
            <Text style={[styles.modalDescription, { color: theme.colors.textSecondary }]}>Choose a unique username for your profile</Text>
            <TextInput value={newUsername} onChangeText={setNewUsername} placeholder="Enter username" placeholderTextColor={theme.colors.textSecondary}
              style={[styles.modalInput, { backgroundColor: theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }]} autoCapitalize="none" autoCorrect={false} autoFocus />
            {usernameError ? (
              <View style={[styles.modalError, { backgroundColor: theme.colors.error + '20' }]}>
                <Text style={[styles.modalErrorText, { color: theme.colors.error }]}>{usernameError}</Text>
              </View>
            ) : null}
            <View style={styles.modalButtons}>
              <Pressable onPress={() => setShowUsernameModal(false)} style={[styles.modalButton, { backgroundColor: theme.colors.backgroundSecondary }]} disabled={isSavingUsername}>
                <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleUsernameSave} style={[styles.modalButton, styles.modalButtonPrimary, { backgroundColor: theme.colors.primary }]} disabled={isSavingUsername}>
                {isSavingUsername ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Save</Text>}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showLanguageModal} transparent animationType="slide" onRequestClose={() => setShowLanguageModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowLanguageModal(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: theme.colors.card }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{t('settings.selectLanguage')}</Text>
              <Pressable onPress={() => setShowLanguageModal(false)}>
                <X size={24} color={theme.colors.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.languageList}>
              {LANGUAGES.map((language) => (
                <Pressable key={language.code} style={[styles.languageItem, language.code === selectedLanguage.code && { backgroundColor: theme.colors.backgroundTertiary }]} onPress={() => handleLanguageSelect(language.code)}>
                  <View>
                    <Text style={[styles.languageName, { color: theme.colors.text }]}>{language.nativeName}</Text>
                    <Text style={[styles.languageCode, { color: theme.colors.textSecondary }]}>{language.name}</Text>
                  </View>
                  {language.code === selectedLanguage.code && (<View style={[styles.selectedDot, { backgroundColor: theme.colors.primary }]} />)}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20 },
    headerTitle: { fontSize: 28, fontWeight: '800' as const },
    closeButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, gap: 20 },
    profileCard: { padding: 32, borderRadius: 24, alignItems: 'center' },
    avatarContainer: { position: 'relative', marginBottom: 16 },
    avatar: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center' },
    editAvatarBadge: { position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#FFFFFF' },
    avatarText: { fontSize: 40, fontWeight: '700' as const, color: '#FFFFFF' },
    profileName: { fontSize: 28, fontWeight: '700' as const, marginBottom: 12 },
    levelBadge: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 16 },
    levelText: { fontSize: 16, fontWeight: '700' as const },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 20, borderRadius: 24, gap: 20 },
    statItem: { width: '45%', alignItems: 'center', gap: 8 },
    statIconContainer: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
    statValue: { fontSize: 24, fontWeight: '700' as const },
    statLabel: { fontSize: 12, textAlign: 'center' },
    progressCard: { padding: 24, borderRadius: 24 },
    progressTitle: { fontSize: 18, fontWeight: '700' as const, marginBottom: 16 },
    progressBar: { marginBottom: 12 },
    progressBarTrack: { height: 12, borderRadius: 6, overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 6 },
    progressText: { fontSize: 14, textAlign: 'center' },
    relationshipCard: { padding: 24, borderRadius: 24 },
    relationshipHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
    relationshipTitle: { fontSize: 18, fontWeight: '700' as const },
    relationshipDescription: { fontSize: 14, marginBottom: 20, lineHeight: 20 },
    relationshipButtons: { flexDirection: 'row', gap: 12 },
    relationshipButton: { flex: 1, paddingVertical: 16, paddingHorizontal: 24, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    relationshipButtonText: { fontSize: 16, fontWeight: '600' as const },
    usernameContainer: { marginBottom: 8, paddingHorizontal: 12, paddingVertical: 6 },
    username: { fontSize: 16, fontWeight: '600' as const },
    addUsernameButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, marginBottom: 8 },
    addUsernameText: { fontSize: 14, fontWeight: '600' as const },
    section: { borderRadius: 20, padding: 20 },
    sectionTitle: { fontSize: 18, fontWeight: '700' as const, marginBottom: 16 },
    settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
    settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    settingLabel: { fontSize: 16, fontWeight: '600' as const, marginBottom: 2 },
    settingDescription: { fontSize: 14 },
    upgradeCard: { padding: 20, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    upgradeContent: { flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1 },
    upgradeText: { flex: 1 },
    upgradeTitle: { fontSize: 18, fontWeight: '700' as const, color: '#FFFFFF', marginBottom: 4 },
    upgradeDescription: { fontSize: 14, color: '#FFFFFF', opacity: 0.9 },
    subscriptionBadge: { padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
    subscriptionText: { fontSize: 16, fontWeight: '600' as const, flex: 1 },
    manageLink: { fontSize: 14, fontWeight: '600' as const },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { width: '100%', maxWidth: 480, borderRadius: 24, padding: 24, gap: 16 },
    modalTitle: { fontSize: 24, fontWeight: '700' as const },
    modalDescription: { fontSize: 14, lineHeight: 20 },
    modalInput: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16 },
    modalError: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
    modalErrorText: { fontSize: 14, fontWeight: '600' as const, textAlign: 'center' as const },
    modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
    modalButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    modalButtonPrimary: { minHeight: 48 },
    modalButtonText: { fontSize: 16, fontWeight: '700' as const },
    avatarOption: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, gap: 16, marginBottom: 12 },
    avatarOptionText: { flex: 1 },
    avatarOptionTitle: { fontSize: 16, fontWeight: '600' as const, marginBottom: 4 },
    avatarOptionDescription: { fontSize: 14 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
    languageList: { marginTop: 8 },
    languageItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, borderRadius: 12, marginVertical: 4 },
    languageName: { fontSize: 16, fontWeight: '600' as const, marginBottom: 2 },
    languageCode: { fontSize: 14 },
    selectedDot: { width: 12, height: 12, borderRadius: 6 },
  });
}

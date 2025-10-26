import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Alert, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Moon, Sun, Bell, Shield, LogOut, Globe, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useLocalization } from '@/contexts/LocalizationContext';

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

export default function SettingsScreen() {
  const { theme, themeMode, toggleTheme } = useTheme();
  const { signOut, user, updatePreferredLanguage } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useLocalization();
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const styles = createStyles(theme.colors);

  const selectedLanguage = LANGUAGES.find(lang => lang.code === (user?.preferredLanguage || 'en')) || LANGUAGES[0];

  const handleLanguageSelect = async (languageCode: string) => {
    try {
      await updatePreferredLanguage(languageCode);
      setShowLanguageModal(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update language');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={[theme.colors.backgroundTertiary, theme.colors.background]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{t('settings.title')}</Text>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <X size={24} color={theme.colors.text} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
      >
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('settings.appearance')}</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              {themeMode === 'dark' ? (
                <Moon size={20} color={theme.colors.text} />
              ) : (
                <Sun size={20} color={theme.colors.text} />
              )}
              <View>
                <Text style={[styles.settingLabel, { color: theme.colors.text }]}>{t('settings.theme')}</Text>
                <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                  {themeMode === 'dark' ? t('settings.darkMode') : t('settings.lightMode')}
                </Text>
              </View>
            </View>
            <Switch
              value={themeMode === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('settings.preferences')}</Text>

          <Pressable
            style={styles.settingRow}
            onPress={() => setShowLanguageModal(true)}
          >
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
            <Switch
              value={false}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('settings.legal')}</Text>

          <Pressable
            style={styles.settingRow}
            onPress={() => router.push('/disclaimer' as any)}
          >
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

          <Pressable
            style={styles.settingRow}
            onPress={() => {
              Alert.alert(
                t('settings.signOut'),
                t('settings.signOutConfirm'),
                [
                  { text: t('settings.cancel'), style: 'cancel' },
                  {
                    text: t('settings.signOut'),
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await signOut();
                        router.replace('/auth');
                      } catch (error: any) {
                        Alert.alert('Error', error.message || 'Failed to sign out');
                      }
                    },
                  },
                ]
              );
            }}
          >
            <View style={styles.settingLeft}>
              <LogOut size={20} color={theme.colors.error} />
              <View>
                <Text style={[styles.settingLabel, { color: theme.colors.error }]}>{t('settings.signOut')}</Text>
                <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                  {user?.email || ''}
                </Text>
              </View>
            </View>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={showLanguageModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowLanguageModal(false)}
        >
          <Pressable
            style={[styles.modalContent, { backgroundColor: theme.colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{t('settings.selectLanguage')}</Text>
              <Pressable onPress={() => setShowLanguageModal(false)}>
                <X size={24} color={theme.colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.languageList}>
              {LANGUAGES.map((language) => (
                <Pressable
                  key={language.code}
                  style={[
                    styles.languageItem,
                    language.code === selectedLanguage.code && {
                      backgroundColor: theme.colors.backgroundTertiary,
                    },
                  ]}
                  onPress={() => handleLanguageSelect(language.code)}
                >
                  <View>
                    <Text style={[styles.languageName, { color: theme.colors.text }]}>
                      {language.nativeName}
                    </Text>
                    <Text style={[styles.languageCode, { color: theme.colors.textSecondary }]}>
                      {language.name}
                    </Text>
                  </View>
                  {language.code === selectedLanguage.code && (
                    <View style={[styles.selectedDot, { backgroundColor: theme.colors.primary }]} />
                  )}
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
      gap: 16,
    },
    section: {
      borderRadius: 20,
      padding: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
      marginBottom: 16,
    },
    settingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    settingLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    settingLabel: {
      fontSize: 16,
      fontWeight: '600' as const,
      marginBottom: 2,
    },
    settingDescription: {
      fontSize: 14,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingBottom: 40,
      maxHeight: '70%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700' as const,
    },
    languageList: {
      marginTop: 8,
    },
    languageItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderRadius: 12,
      marginVertical: 4,
    },
    languageName: {
      fontSize: 16,
      fontWeight: '600' as const,
      marginBottom: 2,
    },
    languageCode: {
      fontSize: 14,
    },
    selectedDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
  });
}

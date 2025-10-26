import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Moon, Sun, Bell, Shield, LogOut } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
  const { theme, themeMode, toggleTheme } = useTheme();
  const { signOut, user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const styles = createStyles(theme.colors);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={[theme.colors.backgroundTertiary, theme.colors.background]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Settings</Text>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <X size={24} color={theme.colors.text} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
      >
        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Appearance</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              {themeMode === 'dark' ? (
                <Moon size={20} color={theme.colors.text} />
              ) : (
                <Sun size={20} color={theme.colors.text} />
              )}
              <View>
                <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Theme</Text>
                <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                  {themeMode === 'dark' ? 'Dark Mode' : 'Light Mode'}
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
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Notifications</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Bell size={20} color={theme.colors.text} />
              <View>
                <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Quest Reminders</Text>
                <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                  Get notified to complete daily quests
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
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Legal</Text>

          <Pressable
            style={styles.settingRow}
            onPress={() => router.push('/disclaimer' as any)}
          >
            <View style={styles.settingLeft}>
              <Shield size={20} color={theme.colors.text} />
              <View>
                <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Safety Guidelines</Text>
                <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                  Read important safety information
                </Text>
              </View>
            </View>
          </Pressable>
        </View>

        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Account</Text>

          <Pressable
            style={styles.settingRow}
            onPress={() => {
              Alert.alert(
                'Sign Out',
                'Are you sure you want to sign out?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Sign Out',
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
                <Text style={[styles.settingLabel, { color: theme.colors.error }]}>Sign Out</Text>
                <Text style={[styles.settingDescription, { color: theme.colors.textSecondary }]}>
                  {user?.email || 'Sign out of your account'}
                </Text>
              </View>
            </View>
          </Pressable>
        </View>
      </ScrollView>
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
  });
}

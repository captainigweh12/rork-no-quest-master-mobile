import { View, Text, StyleSheet, Pressable, ScrollView, Modal, Animated, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { 
  User, 
  HelpCircle, 
  UserPlus, 
  TrendingUp, 
  Users, 
  Compass,
  Trophy,
  ListPlus,
  Shield,
  Scroll,
  Calendar,
  LogOut
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface SideMenuProps {
  visible: boolean;
  onClose: () => void;
  theme: any;
}

type MenuItem = {
  id: string;
  label: string;
  icon: any;
  route: string;
  section?: 'top' | 'profile' | 'adventure' | 'community';
  divider?: boolean;
};

const MENU_ITEMS: MenuItem[] = [
  { id: 'profile', label: 'Profile & Settings', icon: User, route: '/profile', section: 'profile' },
  { id: 'help', label: 'Help & Support', icon: HelpCircle, route: '/disclaimer', section: 'profile' },
  { id: 'refer', label: 'Invite Warriors', icon: UserPlus, route: '/profile', section: 'profile', divider: true },
  
  { id: 'calendar', label: 'Quest Calendar', icon: Calendar, route: '/quest-calendar', section: 'adventure' },
  { id: 'quests', label: 'Past Quests', icon: Scroll, route: '/growth', section: 'adventure' },
  { id: 'ranks', label: 'Leaderboard', icon: Trophy, route: '/ranks', section: 'adventure' },
  { id: 'growth-achievements', label: 'Growth & Achievements', icon: TrendingUp, route: '/growth', section: 'adventure', divider: true },
  
  { id: 'teams', label: 'Groups', icon: Users, route: '/teams', section: 'community' },
  { id: 'categories', label: 'Manage Categories', icon: ListPlus, route: '/manage-categories', section: 'community' },
  { id: 'explore', label: 'Explore World', icon: Compass, route: '/(tabs)/map', section: 'community' },
];

const ADMIN_MENU_ITEMS: MenuItem[] = [
  { id: 'admin', label: 'Admin Dashboard', icon: Shield, route: '/admin', section: 'top' },
];

export default function SideMenu({ visible, onClose, theme }: SideMenuProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const slideAnim = useRef(new Animated.Value(-300)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -300,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  const handleNavigate = (route: string) => {
    onClose();
    setTimeout(() => {
      router.push(route as any);
    }, 200);
  };

  const styles = createStyles(theme);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        
        <Animated.View 
          style={[
            styles.menuContainer,
            { 
              paddingTop: insets.top,
              transform: [{ translateX: slideAnim }]
            }
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.appName}>FEARLESS</Text>
          </View>

          <ScrollView 
            style={styles.scrollContainer}
            contentContainerStyle={styles.menuContent}
            showsVerticalScrollIndicator={false}
          >
            {user?.isAdmin && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.primary }]}>⚔️ ADMIN</Text>
                {ADMIN_MENU_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => handleNavigate(item.route)}
                      style={({ pressed }) => [
                        styles.menuItem,
                        styles.adminMenuItem,
                        pressed && styles.menuItemPressed
                      ]}
                      testID={`menu-${item.id}`}
                    >
                      <Icon size={22} color={theme.primary} strokeWidth={2.5} />
                      <Text style={[styles.menuLabel, styles.adminLabel]}>{item.label}</Text>
                    </Pressable>
                  );
                })}
                <View style={styles.sectionDivider} />
              </View>
            )}
            
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>👤 PROFILE</Text>
              {MENU_ITEMS.filter(item => item.section === 'profile').map((item) => {
                const Icon = item.icon;
                return (
                  <View key={item.id}>
                    <Pressable
                      onPress={() => handleNavigate(item.route)}
                      style={({ pressed }) => [
                        styles.menuItem,
                        pressed && styles.menuItemPressed
                      ]}
                      testID={`menu-${item.id}`}
                    >
                      <Icon size={22} color={theme.text} strokeWidth={2} />
                      <Text style={styles.menuLabel}>{item.label}</Text>
                    </Pressable>
                    {item.divider && <View style={styles.sectionDivider} />}
                  </View>
                );
              })}
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>⚔️ ADVENTURE</Text>
              {MENU_ITEMS.filter(item => item.section === 'adventure').map((item) => {
                const Icon = item.icon;
                return (
                  <View key={item.id}>
                    <Pressable
                      onPress={() => handleNavigate(item.route)}
                      style={({ pressed }) => [
                        styles.menuItem,
                        pressed && styles.menuItemPressed
                      ]}
                      testID={`menu-${item.id}`}
                    >
                      <Icon size={22} color={theme.text} strokeWidth={2} />
                      <Text style={styles.menuLabel}>{item.label}</Text>
                    </Pressable>
                    {item.divider && <View style={styles.sectionDivider} />}
                  </View>
                );
              })}
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>🌍 COMMUNITY</Text>
              {MENU_ITEMS.filter(item => item.section === 'community').map((item) => {
                const Icon = item.icon;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => handleNavigate(item.route)}
                    style={({ pressed }) => [
                      styles.menuItem,
                      pressed && styles.menuItemPressed
                    ]}
                    testID={`menu-${item.id}`}
                  >
                    <Icon size={22} color={theme.text} strokeWidth={2} />
                    <Text style={styles.menuLabel}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
            <Pressable
              onPress={() => {
                Alert.alert('Sign out', 'Are you sure you want to sign out?', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Sign out',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await signOut();
                        router.replace('/auth');
                      } catch (error) {
                        console.error('Sign out failed', error);
                      }
                    },
                  },
                ]);
              }}
              style={({ pressed }) => [styles.logoutButton, pressed && styles.menuItemPressed]}
              testID="menu-logout"
            >
              <LogOut size={20} color={theme.error ?? '#E11D48'} />
              <Text style={[styles.logoutLabel, { color: theme.error ?? '#E11D48' }]}>Log out</Text>
            </Pressable>
            <Text style={styles.footerText}>Version 1.0.0</Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    menuContainer: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: 300,
      backgroundColor: theme.background,
      shadowColor: '#000',
      shadowOffset: { width: 2, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 16,
    },
    header: {
      paddingHorizontal: 24,
      paddingVertical: 24,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    appName: {
      fontSize: 26,
      fontWeight: '900' as const,
      color: theme.text,
      letterSpacing: 1.5,
    },
    section: {
      marginBottom: 8,
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: '800' as const,
      letterSpacing: 1.2,
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 8,
      textTransform: 'uppercase' as const,
    },
    sectionDivider: {
      height: 1,
      backgroundColor: theme.border,
      marginVertical: 8,
      marginHorizontal: 20,
    },
    scrollContainer: {
      flex: 1,
    },
    menuContent: {
      paddingVertical: 12,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingHorizontal: 24,
      paddingVertical: 14,
    },
    menuItemPressed: {
      backgroundColor: theme.backgroundSecondary,
    },
    menuLabel: {
      fontSize: 15,
      fontWeight: '600' as const,
      color: theme.text,
      flex: 1,
    },
    adminMenuItem: {
      backgroundColor: theme.primary + '15',
      borderLeftWidth: 4,
      borderLeftColor: theme.primary,
      marginHorizontal: 16,
      paddingLeft: 20,
      borderRadius: 10,
      marginVertical: 4,
    },
    adminLabel: {
      color: theme.primary,
      fontWeight: '700' as const,
    },
    divider: {
      height: 1,
      backgroundColor: theme.border,
      marginVertical: 12,
      marginHorizontal: 24,
    },
    footer: {
      paddingHorizontal: 24,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      gap: 8,
    },
    footerText: {
      fontSize: 12,
      color: theme.textSecondary,
      fontWeight: '500' as const,
      textAlign: 'center' as const,
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: theme.backgroundSecondary,
    },
    logoutLabel: {
      fontSize: 15,
      fontWeight: '700' as const,
    },
  });
}

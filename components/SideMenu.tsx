import { View, Text, StyleSheet, Pressable, ScrollView, Modal, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { 
  User, 
  Settings, 
  HelpCircle, 
  UserPlus, 
  TrendingUp, 
  BarChart3, 
  FlaskConical, 
  Users, 
  Compass,
  Medal,
  Trophy,
  LineChart
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useRef } from 'react';

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
  section?: 'top' | 'middle';
  divider?: boolean;
};

const MENU_ITEMS: MenuItem[] = [
  { id: 'profile', label: 'My Profile', icon: User, route: '/profile', section: 'top' },
  { id: 'skill', label: 'Skill Level', icon: Medal, route: '/profile', section: 'top' },
  { id: 'settings', label: 'Settings', icon: Settings, route: '/settings', section: 'top' },
  { id: 'help', label: 'Help', icon: HelpCircle, route: '/disclaimer', section: 'top' },
  { id: 'refer', label: 'Refer a Friend', icon: UserPlus, route: '/profile', section: 'top', divider: true },
  
  { id: 'trends', label: 'Trends', icon: TrendingUp, route: '/growth', section: 'middle' },
  { id: 'ranks', label: 'Ranks', icon: Trophy, route: '/ranks', section: 'middle' },
  { id: 'reports', label: 'Reports', icon: BarChart3, route: '/growth', section: 'middle' },
  { id: 'growth', label: 'Growth', icon: LineChart, route: '/growth', section: 'middle' },
  { id: 'experiments', label: 'Experiments', icon: FlaskConical, route: '/profile', section: 'middle' },
  { id: 'teams', label: 'Teams', icon: Users, route: '/teams', section: 'middle' },
  { id: 'explore', label: 'Explore', icon: Compass, route: '/', section: 'middle' },
];

export default function SideMenu({ visible, onClose, theme }: SideMenuProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
            {MENU_ITEMS.map((item) => {
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
                    <Icon size={24} color={theme.text} strokeWidth={2} />
                    <Text style={styles.menuLabel}>{item.label}</Text>
                  </Pressable>
                  {item.divider && <View style={styles.divider} />}
                </View>
              );
            })}
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
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
      fontSize: 28,
      fontWeight: '900' as const,
      color: theme.text,
      letterSpacing: 1,
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
      gap: 16,
      paddingHorizontal: 24,
      paddingVertical: 16,
    },
    menuItemPressed: {
      backgroundColor: theme.backgroundSecondary,
    },
    menuLabel: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: theme.text,
    },
    divider: {
      height: 1,
      backgroundColor: theme.border,
      marginVertical: 12,
      marginHorizontal: 24,
    },
    footer: {
      paddingHorizontal: 24,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    footerText: {
      fontSize: 12,
      color: theme.textSecondary,
      fontWeight: '500' as const,
    },
  });
}

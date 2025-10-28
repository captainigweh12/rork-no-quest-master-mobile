import { Tabs, useRouter } from 'expo-router';
import { Home, Users, Trophy, MapPin, Plus, BookOpen, LineChart, Menu } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { View, StyleSheet, Platform, ActivityIndicator, Pressable, Text, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useMemo, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const router = useRouter();
  const themeContext = useTheme();
  const insets = useSafeAreaInsets();

  if (!themeContext) {
    return <ActivityIndicator size="large" style={{ flex: 1 }} />;
  }

  const { theme } = themeContext;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: theme.colors.card,
            borderTopColor: theme.colors.border,
            borderTopWidth: 1,
            height: 60,
          },
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.textSecondary,
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600' as const,
          },
        }}
      >
        <Tabs.Screen
          name="(home)"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="community"
          options={{
            title: 'Community',
            tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="placeholder"
          options={{
            title: 'Create',
            tabBarIcon: ({ focused }) => (
              <View
                style={[
                  styles.createButton,
                  {
                    backgroundColor: theme.colors.primary,
                    shadowColor: theme.colors.primary,
                  },
                ]}
              >
                <Plus size={24} color="#FFFFFF" strokeWidth={3} />
              </View>
            ),
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
              router.push('/create-quest');
            },
          }}
        />
        <Tabs.Screen
          name="journal"
          options={{
            title: 'Journal',
            tabBarIcon: ({ color, size }) => <BookOpen size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="growth"
          options={{
            title: 'Growth',
            tabBarIcon: ({ color, size }) => <LineChart size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="ranks"
          options={{
            title: 'Ranks',
            tabBarIcon: ({ color, size }) => <Trophy size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="map"
          options={{
            title: 'Map',
            tabBarIcon: ({ color, size }) => <MapPin size={size} color={color} />,
          }}
        />
      </Tabs>

      <TopMenu insetsTop={insets.top} themeColors={theme.colors} onGoJournal={() => router.push('/(tabs)/journal' as any)} onGoGrowth={() => router.push('/(tabs)/growth' as any)} />
    </View>
  );
}

function TopMenu({ insetsTop, themeColors, onGoJournal, onGoGrowth }: { insetsTop: number; themeColors: any; onGoJournal: () => void; onGoGrowth: () => void }) {
  const [open, setOpen] = useState<boolean>(false);
  const scale = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    const to = open ? 0 : 1;
    setOpen(!open);
    Animated.spring(scale, { toValue: to, useNativeDriver: true, friction: 8, tension: 60 }).start();
  };

  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { zIndex: 100 }]}> 
      <View style={{ position: 'absolute', top: insetsTop + 8, right: 12, gap: 8 }}>
        <Pressable
          accessibilityRole="button"
          testID="top-menu-button"
          onPress={toggle}
          style={({ pressed }) => [
            styles.menuButton,
            { backgroundColor: themeColors.card, borderColor: themeColors.border, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Menu size={20} color={themeColors.text} />
        </Pressable>

        {open && (
          <Animated.View
            style={{
              transform: [{ scale }],
              backgroundColor: themeColors.card,
              borderColor: themeColors.border,
              borderWidth: 1,
              borderRadius: 12,
              paddingVertical: 6,
              overflow: 'hidden',
              shadowColor: '#000',
              shadowOpacity: 0.15,
              shadowOffset: { width: 0, height: 6 },
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            <Pressable
              onPress={() => { toggle(); onGoJournal(); }}
              style={({ pressed }) => [styles.menuItem, { backgroundColor: pressed ? themeColors.backgroundSecondary : 'transparent' }]}
              testID="menu-journal"
            >
              <BookOpen size={18} color={themeColors.text} />
              <Text style={[styles.menuText, { color: themeColors.text }]}>Journal</Text>
            </Pressable>
            <Pressable
              onPress={() => { toggle(); onGoGrowth(); }}
              style={({ pressed }) => [styles.menuItem, { backgroundColor: pressed ? themeColors.backgroundSecondary : 'transparent' }]}
              testID="menu-growth"
            >
              <LineChart size={18} color={themeColors.text} />
              <Text style={[styles.menuText, { color: themeColors.text }]}>Growth</Text>
            </Pressable>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  createButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  menuText: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
});

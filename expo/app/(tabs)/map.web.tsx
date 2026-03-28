import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useGame } from '@/contexts/GameContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Menu, Share2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function MapScreen() {
  const { theme } = useTheme();
  const { quests } = useGame();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const styles = createStyles(theme.colors);

  const completedQuests = quests.filter((q) => q.completed && q.location);
  const totalRejections = completedQuests.length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={[theme.colors.backgroundTertiary, theme.colors.background]}
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Rejection Map</Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            {totalRejections} rejections tracked
          </Text>
        </View>
        <Pressable style={styles.menuButton}>
          <Menu size={24} color={theme.colors.text} />
        </Pressable>
        <Pressable style={styles.shareButton}>
          <Share2 size={20} color={theme.colors.text} />
        </Pressable>
      </View>

      <View style={styles.mapPlaceholder}>
        <Text style={[styles.placeholderText, { color: theme.colors.textSecondary }]}>
          Map view is only available on mobile devices
        </Text>
        <Text style={[styles.placeholderSubtext, { color: theme.colors.textSecondary }]}>
          Scan the QR code to view on your phone
        </Text>
      </View>
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
      paddingBottom: 16,
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerCenter: {
      flex: 1,
      marginLeft: 12,
      backgroundColor: colors.card,
      borderRadius: 12,
      paddingVertical: 8,
      paddingHorizontal: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
    },
    headerSubtitle: {
      fontSize: 12,
    },
    menuButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 8,
    },
    shareButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 8,
    },
    mapPlaceholder: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    placeholderText: {
      fontSize: 18,
      fontWeight: '600' as const,
      textAlign: 'center',
      marginBottom: 8,
    },
    placeholderSubtext: {
      fontSize: 14,
      textAlign: 'center',
    },
  });
}

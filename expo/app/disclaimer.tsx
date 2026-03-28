import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, AlertTriangle, Shield, Heart } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function DisclaimerScreen() {
  const { theme } = useTheme();
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
        <View style={styles.headerLeft}>
          <Shield size={28} color={theme.colors.warning} />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Safety Guidelines</Text>
        </View>
        <Pressable onPress={() => router.back()} style={styles.closeButton}>
          <X size={24} color={theme.colors.text} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
      >
        <View style={[styles.warningCard, { backgroundColor: theme.colors.warning + '20', borderColor: theme.colors.warning }]}>
          <AlertTriangle size={32} color={theme.colors.warning} />
          <Text style={[styles.warningTitle, { color: theme.colors.warning }]}>Important Notice</Text>
          <Text style={[styles.warningText, { color: theme.colors.text }]}>
            Rejection Hero is designed to help you build confidence and resilience. However, your safety and the safety of others is paramount.
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Do Not Create Quests That:</Text>
          <View style={styles.listItem}>
            <Text style={[styles.bullet, { color: theme.colors.error }]}>•</Text>
            <Text style={[styles.listText, { color: theme.colors.text }]}>
              Put yourself or others at physical risk or danger
            </Text>
          </View>
          <View style={styles.listItem}>
            <Text style={[styles.bullet, { color: theme.colors.error }]}>•</Text>
            <Text style={[styles.listText, { color: theme.colors.text }]}>
              Are disrespectful, harassing, or discriminatory toward any person or group
            </Text>
          </View>
          <View style={styles.listItem}>
            <Text style={[styles.bullet, { color: theme.colors.error }]}>•</Text>
            <Text style={[styles.listText, { color: theme.colors.text }]}>
              Involve illegal activities or encourage law-breaking
            </Text>
          </View>
          <View style={styles.listItem}>
            <Text style={[styles.bullet, { color: theme.colors.error }]}>•</Text>
            <Text style={[styles.listText, { color: theme.colors.text }]}>
              Could cause emotional distress or harm to yourself or others
            </Text>
          </View>
          <View style={styles.listItem}>
            <Text style={[styles.bullet, { color: theme.colors.error }]}>•</Text>
            <Text style={[styles.listText, { color: theme.colors.text }]}>
              Involve children, vulnerable individuals, or private property without permission
            </Text>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Best Practices:</Text>
          <View style={styles.listItem}>
            <Text style={[styles.bullet, { color: theme.colors.success }]}>✓</Text>
            <Text style={[styles.listText, { color: theme.colors.text }]}>
              Keep quests respectful and appropriate
            </Text>
          </View>
          <View style={styles.listItem}>
            <Text style={[styles.bullet, { color: theme.colors.success }]}>✓</Text>
            <Text style={[styles.listText, { color: theme.colors.text }]}>
              Focus on personal growth and confidence building
            </Text>
          </View>
          <View style={styles.listItem}>
            <Text style={[styles.bullet, { color: theme.colors.success }]}>✓</Text>
            <Text style={[styles.listText, { color: theme.colors.text }]}>
              Be gracious when receiving rejection
            </Text>
          </View>
          <View style={styles.listItem}>
            <Text style={[styles.bullet, { color: theme.colors.success }]}>✓</Text>
            <Text style={[styles.listText, { color: theme.colors.text }]}>
              Start with easier challenges and work your way up
            </Text>
          </View>
          <View style={styles.listItem}>
            <Text style={[styles.bullet, { color: theme.colors.success }]}>✓</Text>
            <Text style={[styles.listText, { color: theme.colors.text }]}>
              Know when to step back if something feels unsafe
            </Text>
          </View>
        </View>

        <View style={[styles.infoCard, { backgroundColor: theme.colors.primary + '20' }]}>
          <Heart size={24} color={theme.colors.primary} />
          <Text style={[styles.infoText, { color: theme.colors.text }]}>
            The goal is to build resilience, not to put yourself or others in uncomfortable or unsafe situations. Always use good judgment and common sense.
          </Text>
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
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    headerTitle: {
      fontSize: 24,
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
      gap: 20,
    },
    warningCard: {
      padding: 20,
      borderRadius: 16,
      alignItems: 'center',
      gap: 12,
      borderWidth: 2,
    },
    warningTitle: {
      fontSize: 20,
      fontWeight: '700' as const,
    },
    warningText: {
      fontSize: 16,
      textAlign: 'center',
      lineHeight: 24,
    },
    section: {
      padding: 20,
      borderRadius: 16,
      gap: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
      marginBottom: 8,
    },
    listItem: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'flex-start',
    },
    bullet: {
      fontSize: 20,
      fontWeight: '700' as const,
      marginTop: -2,
    },
    listText: {
      fontSize: 16,
      lineHeight: 24,
      flex: 1,
    },
    infoCard: {
      padding: 20,
      borderRadius: 16,
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
    },
    infoText: {
      fontSize: 15,
      lineHeight: 22,
      flex: 1,
    },
  });
}

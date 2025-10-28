import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useGame } from '@/contexts/GameContext';
import { SafeImage } from '@/components/SafeImage';
import { ArrowRight, Sparkles } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const CATEGORY_META: Record<string, { title: string; color: string; image: string; subtitle: string; }> = {
  business: { title: 'Business & Growth', color: '#3787ff', image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1400&auto=format&fit=crop', subtitle: 'Ship ideas, sell, and level up your career' },
  dating: { title: 'Dating & Confidence', color: '#ff5d8f', image: 'https://images.unsplash.com/photo-1529336953121-ad5a56b0eece?q=80&w=1400&auto=format&fit=crop', subtitle: 'Courage reps for social boldness' },
  adventure: { title: 'Personal Fun / Adventure', color: '#ff8a30', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1400&auto=format&fit=crop', subtitle: 'Novelty, thrill, and playful challenges' },
  fitness: { title: 'Health & Fitness', color: '#27c37b', image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1400&auto=format&fit=crop', subtitle: 'Small daily missions for your body' },
  wealth: { title: 'Wealth & Finance', color: '#20b2aa', image: 'https://images.unsplash.com/photo-1554224155-3a589877462f?q=80&w=1400&auto=format&fit=crop', subtitle: 'Money moves that build courage' },
  creativity: { title: 'Creativity & Expression', color: '#9b5cff', image: 'https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?q=80&w=1400&auto=format&fit=crop', subtitle: 'Make, share, and create in public' },
  mindset: { title: 'Mindset & Courage', color: '#ffb020', image: 'https://images.unsplash.com/photo-1533371452382-d45a9da51ad9?q=80&w=1400&auto=format&fit=crop', subtitle: 'Micro-fears, daily bravery' },
  relationships: { title: 'Relationships & Family', color: '#ff6b6b', image: 'https://images.unsplash.com/photo-1517884467360-71c4b3d48ee0?q=80&w=1400&auto=format&fit=crop', subtitle: 'Gentle, meaningful social quests' },
  community: { title: 'Community / Service', color: '#00bcd4', image: 'https://images.unsplash.com/photo-1532634896-26909d0d4b6a?q=80&w=1400&auto=format&fit=crop', subtitle: 'Give back with purpose' },
};

const SUBS: Record<string, string[]> = {
  business: ['Pitch a product idea', 'Cold email 3 clients', 'Ask for a testimonial', 'Create a LinkedIn post'],
  dating: ['Ask a stranger for a coffee', 'Compliment 3 people', 'Start a conversation IRL', 'Get 1 bold “no”'],
  adventure: ['Try a new food', 'Dance in public for 10s', 'Ask for a secret menu item', 'Record your reaction'],
  fitness: ['Ask a trainer a question', 'Try a new workout', 'Ask someone how long they train', '10 push-ups after a rejection'],
  wealth: ['Negotiate a discount', 'Ask for a raise', 'Sell an old item', 'Pitch to an investor'],
  creativity: ['Post a short video', 'Write one tweet', 'Ask 5 people for design feedback', 'Launch a micro-project'],
  mindset: ['Talk to a stranger', 'Share a failure story', 'Ask for help publicly', 'Face one small fear'],
  relationships: ['Call a family member', 'Apologize or thank someone', 'Ask a deep question', 'Plan a surprise'],
  community: ['Help carry groceries', 'Compliment a stranger', 'Volunteer for an hour', 'Donate unused clothes'],
};

export default function CategoryScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const { addAIQuest } = useGame();

  const meta = CATEGORY_META[String(category)];
  const items = SUBS[String(category)] ?? [];

  const styles = createStyles(theme.colors);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ headerShown: true, title: meta?.title ?? 'Category', headerStyle: { backgroundColor: theme.colors.background }, headerTintColor: theme.colors.text }} />

      <View style={styles.hero}>
        <SafeImage uri={meta?.image} style={styles.heroImage} />
        <LinearGradient colors={[`${meta?.color ?? '#000'}88`, theme.colors.background]} style={StyleSheet.absoluteFillObject} />
        <View style={styles.heroTextWrap}>
          <Text style={[styles.heroTitle, { color: '#fff' }]}>{meta?.title}</Text>
          <Text style={[styles.heroSubtitle, { color: '#eef' }]}>{meta?.subtitle}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {items.map((t, i) => (
          <View key={i} style={[styles.subCard, { borderColor: theme.colors.border }]}> 
            <Text style={[styles.subText, { color: theme.colors.text }]}>{t}</Text>
          </View>
        ))}

        <Pressable
          testID="get-ai-quest"
          onPress={async () => {
            await addAIQuest('medium', false, undefined, String(category) as any);
            router.replace('/');
          }}
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: meta?.color ?? theme.colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Sparkles size={20} color="#fff" />
          <Text style={styles.ctaText}>Get AI Quest</Text>
          <ArrowRight size={20} color="#fff" />
        </Pressable>
      </ScrollView>
    </View>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    hero: { height: width * 0.6, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: 'hidden', marginBottom: 8 },
    heroImage: { width: '100%', height: '100%' },
    heroTextWrap: { position: 'absolute', bottom: 16, left: 16, right: 16 },
    heroTitle: { fontSize: 28, fontWeight: '900' as const },
    heroSubtitle: { fontSize: 14, fontWeight: '600' as const, marginTop: 6 },
    subCard: { padding: 14, borderRadius: 14, borderWidth: 1, backgroundColor: colors.card },
    subText: { fontSize: 16, fontWeight: '700' as const },
    cta: { marginTop: 8, paddingVertical: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
    ctaText: { color: '#fff', fontSize: 16, fontWeight: '900' as const },
  });
}

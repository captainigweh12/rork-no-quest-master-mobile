import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, Modal, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useGame } from '@/contexts/GameContext';
import { SafeImage } from '@/components/SafeImage';
import { ArrowRight, Sparkles, X } from 'lucide-react-native';
import { useState } from 'react';

const { width } = Dimensions.get('window');

interface CategoryQuestion {
  id: string;
  question: string;
  type: 'text' | 'scale' | 'choice';
  choices?: string[];
}

const CATEGORY_META: Record<string, { title: string; color: string; image: string; subtitle: string; questions: CategoryQuestion[] }> = {
  business: {
    title: 'Business & Growth',
    color: '#3787ff',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1400&auto=format&fit=crop',
    subtitle: 'Ship ideas, sell, and level up your career',
    questions: [
      { id: 'q1', question: "What's your business or idea about?", type: 'text' },
      { id: 'q2', question: "What's one thing you're afraid to ask potential clients or partners?", type: 'text' },
      { id: 'q3', question: 'Are you looking for sales, collaborations, or exposure?', type: 'choice', choices: ['Sales', 'Collaborations', 'Exposure', 'All'] },
    ],
  },
  'door-knocking': {
    title: 'Door Knocking',
    color: '#FF6B35',
    image: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?q=80&w=1400&auto=format&fit=crop',
    subtitle: 'Face-to-face sales at the door',
    questions: [
      { id: 'q1', question: 'What are you offering or promoting when you knock?', type: 'text' },
      { id: 'q2', question: 'Would you rather focus on selling, asking for feedback, or practicing courage?', type: 'choice', choices: ['Selling', 'Feedback', 'Courage'] },
      { id: 'q3', question: 'Are you comfortable being filmed during the challenge?', type: 'choice', choices: ['Yes', 'No', 'Maybe'] },
    ],
  },
  'cold-calling': {
    title: 'Cold Calling',
    color: '#004E89',
    image: 'https://images.unsplash.com/photo-1553484771-371a605b060b?q=80&w=1400&auto=format&fit=crop',
    subtitle: 'Master phone sales and build confidence',
    questions: [
      { id: 'q1', question: 'Who are you trying to reach or pitch to today?', type: 'text' },
      { id: 'q2', question: 'What type of product or offer do you want to call about?', type: 'text' },
      { id: 'q3', question: 'How confident do you feel making cold calls right now?', type: 'scale' },
    ],
  },
  marketing: {
    title: 'Marketing',
    color: '#F77F00',
    image: 'https://images.unsplash.com/photo-1533750349088-cd871a92f312?q=80&w=1400&auto=format&fit=crop',
    subtitle: 'Promote your product or service boldly',
    questions: [
      { id: 'q1', question: 'What product or message are you trying to spread?', type: 'text' },
      { id: 'q2', question: 'Would you prefer online or in-person challenges?', type: 'choice', choices: ['Online', 'In-person', 'Both'] },
      { id: 'q3', question: 'Are you willing to get rejected publicly?', type: 'choice', choices: ['Yes', 'No', 'Maybe'] },
    ],
  },
  dating: {
    title: 'Dating & Confidence',
    color: '#ff5d8f',
    image: 'https://images.unsplash.com/photo-1529336953121-ad5a56b0eece?q=80&w=1400&auto=format&fit=crop',
    subtitle: 'Courage reps for social boldness',
    questions: [
      { id: 'q1', question: 'Are you single or just building social confidence?', type: 'choice', choices: ['Single', 'Building confidence', 'Both'] },
      { id: 'q2', question: 'Do you prefer in-person or digital interactions?', type: 'choice', choices: ['In-person', 'Digital', 'Both'] },
      { id: 'q3', question: "What's your fear level approaching someone attractive?", type: 'scale' },
    ],
  },
  adventure: {
    title: 'Personal Fun / Adventure',
    color: '#ff8a30',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1400&auto=format&fit=crop',
    subtitle: 'Novelty, thrill, and playful challenges',
    questions: [
      { id: 'q1', question: 'Do you want your quest outdoors or in public spaces?', type: 'choice', choices: ['Outdoors', 'Public spaces', 'Both'] },
      { id: 'q2', question: "What's your thrill level — mild, bold, or extreme?", type: 'choice', choices: ['Mild', 'Bold', 'Extreme'] },
      { id: 'q3', question: 'Would you like your quest to involve other people?', type: 'choice', choices: ['Yes', 'No', 'Maybe'] },
    ],
  },
  fitness: {
    title: 'Health & Fitness',
    color: '#27c37b',
    image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1400&auto=format&fit=crop',
    subtitle: 'Small daily missions for your body',
    questions: [
      { id: 'q1', question: "What's your fitness goal — strength, endurance, or confidence?", type: 'choice', choices: ['Strength', 'Endurance', 'Confidence', 'All'] },
      { id: 'q2', question: 'Would you prefer a gym or outdoor challenge?', type: 'choice', choices: ['Gym', 'Outdoor', 'Both'] },
      { id: 'q3', question: 'Are you okay interacting with people while working out?', type: 'choice', choices: ['Yes', 'No', 'Maybe'] },
    ],
  },
  wealth: {
    title: 'Wealth & Finance',
    color: '#20b2aa',
    image: 'https://images.unsplash.com/photo-1554224155-3a589877462f?q=80&w=1400&auto=format&fit=crop',
    subtitle: 'Money moves that build courage',
    questions: [
      { id: 'q1', question: "What's your current goal — earning, investing, or learning?", type: 'choice', choices: ['Earning', 'Investing', 'Learning', 'All'] },
      { id: 'q2', question: 'Are you more afraid of rejection in sales or fundraising?', type: 'choice', choices: ['Sales', 'Fundraising', 'Both'] },
      { id: 'q3', question: 'Would you like a digital or in-person challenge?', type: 'choice', choices: ['Digital', 'In-person', 'Both'] },
    ],
  },
  creativity: {
    title: 'Creativity & Expression',
    color: '#9b5cff',
    image: 'https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?q=80&w=1400&auto=format&fit=crop',
    subtitle: 'Make, share, and create in public',
    questions: [
      { id: 'q1', question: 'What do you create — music, art, content, writing?', type: 'text' },
      { id: 'q2', question: 'Do you want feedback, exposure, or challenge your self-expression?', type: 'choice', choices: ['Feedback', 'Exposure', 'Self-expression', 'All'] },
      { id: 'q3', question: 'Would you rather do this online or offline?', type: 'choice', choices: ['Online', 'Offline', 'Both'] },
    ],
  },
  mindset: {
    title: 'Mindset & Courage',
    color: '#ffb020',
    image: 'https://images.unsplash.com/photo-1533371452382-d45a9da51ad9?q=80&w=1400&auto=format&fit=crop',
    subtitle: 'Micro-fears, daily bravery',
    questions: [
      { id: 'q1', question: 'What area of life do you want to feel bolder in?', type: 'text' },
      { id: 'q2', question: 'When was the last time you avoided something because of fear?', type: 'text' },
      { id: 'q3', question: 'Would you like your challenge to be social or introspective?', type: 'choice', choices: ['Social', 'Introspective', 'Both'] },
    ],
  },
  relationships: {
    title: 'Relationships & Family',
    color: '#ff6b6b',
    image: 'https://images.unsplash.com/photo-1517884467360-71c4b3d48ee0?q=80&w=1400&auto=format&fit=crop',
    subtitle: 'Gentle, meaningful social quests',
    questions: [
      { id: 'q1', question: 'Is your focus romantic, family, or friendships?', type: 'choice', choices: ['Romantic', 'Family', 'Friendships', 'All'] },
      { id: 'q2', question: 'Do you want to practice expressing appreciation or asking for something?', type: 'choice', choices: ['Appreciation', 'Asking', 'Both'] },
      { id: 'q3', question: 'Would you like your quest to involve vulnerability or humor?', type: 'choice', choices: ['Vulnerability', 'Humor', 'Both'] },
    ],
  },
  community: {
    title: 'Community / Service',
    color: '#00bcd4',
    image: 'https://images.unsplash.com/photo-1532634896-26909d0d4b6a?q=80&w=1400&auto=format&fit=crop',
    subtitle: 'Give back with purpose',
    questions: [
      { id: 'q1', question: 'Do you want to engage with strangers or give back?', type: 'choice', choices: ['Engage with strangers', 'Give back', 'Both'] },
      { id: 'q2', question: 'Would you like your quest to involve kindness, courage, or leadership?', type: 'choice', choices: ['Kindness', 'Courage', 'Leadership', 'All'] },
      { id: 'q3', question: "What's your comfort level with public interaction?", type: 'scale' },
    ],
  },
  entrepreneurship: {
    title: 'Entrepreneurship',
    color: '#3787ff',
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1400&auto=format&fit=crop',
    subtitle: 'Ship ideas, sell, and level up your career',
    questions: [
      { id: 'q1', question: "What's your business or idea about?", type: 'text' },
      { id: 'q2', question: "What's one thing you're afraid to ask potential clients or partners?", type: 'text' },
      { id: 'q3', question: 'Are you looking for sales, collaborations, or exposure?', type: 'choice', choices: ['Sales', 'Collaborations', 'Exposure', 'All'] },
    ],
  },
  sales: {
    title: 'Sales',
    color: '#F77F00',
    image: 'https://images.unsplash.com/photo-1553484771-371a605b060b?q=80&w=1400&auto=format&fit=crop',
    subtitle: 'Master the art of persuasion',
    questions: [
      { id: 'q1', question: 'What are you selling?', type: 'text' },
      { id: 'q2', question: 'Do you prefer cold outreach or warm leads?', type: 'choice', choices: ['Cold outreach', 'Warm leads', 'Both'] },
      { id: 'q3', question: 'How comfortable are you with rejection?', type: 'scale' },
    ],
  },
  confidence: {
    title: 'Confidence',
    color: '#10B981',
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1400&auto=format&fit=crop',
    subtitle: 'Build unshakeable self-belief',
    questions: [
      { id: 'q1', question: 'What situation makes you most nervous?', type: 'text' },
      { id: 'q2', question: 'Would you like social or performance-based challenges?', type: 'choice', choices: ['Social', 'Performance', 'Both'] },
      { id: 'q3', question: 'How confident do you feel in new situations?', type: 'scale' },
    ],
  },
};

const SUBS: Record<string, string[]> = {
  business: ['Pitch a product idea', 'Cold email 3 clients', 'Ask for a testimonial', 'Create a LinkedIn post'],
  'door-knocking': ['Knock on 5 doors to pitch', 'Offer free trial at doorstep', 'Ask homeowners for referrals', 'Handle 3 door rejections'],
  'cold-calling': ['Make 10 cold calls', 'Call and pitch to decision-makers', 'Follow up with 5 leads', 'Handle phone objections'],
  marketing: ['Run a social media campaign', 'Create promotional content', 'Network at a local event', 'Pitch your service publicly'],
  dating: ['Ask a stranger for a coffee', 'Compliment 3 people', 'Start a conversation IRL', 'Get 1 bold "no"'],
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
  const [showModal, setShowModal] = useState<boolean>(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState<boolean>(false);

  const meta = CATEGORY_META[String(category)];
  const items = SUBS[String(category)] ?? [];
  const questions = meta?.questions ?? [];

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
          onPress={() => {
            if (questions.length > 0) {
              setShowModal(true);
              setCurrentQuestionIndex(0);
              setAnswers({});
            } else {
              handleQuickGenerate();
            }
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

      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Personalize Your Quest</Text>
              <Pressable onPress={() => setShowModal(false)} style={styles.closeButton}>
                <X size={24} color={theme.colors.text} />
              </Pressable>
            </View>

            {questions.length > 0 && currentQuestionIndex < questions.length ? (
              <View style={styles.questionContainer}>
                <Text style={[styles.questionText, { color: theme.colors.text }]}>
                  {questions[currentQuestionIndex].question}
                </Text>

                {questions[currentQuestionIndex].type === 'text' && (
                  <TextInput
                    style={[styles.textInput, { backgroundColor: theme.colors.background, color: theme.colors.text, borderColor: theme.colors.border }]}
                    placeholder="Type your answer..."
                    placeholderTextColor={theme.colors.text + '80'}
                    value={answers[questions[currentQuestionIndex].id] ?? ''}
                    onChangeText={(text) => setAnswers({ ...answers, [questions[currentQuestionIndex].id]: text })}
                    multiline
                  />
                )}

                {questions[currentQuestionIndex].type === 'scale' && (
                  <View style={styles.scaleContainer}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <Pressable
                        key={num}
                        onPress={() => setAnswers({ ...answers, [questions[currentQuestionIndex].id]: String(num) })}
                        style={[styles.scaleButton, { backgroundColor: answers[questions[currentQuestionIndex].id] === String(num) ? meta?.color : theme.colors.background, borderColor: theme.colors.border }]}
                      >
                        <Text style={[styles.scaleText, { color: answers[questions[currentQuestionIndex].id] === String(num) ? '#fff' : theme.colors.text }]}>{num}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}

                {questions[currentQuestionIndex].type === 'choice' && (
                  <View style={styles.choiceContainer}>
                    {questions[currentQuestionIndex].choices?.map((choice) => (
                      <Pressable
                        key={choice}
                        onPress={() => setAnswers({ ...answers, [questions[currentQuestionIndex].id]: choice })}
                        style={[styles.choiceButton, { backgroundColor: answers[questions[currentQuestionIndex].id] === choice ? meta?.color : theme.colors.background, borderColor: theme.colors.border }]}
                      >
                        <Text style={[styles.choiceText, { color: answers[questions[currentQuestionIndex].id] === choice ? '#fff' : theme.colors.text }]}>{choice}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}

                <View style={styles.modalActions}>
                  {currentQuestionIndex > 0 && (
                    <Pressable onPress={handlePrevious} style={[styles.actionButton, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                      <Text style={[styles.actionButtonText, { color: theme.colors.text }]}>Previous</Text>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={handleNext}
                    disabled={!answers[questions[currentQuestionIndex].id]}
                    style={[styles.actionButton, { backgroundColor: meta?.color, opacity: answers[questions[currentQuestionIndex].id] ? 1 : 0.5 }]}
                  >
                    <Text style={styles.actionButtonText}>{currentQuestionIndex < questions.length - 1 ? 'Next' : generating ? 'Generating...' : 'Generate Quest'}</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );

  async function handleQuickGenerate() {
    try {
      await addAIQuest('medium', false, undefined, String(category) as any);
      router.replace('/(tabs)/(home)?focus=1' as any);
    } catch (error) {
      console.error('Failed to generate quest:', error);
    }
  }

  function handlePrevious() {
    setCurrentQuestionIndex((prev) => Math.max(0, prev - 1));
  }

  async function handleNext() {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else {
      setGenerating(true);
      try {
        await addAIQuest('medium', false, undefined, String(category) as any);
        setShowModal(false);
        router.replace('/(tabs)/(home)?focus=1' as any);
      } catch (error) {
        console.error('Failed to generate quest:', error);
      } finally {
        setGenerating(false);
      }
    }
  }
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
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, minHeight: 400 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 20, fontWeight: '900' as const },
    closeButton: { padding: 4 },
    questionContainer: { flex: 1 },
    questionText: { fontSize: 18, fontWeight: '700' as const, marginBottom: 20 },
    textInput: { borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 16, minHeight: 100, textAlignVertical: 'top' },
    scaleContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    scaleButton: { width: 50, height: 50, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
    scaleText: { fontSize: 16, fontWeight: '700' as const },
    choiceContainer: { gap: 12 },
    choiceButton: { padding: 16, borderRadius: 12, borderWidth: 1 },
    choiceText: { fontSize: 16, fontWeight: '600' as const, textAlign: 'center' },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
    actionButton: { flex: 1, padding: 16, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
    actionButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' as const },
  });
}

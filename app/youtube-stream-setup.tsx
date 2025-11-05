import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Video, Lock, Globe, Users } from 'lucide-react-native';
import { useYouTube } from '@/contexts/YouTubeContext';
import { useAuth } from '@/contexts/AuthContext';

type PrivacyStatus = 'public' | 'unlisted' | 'private';

export default function YouTubeStreamSetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { createLiveStream, isCreatingStream } = useYouTube();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [privacyStatus, setPrivacyStatus] = useState<PrivacyStatus>('public');

  const handleCreateStream = async () => {
    if (!title.trim()) {
      Alert.alert('Title Required', 'Please enter a title for your stream.');
      return;
    }

    if (!user) {
      Alert.alert('Not Logged In', 'Please log in to create a stream.');
      return;
    }

    try {
      createLiveStream(
        {
          title: title.trim(),
          description: description.trim(),
          scheduledStartTime: new Date().toISOString(),
        },
        {
          onSuccess: (data) => {
            Alert.alert(
              'Stream Created!',
              'Your YouTube live stream has been created successfully.',
              [
                {
                  text: 'View Stream',
                  onPress: () => {
                    router.push({
                      pathname: '/youtube-stream',
                      params: {
                        broadcastId: data.broadcastId,
                        streamId: data.streamId,
                        watchUrl: data.watchUrl,
                      },
                    });
                  },
                },
              ]
            );
          },
          onError: (error) => {
            console.error('[Stream Setup] Error:', error);
            Alert.alert(
              'Error',
              error.message || 'Failed to create stream. Please try again.'
            );
          },
        }
      );
    } catch (error) {
      console.error('[Stream Setup] Unexpected error:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
    }
  };

  const privacyOptions: { value: PrivacyStatus; label: string; icon: any; description: string }[] = [
    {
      value: 'public',
      label: 'Public',
      icon: Globe,
      description: 'Anyone can search for and view',
    },
    {
      value: 'unlisted',
      label: 'Unlisted',
      icon: Users,
      description: 'Anyone with the link can view',
    },
    {
      value: 'private',
      label: 'Private',
      icon: Lock,
      description: 'Only you can view',
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Create Stream</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Title Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stream Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter stream title..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
          <Text style={styles.helperText}>{title.length}/100 characters</Text>
        </View>

        {/* Description Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe your stream..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            maxLength={500}
          />
          <Text style={styles.helperText}>{description.length}/500 characters</Text>
        </View>

        {/* Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <Text style={styles.sectionSubtitle}>Choose who can watch your stream</Text>

          {privacyOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = privacyStatus === option.value;

            return (
              <Pressable
                key={option.value}
                style={[styles.privacyOption, isSelected && styles.privacyOptionSelected]}
                onPress={() => setPrivacyStatus(option.value)}
              >
                <View style={styles.privacyOptionLeft}>
                  <View style={[styles.privacyIcon, isSelected && styles.privacyIconSelected]}>
                    <Icon size={24} color={isSelected ? '#FF6B35' : 'rgba(255,255,255,0.6)'} />
                  </View>
                  <View style={styles.privacyInfo}>
                    <Text style={[styles.privacyLabel, isSelected && styles.privacyLabelSelected]}>
                      {option.label}
                    </Text>
                    <Text style={styles.privacyDescription}>{option.description}</Text>
                  </View>
                </View>
                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                  {isSelected && <View style={styles.radioDot} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Video size={20} color="#FF6B35" />
          <Text style={styles.infoText}>
            Your stream will be created on YouTube. You'll receive RTMP details to start broadcasting.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + 20 }]}>
        <Pressable
          style={[styles.createButton, isCreatingStream && styles.createButtonDisabled]}
          onPress={handleCreateStream}
          disabled={isCreatingStream}
        >
          {isCreatingStream ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Video size={20} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Create Stream</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginBottom: 16,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  helperText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'right',
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  privacyOptionSelected: {
    backgroundColor: 'rgba(255,107,53,0.1)',
    borderColor: '#FF6B35',
  },
  privacyOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  privacyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  privacyIconSelected: {
    backgroundColor: 'rgba(255,107,53,0.2)',
  },
  privacyInfo: {
    flex: 1,
  },
  privacyLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  privacyLabelSelected: {
    color: '#FFFFFF',
  },
  privacyDescription: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#FF6B35',
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF6B35',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(255,107,53,0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.3)',
  },
  infoText: {
    flex: 1,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    lineHeight: 20,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(26,26,46,0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});

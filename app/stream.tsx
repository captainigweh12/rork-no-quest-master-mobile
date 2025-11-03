import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import { useTheme } from '@/contexts/ThemeContext';
import { useStream } from '@/contexts/StreamContext';
import { useGame } from '@/contexts/GameContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Users, Send, Video, VideoOff, Server } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { trpc } from '@/lib/trpc';

export default function StreamScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, isLoading: authLoading } = useAuth();
  const params = useLocalSearchParams<{ streamId?: string; mode?: 'broadcaster' | 'viewer' }>();
  const {
    activeStream,
    isStreaming,
    messages,
    viewerCount,
    startStreaming,
    stopStreaming,
    joinStreamById,
    leaveCurrentStream,
    sendMessage,
    isStarting,
    isStopping,
    isJoining,
  } = useStream();
  const { quests } = useGame();
  const [permission, requestPermission] = useCameraPermissions();
  const [messageText, setMessageText] = useState('');
  const [isCameraOn, setIsCameraOn] = useState<boolean>(true);
  const [channelName, setChannelName] = useState<string>('quest-live');
  const [resourceId, setResourceId] = useState<string>('');
  const [sid, setSid] = useState<string>('');
  const scrollViewRef = useRef<ScrollView>(null);
  const styles = createStyles(theme.colors);

  const isBroadcaster = params.mode === 'broadcaster';
  const isViewer = params.mode === 'viewer' || !!params.streamId;
  const paramsStreamId = params.streamId;
  const paramsMode = params.mode;

  useEffect(() => {
    console.log('[STREAM] Screen opened with params:', { streamId: paramsStreamId, mode: paramsMode });
    
    if (authLoading) {
      console.log('[STREAM] Waiting for auth to complete...');
      return;
    }

    if (!user) {
      console.error('[STREAM] User not authenticated, redirecting...');
      setTimeout(() => {
        Alert.alert('Authentication Required', 'You must be logged in to view streams.', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      }, 100);
      return;
    }
    
    if (isViewer && paramsStreamId && !isStreaming) {
      console.log('[STREAM] Joining stream as viewer:', paramsStreamId);
      joinStreamById(paramsStreamId).catch((error) => {
        console.error('[STREAM] Failed to join stream:', error);
        setTimeout(() => {
          Alert.alert('Error', 'Failed to join stream. Please try again.', [
            { text: 'OK', onPress: () => router.back() }
          ]);
        }, 100);
      });
    }
  }, [paramsStreamId, paramsMode, isViewer, isStreaming, joinStreamById, user, authLoading, router]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleStartStream = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Permission Required', 'Camera permission is required to start streaming');
        return;
      }
    }

    try {
      const activeQuest = quests.find((q) => !q.completed && q.timerEndAt);
      
      await startStreaming({
        title: activeQuest ? `Quest: ${activeQuest.title}` : 'Live Stream',
        description: activeQuest?.description,
        questId: activeQuest?.id,
        questTitle: activeQuest?.title,
        category: activeQuest?.category,
      });

      try {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch {}
    } catch (error) {
      console.error('[STREAM] Failed to start stream:', error);
      Alert.alert('Error', 'Failed to start streaming. Please try again.');
    }
  };

  const handleStopStream = async () => {
    try {
      await stopStreaming();
      try {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch {}
      router.back();
    } catch (error) {
      console.error('[STREAM] Failed to stop stream:', error);
      Alert.alert('Error', 'Failed to stop streaming. Please try again.');
    }
  };

  const handleLeaveStream = async () => {
    try {
      await leaveCurrentStream();
      router.back();
    } catch (error) {
      console.error('[STREAM] Failed to leave stream:', error);
      Alert.alert('Error', 'Failed to leave stream. Please try again.');
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    try {
      await sendMessage(messageText);
      setMessageText('');
      try {
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      } catch {}
    } catch (error) {
      console.error('[STREAM] Failed to send message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  const agoraEnvQuery = trpc.agora.env.useQuery(undefined, { 
    staleTime: 60_000,
    retry: false,
    enabled: __DEV__,
  });
  const acquireMutation = trpc.agora.acquire.useMutation();

  async function handleAcquireResource() {
    try {
      const uid = 'host';
      const res = await acquireMutation.mutateAsync({ cname: channelName, uid });
      console.log('[AGORA] acquire response', res);
      setResourceId(res.resourceId);
    } catch (e: any) {
      console.error('[AGORA] acquire failed', e);
      Alert.alert('Agora Error', e?.message ?? 'Failed to acquire resource');
    }
  }

  if (isBroadcaster && !isStreaming && !isStarting) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Pressable
          style={styles.closeButton}
          onPress={() => router.back()}
          testID="close-stream-setup"
        >
          <X size={28} color={theme.colors.text} />
        </Pressable>

        <View style={styles.setupContainer}>
          <Text style={[styles.setupTitle, { color: theme.colors.text }]}>Start Live Stream</Text>
          <Text style={[styles.setupSubtitle, { color: theme.colors.textSecondary }]}>
            Share your quest journey with the community
          </Text>

          <View style={styles.setupInfo}>
            <Video size={48} color={theme.colors.primary} />
            <Text style={[styles.setupInfoText, { color: theme.colors.text }]}>
              Your live stream will be visible to all users. Make sure you have a good internet connection.
            </Text>
          </View>

          <Pressable
            style={[
              styles.startButton,
              { backgroundColor: theme.colors.primary, opacity: isStarting ? 0.6 : 1 },
            ]}
            onPress={handleStartStream}
            disabled={isStarting}
            testID="start-stream-button"
          >
            {isStarting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Video size={24} color="#fff" />
                <Text style={styles.startButtonText}>Go Live</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    );
  }

  if (authLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[{ color: theme.colors.textSecondary, marginTop: 16, fontSize: 14, fontWeight: '600' as const }]}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[{ color: theme.colors.text, fontSize: 16, fontWeight: '700' as const }]}>Authentication Required</Text>
        <Text style={[{ color: theme.colors.textSecondary, marginTop: 8, fontSize: 14, fontWeight: '600' as const }]}>Please log in to continue</Text>
      </View>
    );
  }

  if (isStreaming || isJoining || (isViewer && activeStream)) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.streamContainer}>
          {isBroadcaster && isCameraOn && permission?.granted ? (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing={"front" as CameraType}
              testID="stream-camera"
            />
          ) : (
            <View style={[styles.placeholderView, { backgroundColor: theme.colors.backgroundSecondary }]}>
              <VideoOff size={64} color={theme.colors.textSecondary} />
              <Text style={[styles.placeholderText, { color: theme.colors.textSecondary }]}>
                {isBroadcaster ? 'Camera Off' : 'Connecting to stream...'}
              </Text>
            </View>
          )}

          <View style={[styles.overlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <View style={styles.topBar}>
              <Pressable
                style={[styles.iconButton, { backgroundColor: 'rgba(0, 0, 0, 0.6)' }]}
                onPress={isBroadcaster ? handleStopStream : handleLeaveStream}
                disabled={isStopping}
                testID="close-stream"
              >
                <X size={24} color="#fff" />
              </Pressable>

              <View style={[styles.viewerBadge, { backgroundColor: 'rgba(239, 68, 68, 0.9)' }]}>
                <Users size={16} color="#fff" />
                <Text style={styles.viewerText}>{viewerCount}</Text>
              </View>

              {isBroadcaster && (
                <Pressable
                  style={[styles.iconButton, { backgroundColor: 'rgba(0, 0, 0, 0.6)' }]}
                  onPress={() => setIsCameraOn((prev) => !prev)}
                  testID="toggle-camera"
                >
                  {isCameraOn ? (
                    <Video size={24} color="#fff" />
                  ) : (
                    <VideoOff size={24} color="#fff" />
                  )}
                </Pressable>
              )}
            </View>

            <View style={styles.infoBar}>
              <Text style={styles.streamTitle} numberOfLines={1}>
                {activeStream?.title ?? 'Live Stream'}
              </Text>
              {activeStream?.questTitle && (
                <Text style={styles.questBadge} numberOfLines={1}>
                  Quest: {activeStream.questTitle}
                </Text>
              )}
            </View>

            <View style={styles.chatContainer}>
              <ScrollView
                ref={scrollViewRef}
                style={styles.messageList}
                contentContainerStyle={styles.messageListContent}
                showsVerticalScrollIndicator={false}
              >
                {messages.map((msg) => (
                  <View key={msg.id} style={styles.messageItem}>
                    <Text style={styles.messageUsername}>{msg.username}</Text>
                    <Text style={styles.messageText}>{msg.message}</Text>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.messageInputContainer}>
                <TextInput
                  style={[styles.messageInput, { color: theme.colors.text }]}
                  value={messageText}
                  onChangeText={setMessageText}
                  placeholder="Send a message..."
                  placeholderTextColor={theme.colors.textSecondary}
                  returnKeyType="send"
                  onSubmitEditing={handleSendMessage}
                  testID="message-input"
                />
                <Pressable
                  style={[
                    styles.sendButton,
                    { backgroundColor: theme.colors.primary, opacity: messageText.trim() ? 1 : 0.5 },
                  ]}
                  onPress={handleSendMessage}
                  disabled={!messageText.trim()}
                  testID="send-message-button"
                >
                  <Send size={20} color="#fff" />
                </Pressable>
              </View>

              {__DEV__ && (
                <View style={{ backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, padding: 12 }} testID="agora-dev-panel">
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Server size={16} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '800' as const }}>Agora REST Debug</Text>
                  </View>
                  <Text style={{ color: '#9CA3AF', marginTop: 4 }}>
                    env: appId {agoraEnvQuery.data?.appIdPresent ? '✅' : '❌'} · customer {agoraEnvQuery.data?.customerIdPresent ? '✅' : '❌'}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <TextInput
                      style={[styles.messageInput, { flex: 1 }]}
                      value={channelName}
                      onChangeText={setChannelName}
                      placeholder="Channel name"
                      placeholderTextColor="#9CA3AF"
                    />
                    <Pressable
                      style={[styles.sendButton, { backgroundColor: '#10B981', width: undefined, paddingHorizontal: 12 }]}
                      onPress={handleAcquireResource}
                      testID="agora-acquire"
                    >
                      <Text style={{ color: '#fff', fontWeight: '800' as const }}>Acquire</Text>
                    </Pressable>
                  </View>
                  {resourceId ? (
                    <Text style={{ color: '#22D3EE', marginTop: 6 }}>resourceId: {resourceId}</Text>
                  ) : null}
                </View>
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    closeButton: {
      position: 'absolute',
      top: 60,
      right: 20,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
    setupContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
      gap: 24,
    },
    setupTitle: {
      fontSize: 32,
      fontWeight: '900' as const,
      textAlign: 'center',
    },
    setupSubtitle: {
      fontSize: 16,
      fontWeight: '600' as const,
      textAlign: 'center',
      maxWidth: 300,
    },
    setupInfo: {
      flexDirection: 'column',
      alignItems: 'center',
      gap: 16,
      padding: 24,
      borderRadius: 16,
      backgroundColor: colors.card,
      maxWidth: 350,
    },
    setupInfoText: {
      fontSize: 14,
      fontWeight: '600' as const,
      textAlign: 'center',
      lineHeight: 20,
    },
    startButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 32,
      paddingVertical: 16,
      borderRadius: 999,
      marginTop: 16,
    },
    startButtonText: {
      fontSize: 18,
      fontWeight: '900' as const,
      color: '#fff',
    },
    streamContainer: {
      flex: 1,
      position: 'relative',
    },
    placeholderView: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 16,
    },
    placeholderText: {
      fontSize: 16,
      fontWeight: '700' as const,
    },
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'space-between',
    },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    iconButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
    },
    viewerBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 999,
    },
    viewerText: {
      fontSize: 14,
      fontWeight: '900' as const,
      color: '#fff',
    },
    infoBar: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
    },
    streamTitle: {
      fontSize: 20,
      fontWeight: '900' as const,
      color: '#fff',
      textShadowColor: 'rgba(0, 0, 0, 0.75)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    questBadge: {
      fontSize: 14,
      fontWeight: '700' as const,
      color: '#fff',
      backgroundColor: 'rgba(59, 130, 246, 0.9)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      alignSelf: 'flex-start',
    },
    chatContainer: {
      height: 300,
      paddingHorizontal: 16,
      paddingBottom: 16,
      gap: 12,
    },
    messageList: {
      flex: 1,
    },
    messageListContent: {
      gap: 8,
    },
    messageItem: {
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      maxWidth: '80%',
      alignSelf: 'flex-start',
    },
    messageUsername: {
      fontSize: 12,
      fontWeight: '900' as const,
      color: '#fff',
      marginBottom: 2,
    },
    messageText: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: '#fff',
    },
    messageInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    messageInput: {
      flex: 1,
      height: 44,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      borderRadius: 22,
      paddingHorizontal: 16,
      fontSize: 14,
      fontWeight: '600' as const,
      color: '#fff',
    },
    sendButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
}

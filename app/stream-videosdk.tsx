import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  Alert,
  Share,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useVideoSDK } from "@/contexts/VideoSDKContext";
import { Mic, MicOff, Video as VideoIcon, VideoOff, X, Users, CheckCircle2, XCircle, Map as MapIcon, LayoutList, Share2, MessageCircle, Sparkles, Send, Smile, FlipHorizontal2, PhoneOff, Instagram } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { trpc } from "@/lib/trpc";
import { getBaseUrl } from "@/lib/baseUrl";
import { useAuth } from "@/contexts/AuthContext";
import { useGame } from "@/contexts/GameContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useStream } from "@/contexts/StreamContext";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const WebCameraPreview = () => {
  return (
    <View style={styles.noVideoView}>
      <VideoOff size={64} color="#9CA3AF" />
      <Text style={styles.noVideoText}>Camera not available on web</Text>
      <Text style={[styles.noVideoText, { fontSize: 14, marginTop: 8 }]}>
        Use mobile device for camera
      </Text>
    </View>
  );
};

const NativeCameraPreview = Platform.OS === 'web' ? null : (() => {
  const { CameraView, useCameraPermissions } = require('expo-camera');
  
  return ({ 
    cameraEnabled, 
    cameraType,
    onCameraTypeChange 
  }: { 
    cameraEnabled: boolean;
    cameraType: string;
    onCameraTypeChange: () => void;
  }) => {
    const [permission, requestPermission] = useCameraPermissions();

    if (!permission) {
      return (
        <View style={styles.noVideoView}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={styles.noVideoView}>
          <Text style={styles.permissionText}>Camera permission needed</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!cameraEnabled) {
      return (
        <View style={styles.noVideoView}>
          <VideoOff size={64} color="#9CA3AF" />
          <Text style={styles.noVideoText}>Camera Off</Text>
        </View>
      );
    }

    return (
      <CameraView 
        style={styles.camera} 
        facing={cameraType}
      >
        <TouchableOpacity 
          style={styles.flipButton}
          onPress={onCameraTypeChange}
        >
          <Text style={styles.flipButtonText}>Flip</Text>
        </TouchableOpacity>
      </CameraView>
    );
  };
})();

const CameraPreview = ({ 
  cameraEnabled, 
  cameraType,
  onCameraTypeChange 
}: { 
  cameraEnabled: boolean;
  cameraType: string;
  onCameraTypeChange: () => void;
}) => {
  if (Platform.OS === 'web') {
    return <WebCameraPreview />;
  }
  
  if (!NativeCameraPreview) {
    return <WebCameraPreview />;
  }
  
  return (
    <NativeCameraPreview 
      cameraEnabled={cameraEnabled}
      cameraType={cameraType}
      onCameraTypeChange={onCameraTypeChange}
    />
  );
};

const DiagnosticsBanner = React.memo(function DiagnosticsBanner() {
  const { user } = useAuth();
  const { data, error, isLoading, refetch, isRefetching } = trpc.videosdk.checkConfig.useQuery(undefined, { staleTime: 1000 * 30 });
  const tokenProbe = trpc.videosdk.getToken.useQuery(undefined, { staleTime: 0, retry: 0 });
  const base = useMemo(() => `${getBaseUrl()}/api/trpc`, []);

  // Only show banner for admins
  if (!user?.isAdmin) {
    return null;
  }

  const ok = !!data?.configured && !error && !tokenProbe.error;
  return (
    <View style={[styles.diagContainer, ok ? styles.diagOk : styles.diagFail]} testID="videosdk-diag-banner">
      <View style={styles.diagRow}>
        {ok ? <CheckCircle2 size={16} color="#065F46" /> : <XCircle size={16} color="#991B1B" />}
        <Text style={[styles.diagText, ok ? styles.diagTextOk : styles.diagTextFail]} testID="videosdk-diag-status">
          {isLoading || isRefetching ? "Checking tRPC..." : ok ? "tRPC OK" : "tRPC Fail"}
        </Text>
        <TouchableOpacity onPress={() => { refetch(); tokenProbe.refetch(); }} style={styles.diagRefresh} testID="videosdk-diag-refresh">
          <Text style={styles.diagRefreshText}>Retry</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.diagSub} numberOfLines={1} testID="videosdk-diag-base-url">{base}</Text>
      {!isLoading && (
        <Text style={styles.diagSub} testID="videosdk-diag-detail">
          {error ? String((error as any)?.message ?? error) : `API Key: ${data?.apiKeyPresent ? 'present' : 'missing'} • Secret: ${data?.secretKeyPresent ? 'present' : 'missing'} • token: ${tokenProbe.data?.token ? 'ok' : tokenProbe.error ? 'fail' : 'checking'}`}
        </Text>
      )}
    </View>
  );
});

const QuestLiveBanner = ({
  onOpenQuest,
  onOpenMap,
}: { onOpenQuest: () => void; onOpenMap: () => void }) => {
  const { quests, progressMap, recordQuestOutcome } = useGame();
  const { theme } = useTheme();
  const active = quests.find((q) => !q.completed);

  if (!active) return null as any;
  const progress = progressMap[active.id] ?? { noCount: 0, yesCount: 0 };
  const minNo = active.minNoRequired ?? 0;
  const pct = minNo > 0 ? Math.min(100, Math.round((progress.noCount / minNo) * 100)) : 0;

  return (
    <View style={[questStyles.bannerWrap]} testID="live-quest-banner">
      <View
        style={[
          questStyles.banner,
          { backgroundColor: theme.colors.glass, borderColor: theme.colors.border },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[questStyles.bannerTitle, { color: theme.colors.text }]} numberOfLines={1}>
            Quest: {active.title}
          </Text>
          <View style={questStyles.progressRow}>
            <View style={[questStyles.progressBar, { backgroundColor: theme.colors.backgroundTertiary }]}> 
              <View style={[questStyles.progressFill, { width: `${pct}%`, backgroundColor: '#10B981' }]} />
            </View>
            <Text style={[questStyles.progressLabel, { color: theme.colors.textSecondary }]}>
              NOs {progress.noCount}{minNo ? `/${minNo}` : ''}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          accessibilityLabel="Quest YES"
          onPress={() => recordQuestOutcome(active.id, 'yes')}
          style={[questStyles.actionBtn, { backgroundColor: '#EF4444' }]}
          testID="live-quest-yes"
        >
          <Text style={questStyles.actionText}>YES</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityLabel="Quest NO"
          onPress={() => recordQuestOutcome(active.id, 'no')}
          style={[questStyles.actionBtn, { backgroundColor: '#10B981' }]}
          testID="live-quest-no"
        >
          <Text style={questStyles.actionText}>NO</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onOpenQuest} style={[questStyles.iconBtn, { borderColor: theme.colors.border }]} testID="live-quest-open">
          <LayoutList size={16} color={theme.colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onOpenMap} style={[questStyles.iconBtn, { borderColor: theme.colors.border }]} testID="live-quest-map">
          <MapIcon size={16} color={theme.colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const StreamView = () => {
  const router = useRouter();
  const { meetingId } = useVideoSDK();
  const { user } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  
  const [micEnabled, setMicEnabled] = useState<boolean>(true);
  const [cameraEnabled, setCameraEnabled] = useState<boolean>(true);
  const [cameraType, setCameraType] = useState<string>("front");
  const [viewerCount] = useState<number>(1);
  const [showQuest, setShowQuest] = useState<boolean>(false);
  const [showMap, setShowMap] = useState<boolean>(false);
  const [showChat, setShowChat] = useState<boolean>(false);
  const [showGenerateQuest, setShowGenerateQuest] = useState<boolean>(false);
  const [recentViewers] = useState<Array<{id: string, username: string}>>([
    { id: '1', username: 'mbull205' },
    { id: '2', username: 'kingy2588' },
  ]);

  const handleToggleMic = () => {
    console.log("[VideoSDK] Toggling microphone");
    setMicEnabled((prev) => !prev);
  };

  const handleToggleCamera = () => {
    console.log("[VideoSDK] Toggling camera");
    setCameraEnabled((prev) => !prev);
  };

  const handleFlipCamera = () => {
    console.log("[VideoSDK] Flipping camera");
    setCameraType((current) => (current === "back" ? "front" : "back"));
  };

  const handleCopyMeetingId = async () => {
    if (meetingId) {
      await Clipboard.setStringAsync(meetingId);
      if (Platform.OS === "web") {
        alert("Meeting ID copied to clipboard!");
      } else {
        Alert.alert("Success", "Meeting ID copied to clipboard!");
      }
    }
  };

  const handleEndStream = () => {
    console.log("[VideoSDK] Ending stream");
    if (Platform.OS === "web") {
      if (confirm("Are you sure you want to end the stream?")) {
        router.back();
      }
    } else {
      Alert.alert(
        "End Stream",
        "Are you sure you want to end the stream?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "End", style: "destructive", onPress: () => router.back() },
        ]
      );
    }
  };

  return (
    <View style={styles.meetingContainer}>
      <View style={styles.cameraContainer}>
        <CameraPreview 
          cameraEnabled={cameraEnabled}
          cameraType={cameraType}
          onCameraTypeChange={handleFlipCamera}
        />
        
        {/* Top bar with user profile, LIVE badge and close button */}
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <View style={styles.topBarLeft}>
            <View style={styles.profilePic}>
              <Text style={styles.profileInitial}>{(user?.email?.[0] || 'U').toUpperCase()}</Text>
            </View>
            <Text style={styles.username}>{user?.email?.split('@')[0] || 'user'}</Text>
            <View style={styles.liveIndicatorNew}>
              <Text style={styles.liveTextNew}>LIVE</Text>
            </View>
          </View>
          <TouchableOpacity 
            onPress={handleEndStream}
            style={styles.closeButton}
            accessibilityLabel="Close stream"
            testID="close-stream"
          >
            <X size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Right side toolbar */}
        <View style={styles.rightToolbar}>
          <TouchableOpacity
            style={styles.toolbarButton}
            onPress={handleFlipCamera}
            accessibilityLabel="Flip camera"
            testID="flip-camera"
          >
            <FlipHorizontal2 size={24} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.toolbarButton, !micEnabled && styles.toolbarButtonOff]}
            onPress={handleToggleMic}
            accessibilityLabel="Toggle microphone"
            testID="toggle-mic"
          >
            {micEnabled ? (
              <Mic size={24} color="#fff" />
            ) : (
              <MicOff size={24} color="#fff" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolbarButton, !cameraEnabled && styles.toolbarButtonOff]}
            onPress={handleToggleCamera}
            accessibilityLabel="Toggle camera"
            testID="toggle-camera"
          >
            {cameraEnabled ? (
              <VideoOff size={24} color="#fff" />
            ) : (
              <VideoIcon size={24} color="#fff" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolbarButton}
            onPress={() => {}}
            accessibilityLabel="Instagram share"
            testID="instagram-share"
          >
            <Instagram size={24} color="#fff" />
          </TouchableOpacity>
        </View>



        {/* Bottom section with notification and viewers */}
        <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 16 }]}>
          {/* Notification banner */}
          <View style={styles.notificationBanner}>
            <View style={styles.notificationIcon}>
              <Users size={16} color="#fff" />
            </View>
            <Text style={styles.notificationText}>We're telling your followers that you've started a live video.</Text>
          </View>

          {/* Recent viewers */}
          <View style={styles.viewersSection}>
            {recentViewers.map((viewer) => (
              <View key={viewer.id} style={styles.viewerRow}>
                <View style={styles.viewerAvatar}>
                  <Text style={styles.viewerAvatarText}>{viewer.username[0].toUpperCase()}</Text>
                </View>
                <Text style={styles.viewerName}>{viewer.username} joined</Text>
                <Text style={styles.waveEmoji}>👋</Text>
                <Text style={styles.waveText}>Wave</Text>
              </View>
            ))}
          </View>

          {/* Bottom action bar */}
          <View style={styles.bottomActionBar}>
            <TouchableOpacity
              style={styles.commentButton}
              onPress={() => setShowChat(true)}
              accessibilityLabel="Comment"
              testID="comment-button"
            >
              <Text style={styles.commentButtonText}>Comment</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionIcon}>
              <MapIcon size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionIcon}>
              <Sparkles size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionIcon}>
              <Users size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionIcon}>
              <Share2 size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {showQuest && <QuestOverlay onClose={() => setShowQuest(false)} />}
      {showMap && <MapOverlay onClose={() => setShowMap(false)} />}
      {showChat && <ChatOverlay onClose={() => setShowChat(false)} />}
      {showGenerateQuest && <GenerateQuestOverlay onClose={() => setShowGenerateQuest(false)} />}
    </View>
  );
};

const QuestOverlay = ({ onClose }: { onClose: () => void }) => {
  const { quests } = useGame();
  const { theme } = useTheme();
  const active = quests.find((q) => !q.completed);
  if (!active) return null as any;
  return (
    <View style={overlayStyles.backdrop} pointerEvents="box-none">
      <View style={[overlayStyles.sheet, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}> 
        <View style={overlayStyles.sheetHeader}>
          <Text style={[overlayStyles.sheetTitle, { color: theme.colors.text }]} numberOfLines={1}>Quest</Text>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Close quest" style={overlayStyles.closeBtn}>
            <Text style={{ color: theme.colors.text, fontWeight: '800' as const }}>×</Text>
          </TouchableOpacity>
        </View>
        <Text style={[overlayStyles.questTitle, { color: theme.colors.text }]}>{active.title}</Text>
        <Text style={[overlayStyles.questDesc, { color: theme.colors.textSecondary }]}>{active.description}</Text>
      </View>
    </View>
  );
};

const MapOverlay = ({ onClose }: { onClose: () => void }) => {
  const { theme } = useTheme();
  const router = useRouter();
  return (
    <View style={overlayStyles.backdrop} pointerEvents="box-none">
      <View style={[overlayStyles.sheet, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}> 
        <View style={overlayStyles.sheetHeader}>
          <Text style={[overlayStyles.sheetTitle, { color: theme.colors.text }]}>Quest Map</Text>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Close map" style={overlayStyles.closeBtn}>
            <Text style={{ color: theme.colors.text, fontWeight: '800' as const }}>×</Text>
          </TouchableOpacity>
        </View>
        <Text style={[overlayStyles.questDesc, { color: theme.colors.textSecondary }]}>Open the full interactive Quest Map to navigate to places and unlock quests.</Text>
        <TouchableOpacity
          onPress={() => {
            onClose();
            router.push('/(tabs)/map' as any);
          }}
          style={{ marginTop: 12, paddingVertical: 12, borderRadius: 12, backgroundColor: theme.colors.primary, alignItems: 'center' }}
          accessibilityLabel="Open full map"
          testID="open-full-map"
        >
          <Text style={{ color: '#fff', fontWeight: '800' as const }}>Open Map</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '👏', '💯', '🙌', '✨', '🚀', '💪', '🎯', '⭐'];

const ChatOverlay = ({ onClose }: { onClose: () => void }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { messages, sendMessage } = useStream();
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || isSending) return;
    
    const messageToSend = inputText.trim();
    setInputText('');
    setIsSending(true);
    setShowEmojiPicker(false);
    Keyboard.dismiss();
    
    try {
      await sendMessage(messageToSend);
      console.log('[Chat] Message sent:', messageToSend);
    } catch (error) {
      console.error('[Chat] Failed to send message:', error);
      if (Platform.OS === 'web') {
        alert('Failed to send message');
      } else {
        Alert.alert('Error', 'Failed to send message');
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setInputText(prev => prev + emoji);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={overlayStyles.backdrop}
      pointerEvents="box-none"
    >
      <View style={[overlayStyles.chatSheet, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}> 
        <View style={overlayStyles.sheetHeader}>
          <Text style={[overlayStyles.sheetTitle, { color: theme.colors.text }]}>Live Chat</Text>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Close chat" style={overlayStyles.closeBtn} testID="close-chat">
            <Text style={{ color: theme.colors.text, fontWeight: '800' as const, fontSize: 24 }}>×</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView 
          ref={scrollRef}
          style={{ flex: 1, marginTop: 12 }}
          contentContainerStyle={{ paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 24 }}>
              <MessageCircle size={32} color={theme.colors.textSecondary} />
              <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginTop: 8, textAlign: 'center' }}>
                No messages yet. Be the first to chat!
              </Text>
            </View>
          ) : (
            messages.map((msg, idx) => {
              const isOwn = msg.userId === user?.id;
              return (
                <View key={msg.id || idx} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                    <View style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: isOwn ? theme.colors.primary : theme.colors.backgroundTertiary,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' as const }}>
                        {(msg.username || 'User')[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ color: isOwn ? theme.colors.primary : theme.colors.text, fontSize: 12, fontWeight: '700' as const }}>
                          {msg.username || 'Anonymous'}
                        </Text>
                        {isOwn && (
                          <View style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' as const }}>YOU</Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ color: theme.colors.text, fontSize: 14, marginTop: 2, lineHeight: 20 }}>
                        {msg.message}
                      </Text>
                      {msg.createdAt && (
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 10, marginTop: 2 }}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {showEmojiPicker && (
          <View style={{ 
            flexDirection: 'row', 
            flexWrap: 'wrap', 
            gap: 8, 
            paddingVertical: 12,
            paddingHorizontal: 8,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
            backgroundColor: theme.colors.backgroundSecondary,
          }}>
            {EMOJIS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                onPress={() => handleEmojiSelect(emoji)}
                style={{
                  padding: 8,
                  borderRadius: 8,
                  backgroundColor: theme.colors.card,
                }}
                testID={`emoji-${emoji}`}
              >
                <Text style={{ fontSize: 24 }}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          gap: 8, 
          marginTop: 12,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
        }}>
          <TouchableOpacity
            onPress={() => setShowEmojiPicker(!showEmojiPicker)}
            style={{ 
              padding: 8, 
              borderRadius: 8,
              backgroundColor: showEmojiPicker ? theme.colors.primary : theme.colors.backgroundTertiary,
            }}
            testID="toggle-emoji-picker"
          >
            <Smile size={20} color={showEmojiPicker ? '#fff' : theme.colors.text} />
          </TouchableOpacity>
          
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor={theme.colors.textSecondary}
            style={{
              flex: 1,
              backgroundColor: theme.colors.backgroundTertiary,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: theme.colors.text,
              fontSize: 14,
              maxHeight: 100,
            }}
            multiline
            onSubmitEditing={handleSend}
            returnKeyType="send"
            blurOnSubmit={false}
            testID="chat-input"
          />
          
          <TouchableOpacity
            onPress={handleSend}
            disabled={!inputText.trim() || isSending}
            style={{ 
              padding: 10, 
              borderRadius: 12,
              backgroundColor: inputText.trim() && !isSending ? theme.colors.primary : theme.colors.backgroundTertiary,
            }}
            testID="send-message"
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Send size={20} color={inputText.trim() ? '#fff' : theme.colors.textSecondary} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const GenerateQuestOverlay = ({ onClose }: { onClose: () => void }) => {
  const { theme } = useTheme();
  const { addCustomQuest } = useGame();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const questTitle = `Live Stream Challenge ${Date.now()}`;
      
      await addCustomQuest({
        title: questTitle,
        description: 'Complete this quest during the live stream',
        minNoRequired: 5,
      });
      
      if (Platform.OS === 'web') {
        alert('Quest created successfully!');
      } else {
        Alert.alert('Success', 'Quest created successfully!');
      }
      onClose();
    } catch (error) {
      console.error('[Generate Quest] Error:', error);
      if (Platform.OS === 'web') {
        alert('Failed to create quest');
      } else {
        Alert.alert('Error', 'Failed to create quest');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <View style={overlayStyles.backdrop} pointerEvents="box-none">
      <View style={[overlayStyles.sheet, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}> 
        <View style={overlayStyles.sheetHeader}>
          <Text style={[overlayStyles.sheetTitle, { color: theme.colors.text }]}>Generate Quest</Text>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Close" style={overlayStyles.closeBtn}>
            <Text style={{ color: theme.colors.text, fontWeight: '800' as const }}>×</Text>
          </TouchableOpacity>
        </View>
        <Text style={[overlayStyles.questDesc, { color: theme.colors.textSecondary, marginTop: 8 }]}>Create a quest that viewers can see and participate in during your live stream.</Text>
        <TouchableOpacity
          onPress={handleGenerate}
          disabled={isGenerating}
          style={{ marginTop: 12, paddingVertical: 12, borderRadius: 12, backgroundColor: isGenerating ? '#6B7280' : theme.colors.primary, alignItems: 'center' }}
          accessibilityLabel="Generate quest"
          testID="generate-quest-button"
        >
          {isGenerating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontWeight: '800' as const }}>Create Quick Quest</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function StreamVideoSDKScreen() {
  const { token, meetingId, isLoadingToken, createNewMeeting, error } =
    useVideoSDK();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isCreatingMeeting, setIsCreatingMeeting] = useState<boolean>(false);

  useEffect(() => {
    const initMeeting = async () => {
      if (!token) {
        console.log("[VideoSDK Screen] Waiting for token...");
        return;
      }

      if (!meetingId && !isCreatingMeeting) {
        console.log("[VideoSDK Screen] Creating new meeting...");
        setIsCreatingMeeting(true);
        try {
          await createNewMeeting();
        } catch (err) {
          console.error("[VideoSDK Screen] Failed to create meeting:", err);
        } finally {
          setIsCreatingMeeting(false);
        }
      }
    };

    initMeeting();
  }, [token, meetingId, isCreatingMeeting, createNewMeeting]);

  if (error) {
    return (
      <View style={[styles.container, { paddingBottom: Math.max(0, insets.bottom - 4) } ]}>
        <Stack.Screen
          options={{
            title: "Live Stream",
            headerShown: true,
          }}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (isLoadingToken || !token || !meetingId || isCreatingMeeting) {
    return (
      <View style={[styles.container, { paddingBottom: Math.max(0, insets.bottom - 4) } ]}>
        <Stack.Screen
          options={{
            title: "Live Stream",
            headerShown: true,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>
            {isLoadingToken
              ? "Connecting..."
              : !meetingId
                ? "Creating meeting..."
                : "Initializing..."}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: Math.max(0, insets.bottom - 4) } ]}>
      <Stack.Screen
        options={{
          title: "Live Stream",
          headerShown: false,
        }}
      />
      <DiagnosticsBanner />
      <StreamView />
    </View>
  );
}

const questStyles = StyleSheet.create({
  bannerWrap: {
    position: 'absolute',
    top: 56,
    left: 12,
    right: 12,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  bannerTitle: { fontSize: 13, fontWeight: '800' as const },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  progressBar: { height: 6, flex: 1, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%' },
  progressLabel: { fontSize: 11, fontWeight: '700' as const },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  actionText: { color: '#fff', fontWeight: '900' as const, fontSize: 12 },
  iconBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
});

const overlayStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  sheet: {
    margin: 12,
    marginBottom: 120,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    maxHeight: '60%',
  },
  chatSheet: {
    position: 'absolute',
    left: 16,
    right: 90,
    bottom: 120,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    height: 400,
    maxHeight: '50%',
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontSize: 14, fontWeight: '900' as const },
  closeBtn: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  questTitle: { fontSize: 18, fontWeight: '900' as const, marginTop: 8 },
  questDesc: { fontSize: 13, fontWeight: '600' as const, marginTop: 6 },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#fff",
    fontWeight: "600" as const,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#000",
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
    textAlign: "center",
    marginBottom: 20,
    fontWeight: "600" as const,
  },
  retryButton: {
    backgroundColor: "#6366F1",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600" as const,
  },
  meetingContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  cameraContainer: {
    flex: 1,
    position: "relative",
  },
  camera: {
    flex: 1,
  },
  noVideoView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#2D2D2D",
  },
  noVideoText: {
    fontSize: 18,
    color: "#9CA3AF",
    marginTop: 16,
    fontWeight: "600" as const,
  },
  permissionText: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 20,
    fontWeight: "500" as const,
  },
  permissionButton: {
    backgroundColor: "#6366F1",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600" as const,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 10,
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  profilePic: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E91E63",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  profileInitial: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700" as const,
  },
  username: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600" as const,
  },
  liveIndicatorNew: {
    backgroundColor: "#E91E63",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  liveTextNew: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700" as const,
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  rightToolbar: {
    position: "absolute",
    top: 100,
    right: 16,
    gap: 24,
    zIndex: 10,
  },
  toolbarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  toolbarButtonOff: {
    backgroundColor: "rgba(220, 38, 38, 0.6)",
  },
  centerAvatarContainer: {
    position: "absolute",
    top: "35%",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  centerAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E91E63",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  centerAvatarText: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "700" as const,
  },
  bottomSection: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  notificationBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 12,
    gap: 10,
  },
  notificationIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  notificationText: {
    flex: 1,
    color: "#fff",
    fontSize: 12,
    fontWeight: "500" as const,
  },
  viewersSection: {
    marginBottom: 12,
    gap: 8,
  },
  viewerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  viewerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#6366F1",
    justifyContent: "center",
    alignItems: "center",
  },
  viewerAvatarText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700" as const,
  },
  viewerName: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600" as const,
    flex: 1,
  },
  waveEmoji: {
    fontSize: 14,
  },
  waveText: {
    color: "#FFD700",
    fontSize: 12,
    fontWeight: "600" as const,
  },
  bottomActionBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  commentButton: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  commentButtonText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    fontWeight: "500" as const,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  streamInfo: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(220, 38, 38, 0.9)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
    marginRight: 6,
  },
  liveText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700" as const,
  },
  viewerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  viewerText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600" as const,
  },
  meetingIdContainer: {
    position: "absolute",
    bottom: 100,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  meetingIdLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600" as const,
    flex: 1,
  },
  flipButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  flipButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600" as const,
  },
  diagContainer: {
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  diagOk: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  diagFail: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  diagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  diagText: {
    fontSize: 13,
    fontWeight: "700" as const,
  },
  diagTextOk: { color: "#065F46" },
  diagTextFail: { color: "#991B1B" },
  diagSub: {
    marginTop: 4,
    fontSize: 12,
    color: "#374151",
  },
  diagRefresh: {
    marginLeft: "auto",
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#111827",
    borderRadius: 6,
  },
  diagRefreshText: { color: "#fff", fontSize: 12, fontWeight: "600" as const },
  controls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#000",
    gap: 8,
  },
  controlsLeft: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  controlsCenter: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  controlsRight: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  controlButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#4B5563",
    justifyContent: "center",
    alignItems: "center",
  },
  meetingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)'
  },
  meetingPillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700' as const,
    maxWidth: 160,
  },
  shareBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonOff: {
    backgroundColor: "#DC2626",
  },
  endCallButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#DC2626",
    justifyContent: 'center',
    alignItems: 'center',
  },
  endCallButtonLarge: {
    width: 72,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#DC2626",
    justifyContent: 'center',
    alignItems: 'center',
  },
});

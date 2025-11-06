import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  Alert,
  Share,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useVideoSDK } from "@/contexts/VideoSDKContext";
import { Mic, MicOff, Video as VideoIcon, VideoOff, Square, Users, CheckCircle2, XCircle, Map as MapIcon, LayoutList, Share2, MessageCircle, Sparkles } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { trpc } from "@/lib/trpc";
import { getBaseUrl } from "@/lib/baseUrl";
import { useAuth } from "@/contexts/AuthContext";
import { useGame } from "@/contexts/GameContext";
import { useTheme } from "@/contexts/ThemeContext";
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
  const insets = useSafeAreaInsets();
  
  const [micEnabled, setMicEnabled] = useState<boolean>(true);
  const [cameraEnabled, setCameraEnabled] = useState<boolean>(true);
  const [cameraType, setCameraType] = useState<string>("front");
  const [viewerCount] = useState<number>(1);
  const [showQuest, setShowQuest] = useState<boolean>(false);
  const [showMap, setShowMap] = useState<boolean>(false);
  const [showChat, setShowChat] = useState<boolean>(false);
  const [showGenerateQuest, setShowGenerateQuest] = useState<boolean>(false);

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
        
        <View style={styles.streamInfo}>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
          
          <View style={styles.viewerBadge}>
            <Users size={16} color="#fff" />
            <Text style={styles.viewerText}>{viewerCount}</Text>
          </View>
        </View>

        <QuestLiveBanner onOpenQuest={() => setShowQuest(true)} onOpenMap={() => setShowMap(true)} />
      </View>

      {showQuest && <QuestOverlay onClose={() => setShowQuest(false)} />}
      {showMap && <MapOverlay onClose={() => setShowMap(false)} />}
      {showChat && <ChatOverlay onClose={() => setShowChat(false)} />}
      {showGenerateQuest && <GenerateQuestOverlay onClose={() => setShowGenerateQuest(false)} />}

      <View style={[styles.controls, { paddingBottom: Math.max(8, 8 + insets.bottom) }]}>

        <View style={styles.controlsLeft}>
          <TouchableOpacity
            style={[styles.controlButton, !micEnabled && styles.controlButtonOff]}
            onPress={handleToggleMic}
            accessibilityLabel="Toggle microphone"
            testID="toggle-mic"
          >
            {micEnabled ? (
              <Mic size={22} color="#fff" />
            ) : (
              <MicOff size={22} color="#fff" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, !cameraEnabled && styles.controlButtonOff]}
            onPress={handleToggleCamera}
            accessibilityLabel="Toggle camera"
            testID="toggle-camera"
          >
            {cameraEnabled ? (
              <VideoIcon size={22} color="#fff" />
            ) : (
              <VideoOff size={22} color="#fff" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton]}
            onPress={() => setShowMap(true)}
            accessibilityLabel="Open map"
            testID="open-map"
          >
            <MapIcon size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.controlsCenter}>
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={async () => {
              try {
                const text = `Join my live stream\nMeeting ID: ${meetingId}`;
                if (Platform.OS === 'web') {
                  await Clipboard.setStringAsync(text);
                  alert('Share text copied to clipboard');
                } else {
                  await Share.share({ message: text, title: 'Join my live stream' });
                }
              } catch (e) {
                console.log('[Share] Failed', e);
              }
            }}
            accessibilityLabel="Share meeting"
            testID="share-meeting"
          >
            <Share2 size={18} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => setShowChat(!showChat)}
            accessibilityLabel="Toggle chat"
            testID="toggle-chat"
          >
            <MessageCircle size={22} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => setShowGenerateQuest(true)}
            accessibilityLabel="Generate quest"
            testID="generate-quest"
          >
            <Sparkles size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.controlsRight}>
          <TouchableOpacity
            style={styles.endCallButton}
            onPress={handleEndStream}
            accessibilityLabel="End stream"
            testID="end-stream"
          >
            <Square size={20} color="#fff" fill="#fff" />
          </TouchableOpacity>
        </View>
      </View>
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

const ChatOverlay = ({ onClose }: { onClose: () => void }) => {
  const { theme } = useTheme();
  const [messages] = useState<{ id: string; user: string; text: string }[]>([
    { id: '1', user: 'User123', text: 'Hey! Great stream!' },
    { id: '2', user: 'Viewer456', text: 'What quest are you on?' },
  ]);

  return (
    <View style={overlayStyles.backdrop} pointerEvents="box-none">
      <View style={[overlayStyles.chatSheet, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}> 
        <View style={overlayStyles.sheetHeader}>
          <Text style={[overlayStyles.sheetTitle, { color: theme.colors.text }]}>Live Chat</Text>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Close chat" style={overlayStyles.closeBtn}>
            <Text style={{ color: theme.colors.text, fontWeight: '800' as const }}>×</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, marginTop: 12 }}>
          {messages.map((msg) => (
            <View key={msg.id} style={{ marginBottom: 8 }}>
              <Text style={{ color: theme.colors.primary, fontSize: 12, fontWeight: '700' as const }}>{msg.user}</Text>
              <Text style={{ color: theme.colors.text, fontSize: 13, marginTop: 2 }}>{msg.text}</Text>
            </View>
          ))}
        </View>
        <Text style={[overlayStyles.questDesc, { color: theme.colors.textSecondary, fontSize: 11, marginTop: 8 }]}>Chat feature coming soon!</Text>
      </View>
    </View>
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
          headerShown: true,
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
    margin: 12,
    marginBottom: 120,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
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
    backgroundColor: "#1E1E1E",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1E1E1E",
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
    backgroundColor: "#1E1E1E",
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
    backgroundColor: "#1E1E1E",
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

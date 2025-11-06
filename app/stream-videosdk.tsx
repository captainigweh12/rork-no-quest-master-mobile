import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Alert,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useVideoSDK } from "@/contexts/VideoSDKContext";
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Users, Copy, CheckCircle2, XCircle, Map as MapIcon, Square, LayoutList } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { trpc } from "@/lib/trpc";
import { getBaseUrl } from "@/lib/baseUrl";
import { useAuth } from "@/contexts/AuthContext";
import { useGame } from "@/contexts/GameContext";
import { useTheme } from "@/contexts/ThemeContext";

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
  
  const [micEnabled, setMicEnabled] = useState<boolean>(true);
  const [cameraEnabled, setCameraEnabled] = useState<boolean>(true);
  const [cameraType, setCameraType] = useState<string>("front");
  const [viewerCount] = useState<number>(1);
  const [showQuest, setShowQuest] = useState<boolean>(false);
  const [showMap, setShowMap] = useState<boolean>(false);

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

        <View style={styles.meetingIdContainer}>
          <Text style={styles.meetingIdLabel}>Meeting ID: {meetingId}</Text>
          <TouchableOpacity onPress={handleCopyMeetingId}>
            <Copy size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {showQuest && <QuestOverlay onClose={() => setShowQuest(false)} />}
      {showMap && <MapOverlay onClose={() => setShowMap(false)} />}

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlButton, !micEnabled && styles.controlButtonOff]}
          onPress={handleToggleMic}
        >
          {micEnabled ? (
            <Mic size={28} color="#fff" />
          ) : (
            <MicOff size={28} color="#fff" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.controlButton,
            !cameraEnabled && styles.controlButtonOff,
          ]}
          onPress={handleToggleCamera}
        >
          {cameraEnabled ? (
            <VideoIcon size={28} color="#fff" />
          ) : (
            <VideoOff size={28} color="#fff" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.endCallButton]}
          onPress={handleEndStream}
        >
          <PhoneOff size={28} color="#fff" />
        </TouchableOpacity>
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
  return (
    <View style={overlayStyles.backdrop} pointerEvents="box-none">
      <View style={[overlayStyles.sheet, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}> 
        <View style={overlayStyles.sheetHeader}>
          <Text style={[overlayStyles.sheetTitle, { color: theme.colors.text }]}>Quest Map</Text>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Close map" style={overlayStyles.closeBtn}>
            <Text style={{ color: theme.colors.text, fontWeight: '800' as const }}>×</Text>
          </TouchableOpacity>
        </View>
        <Text style={[overlayStyles.questDesc, { color: theme.colors.textSecondary }]}>Coming soon: collaborative maps. For now this shows an overlay for the stream.</Text>
      </View>
    </View>
  );
};

export default function StreamVideoSDKScreen() {
  const { token, meetingId, isLoadingToken, createNewMeeting, error } =
    useVideoSDK();
  const router = useRouter();
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
      <SafeAreaView style={styles.container}>
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
      </SafeAreaView>
    );
  }

  if (isLoadingToken || !token || !meetingId || isCreatingMeeting) {
    return (
      <SafeAreaView style={styles.container}>
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: "Live Stream",
          headerShown: true,
        }}
      />
      <DiagnosticsBanner />
      <StreamView />
    </SafeAreaView>
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
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: "#000",
    gap: 16,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#4B5563",
    justifyContent: "center",
    alignItems: "center",
  },
  controlButtonOff: {
    backgroundColor: "#DC2626",
  },
  endCallButton: {
    backgroundColor: "#DC2626",
  },
});

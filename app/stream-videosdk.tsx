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
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Users, Copy, CheckCircle2, XCircle } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { trpc } from "@/lib/trpc";
import { getBaseUrl } from "@/lib/baseUrl";

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
  const { data, error, isLoading, refetch, isRefetching } = trpc.videosdk.checkConfig.useQuery(undefined, { staleTime: 1000 * 30 });
  const tokenProbe = trpc.videosdk.getToken.useQuery(undefined, { staleTime: 0, retry: 0 });
  const base = useMemo(() => `${getBaseUrl()}/api/trpc`, []);

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

const StreamView = () => {
  const router = useRouter();
  const { meetingId } = useVideoSDK();
  
  const [micEnabled, setMicEnabled] = useState<boolean>(true);
  const [cameraEnabled, setCameraEnabled] = useState<boolean>(true);
  const [cameraType, setCameraType] = useState<string>("front");
  const [viewerCount] = useState<number>(1);

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

        <View style={styles.meetingIdContainer}>
          <Text style={styles.meetingIdLabel}>Meeting ID: {meetingId}</Text>
          <TouchableOpacity onPress={handleCopyMeetingId}>
            <Copy size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

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

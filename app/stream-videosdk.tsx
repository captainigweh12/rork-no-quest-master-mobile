import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useVideoSDK } from "@/contexts/VideoSDKContext";
import {
  MeetingProvider,
  useMeeting,
  useParticipant,
  RTCView,
  MediaStream,
} from "@videosdk.live/react-native-sdk";
import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react-native";

const ParticipantView = ({ participantId }: { participantId: string }) => {
  const { webcamStream, webcamOn, displayName } = useParticipant(participantId);

  return (
    <View style={styles.participantContainer}>
      {webcamOn && webcamStream ? (
        <RTCView
          streamURL={new MediaStream([webcamStream.track]).toURL()}
          objectFit="cover"
          style={styles.videoView}
        />
      ) : (
        <View style={styles.noVideoView}>
          <Text style={styles.participantName}>{displayName || "Guest"}</Text>
        </View>
      )}
    </View>
  );
};

const MeetingView = () => {
  const router = useRouter();
  const { join, leave, toggleMic, toggleWebcam, participants } = useMeeting({
    onMeetingJoined: () => {
      console.log("[VideoSDK] Meeting joined successfully");
    },
    onMeetingLeft: () => {
      console.log("[VideoSDK] Meeting left");
      router.back();
    },
    onParticipantJoined: (participant) => {
      console.log("[VideoSDK] Participant joined:", participant.id);
    },
    onParticipantLeft: (participant) => {
      console.log("[VideoSDK] Participant left:", participant.id);
    },
  });

  const [micEnabled, setMicEnabled] = useState<boolean>(true);
  const [cameraEnabled, setCameraEnabled] = useState<boolean>(true);

  useEffect(() => {
    console.log("[VideoSDK] Joining meeting...");
    join();
  }, [join]);

  const handleToggleMic = () => {
    console.log("[VideoSDK] Toggling microphone");
    toggleMic();
    setMicEnabled((prev) => !prev);
  };

  const handleToggleCamera = () => {
    console.log("[VideoSDK] Toggling camera");
    toggleWebcam();
    setCameraEnabled((prev) => !prev);
  };

  const handleLeaveMeeting = () => {
    console.log("[VideoSDK] Leaving meeting");
    leave();
  };

  const participantIds = [...participants.keys()];

  return (
    <View style={styles.meetingContainer}>
      <View style={styles.participantsGrid}>
        {participantIds.map((participantId) => (
          <ParticipantView key={participantId} participantId={participantId} />
        ))}
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
            <Video size={28} color="#fff" />
          ) : (
            <VideoOff size={28} color="#fff" />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.endCallButton]}
          onPress={handleLeaveMeeting}
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
      <MeetingProvider
        config={{
          meetingId,
          micEnabled: true,
          webcamEnabled: true,
          name: "Host",
        }}
        token={token}
      >
        <MeetingView />
      </MeetingProvider>
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
  participantsGrid: {
    flex: 1,
    padding: 8,
  },
  participantContainer: {
    flex: 1,
    backgroundColor: "#2D2D2D",
    borderRadius: 12,
    overflow: "hidden",
    margin: 4,
  },
  videoView: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  noVideoView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#3D3D3D",
  },
  participantName: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "600" as const,
  },
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

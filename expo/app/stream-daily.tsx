import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, ScrollView, Modal, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { Video, Mic, MicOff, VideoOff, Monitor, X, Users, Share2, MessageCircle, UserPlus, LogIn, Map, ClipboardCheck, ThumbsUp, ThumbsDown } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';
import { useGame } from '@/contexts/GameContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';

export default function DailyStreamScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const questId = params.questId as string;
  const questTitle = params.questTitle as string;
  const isHost = params.isHost === 'true';
  const roomUrl = params.roomUrl as string | undefined;
  
  const [roomData, setRoomData] = useState<any>(null);
  const [isInCall, setIsInCall] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [participantCount, setParticipantCount] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [streamDuration, setStreamDuration] = useState(0);
  const [showQuestModal, setShowQuestModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  
  const { quests, progressMap, recordQuestOutcome } = useGame();
  const activeQuests = quests.filter(q => !q.completed && q.timerEndAt);
  const currentQuest = activeQuests.length > 0 ? activeQuests[0] : null;

  const createRoomMutation = trpc.daily.createRoom.useMutation();
  const deleteRoomMutation = trpc.daily.deleteRoom.useMutation();

  // Stream duration timer
  useEffect(() => {
    if (isInCall) {
      const interval = setInterval(() => {
        setStreamDuration(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isInCall]);

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startStream = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to start a stream');
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log('[Daily Stream] Creating room for quest:', questId);
      
      const room = await createRoomMutation.mutateAsync({
        questId,
        userId: user.id,
        questTitle,
        maxParticipants: 50,
      });

      console.log('[Daily Stream] Room created:', room.url);
      setRoomData(room);
      setIsInCall(true);
      setInviteLink(room.url);
      
      Alert.alert(
        'Stream Started!',
        `Your stream is live!\n\nShare the link with viewers to let them join.`,
        [
          { text: 'Share Link', onPress: () => handleShare() },
          { text: 'OK' }
        ]
      );
    } catch (error: any) {
      console.error('[Daily Stream] Start stream error:', error);
      Alert.alert('Error', error.message || 'Failed to start stream');
    } finally {
      setIsLoading(false);
    }
  };

  const endStream = async () => {
    Alert.alert(
      'End Stream?',
      'Are you sure you want to end this stream?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Stream',
          style: 'destructive',
          onPress: async () => {
            if (roomData && isHost) {
              try {
                await deleteRoomMutation.mutateAsync({ roomName: roomData.name });
                console.log('[Daily Stream] Room deleted');
              } catch (error) {
                console.error('[Daily Stream] Delete room error:', error);
              }
            }
            setIsInCall(false);
            router.back();
          }
        }
      ]
    );
  };

  const toggleCamera = () => {
    setIsCameraOn(!isCameraOn);
    console.log('[Daily Stream] Camera toggled:', !isCameraOn);
  };

  const toggleMic = () => {
    setIsMicOn(!isMicOn);
    console.log('[Daily Stream] Mic toggled:', !isMicOn);
  };

  const toggleScreenShare = () => {
    setIsScreenSharing(!isScreenSharing);
    console.log('[Daily Stream] Screen share toggled:', !isScreenSharing);
  };

  const handleShare = async () => {
    const shareUrl = roomData?.url || inviteLink;
    if (!shareUrl) return;

    try {
      await Share.share({
        message: `Join my live stream for quest: ${questTitle}\n\n${shareUrl}`,
        title: 'Join My Live Stream',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleCopyLink = async () => {
    const shareUrl = roomData?.url || inviteLink;
    if (shareUrl) {
      await Clipboard.setStringAsync(shareUrl);
      Alert.alert('Success', 'Stream link copied to clipboard!');
    }
  };

  const handleShareQuest = async () => {
    if (!currentQuest) return;
    
    try {
      await Share.share({
        message: `I'm working on: ${currentQuest.title}\n\n${currentQuest.description}`,
        title: 'My Current Quest',
      });
    } catch (error) {
      console.error('Error sharing quest:', error);
    }
  };

  const handleQuestYes = () => {
    if (!currentQuest) return;
    recordQuestOutcome(currentQuest.id, 'yes');
    Alert.alert('Quest Updated', 'Marked as YES. Keep going!');
  };

  const handleQuestNo = () => {
    if (!currentQuest) return;
    const prog = progressMap[currentQuest.id] ?? { noCount: 0, yesCount: 0 };
    recordQuestOutcome(currentQuest.id, 'no');
    const minNo = typeof currentQuest.minNoRequired === 'number' ? currentQuest.minNoRequired : 0;
    if (minNo > 0 && prog.noCount + 1 >= minNo) {
      Alert.alert('Quest Complete!', `You've collected enough NOs! Great work!`);
    } else {
      Alert.alert('Quest Updated', `NO recorded! (${prog.noCount + 1}/${minNo || '∞'})`);
    }
  };

  useEffect(() => {
    if (isHost && !roomUrl) {
      startStream();
    } else if (roomUrl) {
      // Join existing stream as viewer
      setRoomData({ url: roomUrl });
      setIsInCall(true);
    }
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Quest Modal */}
      <Modal
        visible={showQuestModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowQuestModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Current Quest</Text>
              <Pressable onPress={() => setShowQuestModal(false)}>
                <X size={24} color="#FFFFFF" />
              </Pressable>
            </View>
            
            {currentQuest ? (
              <ScrollView style={styles.modalBody}>
                <Text style={styles.questModalTitle}>{currentQuest.title}</Text>
                <Text style={styles.questModalDesc}>{currentQuest.description}</Text>
                
                {currentQuest.minNoRequired && (
                  <View style={styles.questProgress}>
                    <Text style={styles.questProgressText}>
                      Progress: {progressMap[currentQuest.id]?.noCount || 0}/{currentQuest.minNoRequired} NOs
                    </Text>
                  </View>
                )}

                <View style={styles.questActions}>
                  <Pressable style={styles.questYesBtn} onPress={handleQuestYes}>
                    <ThumbsDown size={20} color="#FFFFFF" />
                    <Text style={styles.questBtnText}>YES (Try Again)</Text>
                  </Pressable>
                  
                  <Pressable style={styles.questNoBtn} onPress={handleQuestNo}>
                    <ThumbsUp size={20} color="#FFFFFF" />
                    <Text style={styles.questBtnText}>NO (Success!)</Text>
                  </Pressable>
                </View>

                <Pressable style={styles.shareQuestBtn} onPress={handleShareQuest}>
                  <Share2 size={20} color="#007AFF" />
                  <Text style={styles.shareQuestText}>Share Quest</Text>
                </Pressable>
              </ScrollView>
            ) : (
              <View style={styles.emptyQuest}>
                <Text style={styles.emptyQuestText}>No active quest</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Invite Modal */}
      <Modal
        visible={showInviteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInviteModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invite Viewers</Text>
              <Pressable onPress={() => setShowInviteModal(false)}>
                <X size={24} color="#FFFFFF" />
              </Pressable>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.inviteText}>Share this link with others to join your stream:</Text>
              <View style={styles.linkContainer}>
                <Text style={styles.linkText} numberOfLines={2}>{inviteLink || roomData?.url || 'No link available'}</Text>
              </View>
              
              <Pressable style={styles.inviteButton} onPress={handleCopyLink}>
                <ClipboardCheck size={20} color="#FFFFFF" />
                <Text style={styles.inviteButtonText}>Copy Link</Text>
              </Pressable>
              
              <Pressable style={styles.inviteButton} onPress={handleShare}>
                <Share2 size={20} color="#FFFFFF" />
                <Text style={styles.inviteButtonText}>Share Link</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {isInCall && (
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          )}
          <Text style={styles.duration}>{formatDuration(streamDuration)}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.viewerCount}>
            <Users size={16} color="#FFFFFF" />
            <Text style={styles.viewerCountText}>{participantCount}</Text>
          </View>
        </View>
      </View>

      {/* Video container */}
      <View style={styles.videoContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6B35" />
            <Text style={styles.loadingText}>
              {isHost ? 'Starting your stream...' : 'Joining stream...'}
            </Text>
          </View>
        ) : !isInCall ? (
          <View style={styles.waitingContainer}>
            <Text style={styles.waitingTitle}>Ready to Go Live?</Text>
            <Text style={styles.waitingText}>
              Stream your quest attempt and get support from the community
            </Text>
            <Pressable style={styles.startButton} onPress={startStream}>
              <Text style={styles.startButtonText}>🔴 Start Streaming</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.activeStream}>
            <ScrollView style={styles.streamInfo} contentContainerStyle={{ padding: 20 }}>
              <Text style={styles.questTitle}>{questTitle}</Text>
              <Text style={styles.questSubtitle}>Quest Stream</Text>
              
              {isHost && (
                <View style={styles.hostBadge}>
                  <Text style={styles.hostBadgeText}>👑 Host</Text>
                </View>
              )}

              <View style={styles.streamStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{participantCount}</Text>
                  <Text style={styles.statLabel}>Viewers</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{formatDuration(streamDuration)}</Text>
                  <Text style={styles.statLabel}>Duration</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{isCameraOn ? 'ON' : 'OFF'}</Text>
                  <Text style={styles.statLabel}>Camera</Text>
                </View>
              </View>

              {roomData && (
                <View style={styles.roomInfo}>
                  <Text style={styles.roomInfoTitle}>Stream URL:</Text>
                  <Text style={styles.roomInfoUrl} numberOfLines={1}>{roomData.url}</Text>
                  <Pressable style={styles.shareButton} onPress={handleShare}>
                    <Share2 size={16} color="#FFFFFF" />
                    <Text style={styles.shareButtonText}>Share Stream</Text>
                  </Pressable>
                </View>
              )}

              <View style={styles.features}>
                <Text style={styles.featuresTitle}>Stream Features:</Text>
                <Text style={styles.featureItem}>✅ Cloud Recording</Text>
                <Text style={styles.featureItem}>✅ Live Chat</Text>
                <Text style={styles.featureItem}>✅ Screen Sharing</Text>
                <Text style={styles.featureItem}>✅ Emoji Reactions</Text>
              </View>
            </ScrollView>
          </View>
        )}
      </View>

      {/* Current Quest Badge */}
      {isInCall && currentQuest && (
        <Pressable 
          style={styles.questBadge}
          onPress={() => setShowQuestModal(true)}
        >
          <ClipboardCheck size={16} color="#FFFFFF" />
          <Text style={styles.questBadgeText} numberOfLines={1}>
            {currentQuest.title}
          </Text>
        </Pressable>
      )}

      {/* Controls */}
      {isInCall && (
        <View style={styles.controls}>
          <View style={styles.controlsRow}>
            <Pressable
              style={[styles.controlButton, !isCameraOn && styles.controlButtonOff]}
              onPress={toggleCamera}
            >
              {isCameraOn ? (
                <Video size={24} color="#FFFFFF" />
              ) : (
                <VideoOff size={24} color="#FFFFFF" />
              )}
              <Text style={styles.controlLabel}>Camera</Text>
            </Pressable>

            <Pressable
              style={[styles.controlButton, !isMicOn && styles.controlButtonOff]}
              onPress={toggleMic}
            >
              {isMicOn ? (
                <Mic size={24} color="#FFFFFF" />
              ) : (
                <MicOff size={24} color="#FFFFFF" />
              )}
              <Text style={styles.controlLabel}>Mic</Text>
            </Pressable>

            {isHost && (
              <Pressable
                style={[styles.controlButton, isScreenSharing && styles.controlButtonActive]}
                onPress={toggleScreenShare}
              >
                <Monitor size={24} color="#FFFFFF" />
                <Text style={styles.controlLabel}>Share</Text>
              </Pressable>
            )}

            <Pressable
              style={[styles.controlButton]}
              onPress={() => setShowInviteModal(true)}
            >
              <UserPlus size={24} color="#FFFFFF" />
              <Text style={styles.controlLabel}>Invite</Text>
            </Pressable>
          </View>

          <View style={styles.controlsRow}>
            {currentQuest && (
              <>
                <Pressable
                  style={[styles.controlButton, styles.yesQuestButton]}
                  onPress={handleQuestYes}
                >
                  <ThumbsDown size={24} color="#FFFFFF" />
                  <Text style={styles.controlLabel}>YES</Text>
                </Pressable>

                <Pressable
                  style={[styles.controlButton, styles.noQuestButton]}
                  onPress={handleQuestNo}
                >
                  <ThumbsUp size={24} color="#FFFFFF" />
                  <Text style={styles.controlLabel}>NO</Text>
                </Pressable>
              </>
            )}

            <Pressable
              style={[styles.controlButton]}
              onPress={() => router.push('/maps' as any)}
            >
              <Map size={24} color="#FFFFFF" />
              <Text style={styles.controlLabel}>Maps</Text>
            </Pressable>
          </View>

          <Pressable
            style={[styles.controlButton, styles.endButton]}
            onPress={endStream}
          >
            <X size={24} color="#FFFFFF" />
            <Text style={styles.controlLabel}>End Stream</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DC3545',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  duration: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  viewerCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  viewerCountText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  videoContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  waitingTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  waitingText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  startButton: {
    backgroundColor: '#DC3545',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    shadowColor: '#DC3545',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  activeStream: {
    flex: 1,
  },
  streamInfo: {
    flex: 1,
  },
  questTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  questSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    marginBottom: 20,
  },
  hostBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  hostBadgeText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
  streamStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  roomInfo: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  roomInfoTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  roomInfoUrl: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 12,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  features: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
  },
  featuresTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  featureItem: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    marginBottom: 8,
  },
  controls: {
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    gap: 12,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  controlButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 6,
  },
  controlButtonOff: {
    backgroundColor: '#DC3545',
  },
  controlButtonActive: {
    backgroundColor: '#28A745',
  },
  chatButton: {
    backgroundColor: '#007AFF',
  },
  controlLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  endButton: {
    backgroundColor: '#DC3545',
    flexDirection: 'row',
    gap: 8,
  },
  yesQuestButton: {
    backgroundColor: '#EF4444',
  },
  noQuestButton: {
    backgroundColor: '#10B981',
  },
  questBadge: {
    position: 'absolute',
    bottom: 200,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
  },
  questBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1E293B',
    borderRadius: 24,
    overflow: 'hidden',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  modalBody: {
    padding: 20,
  },
  questModalTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  questModalDesc: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  questProgress: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  questProgressText: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '700',
  },
  questActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  questYesBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    borderRadius: 16,
  },
  questNoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 16,
  },
  questBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  shareQuestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  shareQuestText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyQuest: {
    padding: 40,
    alignItems: 'center',
  },
  emptyQuestText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
  },
  inviteText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    marginBottom: 16,
  },
  linkContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  linkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  inviteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

import { View, Text, StyleSheet, Pressable, ScrollView, Alert, ActivityIndicator, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Video, Users, Clock, ExternalLink, Copy, Play, Square } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { trpc } from '@/lib/trpc';
import * as Clipboard from 'expo-clipboard';

export default function YouTubeStreamScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params = useLocalSearchParams();

  const broadcastId = params.broadcastId as string;
  const streamId = params.streamId as string;
  const watchUrl = params.watchUrl as string;

  const [streamDuration, setStreamDuration] = useState(0);
  const [isLive, setIsLive] = useState(false);

  // Fetch broadcast status
  const { data: broadcastStatus, refetch: refetchStatus } = trpc.youtube.getBroadcastStatus.useQuery(
    {
      userId: user?.id || '',
      broadcastId,
    },
    {
      enabled: !!user && !!broadcastId,
      refetchInterval: 10000, // Refetch every 10 seconds
    }
  );

  // Fetch stream analytics
  const { data: analytics } = trpc.youtube.getStreamAnalytics.useQuery(
    {
      userId: user?.id || '',
      broadcastId,
    },
    {
      enabled: !!user && !!broadcastId && isLive,
      refetchInterval: 30000, // Refetch every 30 seconds
    }
  );

  // Start broadcast mutation
  const startBroadcastMutation = trpc.youtube.startBroadcast.useMutation({
    onSuccess: () => {
      setIsLive(true);
      Alert.alert('Stream Started!', 'Your stream is now live on YouTube.');
      refetchStatus();
    },
    onError: (error) => {
      Alert.alert('Error', error.message || 'Failed to start stream');
    },
  });

  // End broadcast mutation
  const endBroadcastMutation = trpc.youtube.endBroadcast.useMutation({
    onSuccess: () => {
      setIsLive(false);
      Alert.alert('Stream Ended', 'Your stream has been ended successfully.');
      router.back();
    },
    onError: (error) => {
      Alert.alert('Error', error.message || 'Failed to end stream');
    },
  });

  // Stream duration timer
  useEffect(() => {
    if (isLive) {
      const interval = setInterval(() => {
        setStreamDuration((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isLive]);

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopyToClipboard = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied!', `${label} copied to clipboard`);
  };

  const handleStartStream = () => {
    if (!user) return;

    Alert.alert(
      'Start Stream?',
      'Are you ready to go live on YouTube?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Go Live',
          onPress: () => {
            startBroadcastMutation.mutate({
              userId: user.id,
              broadcastId,
            });
          },
        },
      ]
    );
  };

  const handleEndStream = () => {
    Alert.alert(
      'End Stream?',
      'Are you sure you want to end this stream?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Stream',
          style: 'destructive',
          onPress: () => {
            if (!user) return;
            endBroadcastMutation.mutate({
              userId: user.id,
              broadcastId,
            });
          },
        },
      ]
    );
  };

  const handleOpenYouTube = () => {
    if (watchUrl) {
      Linking.openURL(watchUrl);
    }
  };

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
        <Text style={styles.headerTitle}>YouTube Stream</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Live Status */}
        {isLive && (
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
            <Text style={styles.duration}>{formatDuration(streamDuration)}</Text>
          </View>
        )}

        {/* Stream Info */}
        <View style={styles.streamInfo}>
          <Text style={styles.streamTitle}>
            {broadcastStatus?.title || 'YouTube Live Stream'}
          </Text>
          <Text style={styles.streamStatus}>
            Status: {broadcastStatus?.status || 'Ready'}
          </Text>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Users size={24} color="#FF6B35" />
            <Text style={styles.statValue}>
              {broadcastStatus?.concurrentViewers || analytics?.concurrentViewers || 0}
            </Text>
            <Text style={styles.statLabel}>Viewers</Text>
          </View>

          <View style={styles.statCard}>
            <Clock size={24} color="#FF6B35" />
            <Text style={styles.statValue}>{formatDuration(streamDuration)}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>

          <View style={styles.statCard}>
            <Video size={24} color="#FF6B35" />
            <Text style={styles.statValue}>{isLive ? 'ON' : 'OFF'}</Text>
            <Text style={styles.statLabel}>Status</Text>
          </View>
        </View>

        {/* Stream Details */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Stream Details</Text>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Broadcast ID</Text>
            <View style={styles.detailValueRow}>
              <Text style={styles.detailValue} numberOfLines={1}>
                {broadcastId}
              </Text>
              <Pressable onPress={() => handleCopyToClipboard(broadcastId, 'Broadcast ID')}>
                <Copy size={16} color="#FF6B35" />
              </Pressable>
            </View>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Stream ID</Text>
            <View style={styles.detailValueRow}>
              <Text style={styles.detailValue} numberOfLines={1}>
                {streamId}
              </Text>
              <Pressable onPress={() => handleCopyToClipboard(streamId, 'Stream ID')}>
                <Copy size={16} color="#FF6B35" />
              </Pressable>
            </View>
          </View>

          {watchUrl && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Watch URL</Text>
              <Pressable style={styles.watchUrlButton} onPress={handleOpenYouTube}>
                <Text style={styles.watchUrlText} numberOfLines={1}>
                  {watchUrl}
                </Text>
                <ExternalLink size={16} color="#FF6B35" />
              </Pressable>
            </View>
          )}
        </View>

        {/* RTMP Info */}
        <View style={styles.rtmpCard}>
          <Text style={styles.rtmpTitle}>📡 RTMP Streaming</Text>
          <Text style={styles.rtmpText}>
            Use these details in your streaming software (OBS, Streamlabs, etc.) to broadcast to YouTube.
          </Text>
          <View style={styles.rtmpInfo}>
            <Text style={styles.rtmpLabel}>Server URL:</Text>
            <Text style={styles.rtmpValue}>rtmp://a.rtmp.youtube.com/live2</Text>
          </View>
          <View style={styles.rtmpInfo}>
            <Text style={styles.rtmpLabel}>Stream Key:</Text>
            <Text style={styles.rtmpValue}>Check YouTube Studio</Text>
          </View>
        </View>

        {/* Analytics (if live) */}
        {isLive && analytics && (
          <View style={styles.analyticsCard}>
            <Text style={styles.analyticsTitle}>📊 Analytics</Text>
            <View style={styles.analyticsGrid}>
              <View style={styles.analyticsItem}>
                <Text style={styles.analyticsValue}>{analytics.viewCount || 0}</Text>
                <Text style={styles.analyticsLabel}>Total Views</Text>
              </View>
              <View style={styles.analyticsItem}>
                <Text style={styles.analyticsValue}>{analytics.likeCount || 0}</Text>
                <Text style={styles.analyticsLabel}>Likes</Text>
              </View>
              <View style={styles.analyticsItem}>
                <Text style={styles.analyticsValue}>{analytics.commentCount || 0}</Text>
                <Text style={styles.analyticsLabel}>Comments</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + 20 }]}>
        {!isLive ? (
          <Pressable
            style={[styles.actionButton, styles.startButton, startBroadcastMutation.isPending && styles.actionButtonDisabled]}
            onPress={handleStartStream}
            disabled={startBroadcastMutation.isPending}
          >
            {startBroadcastMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Play size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Go Live</Text>
              </>
            )}
          </Pressable>
        ) : (
          <Pressable
            style={[styles.actionButton, styles.endButton, endBroadcastMutation.isPending && styles.actionButtonDisabled]}
            onPress={handleEndStream}
            disabled={endBroadcastMutation.isPending}
          >
            {endBroadcastMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Square size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>End Stream</Text>
              </>
            )}
          </Pressable>
        )}
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
    paddingBottom: 120,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#DC3545',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginBottom: 20,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  duration: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  streamInfo: {
    marginBottom: 24,
  },
  streamTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  streamStatus: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  detailsCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  detailsTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  detailItem: {
    marginBottom: 16,
  },
  detailLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  detailValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailValue: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  watchUrlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,107,53,0.2)',
    padding: 12,
    borderRadius: 8,
  },
  watchUrlText: {
    flex: 1,
    color: '#FF6B35',
    fontSize: 14,
  },
  rtmpCard: {
    backgroundColor: 'rgba(255,107,53,0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.3)',
  },
  rtmpTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  rtmpText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  rtmpInfo: {
    marginBottom: 12,
  },
  rtmpLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  rtmpValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  analyticsCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 20,
  },
  analyticsTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  analyticsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  analyticsItem: {
    flex: 1,
    alignItems: 'center',
  },
  analyticsValue: {
    color: '#FF6B35',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  analyticsLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    textAlign: 'center',
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
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  startButton: {
    backgroundColor: '#28A745',
    shadowColor: '#28A745',
  },
  endButton: {
    backgroundColor: '#DC3545',
    shadowColor: '#DC3545',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});

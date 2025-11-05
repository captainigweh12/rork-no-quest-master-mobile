import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Youtube, CheckCircle, XCircle, ArrowLeft } from 'lucide-react-native';
import { useYouTube } from '@/contexts/YouTubeContext';

export default function YouTubeConnectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { 
    isConnected, 
    isOAuthConnected, 
    connectViaOAuth, 
    disconnect, 
    isLoading,
    state 
  } = useYouTube();

  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const result = await connectViaOAuth();
      if (result.success) {
        Alert.alert(
          'Success!',
          'Your YouTube account has been connected successfully.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Connection Failed',
          'Could not connect to YouTube. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('[YouTube Connect] Error:', error);
      Alert.alert(
        'Error',
        'An unexpected error occurred. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect YouTube?',
      'Are you sure you want to disconnect your YouTube account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            await disconnect();
            Alert.alert('Disconnected', 'Your YouTube account has been disconnected.');
          },
        },
      ]
    );
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
        <Text style={styles.headerTitle}>YouTube</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Title */}
        <View style={styles.titleContainer}>
          <Youtube size={64} color="#FF6B35" />
          <Text style={styles.title}>Connect YouTube</Text>
          <Text style={styles.subtitle}>
            Stream your quests live to your YouTube channel
          </Text>
        </View>

        {/* Connection Status */}
        {isConnected && isOAuthConnected ? (
          <View style={styles.connectedCard}>
            <View style={styles.connectedHeader}>
              <CheckCircle size={48} color="#28A745" />
              <Text style={styles.connectedTitle}>Connected!</Text>
            </View>

            {state?.channelId && (
              <View style={styles.channelInfo}>
                <Text style={styles.channelLabel}>Channel</Text>
                <Text style={styles.channelUrl} numberOfLines={1}>
                  {state.channelUrl || 'YouTube Channel'}
                </Text>
              </View>
            )}

            <View style={styles.connectedFeatures}>
              <Text style={styles.featuresTitle}>What you can do:</Text>
              <View style={styles.featureItem}>
                <CheckCircle size={20} color="#28A745" />
                <Text style={styles.featureText}>Create live broadcasts</Text>
              </View>
              <View style={styles.featureItem}>
                <CheckCircle size={20} color="#28A745" />
                <Text style={styles.featureText}>Stream directly to YouTube</Text>
              </View>
              <View style={styles.featureItem}>
                <CheckCircle size={20} color="#28A745" />
                <Text style={styles.featureText}>View real-time analytics</Text>
              </View>
              <View style={styles.featureItem}>
                <CheckCircle size={20} color="#28A745" />
                <Text style={styles.featureText}>Manage stream settings</Text>
              </View>
            </View>

            <Pressable
              style={styles.disconnectButton}
              onPress={handleDisconnect}
            >
              <XCircle size={20} color="#FFFFFF" />
              <Text style={styles.disconnectText}>Disconnect Account</Text>
            </Pressable>

            <Pressable
              style={styles.createStreamButton}
              onPress={() => router.push('/youtube-stream-setup')}
            >
              <Text style={styles.createStreamText}>Create Live Stream</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.notConnectedCard}>
            <View style={styles.notConnectedIcon}>
              <Youtube size={48} color="rgba(255,255,255,0.5)" />
            </View>

            <Text style={styles.notConnectedTitle}>Not Connected</Text>
            <Text style={styles.notConnectedText}>
              Connect your YouTube account to start live streaming your quest attempts and share them with your audience.
            </Text>

            <View style={styles.benefits}>
              <Text style={styles.benefitsTitle}>Benefits:</Text>
              <View style={styles.benefitItem}>
                <Text style={styles.benefitIcon}>🎥</Text>
                <Text style={styles.benefitText}>Stream directly to your channel</Text>
              </View>
              <View style={styles.benefitItem}>
                <Text style={styles.benefitIcon}>📊</Text>
                <Text style={styles.benefitText}>Real-time viewer analytics</Text>
              </View>
              <View style={styles.benefitItem}>
                <Text style={styles.benefitIcon}>🔒</Text>
                <Text style={styles.benefitText}>Secure OAuth authentication</Text>
              </View>
              <View style={styles.benefitItem}>
                <Text style={styles.benefitIcon}>⚡</Text>
                <Text style={styles.benefitText}>Easy stream management</Text>
              </View>
            </View>

            <Pressable
              style={[styles.connectButton, (isConnecting || isLoading) && styles.connectButtonDisabled]}
              onPress={handleConnect}
              disabled={isConnecting || isLoading}
            >
              {isConnecting || isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Youtube size={24} color="#FFFFFF" />
                  <Text style={styles.connectText}>Connect with Google</Text>
                </>
              )}
            </Pressable>

            <Text style={styles.privacyNote}>
              We'll never post without your permission
            </Text>
          </View>
        )}

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>How it works</Text>
          <View style={styles.infoStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Connect Account</Text>
              <Text style={styles.stepText}>
                Securely connect your YouTube account using Google OAuth
              </Text>
            </View>
          </View>
          <View style={styles.infoStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Create Stream</Text>
              <Text style={styles.stepText}>
                Set up your live stream with title, description, and privacy settings
              </Text>
            </View>
          </View>
          <View style={styles.infoStep}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Go Live</Text>
              <Text style={styles.stepText}>
                Start streaming your quest and engage with your audience
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  connectedCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
  },
  connectedHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  connectedTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 12,
  },
  channelInfo: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  channelLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  channelUrl: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  connectedFeatures: {
    marginBottom: 24,
  },
  featuresTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  featureText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
  },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(220,53,69,0.2)',
    borderWidth: 1,
    borderColor: '#DC3545',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  disconnectText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  createStreamButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  createStreamText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  notConnectedCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  notConnectedIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  notConnectedTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  notConnectedText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  benefits: {
    width: '100%',
    marginBottom: 24,
  },
  benefitsTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  benefitIcon: {
    fontSize: 24,
  },
  benefitText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    flex: 1,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    width: '100%',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  connectButtonDisabled: {
    opacity: 0.6,
  },
  connectText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  privacyNote: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
  },
  infoSection: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
  },
  infoTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
  },
  infoStep: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  stepText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    lineHeight: 20,
  },
});

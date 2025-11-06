import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import * as friendsService from '@/services/supabase/friends';

export default function InviteScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { user } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user) {
      // User not authenticated, redirect to auth
      setStatus('error');
      setMessage('Please sign in to accept this invitation');
      setTimeout(() => {
        router.replace('/auth');
      }, 2000);
      return;
    }

    if (!code) {
      setStatus('error');
      setMessage('Invalid invite link');
      setTimeout(() => {
        router.replace('/(tabs)/(home)');
      }, 2000);
      return;
    }

    // Process the invite
    const acceptInvite = async () => {
      try {
        await friendsService.acceptFriendInvite(code);
        setStatus('success');
        setMessage('Friend added successfully!');
        setTimeout(() => {
          router.replace('/(tabs)/community');
        }, 1500);
      } catch (error: any) {
        console.error('Error accepting invite:', error);
        setStatus('error');
        setMessage(error.message || 'Failed to accept invitation');
        setTimeout(() => {
          router.replace('/(tabs)/community');
        }, 2000);
      }
    };

    acceptInvite();
  }, [code, user, router]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        {status === 'processing' && (
          <>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.message, { color: theme.colors.text }]}>
              Processing invitation...
            </Text>
          </>
        )}
        {status === 'success' && (
          <>
            <Text style={styles.icon}>✓</Text>
            <Text style={[styles.message, { color: theme.colors.success }]}>
              {message}
            </Text>
          </>
        )}
        {status === 'error' && (
          <>
            <Text style={styles.icon}>✗</Text>
            <Text style={[styles.message, { color: theme.colors.error }]}>
              {message}
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    gap: 20,
  },
  icon: {
    fontSize: 64,
  },
  message: {
    fontSize: 18,
    textAlign: 'center',
    fontWeight: '600',
  },
});

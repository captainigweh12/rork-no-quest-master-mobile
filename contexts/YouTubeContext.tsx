import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type YouTubeLinkState = {
  channelUrl?: string;
  liveControlUrl?: string;
  lastConnectedAt?: string;
};

const STORAGE_KEY = 'yt_link_state_v1';

export const [YouTubeProvider, useYouTube] = createContextHook(() => {
  const [state, setState] = useState<YouTubeLinkState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const parsed: YouTubeLinkState | null = raw ? JSON.parse(raw) : null;
        if (mounted) setState(parsed);
      } catch (e) {
        console.error('[YouTube] Failed to load state', e);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const persist = useCallback(async (next: YouTubeLinkState | null) => {
    try {
      if (next) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('[YouTube] Persist error', e);
    }
  }, []);

  const connectManually = useCallback(async (channelUrl: string) => {
    if (!channelUrl || !/^https?:\/\//.test(channelUrl)) {
      Alert.alert('Invalid URL', 'Please enter a valid YouTube channel URL.');
      return { success: false } as const;
    }
    const liveControlUrl = Platform.select({
      web: 'https://studio.youtube.com',
      default: 'https://studio.youtube.com',
    }) as string;
    const next: YouTubeLinkState = {
      channelUrl,
      liveControlUrl,
      lastConnectedAt: new Date().toISOString(),
    };
    setState(next);
    await persist(next);
    return { success: true } as const;
  }, [persist]);

  const disconnect = useCallback(async () => {
    setState(null);
    await persist(null);
  }, [persist]);

  const openChannel = useCallback(async () => {
    const url = state?.channelUrl;
    if (!url) {
      Alert.alert('Not connected', 'Add your YouTube channel URL first.');
      return;
    }
    try {
      await Linking.openURL(url);
    } catch (e) {
      console.error('[YouTube] openChannel error', e);
      Alert.alert('Error', 'Could not open your channel.');
    }
  }, [state?.channelUrl]);

  const goLive = useCallback(async () => {
    const url = state?.liveControlUrl ?? 'https://studio.youtube.com';
    try {
      await Linking.openURL(url);
    } catch (e) {
      console.error('[YouTube] goLive error', e);
      Alert.alert('Error', 'Could not open YouTube Studio.');
    }
  }, [state?.liveControlUrl]);

  return useMemo(() => ({
    isLoading,
    isConnected: !!state?.channelUrl,
    state,
    connectManually,
    disconnect,
    openChannel,
    goLive,
  }), [isLoading, state, connectManually, disconnect, openChannel, goLive]);
});